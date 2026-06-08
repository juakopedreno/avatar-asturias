import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import AsturiasMark from "@/components/brand/AsturiasMark";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { auth, login, verifyMfa } = useAuth();
  const [email, setEmail] = useState("admin@asturias.es");
  const [password, setPassword] = useState("password123");
  const [mfaCode, setMfaCode] = useState("123456");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (auth) {
    return <Navigate to="/admin" replace />;
  }

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await login(email, password);
      if (result.requiresMfa) {
        if (!result.sessionId) {
          throw new Error("No se ha recibido sessionId para MFA.");
        }
        setSessionId(result.sessionId);
      } else {
        navigate("/admin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfa = async (event: FormEvent) => {
    event.preventDefault();
    if (!sessionId) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await verifyMfa(sessionId, mfaCode);
      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo verificar MFA.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div
        className="hidden lg:flex flex-col justify-between p-10 text-primary-foreground"
        style={{ background: 'var(--gradient-dark)' }}
      >
        <AsturiasMark className="h-10 w-auto text-primary-foreground" variant="full" />
        <div>
          <h2 className="text-2xl font-semibold mb-2">Panel de gestión</h2>
          <p className="text-sm text-primary-foreground/75 max-w-md leading-relaxed">
            Administra fuentes, respuestas controladas, alertas y la demo del asistente avatar del Principado de Asturias.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/50">Acceso restringido a personal autorizado</p>
      </div>
      <div className="flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5 lg:hidden">
          <AsturiasMark className="w-10 h-10" />
          <div>
            <h1 className="text-base font-semibold leading-tight">Principado de Asturias</h1>
            <p className="text-xs text-muted-foreground">Panel del asistente avatar</p>
          </div>
        </div>
        <h1 className="text-xl font-semibold mb-1 hidden lg:block">Acceso al panel</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Inicia sesión para gestionar contenidos y la demo ciudadana.
        </p>

        {!sessionId ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-background"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-background"
              />
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              {submitting ? "Validando..." : "Entrar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfa} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Codigo MFA</label>
              <input
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-background"
              />
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              {submitting ? "Verificando..." : "Verificar MFA"}
            </button>
          </form>
        )}
      </div>
      </div>
    </div>
  );
}
