import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bot, Globe, Database, BarChart3, ShieldCheck, MessageSquare, Mic, ChevronRight, CheckCircle2, Zap, Lock, Languages } from 'lucide-react';
import logo from '@/assets/sha-logo.png';

const features = [
  { icon: Bot, title: 'Avatar Hiperrealista', desc: 'Interacción natural por voz y texto con un avatar conversacional de última generación.' },
  { icon: Languages, title: 'Multiidioma Nativo', desc: '6+ idiomas con detección automática. Español, inglés, alemán, francés y más.' },
  { icon: Database, title: 'Fuentes Verificadas', desc: 'Respuestas trazables basadas exclusivamente en fuentes oficiales y verificadas.' },
  { icon: BarChart3, title: 'Analítica Avanzada', desc: 'Métricas en tiempo real de uso, satisfacción, idiomas y temas más consultados.' },
  { icon: ShieldCheck, title: 'Auditoría Completa', desc: 'Trazabilidad total de cambios, accesos y modificaciones del sistema.' },
  { icon: Lock, title: 'Privacidad y RGPD', desc: 'Cumplimiento normativo, anonimización de datos y retención configurable.' },
];

const useCases = [
  { title: 'Centros de bienestar', desc: 'Acompañamiento 24/7 a pacientes y huéspedes en su idioma con orientación de bienestar personalizada.' },
  { title: 'Puntos de atención clínica', desc: 'Puntos de atención en recepción y zonas comunes con experiencia inmersiva y guiada.' },
  { title: 'Portal de paciente', desc: 'Widget integrado en web y app para resolver dudas frecuentes de salud y bienestar.' },
  { title: 'Programas y retiros wellness', desc: 'Asistente virtual para programas de bienestar, retiros y seguimiento personalizado.' },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Torremolinos" className="h-8" />
            <span className="font-semibold text-foreground">SHA Wellness Avatar</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#usecases" className="hover:text-foreground transition-colors">Casos de uso</a>
            <a href="#demo" className="hover:text-foreground transition-colors">Demo</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden md:block">Panel Admin</Link>
            <Link to="/demo" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              Probar Demo
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-primary text-xs font-medium mb-6">
              <Zap className="w-3.5 h-3.5" />
              Asistente de salud conversacional
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Tu asistente visual<br />
              <span className="text-gradient">para bienestar integral</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Un asistente de salud con avatar hiperrealista para acompañar a pacientes y huéspedes con orientación de bienestar, hábitos saludables y atención personalizada, con respuestas trazables y seguras.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/demo" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                Ver Demo en Vivo <ChevronRight className="w-4 h-4" />
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 px-6 py-3 bg-card text-foreground rounded-xl text-sm font-medium border border-border hover:border-primary/30 transition-all card-elevated">
                Descubrir Más
              </a>
            </div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 relative max-w-5xl mx-auto"
          >
            <div className="rounded-2xl overflow-hidden border border-border card-elevated bg-card">
              <div className="bg-gradient-to-br from-foreground to-foreground/80 aspect-[16/9] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                <div className="relative z-10 text-center">
                  <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center animate-float">
                    <Bot className="w-16 h-16 text-primary" />
                  </div>
                  <div className="flex items-center gap-3 px-5 py-2.5 glass rounded-full mx-auto w-fit">
                    <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse-soft" />
                    <span className="text-sm font-medium text-primary-foreground/90 tracking-wide">AVATAR DISPONIBLE</span>
                    <Mic className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-card rounded-xl border border-border card-elevated flex items-center gap-3">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">ES · EN · DE · FR · IT · PT</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Funcionalidades de Salud Digital</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Una plataforma completa para acompañamiento de bienestar y asistencia sanitaria digital.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={f.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} className="bg-card rounded-xl p-6 card-elevated group">
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="usecases" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Casos de Uso Clínico y Wellness</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Adaptable a clínicas, centros wellness y entornos de atención preventiva.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-5">
            {useCases.map((uc, i) => (
              <motion.div key={uc.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }} className="bg-card rounded-xl p-6 card-elevated border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">{uc.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{uc.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="demo" className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp} className="bg-gradient-to-br from-foreground to-foreground/90 rounded-2xl p-12 text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">¿Listo para transformar la experiencia de salud y bienestar?</h2>
              <p className="text-primary-foreground/70 mb-8 max-w-lg mx-auto">Solicite una demo personalizada y descubra cómo SHA Wellness Avatar puede optimizar la comunicación de su municipio.</p>
              <div className="flex items-center justify-center gap-4">
                <Link to="/demo" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-all">
                  Ver Demo Interactiva
                </Link>
                <button className="px-6 py-3 bg-primary-foreground/10 text-primary-foreground rounded-xl text-sm font-medium border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-all">
                  Solicitar Información
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Torremolinos" className="h-6" />
            <span>SHA Wellness Avatar © 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Privacidad</span>
            <span>Términos</span>
            <span>Contacto</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
