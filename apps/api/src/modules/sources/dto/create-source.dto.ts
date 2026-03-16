import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

const sourceTypes = ["pdf", "api", "web", "database", "manual"] as const;

export class CreateSourceDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: sourceTypes })
  @IsString()
  @IsIn(sourceTypes)
  type!: (typeof sourceTypes)[number];

  @ApiProperty()
  @IsString()
  connectorConfig!: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  documents?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  confidence?: number;
}
