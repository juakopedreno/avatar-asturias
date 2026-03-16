import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { ExportService } from "./export.service";

@ApiTags("export")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("export")
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get("bundle")
  @Roles("admin", "auditor")
  async bundle() {
    return this.exportService.exportBundle();
  }
}
