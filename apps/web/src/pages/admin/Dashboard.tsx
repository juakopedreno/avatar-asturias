import { MessageSquare, Clock, ThumbsUp, Globe, Database, AlertTriangle, BookOpen, TrendingUp } from 'lucide-react';
import StatsCard from '@/components/shared/StatsCard';
import PageHeader from '@/components/shared/PageHeader';
import { useDashboardData } from '@/hooks/use-api-data';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { data } = useDashboardData();
  const statsData = data?.statsData ?? {
    totalConversations: 0,
    resolutionRate: 0,
    avgResponseTime: 0,
    citizenSatisfaction: 0,
    activeSources: 0,
    activeLanguages: 0,
    totalContents: 0,
  };
  const topTopics = data?.topTopics ?? [];
  const languageDistribution = data?.languageDistribution ?? [];
  const recentAlerts = data?.recentAlerts ?? [];
  const conversationsByDay = data?.conversationsByDay ?? [];

  return (
    <div>
      <PageHeader title="Dashboard" description="Vista general del rendimiento del asistente virtual." />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Conversaciones Totales" value={statsData.totalConversations.toLocaleString()} change="+12%" trend="up" icon={MessageSquare} delay={0} />
        <StatsCard label="Tasa de Resolución" value={`${statsData.resolutionRate}%`} change="+0.4%" trend="up" icon={ThumbsUp} delay={0.05} />
        <StatsCard label="Tiempo Medio Respuesta" value={`${statsData.avgResponseTime}s`} change="-0.1s" trend="down" icon={Clock} delay={0.1} />
        <StatsCard label="Satisfacción Ciudadana" value={`${statsData.citizenSatisfaction}/5`} change="+2%" trend="up" icon={TrendingUp} delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Conversations Chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 bg-card rounded-xl p-5 card-elevated">
          <h3 className="text-sm font-semibold mb-4">Conversaciones por día</h3>
          <div className="space-y-2">
            {conversationsByDay.map((d) => (
              <div key={d.date} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-8 font-mono-data">{d.date}</span>
                <div className="flex-1 h-7 bg-muted/50 rounded overflow-hidden relative">
                  <div className="h-full bg-primary/15 rounded" style={{ width: `${(d.conversations / 620) * 100}%` }} />
                  <div className="absolute inset-0 h-full bg-primary/30 rounded" style={{ width: `${(d.resolved / 620) * 100}%` }} />
                </div>
                <span className="text-xs font-mono-data w-10 text-right">{d.conversations}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-primary/30" /> Resueltas</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-primary/15" /> Totales</span>
          </div>
        </motion.div>

        {/* Languages */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card rounded-xl p-5 card-elevated">
          <h3 className="text-sm font-semibold mb-4">Distribución por Idioma</h3>
          <div className="space-y-3">
            {languageDistribution.map((l) => (
              <div key={l.code} className="flex items-center gap-3">
                <span className="text-[10px] font-mono-data font-semibold text-primary bg-primary/8 px-1.5 py-0.5 rounded w-7 text-center">{l.code}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${l.percentage}%` }} />
                </div>
                <span className="text-xs font-mono-data text-muted-foreground w-9 text-right">{l.percentage}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Topics */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl p-5 card-elevated">
          <h3 className="text-sm font-semibold mb-4">Temas Más Consultados</h3>
          <div className="space-y-2.5">
            {topTopics.slice(0, 6).map((t, i) => (
              <div key={t.topic} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono-data text-muted-foreground w-4">{i + 1}</span>
                  <span className="text-sm">{t.topic}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono-data text-muted-foreground">{t.count.toLocaleString()}</span>
                  <span className={`text-[11px] font-mono-data ${t.trend.startsWith('+') ? 'text-success' : 'text-destructive'}`}>{t.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Alerts & Quick Access */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-card rounded-xl p-5 card-elevated">
          <h3 className="text-sm font-semibold mb-4">Alertas e Incidencias</h3>
          <div className="space-y-3 mb-6">
            {recentAlerts.map((a) => (
              <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                a.type === 'error' ? 'bg-destructive/5 border-destructive/15' :
                a.type === 'warning' ? 'bg-warning/5 border-warning/15' :
                'bg-info/5 border-info/15'
              }`}>
                <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  a.type === 'error' ? 'text-destructive' :
                  a.type === 'warning' ? 'text-warning' : 'text-info'
                }`} />
                <div>
                  <p className="text-xs font-medium">{a.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Accesos Rápidos</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: BookOpen, label: `${statsData.totalContents} contenidos`, href: '/admin/content' },
              { icon: Database, label: `${statsData.activeSources} fuentes`, href: '/admin/sources' },
              { icon: Globe, label: `${statsData.activeLanguages} idiomas`, href: '/admin/settings' },
              { icon: MessageSquare, label: 'Ver avatar', href: '/demo' },
            ].map((item) => (
              <a key={item.label} href={item.href} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-xs">
                <item.icon className="w-3.5 h-3.5 text-primary" />
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
