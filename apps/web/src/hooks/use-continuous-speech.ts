import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSpeechRecognition, isBrowserSpeechAvailable } from "@/lib/browser-speech";
import { normalizeCovaInTranscript } from "@/lib/normalize-stt";

type UseContinuousSpeechOptions = {
  enabled: boolean;
  onUtterance: (text: string) => void;
  /** Se dispara en cuanto hay sonido/voz del usuario (barge-in agresivo). */
  onBargeIn?: () => void;
  /** Pausa de silencio antes de enviar la pregunta completa (ms). */
  silenceMs?: number;
};

const DEFAULT_SILENCE_MS = 1700;

export function useContinuousSpeech({
  enabled,
  onUtterance,
  onBargeIn,
  silenceMs = DEFAULT_SILENCE_MS,
}: UseContinuousSpeechOptions) {
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<ReturnType<typeof createBrowserSpeechRecognition>>(null);
  const enabledRef = useRef(enabled);
  const restartTimerRef = useRef<number | null>(null);
  const finalizeTimerRef = useRef<number | null>(null);
  const pendingBufferRef = useRef("");
  const lastSentUtteranceRef = useRef("");
  const lastSentAtRef = useRef(0);
  const lastBargeInAtRef = useRef(0);
  const onUtteranceRef = useRef(onUtterance);
  const onBargeInRef = useRef(onBargeIn);
  const silenceMsRef = useRef(silenceMs);

  enabledRef.current = enabled;
  onUtteranceRef.current = onUtterance;
  onBargeInRef.current = onBargeIn;
  silenceMsRef.current = silenceMs;

  const triggerBargeIn = useCallback(() => {
    const now = Date.now();
    if (now - lastBargeInAtRef.current < 60) return;
    lastBargeInAtRef.current = now;
    onBargeInRef.current?.();
  }, []);

  const clearRestartTimer = () => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const clearFinalizeTimer = () => {
    if (finalizeTimerRef.current !== null) {
      window.clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }
  };

  const flushPendingUtterance = useCallback(() => {
    clearFinalizeTimer();
    const full = normalizeCovaInTranscript(pendingBufferRef.current);
    pendingBufferRef.current = "";
    setInterimText("");
    if (!full) return;

    const now = Date.now();
    if (full === lastSentUtteranceRef.current && now - lastSentAtRef.current < 3000) {
      return;
    }
    lastSentUtteranceRef.current = full;
    lastSentAtRef.current = now;
    onUtteranceRef.current(full);
  }, []);

  const scheduleFinalize = useCallback(() => {
    clearFinalizeTimer();
    finalizeTimerRef.current = window.setTimeout(() => {
      finalizeTimerRef.current = null;
      flushPendingUtterance();
    }, silenceMsRef.current);
  }, [flushPendingUtterance]);

  const scheduleRestart = useCallback((delayMs = 250) => {
    clearRestartTimer();
    if (!enabledRef.current) return;
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      startListeningRef.current();
    }, delayMs);
  }, []);

  const stopListening = useCallback(() => {
    clearRestartTimer();
    clearFinalizeTimer();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    pendingBufferRef.current = "";
    setListening(false);
    setInterimText("");
  }, []);

  const startListeningRef = useRef<() => void>(() => {});

  startListeningRef.current = () => {
    if (!enabledRef.current || !isBrowserSpeechAvailable()) return;
    if (recognitionRef.current) return;

    const recognition = createBrowserSpeechRecognition();
    if (!recognition) return;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onaudiostart = () => {
      triggerBargeIn();
    };
    recognition.onsoundstart = () => {
      triggerBargeIn();
    };
    recognition.onspeechstart = () => {
      triggerBargeIn();
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalChunk = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalChunk += transcript;
        } else {
          interim += transcript;
        }
      }

      if (finalChunk.trim()) {
        pendingBufferRef.current = `${pendingBufferRef.current} ${finalChunk}`.replace(/\s+/g, " ").trim();
      }

      const preview = normalizeCovaInTranscript(
        `${pendingBufferRef.current} ${interim}`.replace(/\s+/g, " ").trim(),
      );
      setInterimText(preview);

      if (interim.trim()) {
        triggerBargeIn();
      }

      if (finalChunk.trim() || interim.trim()) {
        scheduleFinalize();
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted") return;
      setListening(false);
      recognitionRef.current = null;
      if (enabledRef.current && event.error !== "not-allowed") {
        scheduleRestart(event.error === "no-speech" ? 120 : 400);
      }
    };

    recognition.onend = () => {
      flushPendingUtterance();
      setListening(false);
      recognitionRef.current = null;
      scheduleRestart();
    };

    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      scheduleRestart(400);
    }
  };

  const startListening = useCallback(() => {
    startListeningRef.current();
  }, []);

  useEffect(() => {
    if (enabled) {
      startListeningRef.current();
    } else {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [enabled, stopListening]);

  return {
    supported: isBrowserSpeechAvailable(),
    listening,
    interimText,
    startListening,
    stopListening,
  };
}
