import { useEffect, useRef } from "react";

type UseMicBargeInOptions = {
  enabled: boolean;
  /** Solo vigilar cuando el avatar está hablando. */
  active: boolean;
  onBargeIn: () => void;
  /** Umbral RMS (0–1). Más alto = menos falsos positivos con el altavoz. */
  threshold?: number;
};

export function useMicBargeIn({
  enabled,
  active,
  onBargeIn,
  threshold = 0.055,
}: UseMicBargeInOptions) {
  const activeRef = useRef(active);
  const onBargeInRef = useRef(onBargeIn);
  const cooldownUntilRef = useRef(0);

  activeRef.current = active;
  onBargeInRef.current = onBargeIn;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let animationFrame = 0;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
          },
        });
        if (cancelled) return;

        audioContext = new AudioContext();
        await audioContext.resume().catch(() => undefined);

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.35;
        audioContext.createMediaStreamSource(stream).connect(analyser);

        const samples = new Uint8Array(analyser.fftSize);
        let loudFrames = 0;

        const tick = () => {
          if (cancelled) return;

          analyser.getByteTimeDomainData(samples);
          let sumSquares = 0;
          for (let i = 0; i < samples.length; i += 1) {
            const normalized = (samples[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / samples.length);
          const now = Date.now();
          const armed = activeRef.current;
          const dynamicThreshold = armed ? threshold * 2.2 : threshold;

          if (armed && rms > dynamicThreshold && now > cooldownUntilRef.current) {
            loudFrames += 1;
            if (loudFrames >= 3) {
              loudFrames = 0;
              cooldownUntilRef.current = now + 500;
              onBargeInRef.current();
            }
          } else if (!armed || rms < dynamicThreshold * 0.75) {
            loudFrames = 0;
          }

          animationFrame = requestAnimationFrame(tick);
        };

        tick();
      } catch {
        // Permisos denegados o sin micrófono
      }
    };

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      stream?.getTracks().forEach((track) => track.stop());
      void audioContext?.close();
    };
  }, [enabled, threshold]);
}
