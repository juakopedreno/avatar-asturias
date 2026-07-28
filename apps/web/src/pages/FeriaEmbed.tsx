import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnamEvent, createClient } from "@anam-ai/js-sdk";
import { LoaderCircle, Maximize, Mic, MicOff, PhoneOff, Play, Send } from "lucide-react";
import { apiPost } from "@/lib/api";

const DEFAULT_WIDGET_AGENT_ID = "cf5e0976-4fb8-494f-a60b-17afe764b2d9";
const VIDEO_ID = "feria-embed-video";
const FERIA_BG = "#08101b";
const AVATAR_PREVIEW_URL = "/cova-portada.jpg";

type SessionStatus = "idle" | "connecting" | "active" | "ended";

type AvatarSessionResponse = {
  provider: "anam" | "mock";
  sessionId: string;
  streamUrl: string;
  sessionToken?: string;
};

type AnamClientHandle = {
  streamToVideoElement: (videoElementId: string) => Promise<void>;
  addListener?: (event: string, callback: (...args: unknown[]) => void) => void;
  sendUserMessage?: (content: string) => void | Promise<void>;
  muteInputAudio?: () => unknown;
  unmuteInputAudio?: () => unknown;
  interruptPersona?: () => void;
  disconnect?: () => void | Promise<void>;
  stopStreaming?: () => void | Promise<void>;
};

function isPersonaRole(role?: string): boolean {
  return role === "persona" || role === "assistant" || role === "agent";
}

export default function FeriaEmbed() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const clientRef = useRef<AnamClientHandle | null>(null);
  const openingSessionRef = useRef(false);
  const unmountedRef = useRef(false);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [micMuted, setMicMuted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [sendingText, setSendingText] = useState(false);

  const agentId = useMemo(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("agent")?.trim();
    const fromEnv =
      import.meta.env.VITE_FERIA_WIDGET_AGENT_ID?.trim() ||
      import.meta.env.VITE_ANAM_WIDGET_AGENT_ID?.trim();
    return fromQuery || fromEnv || DEFAULT_WIDGET_AGENT_ID;
  }, []);

  const disconnectAnam = async (clearVideo = true) => {
    const client = clientRef.current;
    clientRef.current = null;
    if (client) {
      await client.stopStreaming?.();
      await client.disconnect?.();
    }
    if (clearVideo && videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setAudioEnabled(false);
    setMicMuted(false);
  };

  const connectAnam = async (sessionToken: string) => {
    const client = createClient(sessionToken, {
      voiceDetection: { endOfSpeechSensitivity: 0.42 },
    }) as AnamClientHandle;
    clientRef.current = client;

    client.addListener?.(AnamEvent.VIDEO_PLAY_STARTED, () => {
      if (!unmountedRef.current) setStatus("active");
    });
    client.addListener?.(AnamEvent.CONNECTION_CLOSED, () => {
      if (clientRef.current === client) clientRef.current = null;
      if (!unmountedRef.current) {
        setStatus("ended");
        setAudioEnabled(false);
      }
    });
    client.addListener?.(AnamEvent.MIC_PERMISSION_GRANTED, () => {
      if (!unmountedRef.current) setMicMuted(false);
    });
    client.addListener?.(AnamEvent.MIC_PERMISSION_DENIED, () => {
      if (!unmountedRef.current) {
        setMicMuted(true);
        setError("No hay acceso al micrófono. Puedes continuar escribiendo.");
      }
    });
    client.addListener?.(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, (event) => {
      const payload = event as { role?: string; content?: string } | undefined;
      if (isPersonaRole(payload?.role) && payload?.content?.trim()) {
        setCaption(payload.content.trim());
      }
    });
    client.addListener?.(AnamEvent.MESSAGE_HISTORY_UPDATED, (messages) => {
      const list = messages as Array<{ role?: string; content?: string }> | undefined;
      const lastPersonaMessage = list?.findLast((message) => isPersonaRole(message.role));
      if (lastPersonaMessage?.content?.trim()) {
        setCaption(lastPersonaMessage.content.trim());
      }
    });

    await client.streamToVideoElement(VIDEO_ID);

    const video = videoRef.current;
    if (video) {
      video.muted = false;
      video.volume = 1;
      try {
        await video.play();
        setAudioEnabled(true);
      } catch {
        video.muted = true;
        await video.play().catch(() => undefined);
        setAudioEnabled(false);
      }
    }

    setStatus("active");
  };

  const startSession = async () => {
    if (openingSessionRef.current) return;
    openingSessionRef.current = true;
    setStatus("connecting");
    setError("");
    setCaption("");

    try {
      await disconnectAnam();
      const response = await apiPost<AvatarSessionResponse>("/avatar/session", {
        language: "ES",
        voice: "",
        mode: "feria-embed",
        personaId: agentId,
      });
      if (response.provider !== "anam" || !response.sessionToken) {
        throw new Error("El avatar de Anam no está disponible.");
      }
      await connectAnam(response.sessionToken);
    } catch (sessionError) {
      setStatus("idle");
      setError(
        sessionError instanceof Error ? sessionError.message : "No se pudo iniciar la conversación.",
      );
    } finally {
      openingSessionRef.current = false;
    }
  };

  const endSession = async () => {
    await disconnectAnam(false);
    setStatus("ended");
    setCaption("");
  };

  const toggleMicrophone = () => {
    const client = clientRef.current;
    if (!client) return;
    if (micMuted) {
      client.unmuteInputAudio?.();
      setMicMuted(false);
      setError("");
    } else {
      client.muteInputAudio?.();
      setMicMuted(true);
    }
  };

  const enableAudio = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    try {
      await video.play();
      setAudioEnabled(true);
    } catch {
      setError("El navegador ha bloqueado el sonido. Pulsa de nuevo para activarlo.");
    }
  };

  const sendTextMessage = async (event: FormEvent) => {
    event.preventDefault();
    const message = textInput.trim();
    if (!message || !clientRef.current?.sendUserMessage || sendingText) return;

    setSendingText(true);
    setError("");
    try {
      await clientRef.current.sendUserMessage(message);
      setTextInput("");
    } catch {
      setError("No se pudo enviar el mensaje.");
    } finally {
      setSendingText(false);
    }
  };

  const enterFullscreen = () => {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  useEffect(() => {
    document.documentElement.style.backgroundColor = FERIA_BG;
    document.body.style.backgroundColor = FERIA_BG;
    return () => {
      document.documentElement.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    void startSession();
    return () => {
      unmountedRef.current = true;
      void disconnectAnam();
    };
    // La sesión debe iniciarse una sola vez al montar la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("fs") === "1") {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const toggleWithSpace = (event: KeyboardEvent) => {
      if (
        event.code !== "Space" ||
        (status !== "idle" && status !== "ended" && status !== "active")
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "BUTTON"
      ) {
        return;
      }

      event.preventDefault();
      if (status === "active") {
        void endSession();
      } else {
        void startSession();
      }
    };

    window.addEventListener("keydown", toggleWithSpace);
    return () => window.removeEventListener("keydown", toggleWithSpace);
    // Se actualiza al cambiar el estado; las acciones usan siempre el render actual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#08101b] text-white">
      <img
        src={AVATAR_PREVIEW_URL}
        alt=""
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
          status === "active" ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden="true"
      />
      <video
        id={VIDEO_ID}
        ref={videoRef}
        autoPlay
        playsInline
        muted={!audioEnabled}
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
          status === "active" ? "opacity-100" : "opacity-0"
        }`}
        style={{ backgroundColor: "transparent" }}
      />

      {status === "connecting" ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/20">
          <div className="flex items-center gap-3 rounded-full bg-black/45 px-5 py-3 text-white/90 backdrop-blur">
            <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden="true" />
            <span>Conectando con CoVA…</span>
          </div>
        </div>
      ) : null}

      {status === "idle" || status === "ended" ? (
        <div className="absolute inset-x-0 bottom-8 z-30 flex flex-col items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => void startSession()}
            className="inline-flex min-h-14 items-center gap-3 rounded-full bg-cyan-500 px-7 py-3 text-lg font-semibold text-slate-950 shadow-xl transition hover:bg-cyan-400"
          >
            <Play className="h-6 w-6 fill-current" aria-hidden="true" />
            Hablar con CoVA
          </button>
          {error ? (
            <p className="rounded-lg bg-red-950/80 px-4 py-2 text-sm text-red-100">{error}</p>
          ) : null}
        </div>
      ) : null}

      {status === "active" ? (
        <div className="absolute right-4 top-4 z-30 flex gap-2 sm:right-6 sm:top-6">
          {!audioEnabled ? (
            <button
              type="button"
              onClick={() => void enableAudio()}
              className="rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg"
            >
              Activar sonido
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggleMicrophone}
            className="rounded-full bg-black/60 p-3 text-white shadow-lg backdrop-blur hover:bg-black/75"
            aria-label={micMuted ? "Activar micrófono" : "Silenciar micrófono"}
            title={micMuted ? "Activar micrófono" : "Silenciar micrófono"}
          >
            {micMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
          <button
            type="button"
            onClick={enterFullscreen}
            className="rounded-full bg-black/60 p-3 text-white shadow-lg backdrop-blur hover:bg-black/75"
            aria-label="Pantalla completa"
            title="Pantalla completa"
          >
            <Maximize className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => void endSession()}
            className="rounded-full bg-red-600/90 p-3 text-white shadow-lg hover:bg-red-500"
            aria-label="Finalizar conversación"
            title="Finalizar conversación"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        </div>
      ) : null}

      {status === "active" && caption ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4 sm:bottom-28">
          <div
            id="avatar-captions"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="max-w-4xl rounded-2xl bg-black/70 px-5 py-3 text-center leading-relaxed text-white shadow-lg backdrop-blur-sm"
            style={{ fontSize: "clamp(1rem, 2vw, 2rem)" }}
          >
            {caption}
          </div>
        </div>
      ) : null}

      {status === "active" ? (
        <form
          onSubmit={(event) => void sendTextMessage(event)}
          className="absolute inset-x-0 bottom-4 z-30 mx-auto flex w-[min(92vw,720px)] items-center gap-2 rounded-2xl bg-black/65 p-2 shadow-xl backdrop-blur-md sm:bottom-6"
        >
          <label htmlFor="feria-embed-text" className="sr-only">
            Escribe tu pregunta
          </label>
          <input
            id="feria-embed-text"
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
            placeholder="Escribe tu pregunta…"
            className="min-h-12 flex-1 bg-transparent px-4 text-base text-white outline-none placeholder:text-white/55 sm:text-lg"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || sendingText}
            className="rounded-xl bg-cyan-500 p-3 text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Enviar mensaje"
          >
            {sendingText ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      ) : null}

      {status === "active" && error ? (
        <p className="absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-lg bg-red-950/80 px-4 py-2 text-center text-sm text-red-100">
          {error}
        </p>
      ) : null}
    </main>
  );
}
