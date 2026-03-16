import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { RetentionService } from "./retention.service";

@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [AuditService, RetentionService],
  exports: [AuditService],
})
export class AuditModule {}
