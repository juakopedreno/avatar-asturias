import { motion } from 'framer-motion';
import { Save, MessageSquare, Shield, Globe, Sliders, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import LanguageChip from '@/components/shared/LanguageChip';
import { useEffect, useState } from 'react';
import { useTrainingPolicyData } from '@/hooks/use-api-data';
import { apiPut } from '@/lib/api';

export default function Training() {
  const { data, refetch } = useTrainingPolicyData();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    tone: 'Formal y amable',
    responseStyle: 'conversational',
    maxResponseLength: 300,
    systemInstructions:
      'Eres un asistente virtual del Ayuntamiento de Torremolinos. Responde con fuentes verificables y en tono respetuoso.',
    fallbackMessage:
      'Lo siento, no dispongo de informacion suficiente para responder a esa consulta. ¿Puedo ayudarte con algo relacionado con turismo o servicios municipales?',
    allowedTopicsCsv: '',
    blockedTopicsCsv: '',
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      tone: String(data.tone ?? 'Formal y amable'),
      responseStyle: String(data.responseStyle ?? 'conversational'),
      maxResponseLength: Number(data.maxResponseLength ?? 300),
      systemInstructions: String(data.systemInstructions ?? ''),
      fallbackMessage: String(data.fallbackMessage ?? ''),
      allowedTopicsCsv: Array.isArray(data.allowedTopics) ? data.allowedTopics.join(', ') : '',
      blockedTopicsCsv: Array.isArray(data.blockedTopics) ? data.blockedTopics.join(', ') : '',
    });
  }, [data]);

  const trainingConfig = {
    activeLanguages: ['ES', 'EN', 'FR', 'DE'],
  };

  const savePolicy = async () => {
    const allowedTopics = form.allowedTopicsCsv
      .split(',')
      .map((topic) => topic.trim())
      .filter(Boolean);
    const blockedTopics = form.blockedTopicsCsv
      .split(',')
      .map((topic) => topic.trim())
      .filter(Boolean);
    setSaving(true);
    setError(null);
    try {
      await apiPut('/training/policy', {
        tone: form.tone.trim(),
        responseStyle: form.responseStyle,
        maxResponseLength: Number(form.maxResponseLength),
        systemInstructions: form.systemInstructions.trim(),
        fallbackMessage: form.fallbackMessage.trim(),
        allowedTopics,
        blockedTopics,
      });
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la configuracion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Entrenamiento Conversacional" description="Configura el comportamiento, tono y reglas del asistente.">
        <button
          onClick={() => void savePolicy()}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* System Instructions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-card rounded-xl p-5 card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Instrucciones del Sistema</h3>
          </div>
          <textarea
            value={form.systemInstructions}
            onChange={(event) => setForm((prev) => ({ ...prev, systemInstructions: event.target.value }))}
            rows={4}
            className="w-full px-4 py-3 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
          />
        </motion.div>

        {/* Tone & Style */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-xl p-5 card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Tono y Estilo</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tono de respuesta</label>
              <select
                value={form.tone}
                onChange={(event) => setForm((prev) => ({ ...prev, tone: event.target.value }))}
                className="w-full mt-1 h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option>Formal y amable</option>
                <option>Informal y cercano</option>
                <option>Técnico y preciso</option>
                <option>Turístico y entusiasta</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Estilo de respuesta</label>
              <select
                value={form.responseStyle}
                onChange={(event) => setForm((prev) => ({ ...prev, responseStyle: event.target.value }))}
                className="w-full mt-1 h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="conversational">Conversacional</option>
                <option value="concise">Conciso</option>
                <option value="formal">Formal</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Longitud máxima (palabras)</label>
              <input
                type="number"
                value={form.maxResponseLength}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxResponseLength: Number(event.target.value || 0) }))
                }
                className="w-full mt-1 h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </motion.div>

        {/* Active Languages */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl p-5 card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Idiomas Activos</h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {trainingConfig.activeLanguages.map((l) => <LanguageChip key={l} code={l} size="md" />)}
          </div>
          <button className="text-xs text-primary hover:underline">+ Añadir idioma</button>
        </motion.div>

        {/* Allowed Topics */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-xl p-5 card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-success" />
            <h3 className="text-sm font-semibold">Ámbitos Permitidos</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.allowedTopicsCsv.split(',').map((topic) => topic.trim()).filter(Boolean).map((t) => (
              <span key={t} className="px-3 py-1.5 text-xs font-medium bg-success/8 text-success border border-success/15 rounded-lg">{t}</span>
            ))}
          </div>
          <input
            value={form.allowedTopicsCsv}
            onChange={(event) => setForm((prev) => ({ ...prev, allowedTopicsCsv: event.target.value }))}
            placeholder="Turismo, Cultura, Transporte"
            className="w-full mt-3 h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </motion.div>

        {/* Blocked Topics */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl p-5 card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-semibold">Ámbitos Bloqueados</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.blockedTopicsCsv.split(',').map((topic) => topic.trim()).filter(Boolean).map((t) => (
              <span key={t} className="px-3 py-1.5 text-xs font-medium bg-destructive/8 text-destructive border border-destructive/15 rounded-lg">{t}</span>
            ))}
          </div>
          <input
            value={form.blockedTopicsCsv}
            onChange={(event) => setForm((prev) => ({ ...prev, blockedTopicsCsv: event.target.value }))}
            placeholder="Politica, Religion, Consejo medico"
            className="w-full mt-3 h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </motion.div>

        {/* Fallback Message */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="lg:col-span-2 bg-card rounded-xl p-5 card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold">Mensaje Fallback</h3>
          </div>
          <textarea
            value={form.fallbackMessage}
            onChange={(event) => setForm((prev) => ({ ...prev, fallbackMessage: event.target.value }))}
            rows={3}
            className="w-full px-4 py-3 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
          />
          <p className="text-[11px] text-muted-foreground mt-2">Este mensaje se mostrará cuando el asistente no pueda responder a una consulta.</p>
        </motion.div>
      </div>
      {error ? <p className="text-xs text-destructive mt-3">{error}</p> : null}
    </div>
  );
}
