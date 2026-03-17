import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateContentDto } from "./dto/create-content.dto";
import { UpdateContentDto } from "./dto/update-content.dto";

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.prisma.controlledResponse.findMany({
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  findAllPublished() {
    return this.prisma.controlledResponse.findMany({
      where: { status: "published" },
      orderBy: { updatedAt: "desc" },
    });
  }

  async create(dto: CreateContentDto, actor?: string) {
    const questionVariants = Array.isArray(dto.questionVariants) ? dto.questionVariants : [];
    const record = await this.prisma.controlledResponse.create({
      data: {
        question: dto.question,
        questionVariants,
        answer: dto.answer,
        category: dto.category,
        languages: dto.languages,
        status: dto.status,
        author: dto.author,
        updatedAt: new Date(),
        versions: {
          create: {
            version: 1,
            payload: {
              question: dto.question,
              questionVariants,
              answer: dto.answer,
              category: dto.category,
              languages: dto.languages,
              status: dto.status,
              author: dto.author,
            } as Prisma.JsonObject,
          },
        },
      },
      include: { versions: true },
    });
    await this.auditService.append({ actor: actor ?? "sistema", module: "content", action: "create", detail: `Respuesta controlada creada: ${dto.question}` }).catch(() => {});
    return record;
  }

  async update(id: string, dto: UpdateContentDto, actor?: string) {
    const record = await this.prisma.controlledResponse.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });
    if (!record) {
      throw new NotFoundException("Contenido no encontrado.");
    }

    const nextVersion = (record.versions[0]?.version ?? 0) + 1;
    const questionVariants = dto.questionVariants !== undefined ? dto.questionVariants : record.questionVariants;
    const updated = await this.prisma.controlledResponse.update({
      where: { id },
      data: {
        question: dto.question ?? record.question,
        questionVariants,
        answer: dto.answer ?? record.answer,
        category: dto.category ?? record.category,
        languages: dto.languages ?? record.languages,
        status: dto.status ?? record.status,
        author: dto.author ?? record.author,
        updatedAt: new Date(),
        versions: {
          create: {
            version: nextVersion,
            payload: {
              question: dto.question ?? record.question,
              questionVariants,
              answer: dto.answer ?? record.answer,
              category: dto.category ?? record.category,
              languages: dto.languages ?? record.languages,
              status: dto.status ?? record.status,
              author: dto.author ?? record.author,
            } as Prisma.JsonObject,
          },
        },
      },
      include: { versions: true },
    });
    await this.auditService.append({ actor: actor ?? "sistema", module: "content", action: "update", detail: `Respuesta controlada actualizada: ${record.question}` }).catch(() => {});
    return updated;
  }

  async remove(id: string, actor?: string) {
    const record = await this.prisma.controlledResponse.findUnique({ where: { id } });
    if (record) {
      await this.auditService.append({ actor: actor ?? "sistema", module: "content", action: "delete", detail: `Respuesta controlada eliminada: ${record.question}` }).catch(() => {});
    }
    await this.prisma.controlledResponse.delete({ where: { id } });
    return { ok: true };
  }
}
