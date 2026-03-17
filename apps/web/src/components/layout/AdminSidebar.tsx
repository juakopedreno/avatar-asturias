import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, Database, MessageSquare,
  BarChart3, ShieldCheck, Users, Settings, Bot, ChevronLeft, ChevronRight,
} from 'lucide-react';
import logo from '@/assets/torremolinos-logo-alt.png';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { name: 'Respuestas controladas', icon: BookOpen, href: '/admin/content' },
  { name: 'Fuentes', icon: Database, href: '/admin/sources' },
  { name: 'Entrenamiento', icon: MessageSquare, href: '/admin/training' },
  { name: 'Analítica', icon: BarChart3, href: '/admin/analytics' },
  { name: 'Auditoría', icon: ShieldCheck, href: '/admin/audit' },
  { name: 'Usuarios', icon: Users, href: '/admin/users' },
  { name: 'Configuración', icon: Settings, href: '/admin/settings' },
];

export default function AdminSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 h-screen bg-sidebar flex flex-col z-50 overflow-hidden"
      style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.15)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border flex-shrink-0">
        <img src={logo} alt="Torremolinos" className="w-8 h-8 rounded object-contain" />
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-sidebar-accent-foreground truncate">CivicAvatar</span>
            <span className="text-[10px] text-sidebar-muted truncate">Torremolinos</span>
          </motion.div>
        )}
      </div>

      {/* Avatar Demo Link */}
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <Link
          to="/demo"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-sidebar-primary/20 text-sidebar-primary hover:bg-sidebar-primary/30 transition-colors"
        >
          <Bot className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-xs font-medium">Ver Avatar Demo</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-r-full"
                  transition={{ duration: 0.2 }}
                />
              )}
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      <div className="px-3 py-3 border-t border-sidebar-border flex-shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 rounded-lg text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
