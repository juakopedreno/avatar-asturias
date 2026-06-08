import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bot, Database, BarChart3, ShieldCheck, MessageSquare, Mic, ChevronRight, CheckCircle2, Zap, Lock, Languages } from 'lucide-react';
import logo from '@/assets/torremolinos-logo-alt.png';

const features = [
  { icon: Bot, title: 'Avatar Hiperrealista', desc: 'Interacción natural por voz y texto con un avatar conversacional de última generación.' },
  { icon: Languages, title: 'Multiidioma', desc: 'Español, inglés, alemán y francés con detección automática según el usuario.' },
  { icon: Database, title: 'Fuentes Verificadas', desc: 'Respuestas trazables basadas en documentación oficial ingestada en el panel.' },
  { icon: BarChart3, title: 'Analítica', desc: 'Métricas de uso, idiomas y temas más consultados para mejorar el servicio.' },
  { icon: ShieldCheck, title: 'Auditoría', desc: 'Trazabilidad de cambios, accesos y publicaciones en el backoffice.' },
  { icon: Lock, title: 'Privacidad y RGPD', desc: 'Cumplimiento normativo, retención configurable y control de datos.' },
];

const useCases = [
  { title: 'Atención ciudadana', desc: 'Resolución de dudas frecuentes sobre trámites, ayudas y servicios del Principado.' },
  { title: 'Puntos de información', desc: 'Quioscos o pantallas en oficinas con avatar que guía al ciudadano en su idioma.' },
  { title: 'Portal web', desc: 'Asistente embebible en la web institucional con el mismo corpus de conocimiento.' },
  { title: 'Temas sectoriales amplios', desc: 'Turismo, empleo, cultura, medio ambiente u otros ámbitos con fuentes dedicadas en el panel.' },
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
      <nav className="fixed top-0 w-full z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Principado de Asturias" className="h-8" />
            <span className="font-semibold text-foreground">Avatar Asturias</span>
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

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-primary text-xs font-medium mb-6">
              <Zap className="w-3.5 h-3.5" />
              Asistente institucional conversacional
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Tu asistente visual<br />
              <span className="text-gradient">del Principado de Asturias</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Un avatar hiperrealista que responde con información verificada sobre el tema que configures en el panel: trámites, ayudas, normativa, turismo y más, con citas a fuentes oficiales.
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

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-16 relative max-w-4xl mx-auto"
          >
            <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/5 via-card to-primary/10 border border-border card-elevated flex items-center justify-center overflow-hidden">
              <div className="text-center p-8">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-10 h-10 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Avatar conversacional · Voz y texto · Fuentes verificadas</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Funcionalidades</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Misma plataforma de ingesta y gobierno del conocimiento que en proyectos enterprise.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} className="bg-card rounded-xl p-6 card-elevated border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="usecases" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Casos de uso</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Un tema amplio, un corpus amplio: tú defines el alcance desde el panel de fuentes.</p>
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

      <section id="demo" className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp} className="bg-gradient-to-br from-foreground to-foreground/90 rounded-2xl p-12 text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Prueba el asistente con tu corpus</h2>
              <p className="text-primary-foreground/70 mb-8 max-w-lg mx-auto">
                Ingesta documentación en el panel admin y valida respuestas en la demo interactiva con avatar.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link to="/demo" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-all">
                  Ver Demo Interactiva
                </Link>
                <Link to="/admin" className="px-6 py-3 bg-primary-foreground/10 text-primary-foreground rounded-xl text-sm font-medium border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-all">
                  Panel de ingesta
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Principado de Asturias" className="h-6" />
            <span>Avatar Principado de Asturias © 2026</span>
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
