import { Injectable } from "@nestjs/common";
import { AvatarProvider } from "./avatar-provider.interface";
import { AnamAvatarProvider } from "./providers/anam-avatar.provider";
import { MockAvatarProvider } from "./providers/mock-avatar.provider";
import { AvatarSessionRequest } from "./avatar.types";

@Injectable()
export class AvatarAdapterService {
  constructor(
    private readonly mockProvider: MockAvatarProvider,
    private readonly anamProvider: AnamAvatarProvider,
  ) {}

  private selectProvider(): AvatarProvider {
    const runtime = (process.env.AVATAR_RUNTIME ?? "").toLowerCase();
    if (runtime === "mock") {
      return this.mockProvider;
    }
    if ((runtime === "anam" && process.env.ANAM_API_KEY) || process.env.ANAM_API_KEY) {
      return this.anamProvider;
    }
    return this.mockProvider;
  }

  async createSession(request: AvatarSessionRequest) {
    const provider = this.selectProvider();
    try {
      return await provider.createSession(request);
    } catch {
      // Fallback operativo para no cortar el servicio.
      return this.mockProvider.createSession(request);
    }
  }

  async providerHealth() {
    const selected = this.selectProvider();
    const status = await selected.healthCheck();
    if (!status.ok && selected.name !== "mock") {
      const fallback = await this.mockProvider.healthCheck();
      return {
        selected: status,
        fallback,
      };
    }
    return {
      selected: status,
    };
  }

  activeProvider() {
    return this.selectProvider().name;
  }
}
