import { useRef, useState } from "react";
import { apiPost, apiPostForm } from "@/lib/api";
import { createBrowserSpeechRecognition, isBrowserSpeechAvailable } from "@/lib/browser-speech";
import { postFeriaMessage } from "@/lib/feria-channel";

type SupportedLanguage = "ES" | "EN" | "FR" | "DE";

type SttResponse = {
  text: string;
  detectedLanguage: SupportedLanguage;
};

type UseFeriaAskOptions = {
  /** Si se define, la respuesta se entrega aquí en lugar de enviarla por BroadcastChannel. */
  onAnswer?: (answer: string) => void;
  /** Corta el habla del avatar al iniciar una nueva pregunta (modo híbrido). */
  onInterrupt?: () => void;
};

export function useFeriaAsk(options: UseFeriaAskOptions = {}) {
  const { onAnswer, onInterrupt } = options;
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const browserRecognitionRef = useRef<ReturnType<typeof createBrowserSpeechRecognition>>(null);
  const askGenerationRef = useRef(0);

  const stopRecordingTracks = () => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  };

  const deliverAnswer = (answer: string) => {
    if (onAnswer) {
      onAnswer(answer);
    } else {
      postFeriaMessage({ type: "speak", text: answer });
      postFeriaMessage({ type: "status", status: "speaking" });
      window.setTimeout(() => postFeriaMessage({ type: "status", status: "idle" }), 500);
    }
  };

  const askQuestion = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    onInterrupt?.();
    const generation = ++askGenerationRef.current;

    setSending(true);
    setError(null);
    if (!onAnswer) {
      postFeriaMessage({ type: "interrupt" });
      postFeriaMessage({ type: "status", status: "processing" });
    }

    try {
      const rag = await apiPost<{ answer: string }>("/rag/ask", {
        question: trimmed,
        language: "ES",
        brief: true,
      });
      if (generation !== askGenerationRef.current) return;
      deliverAnswer(rag.answer);
      setInputText("");
    } catch (err) {
      if (generation !== askGenerationRef.current) return;
      const message = err instanceof Error ? err.message : "No se pudo obtener respuesta";
      setError(message);
      if (!onAnswer) {
        postFeriaMessage({ type: "status", status: "idle" });
      }
    } finally {
      if (generation === askGenerationRef.current) {
        setSending(false);
      }
    }
  };

  const startWhisperRecording = async () => {
    if (recording) return;
    onInterrupt?.();
    if (!onAnswer) {
      postFeriaMessage({ type: "interrupt" });
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined;
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordingStreamRef.current = stream;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo acceder al micrófono");
    }
  };

  const stopWhisperRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    setRecording(false);
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    stopRecordingTracks();
    mediaRecorderRef.current = null;

    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    audioChunksRef.current = [];
    if (blob.size === 0) return;

    try {
      const form = new FormData();
      form.append("file", blob, "voice.webm");
      const stt = await apiPostForm<SttResponse>("/stt/transcribe", form);
      const question = (stt.text ?? "").trim();
      if (question) {
        setInputText(question);
        await askQuestion(question);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo transcribir el audio");
    }
  };

  const startBrowserVoiceRecording = () => {
    if (recording) return;
    onInterrupt?.();
    if (!onAnswer) {
      postFeriaMessage({ type: "interrupt" });
    }

    const recognition = createBrowserSpeechRecognition();
    if (!recognition) {
      void startWhisperRecording();
      return;
    }

    browserRecognitionRef.current = recognition;
    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) {
        setInputText(text);
        void askQuestion(text);
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        setError("No se detectó voz. Inténtalo de nuevo.");
      } else if (event.error !== "aborted") {
        setError("No se pudo usar el micrófono del navegador.");
      }
      setRecording(false);
      browserRecognitionRef.current = null;
    };
    recognition.onend = () => {
      setRecording(false);
      browserRecognitionRef.current = null;
    };

    try {
      recognition.start();
      setRecording(true);
      setError(null);
    } catch {
      browserRecognitionRef.current = null;
      void startWhisperRecording();
    }
  };

  const stopBrowserVoiceRecording = () => {
    browserRecognitionRef.current?.stop();
    browserRecognitionRef.current = null;
  };

  const toggleVoiceRecording = () => {
    if (recording) {
      if (browserRecognitionRef.current) {
        stopBrowserVoiceRecording();
      } else {
        void stopWhisperRecording();
      }
      return;
    }
    if (isBrowserSpeechAvailable()) {
      startBrowserVoiceRecording();
      return;
    }
    void startWhisperRecording();
  };

  return {
    inputText,
    setInputText,
    sending,
    recording,
    error,
    askQuestion,
    toggleVoiceRecording,
    stopRecordingTracks,
  };
}
