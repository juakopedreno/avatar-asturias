import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  overview() {
    return this.analyticsService.getOverview();
  }

  @Get("dashboard")
  dashboard() {
    return this.analyticsService.getDashboard();
  }
}
