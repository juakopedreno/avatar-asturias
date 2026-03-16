import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { TrainingController } from "./training.controller";
import { TrainingService } from "./training.service";

@Module({
  imports: [AuditModule],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
