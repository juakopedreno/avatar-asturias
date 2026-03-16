import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateSettingsDto, validateSettingsShape } from "./dto/update-settings.dto";

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private readonly defaultSettings: UpdateSettingsDto = {
    branding: {
      name: "Asistente Torremolinos",
      primaryColor: "#00A3A3",
    },
    channels: [
      { id: "web", name: "Widget Web", active: true },
      { id: "kiosk", name: "Kiosco Interactivo", active: true },
      { id: "holobox", name: "Holobox", active: false },
      { id: "app", name: "App Movil", active: false },
    ],
    privacy: {
      dataRetentionDays: 90,
      anonymizeAfterDays: 30,
      cookieConsent: true,
      gdprCompliant: true,
    },
    voice: {
      provider: "Anam",
      defaultVoice: "es-ES-default",
      speed: 1,
      pitch: 1,
    },
    notifications: [
      { label: "Errores de sincronizacion", checked: true },
      { label: "Nuevas preguntas sin resolver", checked: true },
      { label: "Informes semanales", checked: true },
      { label: "Cambios en contenidos", checked: false },
      { label: "Accesos de nuevos usuarios", checked: false },
    ],
  };

  async getSettings() {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: "app_settings" },
    });
    if (!row) {
      await this.prisma.systemConfig.create({
        data: {
          key: "app_settings",
          value: this.defaultSettings as unknown as Prisma.InputJsonValue,
        },
      });
      return this.defaultSettings;
    }
    return row.value as unknown as UpdateSettingsDto;
  }

  async updateSettings(dto: UpdateSettingsDto, actor?: string) {
    if (!validateSettingsShape(dto)) {
      throw new BadRequestException("Formato invalido para configuracion.");
    }
    await this.prisma.systemConfig.upsert({
      where: { key: "app_settings" },
      update: { value: dto as unknown as Prisma.InputJsonValue },
      create: { key: "app_settings", value: dto as unknown as Prisma.InputJsonValue },
    });
    await this.auditService.append({ actor: actor ?? "sistema", module: "settings", action: "config_update", detail: "Configuración general actualizada" }).catch(() => {});
    return dto;
  }
}
