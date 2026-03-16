import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get("live")
  live() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  ready() {
    return { status: "ready", timestamp: new Date().toISOString() };
  }
}
