import { Injectable } from "@nestjs/common";
import { v4 as uuid } from "uuid";
import { AvatarProvider } from "../avatar-provider.interface";
import { AvatarSessionRequest, AvatarSessionResponse } from "../avatar.types";

type AnamLanguageCode = "es" | "en" | "fr" | "de";

@Injectable()
export class AnamAvatarProvider implements AvatarProvider {
  readonly name = "anam" as const;

  private get apiKey() {
    return process.env.ANAM_API_KEY ?? "";
  }

  private get baseUrl() {
    return process.env.ANAM_BASE_URL ?? "https://api.anam.ai";
  }

  async createSession(request: AvatarSessionRequest): Promise<AvatarSessionResponse> {
    if (!this.apiKey) {
      throw new Error("ANAM_API_KEY no configurada");
    }

    const payload = this.buildSessionPayload(request);
    const response = await fetch(`${this.baseUrl}/v1/auth/session-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Anam session token failed: ${response.status} ${body}`);
    }

    const json = (await response.json()) as { sessionToken?: string };
    if (!json.sessionToken) {
      throw new Error("Respuesta Anam invalida: falta sessionToken");
    }

    return {
      provider: this.name,
      sessionId: uuid(),
      streamUrl: `${this.baseUrl}/v1/auth/session-token`,
      sessionToken: json.sessionToken,
    };
  }

  async healthCheck() {
    if (!this.apiKey) {
      return {
        provider: this.name,
        ok: false,
        detail: "ANAM_API_KEY no configurada",
      };
    }
    try {
      const response = await fetch(`${this.baseUrl}/v1/auth/session-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(this.buildSessionPayload({ language: "ES", voice: "" })),
      });
      return {
        provider: this.name,
        ok: response.ok,
        detail: response.ok ? "ok" : `status ${response.status}`,
      };
    } catch (error) {
      return {
        provider: this.name,
        ok: false,
        detail: error instanceof Error ? error.message : "unknown error",
      };
    }
  }

  private buildSessionPayload(request: AvatarSessionRequest): Record<string, unknown> {
    const personaId = process.env.ANAM_PERSONA_ID;
    if (personaId) {
      return {
        personaConfig: {
          personaId,
        },
      };
    }

    const configuredVoice = process.env.ANAM_VOICE_ID?.trim();
    const resolvedVoiceId = configuredVoice || undefined;
    const configuredLlmId = process.env.ANAM_LLM_ID?.trim();
    const configuredModel = process.env.ANAM_AVATAR_MODEL?.trim();
    const maxLength = Number.parseInt(process.env.ANAM_MAX_SESSION_LENGTH_SECONDS ?? "", 10);
    return {
      personaConfig: {
        name: process.env.ANAM_PERSONA_NAME ?? "Asistente Torremolinos",
        avatarId: process.env.ANAM_AVATAR_ID ?? "30fa96d0-26c4-4e55-94a0-517025942e18",
        ...(configuredModel === "cara-2" || configuredModel === "cara-3"
          ? { avatarModel: configuredModel }
          : {}),
        ...(resolvedVoiceId ? { voiceId: resolvedVoiceId } : {}),
        ...(configuredLlmId ? { llmId: configuredLlmId } : {}),
        systemPrompt:
          process.env.ANAM_SYSTEM_PROMPT ??
          "Eres el asistente oficial de turismo de Torremolinos. Responde con claridad y tono cercano.",
        languageCode: this.resolveLanguage(request.language),
        ...(Number.isFinite(maxLength) ? { maxSessionLengthSeconds: maxLength } : {}),
        ...(process.env.ANAM_SKIP_GREETING
          ? { skipGreeting: process.env.ANAM_SKIP_GREETING === "true" }
          : {}),
      },
    };
  }

  private resolveLanguage(language: AvatarSessionRequest["language"]): AnamLanguageCode {
    const normalized = language.toLowerCase();
    if (normalized === "es" || normalized === "en" || normalized === "fr" || normalized === "de") {
      return normalized;
    }
    return "es";
  }
}
