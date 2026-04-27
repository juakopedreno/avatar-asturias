import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

type FitbitTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope?: string;
  userId?: string;
};

type FitbitTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  user_id?: string;
};

@Injectable()
export class WearablesService {
  private static readonly REALTIME_CACHE_MS = (() => {
    const raw = process.env.WEARABLES_REALTIME_CACHE_MS;
    const n = raw ? Number.parseInt(raw, 10) : 180_000;
    return Number.isFinite(n) && n >= 30_000 ? n : 180_000;
  })();
  private static readonly REALTIME_STALE_MS = 30 * 60 * 1000;

  private readonly logger = new Logger(WearablesService.name);
  /** Respuesta Fitbit en caché para no disparar 429 (muchas llamadas en paralelo + polling). */
  private realtimeCache: { body: Record<string, unknown>; until: number } | null = null;
  private realtimeStale: { body: Record<string, unknown>; storedAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  getFitbitConnectData() {
    const clientId = process.env.FITBIT_CLIENT_ID;
    const redirectUri = process.env.FITBIT_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      throw new Error("FITBIT_CLIENT_ID y FITBIT_REDIRECT_URI son obligatorios.");
    }
    const scopes = ["activity", "heartrate", "profile", "sleep"].join(" ");
    const authUrl =
      "https://www.fitbit.com/oauth2/authorize" +
      `?response_type=code&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}`;
    return { authUrl, redirectUri, scopes };
  }

  async exchangeCode(code: string) {
    const clientId = process.env.FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;
    const redirectUri = process.env.FITBIT_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Variables Fitbit incompletas en servidor.");
    }
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`No se pudo intercambiar code de Fitbit: ${err}`);
    }
    const token = (await response.json()) as FitbitTokenResponse;
    await this.saveTokens(token);
    this.realtimeCache = null;
    this.realtimeStale = null;
    return { ok: true };
  }

  async getRealtime(includeDiagnostics = false) {
    const now = Date.now();
    if (!includeDiagnostics && this.realtimeCache && now < this.realtimeCache.until) {
      return { ...this.realtimeCache.body } as Awaited<ReturnType<WearablesService["computeRealtimePayload"]>>;
    }

    try {
      const payload = await this.computeRealtimePayload(includeDiagnostics);
      if (
        !includeDiagnostics &&
        payload &&
        typeof payload === "object" &&
        (payload as { connected?: boolean }).connected === true
      ) {
        const body = { ...(payload as Record<string, unknown>) };
        this.realtimeStale = { body, storedAt: now };
        this.realtimeCache = {
          body,
          until: now + WearablesService.REALTIME_CACHE_MS,
        };
      }
      return payload;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`getRealtime falló: ${msg.slice(0, 300)}`);

      const stale = this.realtimeStale;
      if (stale && now - stale.storedAt < WearablesService.REALTIME_STALE_MS) {
        return {
          ...stale.body,
          note:
            "Límite de consultas de Fitbit (429). Mostrando los últimos datos guardados; espera unos minutos.",
          source: "fitbit",
        } as Awaited<ReturnType<WearablesService["computeRealtimePayload"]>>;
      }

      const friendly =
        msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")
          ? "Fitbit ha limitado temporalmente las consultas (cuota). Espera 5–15 minutos y recarga; evita abrir varias pestañas a la vez."
          : `No se pudo leer Fitbit: ${msg.slice(0, 180)}`;

      return {
        connected: false,
        message: friendly,
        source: "error",
        ...(includeDiagnostics ? { diagnostics: { uncaughtError: msg } } : {}),
      };
    }
  }

  private async computeRealtimePayload(includeDiagnostics: boolean) {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) {
      return {
        connected: false,
        message: "Fitbit no conectado todavía",
      };
    }

    const [profileResp, heartDayResp, heartWeekResp, stepsResp] = await Promise.all([
      this.fitbitGet("https://api.fitbit.com/1/user/-/profile.json", accessToken),
      this.fitbitGet("https://api.fitbit.com/1/user/-/activities/heart/date/today/1d.json", accessToken),
      this.fitbitGet("https://api.fitbit.com/1/user/-/activities/heart/date/today/7d.json", accessToken),
      this.fitbitGet("https://api.fitbit.com/1/user/-/activities/steps/date/today/1d.json", accessToken),
    ]);

    const profile = profileResp?.user ?? {};
    // profile.json documentado no incluye restingHeartRate; por si la API lo añade en algún caso:
    const restingFromProfile = this.coalescePositiveInt(
      (profile as { restingHeartRate?: unknown }).restingHeartRate,
    );

    const restingFromDay = this.restingHeartFromActivitiesHeartEntry(
      heartDayResp?.["activities-heart"]?.[0],
    );
    const restingFromWeek = this.latestRestingHeartFromWeek(heartWeekResp?.["activities-heart"]);

    let latestIntraday: number | null = null;
    try {
      const intraResp = await this.fitbitGet(
        "https://api.fitbit.com/1/user/-/activities/heart/date/today/1d/1min.json",
        accessToken,
      );
      const heartDataset = intraResp?.["activities-heart-intraday"]?.dataset ?? [];
      if (Array.isArray(heartDataset) && heartDataset.length > 0) {
        const last = heartDataset[heartDataset.length - 1];
        latestIntraday = this.coalescePositiveInt(last?.value);
      }
    } catch {
      // Intradía a veces vacío o no disponible según tipo de app Fitbit; usamos resumen/semana.
    }

    const restingHr = restingFromDay ?? restingFromWeek ?? restingFromProfile;
    const heartRate = latestIntraday ?? restingHr ?? null;

    const rawSteps = stepsResp?.["activities-steps"]?.[0]?.value;
    const steps =
      rawSteps !== undefined && rawSteps !== null && rawSteps !== ""
        ? Number.parseInt(String(rawSteps), 10)
        : null;
    const stepsToday = Number.isFinite(steps) ? steps : null;

    const note =
      heartRate == null
        ? "Sin dato de pulso: sincroniza la pulsera con la app Fitbit; el reposo puede aparecer al día siguiente."
        : undefined;

    const today = new Date().toISOString().slice(0, 10);
    const activityResult = await this.fitbitFetchJson(
      `https://api.fitbit.com/1/user/-/activities/date/${today}.json`,
      accessToken,
    );
    const activityJson = activityResult.ok ? activityResult.body : null;
    const summary = activityJson?.summary as Record<string, unknown> | undefined;
    const caloriesOut = this.nonNegativeInt(summary?.caloriesOut);
    const floors = this.nonNegativeInt(summary?.floors);
    const veryActiveMinutes = this.nonNegativeInt(summary?.veryActiveMinutes);
    const fairlyActiveMinutes = this.nonNegativeInt(summary?.fairlyActiveMinutes);
    const lightlyActiveMinutes = this.nonNegativeInt(summary?.lightlyActiveMinutes);
    const sedentaryMinutes = this.nonNegativeInt(summary?.sedentaryMinutes);
    let distanceKm: number | null = null;
    const distances = summary?.distances;
    if (Array.isArray(distances)) {
      const total = distances.find(
        (x: unknown) =>
          x &&
          typeof x === "object" &&
          (x as { activity?: string }).activity === "total",
      ) as { distance?: unknown } | undefined;
      if (total?.distance != null) {
        const d = Number(total.distance);
        if (Number.isFinite(d) && d >= 0) {
          distanceKm = Math.round(d * 1000) / 1000;
        }
      }
    }

    const todayDate = new Date().toISOString().slice(0, 10);
    const yesterdayDateObj = new Date();
    yesterdayDateObj.setUTCDate(yesterdayDateObj.getUTCDate() - 1);
    const yesterdayDate = yesterdayDateObj.toISOString().slice(0, 10);
    const sleepTodayResult = await this.fitbitFetchJson(
      `https://api.fitbit.com/1.2/user/-/sleep/date/${todayDate}.json`,
      accessToken,
    );
    const sleepYesterdayResult = await this.fitbitFetchJson(
      `https://api.fitbit.com/1.2/user/-/sleep/date/${yesterdayDate}.json`,
      accessToken,
    );
    const sleepTodayJson = sleepTodayResult.ok ? sleepTodayResult.body : null;
    const sleepYesterdayJson = sleepYesterdayResult.ok ? sleepYesterdayResult.body : null;
    const sleepResult =
      sleepTodayResult.ok && Array.isArray(sleepTodayJson?.sleep) && sleepTodayJson.sleep.length > 0
        ? sleepTodayResult
        : sleepYesterdayResult;
    const sleepJson =
      sleepResult === sleepTodayResult
        ? sleepTodayJson
        : sleepYesterdayJson;
    let sleepDateLast: string | null = null;
    let sleepMinutesLast: number | null = null;
    let sleepEfficiencyLast: number | null = null;
    const sleepArr = sleepJson?.sleep;
    if (Array.isArray(sleepArr) && sleepArr.length > 0) {
      const sl = sleepArr[0] as Record<string, unknown>;
      if (typeof sl.dateOfSleep === "string") {
        sleepDateLast = sl.dateOfSleep;
      }
      sleepMinutesLast = this.nonNegativeInt(sl.minutesAsleep);
      sleepEfficiencyLast = this.nonNegativeInt(sl.efficiency);
    }

    const diagnostics = includeDiagnostics
      ? {
          activity: activityResult.ok
            ? {
                httpStatus: activityResult.status,
                hasSummary: Boolean(activityJson?.summary),
                summaryKeys:
                  activityJson?.summary && typeof activityJson.summary === "object"
                    ? Object.keys(activityJson.summary as object).slice(0, 20)
                    : [],
              }
            : {
                httpStatus: activityResult.status,
                error: activityResult.errorSnippet,
              },
          sleep: sleepResult.ok
            ? {
                httpStatus: sleepResult.status,
                sleepLogsCount: Array.isArray(sleepJson?.sleep) ? sleepJson.sleep.length : 0,
              }
            : {
                httpStatus: sleepResult.status,
                error: sleepResult.errorSnippet,
              },
        }
      : undefined;

    return {
      connected: true,
      heartRate,
      restingHeartRate: restingHr,
      stepsToday,
      heartRateFromIntraday: latestIntraday != null,
      caloriesOut,
      distanceKm,
      floors,
      veryActiveMinutes,
      fairlyActiveMinutes,
      lightlyActiveMinutes,
      sedentaryMinutes,
      sleepDateLast,
      sleepMinutesLast,
      sleepEfficiencyLast,
      updatedAt: new Date().toISOString(),
      source: "fitbit",
      ...(note ? { note } : {}),
      ...(diagnostics ? { diagnostics } : {}),
    };
  }

  private nonNegativeInt(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return Math.round(value);
    }
    if (typeof value === "string" && value.trim() !== "") {
      const n = Number.parseInt(value, 10);
      if (Number.isFinite(n) && n >= 0) {
        return n;
      }
    }
    return null;
  }

  private coalescePositiveInt(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.round(value);
    }
    if (typeof value === "string" && value.trim() !== "") {
      const n = Number.parseInt(value, 10);
      if (Number.isFinite(n) && n > 0) {
        return n;
      }
    }
    return null;
  }

  private restingHeartFromActivitiesHeartEntry(entry: unknown): number | null {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const value = (entry as { value?: unknown }).value;
    if (!value || typeof value !== "object") {
      return null;
    }
    return this.coalescePositiveInt((value as { restingHeartRate?: unknown }).restingHeartRate);
  }

  private latestRestingHeartFromWeek(entries: unknown): number | null {
    if (!Array.isArray(entries) || entries.length === 0) {
      return null;
    }
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const r = this.restingHeartFromActivitiesHeartEntry(entries[i]);
      if (r != null) {
        return r;
      }
    }
    return null;
  }

  private async fitbitFetchJson(
    url: string,
    accessToken: string,
  ): Promise<
    | { ok: true; status: number; body: any }
    | { ok: false; status: number; errorSnippet: string }
  > {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      return { ok: false, status: 0, errorSnippet: `fetch: ${m.slice(0, 200)}` };
    }
    const status = response.status;
    const text = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        status,
        errorSnippet: text.replace(/\s+/g, " ").slice(0, 240),
      };
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return { ok: true, status, body: {} };
    }
    try {
      return { ok: true, status, body: JSON.parse(trimmed) as any };
    } catch {
      return { ok: false, status, errorSnippet: "respuesta-no-json" };
    }
  }

  private async fitbitGet(url: string, accessToken: string): Promise<any> {
    const r = await this.fitbitFetchJson(url, accessToken);
    if (!r.ok) {
      throw new Error(`Fitbit GET falló (${r.status}): ${r.errorSnippet}`);
    }
    return r.body;
  }

  private async saveTokens(token: FitbitTokenResponse) {
    const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
    const value: FitbitTokens = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt,
      scope: token.scope,
      userId: token.user_id,
    };
    await this.prisma.systemConfig.upsert({
      where: { key: "fitbit_tokens" },
      create: { key: "fitbit_tokens", value: value as unknown as object },
      update: { value: value as unknown as object },
    });
  }

  private async getStoredTokens(): Promise<FitbitTokens | null> {
    const row = await this.prisma.systemConfig.findUnique({ where: { key: "fitbit_tokens" } });
    if (!row || !row.value) return null;
    return row.value as unknown as FitbitTokens;
  }

  private async getValidAccessToken(): Promise<string | null> {
    const stored = await this.getStoredTokens();
    if (!stored) return null;

    const expiresAtMs = new Date(stored.expiresAt).getTime();
    const isExpired = Number.isNaN(expiresAtMs) || Date.now() > expiresAtMs - 60_000;
    if (!isExpired) {
      return stored.accessToken;
    }

    const refreshed = await this.refreshToken(stored.refreshToken);
    return refreshed.access_token;
  }

  private async refreshToken(refreshToken: string): Promise<FitbitTokenResponse> {
    const clientId = process.env.FITBIT_CLIENT_ID;
    const clientSecret = process.env.FITBIT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Faltan FITBIT_CLIENT_ID / FITBIT_CLIENT_SECRET.");
    }
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const response = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`No se pudo refrescar token Fitbit: ${txt}`);
    }
    const token = (await response.json()) as FitbitTokenResponse;
    await this.saveTokens(token);
    return token;
  }
}
