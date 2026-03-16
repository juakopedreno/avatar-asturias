type PrtrFundingNoticeProps = {
  compact?: boolean;
};

export default function PrtrFundingNotice({ compact = false }: PrtrFundingNoticeProps) {
  return (
    <div
      className={`rounded-lg border border-border/60 bg-card/80 backdrop-blur px-3 py-2 ${
        compact ? "text-[10px]" : "text-xs"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">UE · NextGenerationEU</span>
        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">PRTR</span>
        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">PSTD Torremolinos</span>
      </div>
      <p className="text-muted-foreground leading-relaxed">
        Actuación financiada por la Unión Europea – NextGenerationEU en el marco del Plan de Recuperación,
        Transformación y Resiliencia.
      </p>
      <a
        href="https://planderecuperacion.gob.es/"
        target="_blank"
        rel="noreferrer"
        className="text-primary hover:underline"
      >
        Sobre esta aplicación y financiación PRTR
      </a>
    </div>
  );
}
