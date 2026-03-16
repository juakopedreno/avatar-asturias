import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
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
  async create(@Body() dto: CreateSourceDto) {
    return this.sourcesService.create(dto);
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
  async remove(@Param("id") id: string) {
    return this.sourcesService.remove(id);
  }
}
