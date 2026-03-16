import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.runRetention();
    this.timer = setInterval(() => {
      void this.runRetention();
    }, 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async runRetention() {
    try {
      const settings = await this.prisma.systemConfig.findUnique({
        where: { key: "app_settings" },
      });
      const privacy = (settings?.value as { privacy?: { dataRetentionDays?: number; anonymizeAfterDays?: number } })
        ?.privacy;
      const dataRetentionDays = Number(privacy?.dataRetentionDays ?? 90);
      const anonymizeAfterDays = Number(privacy?.anonymizeAfterDays ?? 30);
      const now = Date.now();
      const retentionDate = new Date(now - dataRetentionDays * 24 * 60 * 60 * 1000);
      const anonymizeDate = new Date(now - anonymizeAfterDays * 24 * 60 * 60 * 1000);

      await this.prisma.auditEntry.deleteMany({
        where: { createdAt: { lt: retentionDate } },
      });
      await this.prisma.ingestionJob.deleteMany({
        where: {
          createdAt: { lt: retentionDate },
          finishedAt: { not: null },
        },
      });
      await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [{ revoked: true }, { expiresAt: { lt: new Date() } }],
        },
      });
      await this.prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      await this.prisma.message.updateMany({
        where: {
          createdAt: { lt: anonymizeDate, gte: retentionDate },
          role: "user",
        },
        data: { content: "[ANONIMIZADO POR RETENCION]" },
      });
      await this.prisma.conversation.deleteMany({
        where: { createdAt: { lt: retentionDate } },
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      this.logger.error(`Retention job failed: ${detail}`);
    }
  }
}
