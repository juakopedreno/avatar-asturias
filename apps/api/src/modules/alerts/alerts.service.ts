import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateAlertDto } from "./dto/create-alert.dto";
import { UpdateAlertDto } from "./dto/update-alert.dto";

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.proactiveAlert.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  findActive() {
    const now = new Date();
    return this.prisma.proactiveAlert.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(dto: CreateAlertDto) {
    const keywords = Array.isArray(dto.keywords) ? dto.keywords : [];
    return this.prisma.proactiveAlert.create({
      data: {
        title: dto.title,
        message: dto.message,
        keywords,
        active: dto.active ?? true,
        showOnGreeting: dto.showOnGreeting ?? true,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
      },
    });
  }

  async update(id: string, dto: UpdateAlertDto) {
    const existing = await this.prisma.proactiveAlert.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Alerta no encontrada.");
    }
    const keywords = dto.keywords !== undefined ? dto.keywords : existing.keywords;
    return this.prisma.proactiveAlert.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        message: dto.message ?? existing.message,
        keywords,
        active: dto.active ?? existing.active,
        showOnGreeting: dto.showOnGreeting ?? existing.showOnGreeting,
        startAt: dto.startAt !== undefined ? (dto.startAt ? new Date(dto.startAt) : null) : existing.startAt,
        endAt: dto.endAt !== undefined ? (dto.endAt ? new Date(dto.endAt) : null) : existing.endAt,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.proactiveAlert.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Alerta no encontrada.");
    }
    await this.prisma.proactiveAlert.delete({ where: { id } });
    return { id };
  }
}
