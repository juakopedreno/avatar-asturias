import { Injectable } from "@nestjs/common";
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

  async getRealtime() {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) {
      return {
        connected: false,
        message: "Fitbit no conectado todavía",
      };
    }

    const [profileResp, heartDayResp, stepsResp] = await Promise.all([
      this.fitbitGet("https://api.fitbit.com/1/user/-/profile.json", accessToken),
      this.fitbitGet("https://api.fitbit.com/1/user/-/activities/heart/date/today/1d.json", accessToken),
      this.fitbitGet("https://api.fitbit.com/1/user/-/activities/steps/date/today/1d.json", accessToken),
    ]);

    const profile = profileResp?.user ?? {};
    const restingFromProfile =
      typeof profile.restingHeartRate === "number" ? profile.restingHeartRate : null;

    const dayHeart = heartDayResp?.["activities-heart"]?.[0]?.value;
    const restingFromDay =
      dayHeart && typeof dayHeart === "object" && typeof dayHeart.restingHeartRate === "number"
        ? dayHeart.restingHeartRate
        : null;

    let latestIntraday: number | null = null;
    try {
      const intraResp = await this.fitbitGet(
        "https://api.fitbit.com/1/user/-/activities/heart/date/today/1d/1min.json",
        accessToken,
      );
      const heartDataset = intraResp?.["activities-heart-intraday"]?.dataset ?? [];
      if (Array.isArray(heartDataset) && heartDataset.length > 0) {
        const last = heartDataset[heartDataset.length - 1];
        const v = last?.value;
        latestIntraday = typeof v === "number" ? v : null;
      }
    } catch {
      // Intradía a veces vacío o no disponible según tipo de app Fitbit; usamos resumen/perfil.
    }

    const restingHr = restingFromDay ?? restingFromProfile;
    const heartRate = latestIntraday ?? restingHr ?? null;

    const rawSteps = stepsResp?.["activities-steps"]?.[0]?.value;
    const steps =
      rawSteps !== undefined && rawSteps !== null && rawSteps !== ""
        ? Number.parseInt(String(rawSteps), 10)
        : null;
    const stepsToday = Number.isFinite(steps) ? steps : null;

    return {
      connected: true,
      heartRate,
      restingHeartRate: restingHr,
      stepsToday,
      heartRateFromIntraday: latestIntraday != null,
      updatedAt: new Date().toISOString(),
      source: "fitbit",
    };
  }

  private async fitbitGet(url: string, accessToken: string): Promise<any> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Fitbit GET falló (${response.status}): ${txt}`);
    }
    return response.json();
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
