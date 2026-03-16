import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateContentDto } from "./dto/create-content.dto";
import { UpdateContentDto } from "./dto/update-content.dto";

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.contentItem.findMany({
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async create(dto: CreateContentDto) {
    const record = await this.prisma.contentItem.create({
      data: {
        title: dto.title,
        category: dto.category,
        languages: dto.languages,
        status: dto.status,
        author: dto.author,
        versions: {
          create: {
            version: 1,
            payload: dto as unknown as Prisma.JsonObject,
          },
        },
      },
      include: { versions: true },
    });
    return record;
  }

  async update(id: string, dto: UpdateContentDto) {
    const record = await this.prisma.contentItem.findUnique({
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
    const updated = await this.prisma.contentItem.update({
      where: { id },
      data: {
        title: dto.title ?? record.title,
        category: dto.category ?? record.category,
        languages: dto.languages ?? record.languages,
        status: dto.status ?? record.status,
        author: dto.author ?? record.author,
        updatedAt: new Date(),
        versions: {
          create: {
            version: nextVersion,
            payload: dto as unknown as Prisma.JsonObject,
          },
        },
      },
      include: { versions: true },
    });
    return updated;
  }

  async remove(id: string) {
    await this.prisma.contentItem.delete({ where: { id } });
    return { ok: true };
  }
}
