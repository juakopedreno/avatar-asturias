import { Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnamEvent, createClient } from "@anam-ai/js-sdk";
import { apiPost } from "@/lib/api";
import { createFeriaChannel, type FeriaChannelMessage } from "@/lib/feria-channel";
import { useChatBootstrapData } from "@/hooks/use-api-data";
import AsturiasMark from "@/components/brand/AsturiasMark";
import FeriaInputBar from "@/components/feria/FeriaInputBar";

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

/** Avisos automáticos de Anam (inactividad/desconexión) que no debe pronunciar el avatar. */
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

const VIDEO_ID = "feria-display-video";

/** Fondo alineado con el escenario oscuro del avatar Anam / mockup del stand. */
const FERIA_DISPLAY_BG = "#08101b";
const FERIA_DISPLAY_BG_SOFT = "#0a1628";

export default function FeriaDisplay() {
  const { data } = useChatBootstrapData();
  const openingGreeting =
    (data as { openingGreeting?: string } | undefined)?.openingGreeting ??
    "¡Hola! Soy CoVA, ¿en qué puedo ayudarte hoy?";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const clientRef = useRef<AnamClientHandle | null>(null);
  const openingSessionRef = useRef(false);
  const greetingDeliveredRef = useRef(false);
  const speakGenerationRef = useRef(0);
  const unmountedRef = useRef(false);
  const [avatarConnected, setAvatarConnected] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [avatarSpeaking, setAvatarSpeaking] = useState(false);
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showInput = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("clean") !== "1";
  }, []);

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
    setStreamReady(false);
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
    clientRef.current?.interruptPersona?.();
    setAvatarSpeaking(false);
  }, []);

  const speakWithAvatar = useCallback(
    async (content: string, options?: { preferAudio?: boolean }) => {
      if (!clientRef.current || !avatarConnected || !content.trim()) return false;

      interruptAvatar();
      const generation = ++speakGenerationRef.current;

      if (options?.preferAudio) {
        await ensureVideoPlaying(true);
      } else {
        await ensureVideoPlaying(false);
      }

      setSubtitle(content);
      setShowWelcome(false);
      setAvatarSpeaking(true);

      try {
        if (typeof clientRef.current.talk === "function") {
          await clientRef.current.talk(content);
        }
        return true;
      } catch {
        return false;
      } finally {
        if (generation === speakGenerationRef.current) {
          setAvatarSpeaking(false);
        }
      }
    },
    [avatarConnected, interruptAvatar],
  );

  const deliverOpeningGreeting = useCallback(async () => {
    if (greetingDeliveredRef.current || !avatarConnected || !openingGreeting.trim()) return;
    const ok = await speakWithAvatar(openingGreeting, { preferAudio: audioEnabled });
    if (ok) greetingDeliveredRef.current = true;
  }, [avatarConnected, audioEnabled, openingGreeting, speakWithAvatar]);

  const enableAudio = useCallback(async () => {
    const ok = await ensureVideoPlaying(true);
    if (ok && avatarConnected && openingGreeting.trim()) {
      greetingDeliveredRef.current = false;
      const delivered = await speakWithAvatar(openingGreeting, { preferAudio: true });
      if (delivered) greetingDeliveredRef.current = true;
    }
    return ok;
  }, [avatarConnected, openingGreeting, speakWithAvatar]);

  const silenceSystemNotice = useCallback((content: string) => {
    if (!isSystemNotice(content)) return;
    clientRef.current?.interruptPersona?.();
    setAvatarSpeaking(false);
    setSubtitle(null);
  }, []);

  const connectAnam = async (sessionToken: string) => {
    await waitForVideoElement();
    const client = createClient(sessionToken, { disableInputAudio: true }) as AnamClientHandle;
    clientRef.current = client;
    client.addListener?.(AnamEvent.VIDEO_PLAY_STARTED, () => setAvatarConnected(true));
    client.addListener?.(AnamEvent.CONNECTION_CLOSED, () => {
      setAvatarConnected(false);
      setStreamReady(false);
      if (!unmountedRef.current) {
        window.setTimeout(() => void openAvatarSession(), 1200);
      }
    });
    client.addListener?.(AnamEvent.TALK_STREAM_INTERRUPTED, () => setAvatarSpeaking(false));
    client.addListener?.(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, (event) => {
      const payload = event as { role?: string; content?: string } | undefined;
      if (payload?.role === "persona" || payload?.role === "assistant") {
        silenceSystemNotice(payload.content ?? "");
      }
    });
    client.addListener?.(AnamEvent.MESSAGE_HISTORY_UPDATED, (messages) => {
      const list = messages as Array<{ role?: string; content?: string }> | undefined;
      const last = list?.[list.length - 1];
      if (last && (last.role === "persona" || last.role === "assistant")) {
        silenceSystemNotice(last.content ?? "");
      }
    });
    await client.streamToVideoElement(VIDEO_ID);
    if (videoRef.current) {
      videoRef.current.muted = true;
      await ensureVideoPlaying(false);
      await waitForVideoFrame(videoRef.current);
      setStreamReady(true);
    }
    setAvatarConnected(true);
  };

  const openAvatarSession = async () => {
    if (openingSessionRef.current) return;
    openingSessionRef.current = true;
    try {
      greetingDeliveredRef.current = false;
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
    if (!avatarConnected || !streamReady) return;
    void deliverOpeningGreeting();
  }, [avatarConnected, streamReady, openingGreeting, deliverOpeningGreeting]);

  useEffect(() => {
    const channel = createFeriaChannel();
    if (!channel) return;

    const onMessage = (event: MessageEvent<FeriaChannelMessage>) => {
      const msg = event.data;
      if (msg.type === "interrupt") {
        interruptAvatar();
      } else if (msg.type === "speak") {
        void speakWithAvatar(msg.text);
      }
    };

    channel.addEventListener("message", onMessage);
    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, [speakWithAvatar, interruptAvatar]);

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

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col items-center justify-center relative"
      style={{
        backgroundColor: FERIA_DISPLAY_BG,
        backgroundImage: `radial-gradient(ellipse 90% 70% at 50% 38%, ${FERIA_DISPLAY_BG_SOFT} 0%, ${FERIA_DISPLAY_BG} 85%)`,
      }}
      onClick={() => void enableAudio()}
      role="presentation"
    >
      <div className="absolute top-8 left-8 flex items-center gap-3 z-20 opacity-90">
        <AsturiasMark className="h-10 w-10" />
        <div className="text-white">
          <p className="text-sm font-semibold tracking-wide">Principado de Asturias</p>
          <p className="text-xs text-white/75">CoVA · Asistente virtual con IA</p>
        </div>
      </div>

      {showWelcome && !subtitle ? (
        <div className="absolute top-[14%] left-1/2 -translate-x-1/2 z-20 max-w-md px-6">
          <div
            className="rounded-2xl px-5 py-4 text-center text-sm leading-relaxed text-white/95"
            style={{
              background: "rgba(8, 16, 27, 0.72)",
              border: "1px solid rgba(100, 160, 255, 0.35)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
            }}
          >
            {openingGreeting}
          </div>
        </div>
      ) : null}

      <div
        className="absolute inset-0 flex items-end justify-center"
        style={{ backgroundColor: FERIA_DISPLAY_BG }}
      >
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

      {subtitle ? (
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-20 w-[min(90vw,640px)] ${
            showInput ? "bottom-28" : "bottom-8"
          }`}
        >
          <p className="rounded-xl bg-black/55 text-white text-sm px-4 py-3 text-center leading-relaxed backdrop-blur-sm">
            {subtitle}
          </p>
        </div>
      ) : null}

      {showInput ? (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,560px)] px-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <FeriaInputBar
            variant="dark"
            avatarSpeaking={avatarSpeaking}
            onInterrupt={interruptAvatar}
            onAnswer={(answer) => void speakWithAvatar(answer)}
          />
        </div>
      ) : null}

      {error ? (
        <p className={`absolute text-xs text-red-200 z-30 ${showInput ? "bottom-[5.5rem]" : "bottom-4"}`}>
          {error}
        </p>
      ) : null}

      {avatarConnected && !audioEnabled ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void enableAudio();
          }}
          className={`absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15 animate-pulse ${
            showInput ? "bottom-36" : "bottom-8"
          }`}
          style={{
            background: "rgba(8, 16, 27, 0.85)",
            border: "1px solid rgba(100, 160, 255, 0.45)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          }}
        >
          <Volume2 className="h-5 w-5" />
          Toca para escuchar a CoVA
        </button>
      ) : null}
    </div>
  );
}
