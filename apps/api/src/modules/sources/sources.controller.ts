import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { CreateSourceDto } from "./dto/create-source.dto";
import { SourcesService } from "./sources.service";

@ApiTags("sources")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("sources")
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  async findAll() {
    return this.sourcesService.findAll();
  }

  @Post()
  @Roles("admin", "editor")
  async create(@Body() dto: CreateSourceDto, @CurrentUser() user?: { email?: string }) {
    return this.sourcesService.create(dto, user?.email);
  }

  @Post(":id/sync")
  @Roles("admin", "editor")
  async sync(@Param("id") id: string) {
    return this.sourcesService.sync(id);
  }

  @Get("jobs")
  async jobs() {
    return this.sourcesService.listIngestionJobs();
  }

  @Delete(":id")
  @Roles("admin", "editor")
  async remove(@Param("id") id: string, @CurrentUser() user?: { email?: string }) {
    return this.sourcesService.remove(id, user?.email);
  }
}
