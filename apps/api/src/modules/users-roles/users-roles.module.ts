import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { UsersRolesController } from "./users-roles.controller";
import { UsersRolesService } from "./users-roles.service";

@Module({
  imports: [AuditModule],
  controllers: [UsersRolesController],
  providers: [UsersRolesService],
  exports: [UsersRolesService],
})
export class UsersRolesModule {}
