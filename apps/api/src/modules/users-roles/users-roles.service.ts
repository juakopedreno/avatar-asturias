import { Injectable, NotFoundException } from "@nestjs/common";
import { hash } from "bcryptjs";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      status: user.status,
      modules: user.modules,
      lastLogin: user.lastLoginAt?.toISOString() ?? "Nunca",
    }));
  }

  async create(dto: CreateUserDto, actor?: string) {
    const password = dto.password ?? "Torremolinos2026!";
    const row = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        status: dto.status,
        modules: dto.modules,
        mfaEnabled: dto.role === "admin",
        passwordHash: await hash(password, 10),
      },
    });
    await this.auditService.append({ actor: actor ?? "sistema", module: "users", action: "create", detail: `Usuario creado: ${dto.email} (${dto.role})` }).catch(() => {});
    return {
      id: row.id,
      email: row.email,
      name: row.fullName,
      role: row.role,
      mfaEnabled: row.mfaEnabled,
      status: row.status,
      modules: row.modules,
      lastLogin: row.lastLoginAt?.toISOString() ?? "Nunca",
    };
  }

  async update(id: string, dto: UpdateUserDto, actor?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Usuario no encontrado.");
    }
    const row = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName ?? existing.fullName,
        role: dto.role ?? existing.role,
        status: dto.status ?? existing.status,
        modules: dto.modules ?? existing.modules,
      },
    });
    await this.auditService.append({ actor: actor ?? "sistema", module: "users", action: "update", detail: `Usuario actualizado: ${existing.email}` }).catch(() => {});
    return {
      id: row.id,
      email: row.email,
      name: row.fullName,
      role: row.role,
      mfaEnabled: row.mfaEnabled,
      status: row.status,
      modules: row.modules,
      lastLogin: row.lastLoginAt?.toISOString() ?? "Nunca",
    };
  }
}
