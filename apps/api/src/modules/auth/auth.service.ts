import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { MfaVerifyDto } from "./dto/mfa-verify.dto";
import { RefreshDto } from "./dto/refresh.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException("Credenciales invalidas.");
    }
    const isMatch = await compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException("Credenciales invalidas.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        mfaVerified: !user.mfaEnabled,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    if (!user.mfaEnabled) {
      return this.issueTokens(user.id, user.email, user.role, session.id);
    }
    return {
      sessionId: session.id,
      requiresMfa: user.role === "admin",
      role: user.role,
    };
  }

  async verifyMfa(dto: MfaVerifyDto) {
    const session = await this.prisma.session.findUnique({
      where: { id: dto.sessionId },
      include: { user: true },
    });
    if (!session) {
      throw new UnauthorizedException("Sesion no valida.");
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException("Sesion expirada.");
    }
    if (!session.user.mfaSecret) {
      throw new UnauthorizedException("MFA no configurado para este usuario.");
    }
    if (dto.code !== session.user.mfaSecret) {
      throw new UnauthorizedException("Codigo MFA no valido.");
    }
    await this.prisma.session.update({
      where: { id: session.id },
      data: { mfaVerified: true },
    });

    return this.issueTokens(session.user.id, session.user.email, session.user.role, session.id);
  }

  async refresh(dto: RefreshDto) {
    const refreshSecret = this.getRequiredSecret("JWT_REFRESH_SECRET");
    const payload = await this.jwtService.verifyAsync<{ sub: string; tokenId: string; email: string; role: string }>(
      dto.refreshToken,
      {
        secret: refreshSecret,
      },
    );

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.tokenId },
      include: { user: true },
    });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token no valido.");
    }
    const hashMatches = await compare(dto.refreshToken, stored.tokenHash);
    if (!hashMatches) {
      throw new UnauthorizedException("Refresh token no valido.");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    return this.issueTokens(stored.user.id, stored.user.email, stored.user.role);
  }

  async logout(dto: RefreshDto) {
    try {
      const refreshSecret = this.getRequiredSecret("JWT_REFRESH_SECRET");
      const payload = await this.jwtService.verifyAsync<{ tokenId: string }>(dto.refreshToken, {
        secret: refreshSecret,
      });
      await this.prisma.refreshToken.update({
        where: { id: payload.tokenId },
        data: { revoked: true },
      });
    } catch {
      // token invalido -> se considera logout idempotente
    }
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException("Usuario no encontrado.");
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      mfaEnabled: user.mfaEnabled,
    };
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: "admin" | "editor" | "viewer" | "auditor",
    sessionId?: string,
  ) {
    const accessSecret = this.getRequiredSecret("JWT_SECRET");
    const refreshSecret = this.getRequiredSecret("JWT_REFRESH_SECRET");
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        secret: accessSecret,
        expiresIn: "15m",
      },
    );

    const refreshTokenId = randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, email, role, tokenId: refreshTokenId },
      {
        secret: refreshSecret,
        expiresIn: "7d",
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId,
        tokenHash: await hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      sessionId,
      accessToken,
      refreshToken,
      role,
      email,
    };
  }

  private getRequiredSecret(name: "JWT_SECRET" | "JWT_REFRESH_SECRET") {
    const value = process.env[name];
    if (!value || value.startsWith("change_me")) {
      throw new UnauthorizedException(`${name} no configurada de forma segura.`);
    }
    return value;
  }
}
