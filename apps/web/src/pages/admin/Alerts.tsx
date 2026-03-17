import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, Bell } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { useAlertsData } from '@/hooks/use-api-data';
import { apiPost, apiPatch, apiDelete } from '@/lib/api';

type AlertItem = {
  id: string;
  title: string;
  message: string;
  keywords: string[];
  active: boolean;
  showOnGreeting: boolean;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  title: string;
  message: string;
  keywordsCsv: string;
  active: boolean;
  showOnGreeting: boolean;
  startAt: string;
  endAt: string;
};

const emptyForm: FormState = {
  title: '',
  message: '',
  keywordsCsv: '',
  active: true,
  showOnGreeting: true,
  startAt: '',
  endAt: '',
};

function formatDate(s: string | null) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return s;
  }
}

export default function Alerts() {
  const { data, refetch } = useAlertsData();
  const items = (data ?? []) as AlertItem[];
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AlertItem | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const parseKeywords = (csv: string) =>
    csv
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

  const onCreate = async () => {
    if (!createForm.title.trim() || !createForm.message.trim()) {
      setCreateError('Título y mensaje son obligatorios.');
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await apiPost('/alerts', {
        title: createForm.title.trim(),
        message: createForm.message.trim(),
        keywords: parseKeywords(createForm.keywordsCsv),
        active: createForm.active,
        showOnGreeting: createForm.showOnGreeting,
        startAt: createForm.startAt || undefined,
        endAt: createForm.endAt || undefined,
      });
      setShowCreateModal(false);
      setCreateForm(emptyForm);
      await refetch();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'No se pudo crear.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const onEdit = async () => {
    if (!editingItem) return;
    if (!editForm.title.trim() || !editForm.message.trim()) {
      setEditError('Título y mensaje son obligatorios.');
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      await apiPatch(`/alerts/${editingItem.id}`, {
        title: editForm.title.trim(),
        message: editForm.message.trim(),
        keywords: parseKeywords(editForm.keywordsCsv),
        active: editForm.active,
        showOnGreeting: editForm.showOnGreeting,
        startAt: editForm.startAt || null,
        endAt: editForm.endAt || null,
      });
      setEditingItem(null);
      await refetch();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'No se pudo actualizar.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const onDelete = async (item: AlertItem) => {
    if (!confirm('¿Eliminar esta alerta?')) return;
    try {
      await apiDelete(`/alerts/${item.id}`);
      await refetch();
    } catch {
      // ignore
    }
  };

  const openEdit = (item: AlertItem) => {
    setEditingItem(item);
    setEditForm({
      title: item.title,
      message: item.message,
      keywordsCsv: (item.keywords ?? []).join('\n'),
      active: item.active,
      showOnGreeting: item.showOnGreeting,
      startAt: item.startAt ? item.startAt.slice(0, 10) : '',
      endAt: item.endAt ? item.endAt.slice(0, 10) : '',
    });
    setEditError(null);
  };

  return (
    <div>
      <PageHeader
        title="Alertas y avisos proactivos"
        description="Avisos que el avatar puede mencionar al saludar o cuando el ciudadano pregunte por temas relacionados (playa cerrada, evento cancelado, etc.)."
      >
        <button
          onClick={() => {
            setCreateError(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Nueva alerta
        </button>
      </PageHeader>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-xl card-elevated overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Título</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Mensaje</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Palabras clave</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Activa</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">En saludo</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Vigencia</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium">{item.title}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground max-w-[240px] truncate">{item.message}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">
                    {(item.keywords ?? []).length ? (item.keywords as string[]).join(', ') : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded ${item.active ? 'bg-green-500/15 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                      {item.active ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs">{item.showOnGreeting ? 'Sí' : 'No'}</td>
                  <td className="px-5 py-3.5 text-xs font-mono-data">
                    {formatDate(item.startAt)} – {formatDate(item.endAt)}
                  </td>
                  <td className="px-5 py-3.5">
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
          <span>{items.length} alertas</span>
        </div>
      </motion.div>

      {items.length === 0 && (
        <div className="mt-6 p-8 bg-muted/30 border border-border rounded-xl text-center text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No hay alertas configuradas.</p>
          <p className="text-xs mt-1">Crea una para que el avatar las mencione al saludar o al hablar de ese tema.</p>
        </div>
      )}

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
                  <h3 className="text-sm font-semibold">Nueva alerta</h3>
                  <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-muted rounded transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Título</label>
                    <input
                      value={createForm.title}
                      onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Ej. Playa cerrada"
                      className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Mensaje (lo que dirá el avatar)</label>
                    <textarea
                      value={createForm.message}
                      onChange={(e) => setCreateForm((p) => ({ ...p, message: e.target.value }))}
                      placeholder="La playa de la Carihuela permanece cerrada por obras hasta el 20 de mayo."
                      className="w-full min-h-[80px] px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg resize-y"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Palabras clave (una por línea o separadas por coma)</label>
                    <textarea
                      value={createForm.keywordsCsv}
                      onChange={(e) => setCreateForm((p) => ({ ...p, keywordsCsv: e.target.value }))}
                      placeholder="playa\ncarihuela\nplayas cerradas"
                      className="w-full min-h-[60px] px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg resize-y"
                      rows={2}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Si el usuario menciona alguna, se incluirá este aviso en la respuesta.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createForm.active}
                        onChange={(e) => setCreateForm((p) => ({ ...p, active: e.target.checked }))}
                        className="rounded border-border"
                      />
                      <span className="text-xs">Activa</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createForm.showOnGreeting}
                        onChange={(e) => setCreateForm((p) => ({ ...p, showOnGreeting: e.target.checked }))}
                        className="rounded border-border"
                      />
                      <span className="text-xs">Mostrar en saludo</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Válida desde (opcional)</label>
                      <input
                        type="date"
                        value={createForm.startAt}
                        onChange={(e) => setCreateForm((p) => ({ ...p, startAt: e.target.value }))}
                        className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Válida hasta (opcional)</label>
                      <input
                        type="date"
                        value={createForm.endAt}
                        onChange={(e) => setCreateForm((p) => ({ ...p, endAt: e.target.value }))}
                        className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                      />
                    </div>
                  </div>
                </div>
                {createError && <p className="text-xs text-destructive mt-3">{createError}</p>}
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
                  <h3 className="text-sm font-semibold">Editar alerta</h3>
                  <button onClick={() => setEditingItem(null)} className="p-1 hover:bg-muted rounded transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Título</label>
                    <input
                      value={editForm.title}
                      onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                      className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Mensaje</label>
                    <textarea
                      value={editForm.message}
                      onChange={(e) => setEditForm((p) => ({ ...p, message: e.target.value }))}
                      className="w-full min-h-[80px] px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg resize-y"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Palabras clave</label>
                    <textarea
                      value={editForm.keywordsCsv}
                      onChange={(e) => setEditForm((p) => ({ ...p, keywordsCsv: e.target.value }))}
                      className="w-full min-h-[60px] px-3 py-2 text-sm bg-muted/40 border border-border rounded-lg resize-y"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.active}
                        onChange={(e) => setEditForm((p) => ({ ...p, active: e.target.checked }))}
                        className="rounded border-border"
                      />
                      <span className="text-xs">Activa</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.showOnGreeting}
                        onChange={(e) => setEditForm((p) => ({ ...p, showOnGreeting: e.target.checked }))}
                        className="rounded border-border"
                      />
                      <span className="text-xs">Mostrar en saludo</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Válida desde</label>
                      <input
                        type="date"
                        value={editForm.startAt}
                        onChange={(e) => setEditForm((p) => ({ ...p, startAt: e.target.value }))}
                        className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">Válida hasta</label>
                      <input
                        type="date"
                        value={editForm.endAt}
                        onChange={(e) => setEditForm((p) => ({ ...p, endAt: e.target.value }))}
                        className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                      />
                    </div>
                  </div>
                </div>
                {editError && <p className="text-xs text-destructive mt-3">{editError}</p>}
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
    </div>
  );
}
