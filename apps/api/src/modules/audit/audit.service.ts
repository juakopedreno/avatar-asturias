import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.auditEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((row) => ({
      id: row.id,
      timestamp: row.createdAt.toISOString(),
      actor: row.actor,
      user: row.actor,
      module: row.module,
      action: row.action,
      detail: row.detail,
      type: this.actionToType(row.action),
    }));
  }

  async append(payload: { actor: string; module: string; action: string; detail: string }) {
    return this.prisma.auditEntry.create({
      data: payload,
    });
  }

  private actionToType(action: string) {
    if (action.includes("create")) return "create";
    if (action.includes("delete")) return "delete";
    if (action.includes("update")) return "update";
    if (action.includes("config")) return "config";
    return "access";
  }
}
