import { Controller, Get, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { WearablesService } from "./wearables.service";

@ApiTags("wearables")
@Controller("wearables")
export class WearablesController {
  constructor(private readonly wearablesService: WearablesService) {}

  @Get("fitbit/connect")
  async fitbitConnect() {
    return this.wearablesService.getFitbitConnectData();
  }

  @Get("fitbit/callback")
  async fitbitCallback(@Query("code") code: string | undefined, @Res() res: Response) {
    if (!code) {
      return res.status(400).send("Missing authorization code from Fitbit.");
    }
    await this.wearablesService.exchangeCode(code);
    return res.send(
      "<html><body style=\"font-family:system-ui;padding:24px;\"><h2>Fitbit conectado correctamente</h2><p>Ya puedes volver a la app y ver tu pulso en tiempo real.</p></body></html>",
    );
  }

  @Get("me/realtime")
  async myRealtime(@Query("diagnostics") diagnostics?: string) {
    return this.wearablesService.getRealtime(diagnostics === "1");
  }
}
