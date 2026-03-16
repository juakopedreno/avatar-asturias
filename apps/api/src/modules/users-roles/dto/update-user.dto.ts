import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsIn, IsOptional, IsString } from "class-validator";

const userRoles = ["admin", "editor", "viewer", "auditor"] as const;
const userStatuses = ["active", "inactive", "pending"] as const;

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ enum: userRoles, required: false })
  @IsOptional()
  @IsString()
  @IsIn(userRoles)
  role?: (typeof userRoles)[number];

  @ApiProperty({ enum: userStatuses, required: false })
  @IsOptional()
  @IsString()
  @IsIn(userStatuses)
  status?: (typeof userStatuses)[number];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  modules?: string[];
}
