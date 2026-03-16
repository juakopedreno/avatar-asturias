import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { AuditService } from "./audit.service";

@ApiTags("audit")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("entries")
  @Roles("admin", "auditor")
  async list() {
    return this.auditService.list();
  }

  @Post("entries")
  @Roles("admin")
  async append(
    @Body()
    payload: {
      actor: string;
      module: string;
      action: string;
      detail: string;
    },
  ) {
    return this.auditService.append(payload);
  }
}
