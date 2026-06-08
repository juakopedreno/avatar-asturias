import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth-context";

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-xl border border-border p-6">
        <h1 className="text-xl font-semibold mb-1">Acceso Admin</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Inicia sesion para gestionar la plataforma.
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
  );
}
