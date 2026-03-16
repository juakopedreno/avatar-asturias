import { Module } from "@nestjs/common";
import { UsersRolesController } from "./users-roles.controller";
import { UsersRolesService } from "./users-roles.service";

@Module({
  controllers: [UsersRolesController],
  providers: [UsersRolesService],
  exports: [UsersRolesService],
})
export class UsersRolesModule {}
