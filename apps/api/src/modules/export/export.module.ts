import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { AuditModule } from "../audit/audit.module";
import { RagModule } from "../rag/rag.module";
import { SettingsModule } from "../settings/settings.module";
import { TrainingModule } from "../training/training.module";
import { ExportController } from "./export.controller";
import { ExportService } from "./export.service";

@Module({
  imports: [AuditModule, AnalyticsModule, SettingsModule, TrainingModule, RagModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
