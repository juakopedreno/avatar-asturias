const runtimeDefaultApiBaseUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3000/api`
    : "http://localhost:3000/api";

/** Garantiza sufijo /api (Nest globalPrefix) si en Vercel pusiste solo el host de Railway. */
function normalizeApiBaseUrl(raw: string): string {
  const u = raw.trim().replace(/\/+$/, "");
  return u.toLowerCase().endsWith("/api") ? u : `${u}/api`;
}

const API_BASE_URL = normalizeApiBaseUrl(
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || runtimeDefaultApiBaseUrl,
);
const TOKEN_STORAGE_KEY = "avatar-admin-tokens";

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
};

function getStoredTokens(): StoredTokens | null {
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as StoredTokens) : null;
}

export function setStoredTokens(tokens: StoredTokens) {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

export function clearStoredTokens() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const json = (await response.json()) as { message?: string | string[] };
      if (typeof json.message === "string") {
        message = json.message;
      } else if (Array.isArray(json.message)) {
        message = json.message.join(", ");
      }
    } catch {
      const body = await response.text();
      if (body) {
        message = body;
      }
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

async function requestWithAuth(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  const tokens = getStoredTokens();
  const headers = new Headers(init.headers ?? {});
  if (tokens?.accessToken) {
    headers.set("Authorization", `Bearer ${tokens.accessToken}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && retry && tokens?.refreshToken) {
    const refreshed = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (refreshed.ok) {
      const next = (await refreshed.json()) as { accessToken: string; refreshToken: string };
      setStoredTokens({
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
      });
      return requestWithAuth(path, init, false);
    }
    clearStoredTokens();
    window.dispatchEvent(new CustomEvent("auth:expired"));
  }
  return response;
}

export async function apiGet<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await requestWithAuth(path, {
    ...init,
    method: "GET",
  });
  return parseResponse(response);
}

export async function apiPost<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await requestWithAuth(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function apiPut<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await requestWithAuth(path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function apiPatch<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await requestWithAuth(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await requestWithAuth(path, {
    method: "DELETE",
  });
  return parseResponse(response);
}

export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  const response = await requestWithAuth(path, {
    method: "POST",
    body: formData,
  });
  return parseResponse(response);
}
