import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";

const languageCodes = ["ES", "EN", "FR", "DE"] as const;
const sessionModes = ["default", "feria-embed"] as const;

export class CreateAvatarSessionDto {
  @ApiProperty({ enum: languageCodes })
  @IsString()
  @IsIn(languageCodes)
  language!: (typeof languageCodes)[number];

  @ApiProperty({ default: "6bfbe25a-979d-40f3-a92b-5394170af54b" })
  @IsString()
  voice!: string;

  @ApiPropertyOptional({ enum: sessionModes, default: "default" })
  @IsOptional()
  @IsString()
  @IsIn(sessionModes)
  mode?: (typeof sessionModes)[number];

  @ApiPropertyOptional({
    description: "Persona publicada de Anam. Solo se usa en el modo feria-embed.",
  })
  @IsOptional()
  @IsUUID()
  personaId?: string;
}
