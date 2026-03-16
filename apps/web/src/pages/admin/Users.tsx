import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Shield, User, Pencil, Mail, MoreHorizontal, X } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { useUsersData } from '@/hooks/use-api-data';
import { apiPatch, apiPost } from '@/lib/api';

const roleStyles: Record<string, string> = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  editor: 'bg-info/10 text-info border-info/20',
  viewer: 'bg-muted text-muted-foreground border-border',
  auditor: 'bg-warning/10 text-warning border-warning/20',
};

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visor',
  auditor: 'Auditor',
};

export default function Users() {
  const { data, refetch } = useUsersData();
  const userItems = (data ?? []) as Array<{
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer' | 'auditor';
    status: 'active' | 'inactive' | 'pending';
    modules: string[];
    lastLogin: string;
  }>;
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    role: 'viewer' as 'admin' | 'editor' | 'viewer' | 'auditor',
    status: 'active' as 'active' | 'inactive' | 'pending',
    modulesCsv: 'Contenidos, Fuentes, Entrenamiento',
    password: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);

  const createUser = async () => {
    const fullName = createForm.fullName.trim();
    const email = createForm.email.trim();
    if (!fullName || !email) {
      setCreateError('Nombre y email son obligatorios');
      return;
    }
    const modules = createForm.modulesCsv
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    if (modules.length === 0) modules.push('Dashboard');
    setSubmitting(true);
    setCreateError(null);
    try {
      await apiPost('/users-roles/users', {
        fullName,
        email,
        role: createForm.role,
        status: createForm.status,
        modules,
        ...(createForm.password.trim().length >= 6 ? { password: createForm.password.trim() } : {}),
      });
      await refetch();
      setShowCreateModal(false);
      setCreateForm({
        fullName: '',
        email: '',
        role: 'viewer',
        status: 'active',
        modulesCsv: 'Contenidos, Fuentes, Entrenamiento',
        password: '',
      });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'No se pudo crear usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const editRole = async (userId: string, currentRole: 'admin' | 'editor' | 'viewer' | 'auditor') => {
    const role = (window.prompt('Nuevo rol (admin|editor|viewer|auditor)', currentRole) || currentRole) as
      | 'admin'
      | 'editor'
      | 'viewer'
      | 'auditor';
    setSubmitting(true);
    setError(null);
    try {
      await apiPatch(`/users-roles/users/${userId}`, { role });
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = userItems.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Usuarios y Roles" description="Gestión de accesos, roles y permisos de la plataforma.">
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </PageHeader>

      {/* Modal Nuevo Usuario */}
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
                className="w-full max-w-lg bg-card border border-border rounded-xl p-5"
                style={{ boxShadow: '0 18px 45px rgba(0,0,0,0.18)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Nuevo Usuario</h3>
                  <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-muted rounded transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Nombre completo"
                    className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                  />
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                    className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                  />
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value as typeof createForm.role }))}
                    className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                  >
                    <option value="viewer">Visor</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Administrador</option>
                    <option value="auditor">Auditor</option>
                  </select>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, status: e.target.value as typeof createForm.status }))}
                    className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="pending">Pendiente</option>
                  </select>
                  <input
                    value={createForm.modulesCsv}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, modulesCsv: e.target.value }))}
                    placeholder="Módulos (ej: Contenidos, Fuentes, Entrenamiento o Todos)"
                    className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
                  />
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Contraseña (opcional, mín. 6 caracteres)"
                    className="w-full h-10 px-3 text-sm bg-muted/40 border border-border rounded-lg"
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
                    onClick={() => void createUser()}
                    disabled={submitting}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                  >
                    {submitting ? 'Creando...' : 'Crear usuario'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Role summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(['admin', 'editor', 'viewer', 'auditor'] as const).map((role, i) => {
          const count = userItems.filter(u => u.role === role).length;
          return (
            <motion.div key={role} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-xl p-4 card-elevated">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{roleLabels[role]}</span>
              </div>
              <p className="text-xl font-semibold font-mono-data">{count}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar usuarios..." className="w-full h-9 pl-9 pr-3 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
        </div>
      </div>

      {/* Users Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Usuario</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Rol</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Estado</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Módulos</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Último Acceso</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${roleStyles[user.role]}`}>
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={user.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {user.modules.slice(0, 3).map((m) => (
                        <span key={m} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{m}</span>
                      ))}
                      {user.modules.length > 3 && <span className="text-[10px] text-muted-foreground">+{user.modules.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono-data">{user.lastLogin}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => void editRole(user.id, user.role)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button className="p-1.5 rounded hover:bg-muted transition-colors"><MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
      {error ? <p className="text-xs text-destructive mt-3">{error}</p> : null}
    </div>
  );
}
