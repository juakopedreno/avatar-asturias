import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsIn, IsString, MinLength } from "class-validator";

const statuses = ["draft", "review", "published", "archived"] as const;

export class CreateContentDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty()
  @IsString()
  category!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  languages!: string[];

  @ApiProperty({ enum: statuses, default: "draft" })
  @IsString()
  @IsIn(statuses)
  status!: (typeof statuses)[number];

  @ApiProperty()
  @IsString()
  author!: string;
}
