import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Shield, User, Eye, Pencil, Mail, MoreHorizontal } from 'lucide-react';
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

  const createUser = async () => {
    const fullName = window.prompt('Nombre completo del usuario');
    if (!fullName) return;
    const email = window.prompt('Email del usuario');
    if (!email) return;
    const role = (window.prompt('Rol (admin|editor|viewer|auditor)', 'viewer') || 'viewer') as
      | 'admin'
      | 'editor'
      | 'viewer'
      | 'auditor';
    setSubmitting(true);
    setError(null);
    try {
      await apiPost('/users-roles/users', {
        fullName,
        email,
        role,
        status: 'active',
        modules: ['dashboard', 'content', 'sources'],
      });
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear usuario');
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
          onClick={() => void createUser()}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </PageHeader>

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
