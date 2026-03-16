import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUrl } from "class-validator";

export class IngestApiDto {
  @ApiProperty()
  @IsString()
  sourceId!: string;

  @ApiProperty()
  @IsUrl()
  endpoint!: string;
}
