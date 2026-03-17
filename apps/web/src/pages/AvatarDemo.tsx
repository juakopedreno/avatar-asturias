import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Globe, Bot, ArrowLeft, Volume2, X, FileText } from 'lucide-react';
import { AnamEvent, createClient } from '@anam-ai/js-sdk';
import { Link } from 'react-router-dom';
import { useChatBootstrapData } from '@/hooks/use-api-data';
import { useIsMobile } from '@/hooks/use-mobile';
import PrtrFundingNotice from '@/components/shared/PrtrFundingNotice';
import { apiPost, apiPostForm } from '@/lib/api';

type AvatarState = 'idle' | 'listening' | 'processing' | 'responding';
type SupportedLanguage = 'ES' | 'EN' | 'FR' | 'DE';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
};

type SttResponse = {
  text: string;
  detectedLanguage: SupportedLanguage;
  confidence?: number;
};

type AvatarSessionResponse = {
  provider: 'anam' | 'mock';
  sessionId: string;
  streamUrl: string;
  sessionToken?: string;
};

type AnamClientHandle = {
  streamToVideoElement: (videoElementId: string) => Promise<void>;
  addListener?: (event: string, callback: (...args: unknown[]) => void) => void;
  talk?: (content: string) => Promise<void>;
  disconnect?: () => void | Promise<void>;
  stopStreaming?: () => void | Promise<void>;
};

export default function AvatarDemo() {
  const { data } = useChatBootstrapData();
  const initialMessages = useMemo(
    () => (data?.chatMessages ?? []) as ChatMessage[],
    [data?.chatMessages],
  );
  const suggestedQuestions = data?.suggestedQuestions ?? [];
  const [state, setState] = useState<AvatarState>('idle');
  const [inputText, setInputText] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('ES');
  const [showSources, setShowSources] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [avatarSession, setAvatarSession] = useState<AvatarSessionResponse | null>(null);
  const [avatarConnected, setAvatarConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const clientRef = useRef<AnamClientHandle | null>(null);
  const openingSessionRef = useRef(false);
  const sessionSeqRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const isMobile = useIsMobile();
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false);
  const sheetDragStartY = useRef(0);
  const sheetDragStartHeight = useRef(0);
  const sheetHeightRef = useRef(140);
  const [sheetHeight, setSheetHeight] = useState(140);
  const isDraggingSheet = useRef(false);
  const SHEET_MIN = 140;
  const SHEET_MAX_VH = 78;

  useEffect(() => {
    if (!isMobile) return;
    const maxPx = (window.innerHeight * SHEET_MAX_VH) / 100;
    sheetHeightRef.current = mobileSheetExpanded ? maxPx : SHEET_MIN;
    setSheetHeight(sheetHeightRef.current);
  }, [isMobile, mobileSheetExpanded]);

  useEffect(() => {
    if (!isMobile) return;
    const onResize = () => {
      const maxPx = (window.innerHeight * SHEET_MAX_VH) / 100;
      if (mobileSheetExpanded) {
        sheetHeightRef.current = maxPx;
        setSheetHeight(maxPx);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isMobile, mobileSheetExpanded]);

  const onSheetHandlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingSheet.current = true;
    sheetDragStartY.current = e.clientY;
    sheetDragStartHeight.current = sheetHeightRef.current;
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const maxPx = (window.innerHeight * SHEET_MAX_VH) / 100;
    const onMove = (e: PointerEvent) => {
      if (!isDraggingSheet.current) return;
      const dy = e.clientY - sheetDragStartY.current;
      const next = Math.max(SHEET_MIN, Math.min(maxPx, sheetDragStartHeight.current - dy));
      sheetHeightRef.current = next;
      setSheetHeight(next);
    };
    const onUp = () => {
      if (!isDraggingSheet.current) return;
      isDraggingSheet.current = false;
      const mid = SHEET_MIN + (maxPx - SHEET_MIN) / 2;
      const expanded = sheetHeightRef.current > mid;
      setMobileSheetExpanded(expanded);
      sheetHeightRef.current = expanded ? maxPx : SHEET_MIN;
      setSheetHeight(sheetHeightRef.current);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isMobile]);

  const cycleState = () => {
    const states: AvatarState[] = ['idle', 'listening', 'processing', 'responding'];
    const i = states.indexOf(state);
    setState(states[(i + 1) % states.length]);
  };

  const stopRecordingTracks = () => {
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
  };

  const startVoiceRecording = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined;
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordingStreamRef.current = stream;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setState('listening');
      setRequestError(null);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'No se pudo acceder al microfono');
    }
  };

  const stopVoiceRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    setRecording(false);
    setState('processing');
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    stopRecordingTracks();
    mediaRecorderRef.current = null;
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    audioChunksRef.current = [];
    if (blob.size === 0) {
      setState('idle');
      return;
    }
    try {
      const form = new FormData();
      form.append('file', blob, 'voice.webm');
      const stt = await apiPostForm<SttResponse>('/stt/transcribe', form);
      setInputText(stt.text);
      if (stt.detectedLanguage) {
        setLanguage(stt.detectedLanguage);
      }
      const question = (stt.text ?? '').trim();
      if (question) {
        setRequestError(null);
        setSending(true);
        setState('processing');
        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: question,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        try {
          const lang = stt.detectedLanguage ?? language;
          const rag = await apiPost<{ answer: string; sources?: Array<{ sourceLabel: string }> }>('/rag/ask', {
            question,
            language: lang,
          });
          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: rag.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sources: rag.sources?.map((s) => s.sourceLabel) ?? [],
          };
          setMessages((prev) => [...prev, assistantMessage]);
          await speakWithAvatar(rag.answer);
          setState('responding');
        } catch (err) {
          setRequestError(err instanceof Error ? err.message : 'No se pudo obtener respuesta');
          setState('idle');
        } finally {
          setSending(false);
          setTimeout(() => setState('idle'), 700);
        }
      } else {
        setState('idle');
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'No se pudo transcribir el audio');
      setState('idle');
    }
  };

  const toggleVoiceRecording = async () => {
    if (recording) {
      await stopVoiceRecording();
      return;
    }
    await startVoiceRecording();
  };

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const inputLanguage = useMemo<SupportedLanguage>(() => {
    if (language === 'ES' || language === 'EN' || language === 'FR' || language === 'DE') {
      return language;
    }
    return 'ES';
  }, [language]);

  const openAvatarSession = async () => {
    if (openingSessionRef.current) return;
    openingSessionRef.current = true;
    const sequence = ++sessionSeqRef.current;
    try {
      await disconnectAnam();
      const response = await apiPost<AvatarSessionResponse>('/avatar/session', {
        language: inputLanguage,
        voice: '',
      });
      if (sequence !== sessionSeqRef.current) return;
      setAvatarSession(response);
      if (response.provider === 'anam' && response.sessionToken) {
        try {
          await connectAnam(response.sessionToken);
        } catch {
          // Reintento suave: en algunos navegadores el primer attach queda en negro.
          await disconnectAnam();
          const retry = await apiPost<AvatarSessionResponse>('/avatar/session', {
            language: inputLanguage,
            voice: '',
          });
          if (sequence !== sessionSeqRef.current) return;
          setAvatarSession(retry);
          if (retry.provider === 'anam' && retry.sessionToken) {
            await connectAnam(retry.sessionToken);
          }
        }
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : JSON.stringify(error);
      setRequestError(`No se pudo iniciar sesion de avatar: ${detail}`);
    } finally {
      openingSessionRef.current = false;
    }
  };

  const disconnectAnam = async () => {
    if (clientRef.current) {
      if (typeof clientRef.current.stopStreaming === 'function') {
        await clientRef.current.stopStreaming();
      }
      if (typeof clientRef.current.disconnect === 'function') {
        await clientRef.current.disconnect();
      }
      clientRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setAvatarConnected(false);
  };

  const connectAnam = async (sessionToken: string) => {
    await waitForVideoElement();
    const client = createClient(sessionToken, {
      disableInputAudio: true,
    }) as AnamClientHandle;
    clientRef.current = client;
    client.addListener?.(AnamEvent.VIDEO_PLAY_STARTED, () => {
      setAvatarConnected(true);
    });
    client.addListener?.(AnamEvent.SERVER_WARNING, (warning) => {
      if (typeof warning === 'string') {
        setRequestError(`Aviso de Anam: ${warning}`);
      }
    });
    client.addListener?.(AnamEvent.CONNECTION_CLOSED, (reason, details) => {
      const reasonText = typeof reason === 'string' ? reason : 'unknown';
      const detailsText = typeof details === 'string' ? details : '';
      setAvatarConnected(false);
      setRequestError(`Conexion cerrada (${reasonText}) ${detailsText}`.trim());
    });
    client.addListener?.(AnamEvent.MIC_PERMISSION_DENIED, (error) => {
      const detail = typeof error === 'string' ? error : 'Permiso de microfono denegado';
      setRequestError(detail);
    });
    await withTimeout(client.streamToVideoElement('avatar-demo-video'), 20_000);
    if (videoRef.current) {
      try {
        await videoRef.current.play();
      } catch {
        // Algunos navegadores bloquean autoplay hasta interacción del usuario.
      }
      const frameReady = await waitForVideoFrame(videoRef.current);
      if (!frameReady) {
        throw new Error('El stream se inicio pero no hay frame visible');
      }
    }
    setAvatarConnected(true);
  };

  const enableAvatarAudio = async () => {
    if (!videoRef.current) return;
    videoRef.current.muted = false;
    videoRef.current.volume = 1;
    try {
      await videoRef.current.play();
      setAudioEnabled(true);
    } catch {
      setRequestError('El navegador bloqueo el audio. Haz click de nuevo en "Activar audio".');
    }
  };

  const speakWithAvatar = async (content: string) => {
    if (!clientRef.current || !avatarConnected) return;
    if (!videoRef.current) return;
    videoRef.current.muted = false;
    videoRef.current.volume = 1;
    try {
      await videoRef.current.play();
    } catch {
      // Si el navegador bloquea autoplay, el usuario puede usar "Activar audio".
    }
    setAudioEnabled(!videoRef.current.muted);
    if (typeof clientRef.current.talk === 'function') {
      await clientRef.current.talk(content);
    }
  };

  const waitForVideoElement = async () => {
    const maxAttempts = 20;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const el = document.getElementById('avatar-demo-video');
      if (el) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error('No se encontro el elemento de video del avatar en la pagina');
  };

  const waitForVideoFrame = async (video: HTMLVideoElement) => {
    const maxAttempts = 24;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const hasFrame = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
      if (hasFrame) return true;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  };

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout iniciando stream de avatar'));
        }, timeoutMs);
      }),
    ]);
  };

  useEffect(() => {
    void openAvatarSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputLanguage]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopRecordingTracks();
      void disconnectAnam();
    };
  }, []);

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!inputText.trim() || sending) return;

    const question = inputText.trim();
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setRequestError(null);
    setSending(true);
    setState('processing');

    try {
      const rag = await apiPost<{
        answer: string;
        sources?: Array<{ sourceLabel: string }>;
      }>('/rag/ask', {
        question,
        language: inputLanguage,
      });

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: rag.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: rag.sources?.map((source) => source.sourceLabel) ?? [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      await speakWithAvatar(rag.answer);
      setState('responding');
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'No se pudo enviar el mensaje');
      setState('idle');
    } finally {
      setSending(false);
      setTimeout(() => setState('idle'), 700);
    }
  };

  const stateLabels: Record<AvatarState, string> = {
    idle: 'AVATAR DISPONIBLE',
    listening: 'ESCUCHANDO...',
    processing: 'PROCESANDO...',
    responding: 'RESPONDIENDO...',
  };

  const stateColors: Record<AvatarState, string> = {
    idle: 'bg-primary',
    listening: 'bg-destructive',
    processing: 'bg-warning',
    responding: 'bg-success',
  };

  // Si quieres fondo con imagen, pega URL aquí.
  const sceneBackgroundImage = '';
  const sceneBackground = sceneBackgroundImage
    ? `linear-gradient(180deg, rgba(18, 24, 35, 0.2) 0%, rgba(18, 24, 35, 0.3) 100%), url(${sceneBackgroundImage}) center / cover no-repeat`
    : 'linear-gradient(180deg, hsl(210 42% 96%) 0%, hsl(208 46% 92%) 45%, hsl(206 44% 88%) 100%)';

  const chatHeader = (
    <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
      <div>
        <h2 className="font-semibold text-sm">Asistente Turístico</h2>
        <p className="text-[11px] text-muted-foreground">Torremolinos · Siempre disponible</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 glass-dark rounded-lg px-2 py-1.5">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-transparent text-xs text-primary-foreground/80 outline-none cursor-pointer"
          >
            <option value="ES">ES</option>
            <option value="EN">EN</option>
            <option value="DE">DE</option>
            <option value="FR">FR</option>
          </select>
        </div>
        <div className={`w-2 h-2 rounded-full ${stateColors[state]}`} title={stateLabels[state]} />
        <Link to="/admin" className="text-[11px] text-primary font-medium hover:underline">Admin</Link>
      </div>
    </div>
  );

  const chatMessagesArea = (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
      {messages.map((msg) => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-[85%] ${msg.role === 'user'
            ? 'bg-muted rounded-2xl rounded-tr-sm p-4'
            : 'bg-primary/5 border border-primary/10 rounded-2xl rounded-tl-sm p-4'
          }`}>
            <p className="text-sm leading-relaxed">{msg.content}</p>
            {msg.role === 'assistant' && msg.sources && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3 h-3 text-primary" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">Fuentes</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {msg.sources.map((s) => (
                    <button
                      key={s}
                      onClick={() => setShowSources(!showSources)}
                      className="text-[10px] px-2 py-0.5 rounded bg-card border border-border hover:border-primary/30 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <span className="text-[10px] text-muted-foreground mt-2 block">{msg.timestamp}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const chatInput = (
    <div className="p-4 bg-muted/30 border-t border-border flex-shrink-0">
      <form className="relative" onSubmit={(event) => void sendMessage(event)}>
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Haz una pregunta por voz o texto..."
          className="w-full bg-card border border-border rounded-xl py-3.5 pl-4 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void toggleVoiceRecording()}
            className={`p-2 rounded-lg transition-colors ${recording ? 'bg-destructive text-destructive-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}
          >
            {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
      {requestError ? <p className="text-xs text-destructive mt-2">{requestError}</p> : null}
    </div>
  );

  return (
    <div
      className="flex flex-col md:flex-row h-screen overflow-hidden relative"
      style={{
        background: sceneBackground,
      }}
    >
      {/* Avatar: en móvil ocupa toda la pantalla sin overlays; en desktop layout actual */}
      <div className={`flex flex-col items-center justify-end overflow-hidden pb-4 md:pb-10
        ${isMobile ? 'absolute inset-0 z-0' : 'relative flex-shrink-0 md:flex-1 min-h-[280px] md:min-h-0'}`}
      >
        {/* Sun glow */}
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(198, 226, 255, 0.24) 0%, rgba(177, 214, 247, 0.12) 42%, rgba(255,255,255,0) 74%)',
          }}
        />
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(71, 109, 146, 0.16) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Back button */}
        <Link to="/" className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 glass rounded-lg text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>

        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="relative z-10 flex h-full min-h-[200px] w-full flex-col items-center justify-end pb-2 md:pb-6"
        >
          <div className="absolute inset-0 min-h-[200px]">
            {avatarSession?.provider === 'anam' ? (
              <div className="absolute inset-0 overflow-hidden">
                <video
                  id="avatar-demo-video"
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted={!audioEnabled}
                  className="w-full h-full object-cover"
                  style={{
                    transform: 'scale(1.02)',
                    objectPosition: 'center top',
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/8 via-transparent to-white/4" />
              </div>
            ) : (
              <div
                onClick={cycleState}
                className="relative w-full h-full rounded-full flex items-center justify-center cursor-pointer group"
                style={{ background: 'radial-gradient(circle, hsl(174 100% 32% / 0.15) 0%, transparent 70%)' }}
              >
                <div className="absolute inset-4 rounded-full border-2 border-primary/20 animate-pulse-soft" />
                <div className="absolute inset-8 rounded-full border border-primary/10" />
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center group-hover:border-primary/50 transition-colors animate-float">
                  <Bot className="w-16 h-16 md:w-20 md:h-20 text-primary" />
                </div>
              </div>
            )}
            <div className="absolute bottom-1 text-[11px] text-primary-foreground/70 z-10 hidden md:block">
              Proveedor: {avatarSession?.provider ?? 'cargando...'} {avatarConnected ? '· conectado' : ''}
            </div>
          </div>
          {avatarSession?.provider === 'anam' && !avatarConnected ? (
            <p className="mt-12 text-[11px] text-primary-foreground/60 max-w-md text-center">
              Inicializando stream de avatar en tiempo real...
            </p>
          ) : null}
          {avatarSession?.provider === 'anam' && avatarConnected && !audioEnabled ? (
            <button
              onClick={() => void enableAvatarAudio()}
              className="mt-3 text-[11px] px-3 py-1.5 rounded-lg bg-primary/20 text-primary-foreground/90 border border-primary/30 hover:bg-primary/25 transition-colors hidden md:inline-flex"
            >
              Activar audio
            </button>
          ) : null}

          {/* Status, sugerencias e idioma: solo en desktop para no tapar el avatar en móvil */}
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 md:mt-8 flex items-center gap-3 px-5 py-2.5 glass-dark rounded-full hidden md:flex"
          >
            <div className={`w-2.5 h-2.5 rounded-full ${stateColors[state]} ${state !== 'idle' ? 'animate-pulse-soft' : ''}`} />
            <span className="text-xs font-medium text-primary-foreground/80 tracking-widest uppercase">{stateLabels[state]}</span>
          </motion.div>

          <div className="mt-4 md:mt-8 flex flex-wrap gap-2 justify-center max-w-lg px-4 hidden md:flex">
            {suggestedQuestions.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => setInputText(q)}
                className="px-3 py-1.5 glass-dark rounded-lg text-xs text-primary-foreground/60 hover:text-primary-foreground/90 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="absolute bottom-2 left-4 md:bottom-6 md:left-6 z-20 hidden md:block">
          <div className="flex items-center gap-2 glass-dark rounded-lg px-3 py-2">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-xs text-primary-foreground outline-none cursor-pointer [&_option]:bg-card [&_option]:text-foreground"
              title="Idioma de la respuesta (ES, EN, DE, FR)"
            >
              <option value="ES">Español</option>
              <option value="EN">English</option>
              <option value="DE">Deutsch</option>
              <option value="FR">Français</option>
            </select>
          </div>
          <div className="mt-2 max-w-[360px]">
            <PrtrFundingNotice compact />
          </div>
        </div>
      </div>

      {/* Móvil: panel inferior arrastrable (solo input por defecto; arrastrar arriba para ver chat) */}
      {isMobile && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-20 bg-card rounded-t-2xl flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.15)]"
          style={{ height: `${sheetHeight}px` }}
          initial={false}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        >
          <div
            className="flex-shrink-0 pt-3 pb-2 flex flex-col items-center cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={onSheetHandlePointerDown}
            onClick={() => setMobileSheetExpanded((e) => !e)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setMobileSheetExpanded((x) => !x)}
            aria-label={mobileSheetExpanded ? 'Cerrar chat' : 'Abrir chat'}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            <span className="text-[11px] text-muted-foreground mt-1.5">
              {mobileSheetExpanded ? 'Desliza abajo para ver el avatar' : 'Desliza arriba para ver el chat'}
            </span>
          </div>
          {mobileSheetExpanded && chatHeader}
          {mobileSheetExpanded && chatMessagesArea}
          <div className="flex-shrink-0 pb-[env(safe-area-inset-bottom,0px)]">{chatInput}</div>
        </motion.div>
      )}

      {/* Chat Panel: solo en desktop (en móvil se usa el sheet de arriba) */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="hidden md:flex w-full md:w-[420px] flex-1 flex-col min-h-0 bg-card"
        style={{ boxShadow: '-10px 0 40px rgba(0,0,0,0.2)' }}
      >
        <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-semibold text-sm">Asistente Turístico</h2>
            <p className="text-[11px] text-muted-foreground">Torremolinos · Siempre disponible</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
            </button>
            <Link to="/admin" className="text-[11px] text-primary font-medium hover:underline">Admin</Link>
          </div>
        </div>
        {chatMessagesArea}
        <div className="p-5 bg-muted/30 border-t border-border flex-shrink-0">
          <form className="relative" onSubmit={(event) => void sendMessage(event)}>
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Haz una pregunta por voz o texto..."
              className="w-full bg-card border border-border rounded-xl py-3.5 pl-4 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void toggleVoiceRecording()}
                className={`p-2 rounded-lg transition-colors ${recording ? 'bg-destructive text-destructive-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}
              >
                {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
          {requestError ? <p className="text-xs text-destructive mt-2">{requestError}</p> : null}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {suggestedQuestions.slice(3).map((q) => (
              <button
                key={q}
                onClick={() => setInputText(q)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Source Details Panel */}
      <AnimatePresence>
        {showSources && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border z-50 p-6 overflow-y-auto"
            style={{ boxShadow: '-8px 0 30px rgba(0,0,0,0.1)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-sm">Detalle de Fuentes</h3>
              <button onClick={() => setShowSources(false)} className="p-1 hover:bg-muted rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Guía de playas oficial</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">PDF · 18 documentos · Confianza: 97%</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Última sincronización: 13/03/2026 10:00</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Portal de Turismo</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Web · 128 documentos · Confianza: 95%</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Última sincronización: 15/03/2026 06:00</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
