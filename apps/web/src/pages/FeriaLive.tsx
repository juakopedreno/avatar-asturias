import { Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnamEvent, MessageRole, createClient } from "@anam-ai/js-sdk";
import { apiPost } from "@/lib/api";
import { useChatBootstrapData } from "@/hooks/use-api-data";
import { useContinuousSpeech } from "@/hooks/use-continuous-speech";
import { isBrowserSpeechAvailable } from "@/lib/browser-speech";
import AsturiasMark from "@/components/brand/AsturiasMark";

type AvatarSessionResponse = {
  provider: "anam" | "mock";
  sessionId: string;
  streamUrl: string;
  sessionToken?: string;
};

type AnamClientHandle = {
  streamToVideoElement: (videoElementId: string) => Promise<void>;
  addListener?: (event: string, callback: (...args: unknown[]) => void) => void;
  talk?: (content: string) => Promise<void>;
  interruptPersona?: () => void;
  disconnect?: () => void | Promise<void>;
  stopStreaming?: () => void | Promise<void>;
};

type LiveStatus = "idle" | "listening" | "thinking" | "speaking";

const SYSTEM_NOTICE_PATTERNS = [
  /disconnect/i,
  /you will be disconnected/i,
  /are you still there/i,
  /inactiv/i,
  /session.*(end|expire|timeout)/i,
  /seconds if/i,
];

const isSystemNotice = (content: string): boolean => {
  const text = content?.trim();
  if (!text) return false;
  return SYSTEM_NOTICE_PATTERNS.some((pattern) => pattern.test(text));
};

const VIDEO_ID = "feria-live-video";
const FERIA_DISPLAY_BG = "#08101b";
const FERIA_DISPLAY_BG_SOFT = "#0a1628";

export default function FeriaLive() {
  const { data } = useChatBootstrapData();
  const openingGreeting =
    (data as { openingGreeting?: string } | undefined)?.openingGreeting ??
    "¡Hola! Soy CoVA. Habla cuando quieras, te escucho.";

  const useAnamMic = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("anamMic") === "1";
  }, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const clientRef = useRef<AnamClientHandle | null>(null);
  const openingSessionRef = useRef(false);
  const speakGenerationRef = useRef(0);
  const askGenerationRef = useRef(0);
  const unmountedRef = useRef(false);
  const processedUserMessageIdsRef = useRef<Set<string>>(new Set());

  const [avatarConnected, setAvatarConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [userLine, setUserLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const waitForVideoElement = async () => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (document.getElementById(VIDEO_ID)) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("No se encontró el elemento de vídeo");
  };

  const waitForVideoFrame = async (video: HTMLVideoElement) => {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) return true;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  };

  const disconnectAnam = async () => {
    if (clientRef.current) {
      await clientRef.current.stopStreaming?.();
      await clientRef.current.disconnect?.();
      clientRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setAvatarConnected(false);
  };

  const ensureVideoPlaying = async (unmute = false) => {
    const video = videoRef.current;
    if (!video) return false;
    if (unmute) {
      video.muted = false;
      video.volume = 1;
    }
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        await video.play();
        if (unmute) setAudioEnabled(true);
        return true;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    return false;
  };

  const interruptAvatar = useCallback(() => {
    askGenerationRef.current += 1;
    clientRef.current?.interruptPersona?.();
    setStatus((current) => (current === "speaking" ? "listening" : current));
  }, []);

  const speakWithAvatar = useCallback(
    async (content: string) => {
      if (!clientRef.current || !avatarConnected || !content.trim()) return false;

      const generation = ++speakGenerationRef.current;
      void ensureVideoPlaying(true);
      setSubtitle(content);
      setStatus("speaking");
      clientRef.current.interruptPersona?.();

      try {
        if (typeof clientRef.current.talk === "function") {
          void clientRef.current.talk(content).finally(() => {
            if (generation === speakGenerationRef.current && conversationActive) {
              setStatus("listening");
            }
          });
        }
        return true;
      } catch {
        if (generation === speakGenerationRef.current && conversationActive) {
          setStatus("listening");
        }
        return false;
      }
    },
    [avatarConnected, conversationActive],
  );

  const handleUserUtterance = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || !conversationActive) return;

      interruptAvatar();
      const generation = ++askGenerationRef.current;
      setUserLine(trimmed);
      setStatus("thinking");
      setError(null);

      try {
        const rag = await apiPost<{ answer: string }>("/rag/ask", {
          question: trimmed,
          language: "ES",
          brief: true,
        });
        if (generation !== askGenerationRef.current) return;
        await speakWithAvatar(rag.answer);
      } catch (err) {
        if (generation !== askGenerationRef.current) return;
        setError(err instanceof Error ? err.message : "No se pudo obtener respuesta");
        setStatus("listening");
      }
    },
    [conversationActive, interruptAvatar, speakWithAvatar],
  );

  const silenceSystemNotice = useCallback((content: string) => {
    if (!isSystemNotice(content)) return;
    clientRef.current?.interruptPersona?.();
    if (conversationActive) setStatus("listening");
  }, [conversationActive]);

  const connectAnam = async (sessionToken: string) => {
    await waitForVideoElement();
    const client = createClient(
      sessionToken,
      useAnamMic
        ? { voiceDetection: { endOfSpeechSensitivity: 0.55 } }
        : { disableInputAudio: true },
    ) as AnamClientHandle;
    clientRef.current = client;

    client.addListener?.(AnamEvent.VIDEO_PLAY_STARTED, () => setAvatarConnected(true));
    client.addListener?.(AnamEvent.CONNECTION_CLOSED, () => {
      setAvatarConnected(false);
      if (!unmountedRef.current) {
        window.setTimeout(() => void openAvatarSession(), 1200);
      }
    });
    client.addListener?.(AnamEvent.TALK_STREAM_INTERRUPTED, () => {
      if (conversationActive) setStatus("listening");
    });
    client.addListener?.(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, (event) => {
      const payload = event as {
        id?: string;
        role?: string;
        content?: string;
        endOfSpeech?: boolean;
      };

      if (payload?.role === MessageRole.PERSONA || payload?.role === "assistant") {
        silenceSystemNotice(payload.content ?? "");
        return;
      }

      if (!useAnamMic || payload?.role !== MessageRole.USER) return;

      if (payload.content?.trim() && !payload.endOfSpeech) {
        interruptAvatar();
        setUserLine(payload.content.trim());
        return;
      }

      if (!payload.endOfSpeech || !payload.content?.trim() || !payload.id) return;
      if (processedUserMessageIdsRef.current.has(payload.id)) return;
      processedUserMessageIdsRef.current.add(payload.id);
      void handleUserUtterance(payload.content.trim());
    });

    await client.streamToVideoElement(VIDEO_ID);
    if (videoRef.current) {
      videoRef.current.muted = true;
      await ensureVideoPlaying(false);
      await waitForVideoFrame(videoRef.current);
    }
    setAvatarConnected(true);
  };

  const openAvatarSession = async () => {
    if (openingSessionRef.current) return;
    openingSessionRef.current = true;
    try {
      await disconnectAnam();
      const response = await apiPost<AvatarSessionResponse>("/avatar/session", {
        language: "ES",
        voice: "",
      });
      if (response.provider === "anam" && response.sessionToken) {
        await connectAnam(response.sessionToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar avatar");
    } finally {
      openingSessionRef.current = false;
    }
  };

  const { listening, interimText } = useContinuousSpeech({
    enabled: conversationActive && !useAnamMic,
    onUtterance: (text) => void handleUserUtterance(text),
    onSpeechStart: () => {
      interruptAvatar();
      setStatus("listening");
    },
  });

  const startConversation = async () => {
    const ok = await ensureVideoPlaying(true);
    if (!ok) {
      setError("No se pudo activar el audio. Comprueba permisos del navegador.");
      return;
    }
    processedUserMessageIdsRef.current.clear();
    setConversationActive(true);
    setSubtitle(openingGreeting);
    setStatus("listening");
    setError(null);
    void speakWithAvatar(openingGreeting);
  };

  useEffect(() => {
    unmountedRef.current = false;
    void openAvatarSession();
    return () => {
      unmountedRef.current = true;
      void disconnectAnam();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (openingGreeting.trim() && !subtitle) {
      setSubtitle(openingGreeting);
    }
  }, [openingGreeting, subtitle]);

  useEffect(() => {
    document.documentElement.style.backgroundColor = FERIA_DISPLAY_BG;
    document.body.style.backgroundColor = FERIA_DISPLAY_BG;
    return () => {
      document.documentElement.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("fs") === "1") {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  }, []);

  const statusLabel = useMemo(() => {
    if (!conversationActive) return "Pulsa para iniciar la conversación";
    if (status === "thinking") return "CoVA está pensando…";
    if (status === "speaking") return "CoVA está hablando — interrumpe hablando";
    if (useAnamMic) return "Micrófono activo (Anam)";
    if (listening) return "Escuchando… habla con naturalidad";
    return "Reconectando micrófono…";
  }, [conversationActive, listening, status, useAnamMic]);

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col items-center justify-center relative"
      style={{
        backgroundColor: FERIA_DISPLAY_BG,
        backgroundImage: `radial-gradient(ellipse 90% 70% at 50% 38%, ${FERIA_DISPLAY_BG_SOFT} 0%, ${FERIA_DISPLAY_BG} 85%)`,
      }}
    >
      <div className="absolute top-8 left-8 flex items-center gap-3 z-20 opacity-90">
        <AsturiasMark className="h-10 w-10" />
        <div className="text-white">
          <p className="text-sm font-semibold tracking-wide">Principado de Asturias</p>
          <p className="text-xs text-white/75">CoVA · Modo conversación</p>
        </div>
      </div>

      <div className="absolute inset-0 flex items-end justify-center" style={{ backgroundColor: FERIA_DISPLAY_BG }}>
        <video
          id={VIDEO_ID}
          ref={videoRef}
          autoPlay
          playsInline
          muted={!audioEnabled}
          className="h-full w-full object-cover"
          style={{
            transform: "scale(1.08)",
            objectPosition: "50% 14%",
            backgroundColor: FERIA_DISPLAY_BG,
          }}
        />
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 z-20 w-[min(90vw,640px)] bottom-28 space-y-2">
        {userLine ? (
          <p className="rounded-xl bg-white/10 text-white/90 text-xs px-4 py-2 text-center backdrop-blur-sm">
            Tú: {interimText || userLine}
          </p>
        ) : interimText ? (
          <p className="rounded-xl bg-white/10 text-white/90 text-xs px-4 py-2 text-center backdrop-blur-sm">
            Tú: {interimText}
          </p>
        ) : null}
        {subtitle ? (
          <p className="rounded-xl bg-black/55 text-white text-sm px-4 py-3 text-center leading-relaxed backdrop-blur-sm">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3">
        {!conversationActive ? (
          <button
            type="button"
            onClick={() => void startConversation()}
            disabled={!avatarConnected || (!useAnamMic && !isBrowserSpeechAvailable())}
            className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
            style={{
              background: "rgba(8, 16, 27, 0.9)",
              border: "1px solid rgba(100, 160, 255, 0.45)",
            }}
          >
            <Mic className="h-5 w-5" />
            Iniciar conversación
          </button>
        ) : (
          <div
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-white ${
              status === "listening" ? "animate-pulse" : ""
            }`}
            style={{
              background: "rgba(8, 16, 27, 0.88)",
              border: "1px solid rgba(100, 160, 255, 0.35)",
            }}
          >
            {status === "listening" ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 opacity-60" />}
            {statusLabel}
          </div>
        )}
        {!useAnamMic && !isBrowserSpeechAvailable() ? (
          <p className="text-xs text-red-200 max-w-sm text-center">
            Este navegador no soporta reconocimiento de voz continuo. Usa Chrome o Edge.
          </p>
        ) : null}
        {error ? <p className="text-xs text-red-200 max-w-sm text-center">{error}</p> : null}
      </div>
    </div>
  );
}
