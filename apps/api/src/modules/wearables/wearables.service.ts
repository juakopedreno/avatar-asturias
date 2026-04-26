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
  private readonly logger = new Logger(WearablesService.name);

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
    return { ok: true };
  }

  async getRealtime(includeDiagnostics = false) {
    try {
      return await this.computeRealtimePayload(includeDiagnostics);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`getRealtime falló: ${msg}`);
      return {
        connected: false,
        message: `No se pudo leer Fitbit: ${msg.slice(0, 200)}`,
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

    const activityResult = await this.fitbitFetchJson(
      "https://api.fitbit.com/1/user/-/activities/date/today.json",
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

    const afterSleep = new Date();
    afterSleep.setUTCDate(afterSleep.getUTCDate() - 21);
    const afterSleepStr = afterSleep.toISOString().slice(0, 10);
    const sleepUrl = `https://api.fitbit.com/1.2/user/-/sleep/list.json?beforeDate=today&afterDate=${afterSleepStr}&sort=desc&limit=1`;
    const sleepResult = await this.fitbitFetchJson(sleepUrl, accessToken);
    const sleepJson = sleepResult.ok ? sleepResult.body : null;
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
