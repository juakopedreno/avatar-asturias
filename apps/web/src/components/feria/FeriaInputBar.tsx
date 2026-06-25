import { FormEvent } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { useFeriaAsk } from "@/hooks/use-feria-ask";

type FeriaInputBarProps = {
  variant?: "light" | "dark";
  onAnswer?: (answer: string) => void;
  onInterrupt?: () => void;
  avatarSpeaking?: boolean;
  className?: string;
};

export default function FeriaInputBar({
  variant = "light",
  onAnswer,
  onInterrupt,
  avatarSpeaking = false,
  className = "",
}: FeriaInputBarProps) {
  const {
    inputText,
    setInputText,
    sending,
    recording,
    error,
    askQuestion,
    toggleVoiceRecording,
  } = useFeriaAsk({ onAnswer, onInterrupt });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void askQuestion(inputText);
  };

  const isDark = variant === "dark";

  return (
    <div className={className}>
      <form onSubmit={onSubmit}>
        <div
          className={`relative rounded-2xl overflow-hidden ${
            isDark
              ? "border border-white/20 shadow-lg"
              : "bg-white shadow-lg border border-[#0055A4]/15"
          }`}
          style={isDark ? { background: "rgba(8, 16, 27, 0.92)" } : undefined}
        >
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              recording
                ? "Habla ahora… pulsa el micrófono para enviar"
                : "Escribe tu pregunta o usa el micrófono…"
            }
            disabled={sending && !avatarSpeaking}
            onClick={(e) => e.stopPropagation()}
            className={`w-full py-4 pl-5 pr-28 text-base focus:outline-none disabled:opacity-60 ${
              isDark
                ? "text-white placeholder:text-white/40 bg-transparent"
                : "text-[#003d78] placeholder:text-[#003d78]/40"
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void toggleVoiceRecording();
              }}
              disabled={sending && !recording && !avatarSpeaking}
              className={`p-3 rounded-xl transition-colors ${
                recording
                  ? "bg-red-500 text-white animate-pulse"
                  : isDark
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-[#0055A4]/10 text-[#0055A4] hover:bg-[#0055A4]/20"
              }`}
              aria-label={recording ? "Detener grabación" : "Grabar voz"}
            >
              {recording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              type="submit"
              disabled={!inputText.trim()}
              onClick={(e) => e.stopPropagation()}
              className={`p-3 rounded-xl transition-colors disabled:opacity-50 ${
                isDark
                  ? "bg-[#0055A4] text-white hover:bg-[#004990]"
                  : "bg-[#0055A4] text-white hover:bg-[#004990]"
              }`}
              aria-label="Enviar"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </form>
      {recording ? (
        <p className={`text-center text-sm mt-2 ${isDark ? "text-red-300" : "text-red-600"}`}>
          Escuchando… pulsa el micrófono de nuevo para enviar (puedes interrumpir a CoVA)
        </p>
      ) : null}
      {sending ? (
        <p
          className={`text-center text-sm mt-2 animate-pulse ${
            isDark ? "text-white/70" : "text-[#0055A4]"
          }`}
        >
          CoVA está preparando la respuesta…
        </p>
      ) : null}
      {!sending && !recording && avatarSpeaking ? (
        <p className={`text-center text-xs mt-2 ${isDark ? "text-white/50" : "text-[#003d78]/60"}`}>
          CoVA está hablando — pulsa el micrófono o envía texto para interrumpir
        </p>
      ) : null}
      {error ? (
        <p className={`text-center text-sm mt-2 ${isDark ? "text-red-300" : "text-red-600"}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
