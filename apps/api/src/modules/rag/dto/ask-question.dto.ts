import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";

const languageCodes = ["ES", "EN", "FR", "DE"] as const;

export class AskQuestionDto {
  @ApiProperty()
  @IsString()
  question!: string;

  @ApiProperty({ enum: languageCodes, default: "ES" })
  @IsString()
  @IsIn(languageCodes)
  language!: (typeof languageCodes)[number];
}
