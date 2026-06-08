type AsturiasMarkProps = {
  className?: string;
  variant?: 'full' | 'icon';
};

/** Marca simplificada inspirada en la Cruz de la Victoria (uso decorativo en UI). */
export default function AsturiasMark({ className = 'w-8 h-8', variant = 'icon' }: AsturiasMarkProps) {
  if (variant === 'full') {
    return (
      <svg className={className} viewBox="0 0 200 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect x="0" y="4" width="40" height="40" rx="8" fill="#0055A4" />
        <path
          d="M20 10v28M11 19h18M14 14l12 20M26 14L14 34"
          stroke="#F5C518"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <text x="48" y="20" fill="currentColor" fontSize="13" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
          Principado de Asturias
        </text>
        <text x="48" y="36" fill="currentColor" opacity="0.65" fontSize="10" fontFamily="Inter, system-ui, sans-serif">
          Panel del asistente avatar
        </text>
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="40" height="40" rx="9" fill="#0055A4" />
      <path
        d="M20 9v22M12 17h16M14.5 13.5l11 17M25.5 13.5l-11 17"
        stroke="#F5C518"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
