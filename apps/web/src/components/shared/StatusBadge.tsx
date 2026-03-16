interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'dot';
}

const statusStyles: Record<string, string> = {
  published: 'bg-success/10 text-success border-success/20',
  synced: 'bg-success/10 text-success border-success/20',
  active: 'bg-success/10 text-success border-success/20',
  draft: 'bg-warning/10 text-warning border-warning/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  archived: 'bg-muted text-muted-foreground border-border',
  inactive: 'bg-muted text-muted-foreground border-border',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels: Record<string, string> = {
  published: 'Publicado',
  synced: 'Sincronizado',
  active: 'Activo',
  draft: 'Borrador',
  pending: 'Pendiente',
  archived: 'Archivado',
  inactive: 'Inactivo',
  error: 'Error',
};

export default function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const style = statusStyles[status] || statusStyles.archived;
  const label = statusLabels[status] || status;

  if (variant === 'dot') {
    const dotColor = status === 'published' || status === 'synced' || status === 'active' ? 'bg-success' :
      status === 'draft' || status === 'pending' ? 'bg-warning' :
      status === 'error' ? 'bg-destructive' : 'bg-muted-foreground';
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${style}`}>
      {label}
    </span>
  );
}
