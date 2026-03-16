import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateTrainingPolicyDto } from "./dto/update-training-policy.dto";

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private readonly defaultPolicy: UpdateTrainingPolicyDto = {
    tone: "Formal y amable",
    allowedTopics: [
      "Turismo",
      "Cultura",
      "Transporte",
      "Servicios municipales",
      "Gastronomia",
      "Alojamiento",
      "Eventos",
    ],
    blockedTopics: ["Politica", "Religion", "Opiniones personales", "Consejo medico"],
    responseStyle: "conversational",
    systemInstructions:
      "Eres un asistente virtual del Ayuntamiento de Torremolinos. Responde con fuentes verificables y en tono respetuoso.",
    fallbackMessage:
      "Lo siento, no dispongo de informacion suficiente para responder a esa consulta. ¿Puedo ayudarte con algo relacionado con turismo o servicios municipales?",
    maxResponseLength: 300,
  };

  async getPolicy() {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: "training_policy" },
    });
    if (!row) {
      await this.prisma.systemConfig.create({
        data: {
          key: "training_policy",
          value: this.defaultPolicy as unknown as Prisma.InputJsonValue,
        },
      });
      return this.defaultPolicy;
    }
    return row.value as unknown as UpdateTrainingPolicyDto;
  }

  async updatePolicy(dto: UpdateTrainingPolicyDto, actor?: string) {
    await this.prisma.systemConfig.upsert({
      where: { key: "training_policy" },
      update: { value: dto as unknown as Prisma.InputJsonValue },
      create: {
        key: "training_policy",
        value: dto as unknown as Prisma.InputJsonValue,
      },
    });
    await this.auditService.append({ actor: actor ?? "sistema", module: "training", action: "config_update", detail: "Política de entrenamiento actualizada" }).catch(() => {});
    return dto;
  }
}
