import { Injectable } from "@nestjs/common";
import { v4 as uuid } from "uuid";
import { ANAM_DELIVERY_PROMPT } from "../../persona/asturias-cova.prompt";
import { AvatarProvider } from "../avatar-provider.interface";
import { AvatarSessionRequest, AvatarSessionResponse } from "../avatar.types";

type AnamLanguageCode = "es" | "en" | "fr" | "de";
type AnamAvatarModel = "cara-2" | "cara-3" | "cara-4" | "cara-4-latest";

const DEFAULT_FERIA_PERSONA_ID = "cf5e0976-4fb8-494f-a60b-17afe764b2d9";
const FERIA_PORTRAIT_SESSION_OPTIONS = {
  videoWidth: 768,
  videoHeight: 1152,
  videoQuality: "high",
} as const;

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

    const previewImageUrl =
      request.mode === "feria-embed"
        ? await this.getPersonaPreviewImage(this.resolvePersonaId(request))
        : undefined;

    return {
      provider: this.name,
      sessionId: uuid(),
      streamUrl: `${this.baseUrl}/v1/auth/session-token`,
      sessionToken: json.sessionToken,
      ...(previewImageUrl ? { previewImageUrl } : {}),
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
    const isFeriaEmbed = request.mode === "feria-embed";
    const personaId = this.resolvePersonaId(request);

    if (personaId) {
      return {
        personaConfig: {
          personaId,
          ...(isFeriaEmbed ? { avatarModel: "cara-4" satisfies AnamAvatarModel } : {}),
          languageCode: this.resolveLanguage(request.language),
          ...(process.env.ANAM_SKIP_GREETING
            ? { skipGreeting: process.env.ANAM_SKIP_GREETING === "true" }
            : {}),
        },
        ...(isFeriaEmbed ? { sessionOptions: FERIA_PORTRAIT_SESSION_OPTIONS } : {}),
      };
    }

    const configuredVoice = process.env.ANAM_VOICE_ID?.trim();
    const resolvedVoiceId = configuredVoice || undefined;
    const configuredLlmId = process.env.ANAM_LLM_ID?.trim();
    const configuredModel = process.env.ANAM_AVATAR_MODEL?.trim();
    const configuredAvatarId = process.env.ANAM_AVATAR_ID?.trim();
    const maxLength = Number.parseInt(process.env.ANAM_MAX_SESSION_LENGTH_SECONDS ?? "", 10);
    const supportedModel =
      configuredModel === "cara-2" ||
      configuredModel === "cara-3" ||
      configuredModel === "cara-4" ||
      configuredModel === "cara-4-latest"
        ? (configuredModel satisfies AnamAvatarModel)
        : undefined;

    return {
      personaConfig: {
        name: process.env.ANAM_PERSONA_NAME ?? "CoVA",
        avatarId: configuredAvatarId || "30fa96d0-26c4-4e55-94a0-517025942e18",
        ...(supportedModel ? { avatarModel: supportedModel } : {}),
        ...(resolvedVoiceId ? { voiceId: resolvedVoiceId } : {}),
        ...(configuredLlmId ? { llmId: configuredLlmId } : {}),
        systemPrompt: process.env.ANAM_SYSTEM_PROMPT ?? ANAM_DELIVERY_PROMPT,
        languageCode: this.resolveLanguage(request.language),
        ...(Number.isFinite(maxLength) ? { maxSessionLengthSeconds: maxLength } : {}),
        ...(process.env.ANAM_SKIP_GREETING
          ? { skipGreeting: process.env.ANAM_SKIP_GREETING === "true" }
          : {}),
      },
    };
  }

  private resolvePersonaId(request: AvatarSessionRequest): string | undefined {
    if (request.mode === "feria-embed") {
      return (
        request.personaId?.trim() ||
        process.env.ANAM_FERIA_PERSONA_ID?.trim() ||
        DEFAULT_FERIA_PERSONA_ID
      );
    }
    return process.env.ANAM_PERSONA_ID?.trim();
  }

  private async getPersonaPreviewImage(personaId?: string): Promise<string | undefined> {
    if (!personaId) return undefined;

    try {
      const response = await fetch(`${this.baseUrl}/v1/personas/${personaId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!response.ok) return undefined;

      const persona = (await response.json()) as {
        avatar?: {
          portraitImageUrl?: string | null;
          imageUrl?: string | null;
        } | null;
      };
      return persona.avatar?.portraitImageUrl ?? persona.avatar?.imageUrl ?? undefined;
    } catch {
      return undefined;
    }
  }

  private resolveLanguage(language: AvatarSessionRequest["language"]): AnamLanguageCode {
    const normalized = language.toLowerCase();
    if (normalized === "es" || normalized === "en" || normalized === "fr" || normalized === "de") {
      return normalized;
    }
    return "es";
  }
}
