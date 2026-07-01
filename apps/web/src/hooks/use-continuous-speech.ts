import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSpeechRecognition, isBrowserSpeechAvailable } from "@/lib/browser-speech";

type UseContinuousSpeechOptions = {
  enabled: boolean;
  onUtterance: (text: string) => void;
  onSpeechStart?: () => void;
};

export function useContinuousSpeech({
  enabled,
  onUtterance,
  onSpeechStart,
}: UseContinuousSpeechOptions) {
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<ReturnType<typeof createBrowserSpeechRecognition>>(null);
  const enabledRef = useRef(enabled);
  const restartTimerRef = useRef<number | null>(null);
  const lastUtteranceRef = useRef("");
  const lastUtteranceAtRef = useRef(0);
  const onUtteranceRef = useRef(onUtterance);
  const onSpeechStartRef = useRef(onSpeechStart);

  enabledRef.current = enabled;
  onUtteranceRef.current = onUtterance;
  onSpeechStartRef.current = onSpeechStart;

  const clearRestartTimer = () => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

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
    recognitionRef.current?.abort();
    recognitionRef.current = null;
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

    recognition.onspeechstart = () => {
      onSpeechStartRef.current?.();
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimText(interim.trim());

      const normalizedFinal = finalText.replace(/\s+/g, " ").trim();
      if (!normalizedFinal) return;

      const now = Date.now();
      if (
        normalizedFinal === lastUtteranceRef.current &&
        now - lastUtteranceAtRef.current < 2500
      ) {
        return;
      }

      lastUtteranceRef.current = normalizedFinal;
      lastUtteranceAtRef.current = now;
      setInterimText("");
      onUtteranceRef.current(normalizedFinal);
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
