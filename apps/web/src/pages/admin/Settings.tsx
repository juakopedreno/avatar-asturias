import { motion } from 'framer-motion';
import { Save, Globe, Monitor, Box, Smartphone, Volume2, Shield, Bell, Palette } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { useAvatarProviderData, useSettingsData, useTrainingPolicyData } from '@/hooks/use-api-data';
import LanguageChip from '@/components/shared/LanguageChip';
import { apiPut } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const { data: avatarProvider } = useAvatarProviderData();
  const { data: settingsData, refetch } = useSettingsData();
  const { data } = useTrainingPolicyData();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsConfig, setSettingsConfig] = useState({
    branding: {
      name: 'Asistente Torremolinos',
      primaryColor: '#00A3A3',
    },
    channels: [
      { id: 'web', name: 'Widget Web', active: true },
      { id: 'kiosk', name: 'Kiosco Interactivo', active: true },
      { id: 'holobox', name: 'Holobox', active: false },
      { id: 'app', name: 'App Móvil', active: false },
    ],
    privacy: {
      dataRetentionDays: 90,
      anonymizeAfterDays: 30,
      cookieConsent: true,
      gdprCompliant: true,
    },
    voice: {
      provider: 'Anam',
      defaultVoice: 'es-ES-default',
      speed: 1,
      pitch: 1,
    },
    notifications: [
      { label: 'Errores de sincronización', checked: true },
      { label: 'Nuevas preguntas sin resolver', checked: true },
      { label: 'Informes semanales', checked: true },
      { label: 'Cambios en contenidos', checked: false },
      { label: 'Accesos de nuevos usuarios', checked: false },
    ],
  });

  useEffect(() => {
    if (!settingsData) return;
    setSettingsConfig(settingsData as typeof settingsConfig);
  }, [settingsData]);

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPut('/settings', settingsConfig);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la configuracion');
    } finally {
      setSaving(false);
    }
  };

  const trainingConfig = {
    activeLanguages: ['ES', 'EN', 'FR', 'DE'],
    ...data,
  };
  const channelIcons: Record<string, typeof Globe> = { Globe, Monitor, Box, Smartphone };

  return (
    <div>
      <PageHeader title="Configuración General" description="Ajustes de branding, canales, privacidad y parámetros generales.">
        <button
          onClick={() => void saveSettings()}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Branding */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-5 card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Branding</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nombre del asistente</label>
              <input
                value={settingsConfig.branding.name}
                onChange={(event) =>
                  setSettingsConfig((prev) => ({
                    ...prev,
                    branding: { ...prev.branding, name: event.target.value },
                  }))
                }
                className="w-full mt-1 h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Color principal</label>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-9 h-9 rounded-lg bg-primary border border-border" />
                <input
                  value={settingsConfig.branding.primaryColor}
                  onChange={(event) =>
                    setSettingsConfig((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, primaryColor: event.target.value },
                    }))
                  }
                  className="flex-1 h-9 px-3 text-sm font-mono-data bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Languages */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-xl p-5 card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Idiomas Activos</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {trainingConfig.activeLanguages.map((lang) => (
              <div key={lang} className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg">
                <LanguageChip code={lang} size="md" />
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-8 h-4.5 bg-muted peer-checked:bg-primary rounded-full peer-checked:after:translate-x-3.5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-card after:rounded-full after:h-3.5 after:w-3.5 after:transition-all" />
                </label>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Channels */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl p-5 card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Canales de Despliegue</h3>
          </div>
          <div className="space-y-3">
            {settingsConfig.channels.map((ch) => (
              <div key={ch.id} className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{ch.name}</p>
                    <p className="text-[11px] text-muted-foreground">Canal {ch.id}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ch.active}
                    onChange={(event) =>
                      setSettingsConfig((prev) => ({
                        ...prev,
                        channels: prev.channels.map((channel) =>
                          channel.id === ch.id ? { ...channel, active: event.target.checked } : channel,
                        ),
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-checked:bg-primary rounded-full peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all" />
                </label>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Voice */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-xl p-5 card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Voz y Audio</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Proveedor TTS</label>
              <input
                value={settingsConfig.voice.provider}
                onChange={(event) =>
                  setSettingsConfig((prev) => ({
                    ...prev,
                    voice: { ...prev.voice, provider: event.target.value },
                  }))
                }
                className="w-full mt-1 h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Proveedor avatar activo</label>
              <input
                value={String((avatarProvider as { provider?: string } | undefined)?.provider ?? 'mock')}
                className="w-full mt-1 h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none"
                readOnly
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Voz por defecto</label>
              <select
                value={settingsConfig.voice.defaultVoice}
                onChange={(event) =>
                  setSettingsConfig((prev) => ({
                    ...prev,
                    voice: { ...prev.voice, defaultVoice: event.target.value },
                  }))
                }
                className="w-full mt-1 h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option>{settingsConfig.voice.defaultVoice}</option>
                <option>es-ES-AlvaroNeural</option>
                <option>en-US-JennyNeural</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Velocidad</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settingsConfig.voice.speed}
                  onChange={(event) =>
                    setSettingsConfig((prev) => ({
                      ...prev,
                      voice: { ...prev.voice, speed: Number(event.target.value) },
                    }))
                  }
                  className="w-full mt-2 accent-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tono</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settingsConfig.voice.pitch}
                  onChange={(event) =>
                    setSettingsConfig((prev) => ({
                      ...prev,
                      voice: { ...prev.voice, pitch: Number(event.target.value) },
                    }))
                  }
                  className="w-full mt-2 accent-primary"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Privacy */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl p-5 card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Privacidad y Datos</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Retención de datos (días)</label>
              <input
                type="number"
                value={settingsConfig.privacy.dataRetentionDays}
                onChange={(event) =>
                  setSettingsConfig((prev) => ({
                    ...prev,
                    privacy: { ...prev.privacy, dataRetentionDays: Number(event.target.value || 0) },
                  }))
                }
                className="w-full mt-1 h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Anonimizar después de (días)</label>
              <input
                type="number"
                value={settingsConfig.privacy.anonymizeAfterDays}
                onChange={(event) =>
                  setSettingsConfig((prev) => ({
                    ...prev,
                    privacy: { ...prev.privacy, anonymizeAfterDays: Number(event.target.value || 0) },
                  }))
                }
                className="w-full mt-1 h-9 px-3 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Consentimiento de cookies</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsConfig.privacy.cookieConsent}
                  onChange={(event) =>
                    setSettingsConfig((prev) => ({
                      ...prev,
                      privacy: { ...prev.privacy, cookieConsent: event.target.checked },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted peer-checked:bg-primary rounded-full peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Cumplimiento RGPD</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsConfig.privacy.gdprCompliant}
                  onChange={(event) =>
                    setSettingsConfig((prev) => ({
                      ...prev,
                      privacy: { ...prev.privacy, gdprCompliant: event.target.checked },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted peer-checked:bg-primary rounded-full peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card rounded-xl p-5 card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Notificaciones</h3>
          </div>
          <div className="space-y-3">
            {settingsConfig.notifications.map((n) => (
              <div key={n.label} className="flex items-center justify-between py-1">
                <span className="text-sm">{n.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={n.checked}
                    onChange={(event) =>
                      setSettingsConfig((prev) => ({
                        ...prev,
                        notifications: prev.notifications.map((notif) =>
                          notif.label === n.label ? { ...notif, checked: event.target.checked } : notif,
                        ),
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-checked:bg-primary rounded-full peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all" />
                </label>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      {error ? <p className="text-xs text-destructive mt-3">{error}</p> : null}
    </div>
  );
}
