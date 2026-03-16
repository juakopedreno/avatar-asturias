import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { TrainingService } from "../training/training.service";
import { RagService } from "../rag/rag.service";
import { SettingsService } from "../settings/settings.service";

@Injectable()
export class ExportService {
  constructor(
    private readonly auditService: AuditService,
    private readonly analyticsService: AnalyticsService,
    private readonly settingsService: SettingsService,
    private readonly trainingService: TrainingService,
    private readonly ragService: RagService,
  ) {}

  async exportBundle() {
    const [policy, settings, audit, knowledge, metrics] = await Promise.all([
      this.trainingService.getPolicy(),
      this.settingsService.getSettings(),
      this.auditService.list(),
      this.ragService.listChunks(),
      this.analyticsService.getDashboard(),
    ]);

    const blocks = {
      knowledge,
      config: {
        trainingPolicy: policy,
        appSettings: settings,
      },
      metrics,
      logs: audit,
    };

    const blockHashes = {
      knowledge: this.hashPayload(blocks.knowledge),
      config: this.hashPayload(blocks.config),
      metrics: this.hashPayload(blocks.metrics),
      logs: this.hashPayload(blocks.logs),
    };

    return {
      schemaVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      manifest: {
        blocks: blockHashes,
      },
      ...blocks,
    };
  }

  private hashPayload(payload: unknown) {
    return createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");
  }
}
