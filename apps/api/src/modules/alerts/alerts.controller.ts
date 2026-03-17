import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { AlertsService } from "./alerts.service";
import { CreateAlertDto } from "./dto/create-alert.dto";
import { UpdateAlertDto } from "./dto/update-alert.dto";

@ApiTags("alerts")
@Controller("alerts")
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get("active")
  getActive() {
    return this.alertsService.findActive();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  @Roles("admin", "editor", "viewer")
  findAll() {
    return this.alertsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles("admin", "editor")
  create(@Body() dto: CreateAlertDto) {
    return this.alertsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(":id")
  @Roles("admin", "editor")
  update(@Param("id") id: string, @Body() dto: UpdateAlertDto) {
    return this.alertsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(":id")
  @Roles("admin")
  remove(@Param("id") id: string) {
    return this.alertsService.remove(id);
  }
}
