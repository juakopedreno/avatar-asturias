import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateSourceDto } from "./dto/create-source.dto";

@Injectable()
export class SourcesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(dto: CreateSourceDto) {
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

  async remove(id: string) {
    const source = await this.prisma.source.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException("Fuente no encontrada.");
    }
    await this.prisma.source.delete({ where: { id } });
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
}
