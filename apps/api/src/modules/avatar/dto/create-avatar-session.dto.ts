import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";

const languageCodes = ["ES", "EN", "FR", "DE"] as const;

export class CreateAvatarSessionDto {
  @ApiProperty({ enum: languageCodes })
  @IsString()
  @IsIn(languageCodes)
  language!: (typeof languageCodes)[number];

  @ApiProperty({ default: "6bfbe25a-979d-40f3-a92b-5394170af54b" })
  @IsString()
  voice!: string;
}
