import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

const userRoles = ["admin", "editor", "viewer", "auditor"] as const;
const userStatuses = ["active", "inactive", "pending"] as const;

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty({ enum: userRoles })
  @IsString()
  @IsIn(userRoles)
  role!: (typeof userRoles)[number];

  @ApiProperty({ enum: userStatuses, default: "active" })
  @IsString()
  @IsIn(userStatuses)
  status!: (typeof userStatuses)[number];

  @ApiProperty({ type: [String] })
  @IsArray()
  modules!: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
