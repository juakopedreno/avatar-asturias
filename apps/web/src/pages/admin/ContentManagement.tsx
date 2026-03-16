import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, Eye, Pencil, Trash2, X } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import LanguageChip from '@/components/shared/LanguageChip';
import { useContentData } from '@/hooks/use-api-data';
import { apiPost } from '@/lib/api';

type ContentItem = {
  id: string;
  title: string;
  category: string;
  languages: string[];
  status: 'published' | 'draft' | 'review' | 'archived';
  updatedAt: string;
  author: string;
};

type CreateContentForm = {
  title: string;
  category: string;
  languagesCsv: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  author: string;
};

export default function ContentManagement() {
  const { data, refetch } = useContentData();
  const contentItems = (data ?? []) as ContentItem[];
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateContentForm>({
    title: '',
    category: '',
    languagesCsv: 'es, en',
    status: 'draft',
    author: 'admin@torremolinos.es',
  });

  const filtered = contentItems.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const onCreateContent = async () => {
    const languages = createForm.languagesCsv
      .split(',')
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean);

    if (!createForm.title.trim() || !createForm.category.trim() || !createForm.author.trim()) {
      setCreateError('Completa título, categoría y autor.');
      return;
    }
    if (languages.length === 0) {
      setCreateError('Debes indicar al menos un idioma.');
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await apiPost('/content', {
        title: createForm.title.trim(),
        category: createForm.category.trim(),
        languages,
        status: createForm.status,
        author: createForm.author.trim(),
      });
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        category: '',
        languagesCsv: 'es, en',
        status: 'draft',
        author: createForm.author.trim(),
      });
      await refetch();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'No se pudo crear el contenido');
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Gestión de Contenidos" description="Administra los contenidos turísticos y de servicios municipales.">
        <button
          onClick={() => {
            setCreateError(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Nuevo Contenido
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contenidos..."
            className="w-full h-9 pl-9 pr-3 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {['all', 'published', 'draft', 'archived'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'published' ? 'Publicados' : s === 'draft' ? 'Borradores' : 'Archivados'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Título</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Categoría</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Idiomas</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Actualización</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedItem(item)}>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">{item.author}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2 py-0.5 bg-muted rounded-md">{item.category}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1">{item.languages.map((l) => <LanguageChip key={l} code={l} />)}</div>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={item.status} /></td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono-data">{item.updatedAt}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 rounded hover:bg-muted transition-colors"><Eye className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button className="p-1.5 rounded hover:bg-muted transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button className="p-1.5 rounded hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive/70" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} de {contentItems.length} contenidos</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 rounded border border-border hover:bg-muted transition-colors">Anterior</button>
            <button className="px-3 py-1 rounded bg-primary/10 text-primary border border-primary/20">1</button>
            <button className="px-3 py-1 rounded border border-border hover:bg-muted transition-colors">Siguiente</button>
          </div>
        </div>
      </motion.div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/30 z-40"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-xl bg-card border border-border rounded-xl z-50 p-5"
              style={{ boxShadow: '0 18px 45px rgba(0,0,0,0.18)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Nuevo Contenido</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-muted rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={createForm.title}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Título"
                  className="h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                />
                <input
                  value={createForm.category}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="Categoría"
                  className="h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                />
                <input
                  value={createForm.languagesCsv}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, languagesCsv: event.target.value }))}
                  placeholder="Idiomas (ej: es, en)"
                  className="h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                />
                <select
                  value={createForm.status}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      status: event.target.value as CreateContentForm['status'],
                    }))
                  }
                  className="h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                >
                  <option value="draft">Borrador</option>
                  <option value="review">Revisión</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Archivado</option>
                </select>
                <input
                  value={createForm.author}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, author: event.target.value }))}
                  placeholder="Autor"
                  className="md:col-span-2 h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                />
              </div>
              {createError ? <p className="text-xs text-destructive mt-3">{createError}</p> : null}
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void onCreateContent()}
                  disabled={createSubmitting}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                >
                  {createSubmitting ? 'Creando...' : 'Crear contenido'}
                </button>
              </div>
            </motion.div>
          </>
        )}
        {selectedItem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/20 z-40" onClick={() => setSelectedItem(null)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ ease: [0.4, 0, 0.2, 1] }}
              className="fixed right-0 top-0 h-full w-[420px] bg-card border-l border-border z-50 flex flex-col"
              style={{ boxShadow: '-8px 0 30px rgba(0,0,0,0.1)' }}
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h3 className="font-semibold text-sm">Detalle del Contenido</h3>
                <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-muted rounded transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Título</label>
                  <p className="text-sm font-medium mt-1">{selectedItem.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Categoría</label>
                    <p className="text-sm mt-1">{selectedItem.category}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Estado</label>
                    <div className="mt-1"><StatusBadge status={selectedItem.status} /></div>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Idiomas</label>
                  <div className="flex gap-1.5 mt-1">{selectedItem.languages.map((l) => <LanguageChip key={l} code={l} size="md" />)}</div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Autor</label>
                  <p className="text-sm mt-1">{selectedItem.author}</p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Última actualización</label>
                  <p className="text-sm font-mono-data mt-1">{selectedItem.updatedAt}</p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Descripción</label>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">Contenido informativo sobre {selectedItem.title.toLowerCase()} para la atención turística y ciudadana del municipio de Torremolinos.</p>
                </div>
              </div>
              <div className="p-5 border-t border-border flex items-center gap-2">
                <button className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Editar</button>
                <button className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">Vista Previa</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
