import { useEffect, useState } from "react";
import { useChatBootstrapData } from "@/hooks/use-api-data";
import AsturiasMark from "@/components/brand/AsturiasMark";
import FeriaInputBar from "@/components/feria/FeriaInputBar";
import { useFeriaAsk } from "@/hooks/use-feria-ask";

export default function FeriaKiosk() {
  const { data } = useChatBootstrapData();
  const suggestedQuestions =
    (data as { suggestedQuestions?: string[] } | undefined)?.suggestedQuestions ?? [];
  const assistantName =
    (data as { assistantName?: string } | undefined)?.assistantName ?? "CoVA";

  const { askQuestion, sending, error, stopRecordingTracks } = useFeriaAsk();
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);

  const handleSuggestedQuestion = async (question: string) => {
    setLastQuestion(question);
    await askQuestion(question);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("fs") === "1") {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
    return () => stopRecordingTracks();
  }, [stopRecordingTracks]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(180deg, #f5f8fc 0%, #e8f0fa 100%)" }}
    >
      <header className="px-8 pt-10 pb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <AsturiasMark className="h-12 w-12" />
          <div className="text-left">
            <p className="text-xs uppercase tracking-widest text-[#0055A4]/70 font-medium">
              Principado de Asturias
            </p>
            <h1 className="text-2xl font-bold text-[#003d78]">{assistantName}</h1>
          </div>
        </div>
        <p className="text-[#003d78]/80 text-sm max-w-lg mx-auto">
          Pregunta por ayudas, servicios o recursos. Te responderé con información oficial verificada.
        </p>
      </header>

      <main className="flex-1 flex flex-col px-6 pb-10 max-w-2xl mx-auto w-full">
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {suggestedQuestions.map((question) => (
            <button
              key={question}
              type="button"
              disabled={sending}
              onClick={() => void handleSuggestedQuestion(question)}
              className="px-4 py-2 rounded-full bg-white border border-[#0055A4]/20 text-sm text-[#003d78] hover:border-[#0055A4]/50 hover:bg-[#0055A4]/5 transition-colors disabled:opacity-50"
            >
              {question}
            </button>
          ))}
        </div>

        <FeriaInputBar variant="light" className="mt-auto" />

        {lastQuestion && !sending && !error ? (
          <p className="text-center text-xs text-[#003d78]/60 mt-3">Última pregunta: «{lastQuestion}»</p>
        ) : null}
      </main>
    </div>
  );
}
