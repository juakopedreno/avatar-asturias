import { Bell, Search, User, LogOut } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';

const routeNames: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/content': 'Gestión de Contenidos',
  '/admin/alerts': 'Alertas y Avisos',
  '/admin/sources': 'Fuentes y Trazabilidad',
  '/admin/training': 'Entrenamiento',
  '/admin/analytics': 'Analítica Avanzada',
  '/admin/audit': 'Auditoría y Logs',
  '/admin/users': 'Usuarios y Roles',
  '/admin/settings': 'Configuración General',
};

export default function TopBar() {
  const { auth, logout } = useAuth();
  const location = useLocation();
  const currentRoute = routeNames[location.pathname] || 'Dashboard';

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1.5 text-sm">
          <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">Principado de Asturias</Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-medium text-foreground">{currentRoute}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            placeholder="Buscar... (⌘K)"
            className="w-56 h-8 pl-9 pr-3 text-xs bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-2 ml-2 border-l border-border">
          <button onClick={logout} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Cerrar sesión">
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-medium">{auth?.email ?? 'Usuario'}</p>
            <p className="text-[10px] text-muted-foreground">{auth?.role ?? 'sin rol'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
