import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, IsArray } from "class-validator";

const languageCodes = ["ES", "EN", "FR", "DE"] as const;
const ragScopeValues = ["feria"] as const;

export class AskQuestionDto {
  @ApiProperty()
  @IsString()
  question!: string;

  @ApiProperty({ enum: languageCodes, default: "ES" })
  @IsString()
  @IsIn(languageCodes)
  language!: (typeof languageCodes)[number];

  @ApiPropertyOptional({
    description: "Resumen breve de biometría (p. ej. pulso y pasos) enviado por el cliente para contexto.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  wearablesSummary?: string;

  @ApiPropertyOptional({
    description: "Respuesta breve optimizada para voz (feria/kiosk).",
  })
  @IsOptional()
  @IsBoolean()
  brief?: boolean;

  @ApiPropertyOptional({
    description: "ID de conversación existente para mantener contexto entre turnos.",
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    description: "Restringe la búsqueda RAG a fuentes concretas (IDs del panel admin).",
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  sourceIds?: string[];

  @ApiPropertyOptional({
    description: "Ámbito RAG predefinido. feria = solo documentos de feria sincronizados en admin.",
    enum: ragScopeValues,
  })
  @IsOptional()
  @IsIn(ragScopeValues)
  ragScope?: (typeof ragScopeValues)[number];
}
