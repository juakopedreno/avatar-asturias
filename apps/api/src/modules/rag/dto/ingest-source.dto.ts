import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString } from "class-validator";

export class IngestSourceDto {
  @ApiProperty()
  @IsString()
  sourceId!: string;

  @ApiProperty()
  @IsString()
  sourceLabel!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  chunks!: string[];
}
