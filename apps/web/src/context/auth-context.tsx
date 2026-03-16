import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, clearStoredTokens, setStoredTokens } from "@/lib/api";

type Role = "admin" | "editor" | "viewer" | "auditor";

interface AuthState {
  sessionId?: string;
  role: Role;
  email: string;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  auth: AuthState | null;
  login: (email: string, password: string) => Promise<{ requiresMfa: boolean; sessionId?: string }>;
  verifyMfa: (sessionId: string, code: string) => Promise<void>;
  hydrateMe: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "avatar-admin-auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.email || !parsed.role) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as AuthState;
  });

  const login = async (email: string, password: string) => {
    const result = await apiPost<{
      sessionId?: string;
      requiresMfa: boolean;
      role: Role;
      accessToken?: string;
      refreshToken?: string;
      email?: string;
    }>("/auth/login", { email, password });

    if (!result.requiresMfa && result.accessToken && result.refreshToken && result.email) {
      setStoredTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      const session = {
        sessionId: result.sessionId,
        role: result.role,
        email: result.email,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      } satisfies AuthState;
      setAuth(session);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
    return { requiresMfa: result.requiresMfa, sessionId: result.sessionId };
  };

  const verifyMfa = async (sessionId: string, code: string) => {
    const token = await apiPost<{
      accessToken: string;
      refreshToken: string;
      role: Role;
      email: string;
    }>("/auth/mfa/verify", { sessionId, code });
    setStoredTokens({
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
    });
    const session = {
      sessionId,
      role: token.role,
      email: token.email,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
    } satisfies AuthState;
    setAuth(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  };

  const hydrateMe = async () => {
    if (!auth?.accessToken) {
      return;
    }
    const me = await apiGet<{
      email: string;
      role: Role;
    }>("/auth/me");
    const updated = {
      ...auth,
      email: me.email,
      role: me.role,
    };
    setAuth(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const logout = () => {
    if (auth?.refreshToken) {
      void apiPost("/auth/logout", { refreshToken: auth.refreshToken });
    }
    setAuth(null);
    localStorage.removeItem(STORAGE_KEY);
    clearStoredTokens();
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      login,
      verifyMfa,
      hydrateMe,
      logout,
    }),
    [auth, hydrateMe, login, logout, verifyMfa],
  );

  useEffect(() => {
    const listener = () => {
      setAuth(null);
      localStorage.removeItem(STORAGE_KEY);
      clearStoredTokens();
    };
    window.addEventListener("auth:expired", listener);
    return () => window.removeEventListener("auth:expired", listener);
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
