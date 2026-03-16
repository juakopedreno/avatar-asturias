import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Filter, Clock, User, BookOpen, Settings, ShieldCheck, Database, Pencil, Trash2, Eye } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { useAuditData } from '@/hooks/use-api-data';
import { apiGet } from '@/lib/api';

type AuditEntry = {
  id: string;
  timestamp: string;
  user: string;
  module: string;
  action: string;
  detail: string;
  type: 'create' | 'update' | 'delete' | 'config' | 'access';
};

const typeIcons: Record<string, typeof Clock> = {
  create: BookOpen, update: Pencil, delete: Trash2, config: Settings, access: Eye,
};

const typeColors: Record<string, string> = {
  create: 'bg-success/10 text-success border-success/20',
  update: 'bg-info/10 text-info border-info/20',
  delete: 'bg-destructive/10 text-destructive border-destructive/20',
  config: 'bg-warning/10 text-warning border-warning/20',
  access: 'bg-muted text-muted-foreground border-border',
};

const typeLabels: Record<string, string> = {
  create: 'Creación', update: 'Actualización', delete: 'Eliminación', config: 'Configuración', access: 'Acceso',
};

export default function Audit() {
  const { data } = useAuditData();
  const auditEntries = ((data ?? []) as Array<Record<string, string>>).map((entry) => ({
    id: entry.id ?? '',
    timestamp: entry.timestamp ?? '',
    user: entry.user ?? entry.actor ?? 'sistema',
    module: entry.module ?? 'general',
    action: entry.action ?? 'accion',
    detail: entry.detail ?? '',
    type: (entry.type as AuditEntry['type']) ?? 'access',
  }));
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [exporting, setExporting] = useState(false);

  const exportLogs = async () => {
    setExporting(true);
    try {
      const bundle = await apiGet('/export/bundle');
      const json = JSON.stringify(bundle, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `audit-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const filtered = auditEntries.filter((e) => {
    const matchSearch = e.detail.toLowerCase().includes(search.toLowerCase()) || e.user.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || e.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div>
      <PageHeader title="Auditoría y Logs" description="Historial completo de cambios, accesos y actividad del sistema.">
        <button
          onClick={() => void exportLogs()}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <Download className="w-4 h-4" /> {exporting ? 'Exportando...' : 'Exportar Logs'}
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar en logs..." className="w-full h-9 pl-9 pr-3 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', 'create', 'update', 'delete', 'config', 'access'].map((t) => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === t ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
              {t === 'all' ? 'Todos' : typeLabels[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl card-elevated overflow-hidden">
        <div className="divide-y divide-border/50">
          {filtered.map((entry, i) => {
            const Icon = typeIcons[entry.type] || Clock;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${typeColors[entry.type]}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium">{entry.action}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${typeColors[entry.type]}`}>{typeLabels[entry.type]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{entry.detail}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" /> {entry.user}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {entry.timestamp}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{entry.module}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground">
          Mostrando {filtered.length} de {auditEntries.length} registros
        </div>
      </motion.div>
    </div>
  );
}
