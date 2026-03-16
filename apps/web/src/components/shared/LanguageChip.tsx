interface LanguageChipProps {
  code: string;
  size?: 'sm' | 'md';
}

export default function LanguageChip({ code, size = 'sm' }: LanguageChipProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded font-mono-data font-medium bg-primary/8 text-primary border border-primary/15 ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
      }`}
    >
      {code}
    </span>
  );
}
