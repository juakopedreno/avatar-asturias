import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUrl } from "class-validator";

export class IngestWebDto {
  @ApiProperty()
  @IsString()
  sourceId!: string;

  @ApiProperty()
  @IsUrl()
  url!: string;
}
