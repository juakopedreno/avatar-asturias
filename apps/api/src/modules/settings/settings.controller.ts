import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { SettingsService } from "./settings.service";

@ApiTags("settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles("admin", "editor")
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  @Roles("admin")
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }
}
