type PrtrFundingNoticeProps = {
  compact?: boolean;
};

export default function PrtrFundingNotice({ compact = false }: PrtrFundingNoticeProps) {
  return (
    <div
      className={`rounded-lg border border-primary/15 bg-card/90 backdrop-blur px-3 py-2 ${
        compact ? 'text-[10px]' : 'text-xs'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">Principado de Asturias</span>
        <span className="px-1.5 py-0.5 rounded bg-accent/20 text-foreground font-semibold">Asistente avatar institucional</span>
      </div>
      <p className="text-muted-foreground leading-relaxed">
        Plataforma de gestión de conocimiento y demo del asistente conversacional del Principado de Asturias.
      </p>
    </div>
  );
}
