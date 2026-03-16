import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AvatarModule } from "./modules/avatar/avatar.module";
import { ExportModule } from "./modules/export/export.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ChatModule } from "./modules/chat/chat.module";
import { ContentModule } from "./modules/content/content.module";
import { HealthModule } from "./modules/health/health.module";
import { RagModule } from "./modules/rag/rag.module";
import { SourcesModule } from "./modules/sources/sources.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { SttModule } from "./modules/stt/stt.module";
import { TrainingModule } from "./modules/training/training.module";
import { UsersRolesModule } from "./modules/users-roles/users-roles.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
    }),
    AuthModule,
    UsersRolesModule,
    ContentModule,
    SettingsModule,
    SourcesModule,
    TrainingModule,
    AnalyticsModule,
    AuditModule,
    AvatarModule,
    HealthModule,
    ChatModule,
    SttModule,
    RagModule,
    ExportModule,
  ],
})
export class AppModule {}
