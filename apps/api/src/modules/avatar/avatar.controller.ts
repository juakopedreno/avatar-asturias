import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AvatarAdapterService } from "./avatar-adapter.service";
import { CreateAvatarSessionDto } from "./dto/create-avatar-session.dto";

@ApiTags("avatar")
@Controller("avatar")
export class AvatarController {
  constructor(private readonly avatarAdapterService: AvatarAdapterService) {}

  @Post("session")
  async session(@Body() dto: CreateAvatarSessionDto) {
    return this.avatarAdapterService.createSession(dto);
  }

  @Get("provider-health")
  async providerHealth() {
    return this.avatarAdapterService.providerHealth();
  }

  @Get("provider-active")
  activeProvider() {
    return { provider: this.avatarAdapterService.activeProvider() };
  }
}
