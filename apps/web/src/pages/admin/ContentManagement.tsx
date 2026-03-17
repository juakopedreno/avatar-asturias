import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Pencil, Trash2, X } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import LanguageChip from '@/components/shared/LanguageChip';
import { useContentData } from '@/hooks/use-api-data';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';

type ControlledResponseItem = {
  id: string;
  question: string;
  questionVariants: string[];
  answer: string;
  category: string;
  languages: string[];
  status: 'published' | 'draft' | 'review' | 'archived';
  updatedAt: string;
  author: string;
};

type CreateForm = {
  question: string;
  answer: string;
  questionVariantsCsv: string;
  category: string;
  languagesCsv: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  author: string;
};

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}

export default function ContentManagement() {
  const { data, refetch } = useContentData();
  const items = (data ?? []) as ControlledResponseItem[];
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<ControlledResponseItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ControlledResponseItem | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>({
    question: '',
    answer: '',
    questionVariantsCsv: '',
    category: '',
    languagesCsv: 'es, en',
    status: 'draft',
    author: 'admin@torremolinos.es',
  });
  const [editForm, setEditForm] = useState<CreateForm>({
    question: '',
    answer: '',
    questionVariantsCsv: '',
    category: '',
    languagesCsv: 'es, en',
    status: 'draft',
    author: '',
  });

  const filtered = items.filter((item) => {
    const matchSearch =
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const parseVariants = (csv: string) =>
    csv
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  const parseLanguages = (csv: string) =>
    csv
      .split(',')
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean);

  const onCreate = async () => {
    const languages = parseLanguages(createForm.languagesCsv);
    const questionVariants = parseVariants(createForm.questionVariantsCsv);
    if (!createForm.question.trim() || !createForm.answer.trim() || !createForm.category.trim() || !createForm.author.trim()) {
      setCreateError('Completa pregunta, respuesta, categoría y autor.');
      return;
    }
    if (languages.length === 0) {
      setCreateError('Indica al menos un idioma.');
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await apiPost('/content', {
        question: createForm.question.trim(),
        answer: createForm.answer.trim(),
        questionVariants,
        category: createForm.category.trim(),
        languages,
        status: createForm.status,
        author: createForm.author.trim(),
      });
      setShowCreateModal(false);
      setCreateForm({
        question: '',
        answer: '',
        questionVariantsCsv: '',
        category: '',
        languagesCsv: 'es, en',
        status: 'draft',
        author: createForm.author.trim(),
      });
      await refetch();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'No se pudo crear.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const onEdit = async () => {
    if (!editingItem) return;
    const languages = parseLanguages(editForm.languagesCsv);
    const questionVariants = parseVariants(editForm.questionVariantsCsv);
    if (!editForm.question.trim() || !editForm.answer.trim() || !editForm.category.trim() || !editForm.author.trim()) {
      setEditError('Completa pregunta, respuesta, categoría y autor.');
      return;
    }
    if (languages.length === 0) {
      setEditError('Indica al menos un idioma.');
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      await apiPatch(`/content/${editingItem.id}`, {
        question: editForm.question.trim(),
        answer: editForm.answer.trim(),
        questionVariants,
        category: editForm.category.trim(),
        languages,
        status: editForm.status,
        author: editForm.author.trim(),
      });
      setEditingItem(null);
      if (selectedItem?.id === editingItem.id) setSelectedItem(null);
      await refetch();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'No se pudo actualizar.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const onDelete = async (item: ControlledResponseItem) => {
    if (!confirm('¿Eliminar esta respuesta controlada?')) return;
    try {
      await apiDelete(`/content/${item.id}`);
      if (selectedItem?.id === item.id) setSelectedItem(null);
      if (editingItem?.id === item.id) setEditingItem(null);
      await refetch();
    } catch {
      // ignore
    }
  };

  const openEdit = (item: ControlledResponseItem) => {
    setEditingItem(item);
    setEditForm({
      question: item.question,
      answer: item.answer,
      questionVariantsCsv: (item.questionVariants ?? []).join('\n'),
      category: item.category,
      languagesCsv: item.languages.join(', '),
      status: item.status,
      author: item.author,
    });
    setEditError(null);
  };

  return (
    <div>
      <PageHeader
        title="Respuestas controladas"
        description="Preguntas y respuestas que debe dar el asistente. Solo las publicadas se usan en el canal ciudadano."
      >
        <button
          onClick={() => {
            setCreateError(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Nueva respuesta
        </button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por pregunta, respuesta o categoría..."
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

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Pregunta</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Respuesta</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Categoría</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Idiomas</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Actualización</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium">{truncate(item.question, 50)}</span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">{item.author}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{truncate(item.answer, 45)}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2 py-0.5 bg-muted rounded-md">{item.category}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 flex-wrap">{item.languages.map((l) => <LanguageChip key={l} code={l} />)}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono-data">{item.updatedAt}</td>
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        onClick={() => openEdit(item)}
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                        onClick={() => void onDelete(item)}
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} de {items.length} respuestas</span>
        </div>
      </motion.div>

      {/* Create Modal */}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
            >
              <motion.div
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 12, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xl bg-card border border-border rounded-xl p-5 max-h-[90vh] overflow-y-auto"
                style={{ boxShadow: '0 18px 45px rgba(0,0,0,0.18)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Nueva respuesta controlada</h3>
                  <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-muted rounded transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Pregunta</label>
                    <textarea
                      value={createForm.question}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, question: e.target.value }))}
                      placeholder="¿Dónde está la playa de la Carihuela?"
                      className="w-full min-h-[60px] px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg resize-y"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Respuesta</label>
                    <textarea
                      value={createForm.answer}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, answer: e.target.value }))}
                      placeholder="La playa de la Carihuela está en el paseo marítimo de Torremolinos..."
                      className="w-full min-h-[80px] px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg resize-y"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Variantes de pregunta (una por línea)</label>
                    <textarea
                      value={createForm.questionVariantsCsv}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, questionVariantsCsv: e.target.value }))}
                      placeholder={'playa carihuela ubicación\ndonde queda carihuela'}
                      className="w-full min-h-[50px] px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg resize-y"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Categoría</label>
                      <input
                        value={createForm.category}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, category: e.target.value }))}
                        placeholder="Playas"
                        className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Idiomas</label>
                      <input
                        value={createForm.languagesCsv}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, languagesCsv: e.target.value }))}
                        placeholder="es, en"
                        className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Estado</label>
                      <select
                        value={createForm.status}
                        onChange={(e) =>
                          setCreateForm((prev) => ({ ...prev, status: e.target.value as CreateForm['status'] }))
                        }
                        className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                      >
                        <option value="draft">Borrador</option>
                        <option value="review">Revisión</option>
                        <option value="published">Publicado</option>
                        <option value="archived">Archivado</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Autor</label>
                      <input
                        value={createForm.author}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, author: e.target.value }))}
                        placeholder="admin@torremolinos.es"
                        className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                      />
                    </div>
                  </div>
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
                    onClick={() => void onCreate()}
                    disabled={createSubmitting}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                  >
                    {createSubmitting ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/30 z-40"
              onClick={() => setEditingItem(null)}
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
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 12, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xl bg-card border border-border rounded-xl p-5 max-h-[90vh] overflow-y-auto"
                style={{ boxShadow: '0 18px 45px rgba(0,0,0,0.18)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Editar respuesta controlada</h3>
                  <button onClick={() => setEditingItem(null)} className="p-1 hover:bg-muted rounded transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Pregunta</label>
                    <textarea
                      value={editForm.question}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, question: e.target.value }))}
                      className="w-full min-h-[60px] px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg resize-y"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Respuesta</label>
                    <textarea
                      value={editForm.answer}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, answer: e.target.value }))}
                      className="w-full min-h-[80px] px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg resize-y"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Variantes de pregunta (una por línea)</label>
                    <textarea
                      value={editForm.questionVariantsCsv}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, questionVariantsCsv: e.target.value }))}
                      className="w-full min-h-[50px] px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg resize-y"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Categoría</label>
                      <input
                        value={editForm.category}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                        className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Idiomas</label>
                      <input
                        value={editForm.languagesCsv}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, languagesCsv: e.target.value }))}
                        className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Estado</label>
                      <select
                        value={editForm.status}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, status: e.target.value as CreateForm['status'] }))
                        }
                        className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                      >
                        <option value="draft">Borrador</option>
                        <option value="review">Revisión</option>
                        <option value="published">Publicado</option>
                        <option value="archived">Archivado</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Autor</label>
                      <input
                        value={editForm.author}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, author: e.target.value }))}
                        className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                      />
                    </div>
                  </div>
                </div>
                {editError ? <p className="text-xs text-destructive mt-3">{editError}</p> : null}
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => void onEdit()}
                    disabled={editSubmitting}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                  >
                    {editSubmitting ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 z-40"
              onClick={() => setSelectedItem(null)}
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
                <h3 className="font-semibold text-sm">Detalle</h3>
                <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-muted rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pregunta</label>
                  <p className="text-sm font-medium mt-1 leading-relaxed">{selectedItem.question}</p>
                </div>
                {(selectedItem.questionVariants?.length ?? 0) > 0 && (
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Variantes</label>
                    <ul className="text-sm mt-1 list-disc list-inside space-y-0.5">
                      {selectedItem.questionVariants.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Respuesta</label>
                  <p className="text-sm mt-1 leading-relaxed">{selectedItem.answer}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Categoría</label>
                    <p className="text-sm mt-1">{selectedItem.category}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Estado</label>
                    <div className="mt-1">
                      <StatusBadge status={selectedItem.status} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Idiomas</label>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {selectedItem.languages.map((l) => (
                      <LanguageChip key={l} code={l} size="md" />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Autor</label>
                  <p className="text-sm mt-1">{selectedItem.author}</p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Última actualización</label>
                  <p className="text-sm font-mono-data mt-1">{selectedItem.updatedAt}</p>
                </div>
              </div>
              <div className="p-5 border-t border-border flex items-center gap-2">
                <button
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  onClick={() => {
                    openEdit(selectedItem);
                    setSelectedItem(null);
                  }}
                >
                  Editar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
