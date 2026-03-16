import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsIn, IsNumber, IsString } from "class-validator";

const responseStyles = ["concise", "conversational", "formal"] as const;

export class UpdateTrainingPolicyDto {
  @ApiProperty()
  @IsString()
  tone!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  allowedTopics!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  blockedTopics!: string[];

  @ApiProperty({ enum: responseStyles })
  @IsString()
  @IsIn(responseStyles)
  responseStyle!: (typeof responseStyles)[number];

  @ApiProperty()
  @IsString()
  systemInstructions!: string;

  @ApiProperty()
  @IsString()
  fallbackMessage!: string;

  @ApiProperty()
  @IsNumber()
  maxResponseLength!: number;
}
