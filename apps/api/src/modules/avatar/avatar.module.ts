import { Module } from "@nestjs/common";
import { AvatarAdapterService } from "./avatar-adapter.service";
import { AvatarController } from "./avatar.controller";
import { AnamAvatarProvider } from "./providers/anam-avatar.provider";
import { MockAvatarProvider } from "./providers/mock-avatar.provider";

@Module({
  controllers: [AvatarController],
  providers: [AvatarAdapterService, MockAvatarProvider, AnamAvatarProvider],
  exports: [AvatarAdapterService],
})
export class AvatarModule {}
