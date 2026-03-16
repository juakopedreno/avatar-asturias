import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { RolesGuard } from "../../common/auth/roles.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { ContentService } from "./content.service";
import { CreateContentDto } from "./dto/create-content.dto";
import { UpdateContentDto } from "./dto/update-content.dto";

@ApiTags("content")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("content")
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  async findAll() {
    return this.contentService.findAll();
  }

  @Post()
  @Roles("admin", "editor")
  async create(@Body() dto: CreateContentDto) {
    return this.contentService.create(dto);
  }

  @Patch(":id")
  @Roles("admin", "editor")
  async update(@Param("id") id: string, @Body() dto: UpdateContentDto) {
    return this.contentService.update(id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Param("id") id: string) {
    return this.contentService.remove(id);
  }
}
