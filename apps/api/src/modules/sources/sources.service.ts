import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateSourceDto } from "./dto/create-source.dto";

@Injectable()
export class SourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.prisma.source.findMany({
      orderBy: { updatedAt: "desc" },
    }).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        connectorConfig: row.connectorJson,
        status: row.status,
        lastSync: row.lastSyncAt?.toISOString() ?? null,
        documents: row.documents,
        confidence: row.confidence,
      })),
    );
  }

  async findById(id: string) {
    const row = await this.prisma.source.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("Fuente no encontrada.");
    }
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      connectorConfig: row.connectorJson,
      status: row.status,
      lastSync: row.lastSyncAt?.toISOString() ?? null,
      documents: row.documents,
      confidence: row.confidence,
    };
  }

  async create(dto: CreateSourceDto, actor?: string) {
    const row = await this.prisma.source.create({
      data: {
        name: dto.name,
        type: dto.type,
        connectorJson: dto.connectorConfig,
        status: "pending",
        documents: dto.documents ?? 0,
        confidence: dto.confidence ?? 0,
      },
    });
    await this.auditService.append({ actor: actor ?? "sistema", module: "sources", action: "create", detail: `Fuente creada: ${dto.name} (${dto.type})` }).catch(() => {});
    return this.findById(row.id);
  }

  async sync(id: string) {
    const source = await this.prisma.source.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException("Fuente no encontrada.");
    }
    await this.prisma.source.update({
      where: { id },
      data: {
        status: "synced",
        lastSyncAt: new Date(),
      },
    });
    return this.findById(id);
  }

  async remove(id: string, actor?: string) {
    const source = await this.prisma.source.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException("Fuente no encontrada.");
    }
    await this.prisma.source.delete({ where: { id } });
    await this.auditService.append({ actor: actor ?? "sistema", module: "sources", action: "delete", detail: `Fuente eliminada: ${source.name} (${source.type})` }).catch(() => {});
    return { ok: true };
  }

  createIngestionJob(payload: { sourceId?: string; sourceKind: "pdf" | "web" | "api"; inputRef: string }) {
    return this.prisma.ingestionJob.create({
      data: {
        sourceId: payload.sourceId,
        sourceKind: payload.sourceKind,
        inputRef: payload.inputRef,
        status: "pending",
      },
    });
  }

  completeIngestionJob(id: string, outputChunks: number) {
    return this.prisma.ingestionJob.update({
      where: { id },
      data: {
        status: "synced",
        outputChunks,
        finishedAt: new Date(),
      },
    });
  }

  failIngestionJob(id: string, message: string) {
    return this.prisma.ingestionJob.update({
      where: { id },
      data: {
        status: "error",
        errorMessage: message,
        finishedAt: new Date(),
      },
    });
  }

  listIngestionJobs() {
    return this.prisma.ingestionJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async deleteIngestionJob(id: string, actor?: string) {
    const job = await this.prisma.ingestionJob.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException("Job de ingesta no encontrado.");
    }

    if (job.sourceId && job.inputRef) {
      const document = await this.prisma.sourceDocument.findFirst({
        where: {
          sourceId: job.sourceId,
          OR: [{ uri: job.inputRef }, { title: job.inputRef }],
        },
      });

      if (document) {
        const chunkTexts = this.chunkTextForCleanup(document.rawText);
        if (chunkTexts.length > 0) {
          await this.prisma.knowledgeChunk.deleteMany({
            where: {
              sourceId: job.sourceId,
              text: { in: chunkTexts },
            },
          });
        }
        await this.prisma.sourceDocument.delete({ where: { id: document.id } });
        await this.prisma.source.update({
          where: { id: job.sourceId },
          data: { documents: { decrement: 1 } },
        });
      }
    }

    await this.prisma.ingestionJob.delete({ where: { id } });
    await this.auditService
      .append({
        actor: actor ?? "sistema",
        module: "sources",
        action: "delete_job",
        detail: `Job de ingesta eliminado: ${job.sourceKind} ${job.inputRef}`,
      })
      .catch(() => {});

    return { ok: true };
  }

  private chunkTextForCleanup(raw: string, chunkSize = 900) {
    const cleaned = raw.replace(/\s+/g, " ").trim();
    if (!cleaned) return [];
    const chunks: string[] = [];
    for (let i = 0; i < cleaned.length; i += chunkSize) {
      chunks.push(cleaned.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
