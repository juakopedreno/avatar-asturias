import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const languageCodes = ["ES", "EN", "FR", "DE"] as const;

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
}
