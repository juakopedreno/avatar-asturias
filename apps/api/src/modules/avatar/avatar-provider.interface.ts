import { AvatarSessionRequest, AvatarSessionResponse } from "./avatar.types";

export interface AvatarProvider {
  name: "anam" | "mock";
  createSession(request: AvatarSessionRequest): Promise<AvatarSessionResponse>;
  healthCheck(): Promise<{ provider: string; ok: boolean; detail?: string }>;
}
