export type AvatarProviderName = "anam" | "mock";
export type AvatarSessionMode = "default" | "feria-embed";

export interface AvatarSessionRequest {
  language: "ES" | "EN" | "FR" | "DE";
  voice: string;
  mode?: AvatarSessionMode;
  personaId?: string;
}

export interface AvatarSessionResponse {
  provider: AvatarProviderName;
  sessionId: string;
  streamUrl: string;
  sessionToken?: string;
}
