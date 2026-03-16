import { Injectable } from "@nestjs/common";
import { v4 as uuid } from "uuid";
import { AvatarProvider } from "../avatar-provider.interface";
import { AvatarSessionRequest, AvatarSessionResponse } from "../avatar.types";

@Injectable()
export class MockAvatarProvider implements AvatarProvider {
  readonly name = "mock";

  async createSession(request: AvatarSessionRequest): Promise<AvatarSessionResponse> {
    const sessionId = uuid();
    return {
      provider: this.name,
      sessionId,
      streamUrl: `https://mock-avatar.local/stream/${sessionId}?lang=${request.language}&voice=${request.voice}`,
      sessionToken: undefined,
    };
  }

  async healthCheck() {
    return {
      provider: this.name,
      ok: true,
      detail: "mock provider active",
    };
  }
}
