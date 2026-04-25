import { Module } from "@nestjs/common";
import { WearablesController } from "./wearables.controller";
import { WearablesService } from "./wearables.service";

@Module({
  controllers: [WearablesController],
  providers: [WearablesService],
  exports: [WearablesService],
})
export class WearablesModule {}
