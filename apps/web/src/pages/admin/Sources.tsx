import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Plus, Globe, FileText, Database as DbIcon, Code, BookOpen, X, Trash2, Upload, Download } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { useIngestionJobsData, useSourcesData } from '@/hooks/use-api-data';
import { apiDelete, apiPost, apiPostForm } from '@/lib/api';

type SourceItem = {
  id: string;
  name: string;
  type: 'pdf' | 'api' | 'web' | 'database' | 'manual';
  status: 'synced' | 'pending' | 'error';
  lastSync: string | null;
  confidence: number;
  documents: number;
};

const typeIcons: Record<string, typeof Globe> = {
  pdf: FileText,
  api: Code,
  web: Globe,
  database: DbIcon,
  manual: BookOpen,
};

const typeLabels: Record<string, string> = {
  pdf: 'PDF',
  api: 'API',
  web: 'Web',
  database: 'Base de datos',
  manual: 'Manual',
};

export default function Sources() {
  const { data, refetch: refetchSources } = useSourcesData();
  const { data: jobs, refetch: refetchJobs } = useIngestionJobsData();
  const sourceItems = (data ?? []) as SourceItem[];
  const [selected, setSelected] = useState<SourceItem | null>(null);
  const [sourceId, setSourceId] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCreateSource, setShowCreateSource] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState<SourceItem['type']>('web');
  const [sourceConfig, setSourceConfig] = useState('');
  const [sourcePdfFile, setSourcePdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type === 'application/pdf') setSourcePdfFile(file);
  };

  const handlePdfDragOver = (e: React.DragEvent) => e.preventDefault();

  const downloadSelectedPdf = () => {
    if (!sourcePdfFile) return;
    const url = URL.createObjectURL(sourcePdfFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = sourcePdfFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadPdf = async (file: File) => {
    setSubmitting(true);
    setSourceError(null);
    try {
      let effectiveSourceId = sourceId;
      if (!effectiveSourceId) {
        const baseName = file.name.replace(/\.pdf$/i, '').trim() || 'Documento';
        const created = (await apiPost('/sources', {
          name: `PDF ${baseName}`,
          type: 'pdf',
          connectorConfig: file.name,
        })) as { id: string };
        effectiveSourceId = created.id;
        setSourceId(created.id);
        await refetchSources();
      }
      const form = new FormData();
      form.append('sourceId', effectiveSourceId);
      form.append('file', file);
      await apiPostForm('/rag/ingest/pdf', form);
      await refetchJobs();
      await refetchSources();
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : 'No se pudo subir el PDF');
    } finally {
      setSubmitting(false);
    }
  };

  const ingestWeb = async () => {
    if (!webUrl.trim()) return;
    setSubmitting(true);
    setSourceError(null);
    try {
      let effectiveSourceId = sourceId;
      if (!effectiveSourceId) {
        const normalizedUrl = webUrl.trim();
        const domain = (() => {
          try {
            return new URL(normalizedUrl).hostname;
          } catch {
            return normalizedUrl;
          }
        })();
        const created = (await apiPost('/sources', {
          name: `Web ${domain}`,
          type: 'web',
          connectorConfig: normalizedUrl,
        })) as { id: string };
        effectiveSourceId = created.id;
        setSourceId(created.id);
        await refetchSources();
      }
      await apiPost('/rag/ingest/web', { sourceId: effectiveSourceId, url: webUrl.trim() });
      await refetchJobs();
      await refetchSources();
      setWebUrl('');
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : 'No se pudo ingerir la web');
    } finally {
      setSubmitting(false);
    }
  };

  const ingestApi = async () => {
    if (!sourceId || !apiEndpoint.trim()) return;
    setSubmitting(true);
    setSourceError(null);
    try {
      await apiPost('/rag/ingest/api', { sourceId, endpoint: apiEndpoint.trim() });
      await refetchJobs();
      await refetchSources();
      setApiEndpoint('');
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : 'No se pudo ingerir la API');
    } finally {
      setSubmitting(false);
    }
  };

  const createSource = async () => {
    if (!sourceName.trim()) {
      setSourceError('Indica un nombre para la fuente.');
      return;
    }
    if (sourceType === 'pdf' && !sourcePdfFile) {
      setSourceError('Selecciona un archivo PDF para subir.');
      return;
    }
    const configRequired = sourceType !== 'pdf';
    if (configRequired && !sourceConfig.trim()) {
      setSourceError('Indica la configuración/conector de la fuente.');
      return;
    }

    setSubmitting(true);
    setSourceError(null);
    try {
      const created = (await apiPost('/sources', {
        name: sourceName.trim(),
        type: sourceType,
        connectorConfig: sourceConfig.trim() || (sourceType === 'pdf' ? 'pdf-upload' : ''),
      })) as { id: string };
      await refetchSources();
      setSourceId(created.id);
      if (sourceType === 'pdf' && sourcePdfFile) {
        const form = new FormData();
        form.append('sourceId', created.id);
        form.append('file', sourcePdfFile);
        await apiPostForm('/rag/ingest/pdf', form);
        await refetchJobs();
        await refetchSources();
      }
      setShowCreateSource(false);
      setSourceName('');
      setSourceType('web');
      setSourceConfig('');
      setSourcePdfFile(null);
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : 'No se pudo crear la fuente');
    } finally {
      setSubmitting(false);
    }
  };

  const removeSource = async (id: string) => {
    const confirmed = window.confirm('Se eliminara la fuente y su contenido indexado. ¿Continuar?');
    if (!confirmed) return;
    setSubmitting(true);
    setSourceError(null);
    try {
      await apiDelete<{ ok: boolean }>(`/sources/${id}`);
      if (selected?.id === id) {
        setSelected(null);
      }
      if (sourceId === id) {
        setSourceId('');
      }
      await refetchSources();
      await refetchJobs();
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : 'No se pudo eliminar la fuente');
    } finally {
      setSubmitting(false);
    }
  };

  const activeSources = sourceItems.filter((s) => s.status === 'synced').length;
  const indexedDocuments = sourceItems.reduce((acc, item) => acc + item.documents, 0);
  const confidenceRows = sourceItems.filter((s) => s.confidence > 0);
  const avgConfidence =
    confidenceRows.length > 0
      ? `${Math.round(
          confidenceRows.reduce((acc, item) => acc + item.confidence, 0) / confidenceRows.length,
        )}%`
      : '—';

  return (
    <div>
      <PageHeader
        title="Fuentes y Trazabilidad"
        description="Gestiona las fuentes de conocimiento y verifica la trazabilidad de las respuestas."
      >
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" /> Sincronizar Todo
        </button>
        <button
          onClick={() => {
            setSourceError(null);
            setSourceName('');
            setSourceType('web');
            setSourceConfig(webUrl.trim());
            setSourcePdfFile(null);
            setShowCreateSource(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Nueva Fuente
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Fuentes Activas', value: activeSources, total: sourceItems.length },
          { label: 'Documentos Indexados', value: indexedDocuments },
          { label: 'Confianza Media', value: avgConfidence },
        ].map((summary, i) => (
          <motion.div
            key={summary.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl p-5 card-elevated"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{summary.label}</p>
            <p className="text-2xl font-semibold font-mono-data mt-1">
              {summary.value}
              {summary.total ? (
                <span className="text-sm text-muted-foreground">/{summary.total}</span>
              ) : null}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="bg-card rounded-xl p-5 card-elevated mb-6">
        <h3 className="text-sm font-semibold mb-4">Ingesta documental real (RAG)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <select
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
            className="h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg"
          >
            <option value="">Selecciona fuente (opcional para web)</option>
            {sourceItems.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
          <input
            value={webUrl}
            onChange={(event) => setWebUrl(event.target.value)}
            placeholder="https://..."
            className="h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg"
          />
          <button
            onClick={() => void ingestWeb()}
            disabled={submitting || !webUrl.trim()}
            className="h-9 px-3 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            Ingestar Web
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input
            value={apiEndpoint}
            onChange={(event) => setApiEndpoint(event.target.value)}
            placeholder="https://api..."
            className="md:col-span-2 h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg"
          />
          <button
            onClick={() => void ingestApi()}
            disabled={submitting || !sourceId || !apiEndpoint.trim()}
            className="h-9 px-3 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            Ingestar API
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadPdf(file);
            }}
            className="text-xs"
          />
          <span className="text-xs text-muted-foreground">Selecciona fuente y sube PDF para indexar contenido.</span>
        </div>
        {sourceError ? <p className="text-xs text-destructive mt-3">{sourceError}</p> : null}
      </div>

      <div className="bg-card rounded-xl p-5 card-elevated mb-6">
        <h3 className="text-sm font-semibold mb-3">Jobs de ingesta</h3>
        <div className="space-y-2">
          {(jobs as Array<Record<string, unknown>> | undefined)?.slice(0, 8).map((job) => (
            <div
              key={String(job.id)}
              className="flex items-center justify-between text-xs border border-border rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{String(job.sourceKind)}</span>
                <span className="text-muted-foreground">{String(job.inputRef)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{String(job.outputChunks ?? 0)} chunks</span>
                <StatusBadge status={String(job.status) as 'synced' | 'pending' | 'error'} />
              </div>
            </div>
          )) ?? <p className="text-xs text-muted-foreground">Sin jobs registrados</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sourceItems.map((source, i) => {
          const Icon = typeIcons[source.type] || Globe;
          return (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              onClick={() => setSelected(source)}
              className="bg-card rounded-xl p-5 card-elevated cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <Icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">{source.name}</h4>
                    <p className="text-[11px] text-muted-foreground">{typeLabels[source.type]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={source.status} />
                  <button
                    type="button"
                    title="Eliminar fuente"
                    onClick={(event) => {
                      event.stopPropagation();
                      void removeSource(source.id);
                    }}
                    className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Documentos</p>
                  <p className="text-sm font-mono-data font-medium mt-0.5">{source.documents}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Confianza</p>
                  <p
                    className={`text-sm font-mono-data font-medium mt-0.5 ${
                      source.confidence >= 90
                        ? 'text-success'
                        : source.confidence > 0
                          ? 'text-warning'
                          : 'text-destructive'
                    }`}
                  >
                    {source.confidence > 0 ? `${source.confidence}%` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Última sync</p>
                  <p className="text-[11px] font-mono-data text-muted-foreground mt-0.5">
                    {source.lastSync ? source.lastSync.split('T')[0] : '—'}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showCreateSource && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 z-40"
              onClick={() => setShowCreateSource(false)}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
            >
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-card border border-border rounded-xl p-5"
                style={{ boxShadow: '0 18px 45px rgba(0,0,0,0.18)' }}
              >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Nueva Fuente</h3>
                <button onClick={() => setShowCreateSource(false)} className="p-1 hover:bg-muted rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  value={sourceName}
                  onChange={(event) => setSourceName(event.target.value)}
                  placeholder="Nombre de la fuente"
                  className="w-full h-10 px-3 text-sm bg-muted/50 border border-border rounded-lg"
                />
                <select
                  value={sourceType}
                  onChange={(event) => {
                    const nextType = event.target.value as SourceItem['type'];
                    setSourceType(nextType);
                    setSourceError(null);
                    if (nextType !== 'pdf') setSourcePdfFile(null);
                  }}
                  className="w-full h-10 px-3 text-sm bg-muted/50 border border-border rounded-lg"
                >
                  <option value="web">Web</option>
                  <option value="api">API</option>
                  <option value="pdf">PDF</option>
                  <option value="database">Base de datos</option>
                  <option value="manual">Manual</option>
                </select>
                {sourceType === 'pdf' ? (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setSourcePdfFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <div
                      onDrop={handlePdfDrop}
                      onDragOver={handlePdfDragOver}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-6 bg-muted/30 hover:bg-muted/50 hover:border-primary/40 transition-colors cursor-pointer text-center"
                    >
                      {sourcePdfFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-primary" />
                          </div>
                          <p className="text-sm font-medium truncate max-w-full px-2">{sourcePdfFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(sourcePdfFile.size / 1024).toFixed(1)} KB
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                              className="text-xs text-primary hover:underline"
                            >
                              Cambiar archivo
                            </button>
                            <span className="text-muted-foreground">·</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); downloadSelectedPdf(); }}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Download className="w-3.5 h-3.5" /> Descargar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <Upload className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground">Arrastra el PDF aquí o haz clic</p>
                          <p className="text-[11px] text-muted-foreground">
                            Solo archivos PDF. Se creará la fuente y se indexará el contenido.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <input
                    value={sourceConfig}
                    onChange={(event) => setSourceConfig(event.target.value)}
                    placeholder="Config/URL/endpoint"
                    className="w-full h-10 px-3 text-sm bg-muted/50 border border-border rounded-lg"
                  />
                )}
                {sourceError ? <p className="text-xs text-destructive">{sourceError}</p> : null}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowCreateSource(false)}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => void createSource()}
                    disabled={submitting}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                  >
                    {submitting ? 'Creando...' : 'Crear fuente'}
                  </button>
                </div>
              </div>
              </motion.div>
            </motion.div>
          </>
        )}

        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 z-40"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ ease: [0.4, 0, 0.2, 1] }}
              className="fixed right-0 top-0 h-full w-[420px] bg-card border-l border-border z-50 flex flex-col"
              style={{ boxShadow: '-8px 0 30px rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h3 className="font-semibold text-sm">Detalle de Fuente</h3>
                <button onClick={() => setSelected(null)} className="p-1 hover:bg-muted rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center">
                    {(() => {
                      const I = typeIcons[selected.type] || Globe;
                      return <I className="w-5 h-5 text-primary" />;
                    })()}
                  </div>
                  <div>
                    <h4 className="font-medium">{selected.name}</h4>
                    <p className="text-xs text-muted-foreground">{typeLabels[selected.type]}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Estado</label>
                    <div className="mt-1">
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Confianza</label>
                    <p className="text-sm font-mono-data mt-1">{selected.confidence}%</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Documentos</label>
                    <p className="text-sm font-mono-data mt-1">{selected.documents}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Última Sync</label>
                    <p className="text-xs font-mono-data mt-1">{selected.lastSync ?? '—'}</p>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-border flex items-center gap-2">
                <button className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                  Resincronizar
                </button>
                <button
                  onClick={() => void removeSource(selected.id)}
                  className="px-4 py-2 border border-destructive/40 text-destructive rounded-lg text-sm hover:bg-destructive/10 transition-colors"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
