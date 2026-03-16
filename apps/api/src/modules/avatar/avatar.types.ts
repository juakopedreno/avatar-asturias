export type AvatarProviderName = "anam" | "mock";

export interface AvatarSessionRequest {
  language: "ES" | "EN" | "FR" | "DE";
  voice: string;
}

export interface AvatarSessionResponse {
  provider: AvatarProviderName;
  sessionId: string;
  streamUrl: string;
  sessionToken?: string;
}
