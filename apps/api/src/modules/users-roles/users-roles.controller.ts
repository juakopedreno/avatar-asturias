import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersRolesService } from "./users-roles.service";

@ApiTags("users-roles")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users-roles")
export class UsersRolesController {
  constructor(private readonly usersRolesService: UsersRolesService) {}

  @Get("users")
  @Roles("admin", "auditor")
  async users() {
    return this.usersRolesService.findAll();
  }

  @Post("users")
  @Roles("admin")
  async create(@Body() dto: CreateUserDto) {
    return this.usersRolesService.create(dto);
  }

  @Patch("users/:id")
  @Roles("admin")
  async update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersRolesService.update(id, dto);
  }
}
