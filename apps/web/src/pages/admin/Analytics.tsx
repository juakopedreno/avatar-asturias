import { motion } from 'framer-motion';
import { MessageSquare, Clock, ThumbsUp, Globe, TrendingUp, Download, Calendar } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatsCard from '@/components/shared/StatsCard';
import { useDashboardData } from '@/hooks/use-api-data';
import { apiGet } from '@/lib/api';
import { useState } from 'react';

export default function Analytics() {
  const { data } = useDashboardData();
  const [exporting, setExporting] = useState(false);
  const statsData = (data?.statsData as {
    totalConversations: number;
    resolutionRate: number;
    avgResponseTime: number;
    activeLanguages: number;
    conversationDelta?: number;
    resolutionDelta?: number;
    avgResponseDelta?: number;
    languagesDelta?: number;
  }) ?? {
    totalConversations: 0,
    resolutionRate: 0,
    avgResponseTime: 0,
    activeLanguages: 0,
  };
  const hourlyData = (data?.hourlyDistribution as Array<{ hour: string; value: number }> | undefined) ?? [];
  const unresolvedQuestions =
    (data?.unresolvedQuestions as Array<{ question: string; count: number; lastAsked: string }> | undefined) ?? [];
  const qualityMetrics =
    (data?.qualityMetrics as Array<{ label: string; value: number; target: number }> | undefined) ?? [];
  const topTopics = (data?.topTopics as Array<{ topic: string; count: number; trend: string }> | undefined) ?? [];
  const maxHourlyValue = hourlyData.reduce((acc, row) => Math.max(acc, row.value), 0) || 1;
  const maxTopicCount = topTopics.reduce((acc, row) => Math.max(acc, row.count), 0) || 1;
  const conversationTrend = (statsData.conversationDelta ?? 0) >= 0 ? 'up' : 'down';
  const resolutionTrend = (statsData.resolutionDelta ?? 0) >= 0 ? 'up' : 'down';
  const responseTrend = (statsData.avgResponseDelta ?? 0) <= 0 ? 'up' : 'down';
  const languageTrend = (statsData.languagesDelta ?? 0) >= 0 ? 'up' : 'down';
  const conversationChange = `${(statsData.conversationDelta ?? 0) >= 0 ? '+' : ''}${(statsData.conversationDelta ?? 0).toFixed(1)}%`;
  const resolutionChange = `${(statsData.resolutionDelta ?? 0) >= 0 ? '+' : ''}${(statsData.resolutionDelta ?? 0).toFixed(1)}%`;
  const responseChange = `${(statsData.avgResponseDelta ?? 0) >= 0 ? '+' : ''}${(statsData.avgResponseDelta ?? 0).toFixed(1)}s`;
  const languageChange = `${(statsData.languagesDelta ?? 0) >= 0 ? '+' : ''}${(statsData.languagesDelta ?? 0).toFixed(1)}`;

  const exportReport = async () => {
    setExporting(true);
    try {
      const report = await apiGet('/analytics/dashboard');
      const json = JSON.stringify(report, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `analytics-report-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Analítica Avanzada" description="Métricas detalladas del rendimiento y uso del asistente.">
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm hover:bg-muted transition-colors">
          <Calendar className="w-4 h-4" /> Últimos 30 días
        </button>
        <button
          onClick={() => void exportReport()}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <Download className="w-4 h-4" /> {exporting ? 'Exportando...' : 'Exportar Informe'}
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Conversaciones" value={statsData.totalConversations.toLocaleString()} change={conversationChange} trend={conversationTrend} icon={MessageSquare} />
        <StatsCard label="Resolución" value={`${statsData.resolutionRate}%`} change={resolutionChange} trend={resolutionTrend} icon={ThumbsUp} delay={0.05} />
        <StatsCard label="Tiempo Medio" value={`${statsData.avgResponseTime}s`} change={responseChange} trend={responseTrend} icon={Clock} delay={0.1} />
        <StatsCard label="Idiomas Activos" value={statsData.activeLanguages.toString()} change={languageChange} trend={languageTrend} icon={Globe} delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Hourly distribution */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl p-5 card-elevated">
          <h3 className="text-sm font-semibold mb-4">Distribución Horaria</h3>
          <div className="flex items-end gap-1.5 h-40">
            {hourlyData.map((d) => (
              <div key={d.hour} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-primary/20 hover:bg-primary/30 transition-colors relative group" style={{ height: `${(d.value / maxHourlyValue) * 100}%` }}>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-foreground text-background text-[9px] font-mono-data rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{d.value}</div>
                </div>
                <span className="text-[9px] text-muted-foreground font-mono-data">{d.hour}</span>
              </div>
            ))}
            {hourlyData.length === 0 ? <p className="text-xs text-muted-foreground">Sin datos en el periodo seleccionado.</p> : null}
          </div>
        </motion.div>

        {/* Quality metrics */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card rounded-xl p-5 card-elevated">
          <h3 className="text-sm font-semibold mb-4">Calidad Percibida</h3>
          <div className="space-y-4">
            {qualityMetrics.map((m) => (
              <div key={m.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span>{m.label}</span>
                  <span className={`font-mono-data font-medium ${m.value >= m.target ? 'text-success' : 'text-warning'}`}>{m.value}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${m.value >= m.target ? 'bg-success' : 'bg-warning'}`} style={{ width: `${m.value}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Objetivo: {m.target}%</div>
              </div>
            ))}
            {qualityMetrics.length === 0 ? <p className="text-xs text-muted-foreground">Sin datos de calidad por el momento.</p> : null}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Unresolved */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl p-5 card-elevated">
          <h3 className="text-sm font-semibold mb-4">Preguntas Sin Resolver</h3>
          <div className="space-y-2.5">
            {unresolvedQuestions.map((q) => (
              <div key={q.question} className="flex items-start gap-3 p-3 bg-warning/5 border border-warning/10 rounded-lg">
                <MessageSquare className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{q.question}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{q.count} veces · {q.lastAsked}</p>
                </div>
              </div>
            ))}
            {unresolvedQuestions.length === 0 ? <p className="text-xs text-muted-foreground">No hay preguntas pendientes en este periodo.</p> : null}
          </div>
        </motion.div>

        {/* Topics Trends */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-card rounded-xl p-5 card-elevated">
          <h3 className="text-sm font-semibold mb-4">Tendencias de Temas</h3>
          <div className="space-y-2.5">
            {topTopics.map((t, i) => (
              <div key={t.topic} className="flex items-center gap-3">
                <span className="text-[11px] font-mono-data text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{t.topic}</span>
                    <span className={`text-[11px] font-mono-data ${t.trend.startsWith('+') ? 'text-success' : 'text-destructive'}`}>{t.trend}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/30 rounded-full" style={{ width: `${(t.count / maxTopicCount) * 100}%` }} />
                  </div>
                </div>
                <span className="text-[11px] font-mono-data text-muted-foreground w-12 text-right">{t.count.toLocaleString()}</span>
              </div>
            ))}
            {topTopics.length === 0 ? <p className="text-xs text-muted-foreground">Sin tendencias detectadas todavia.</p> : null}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
