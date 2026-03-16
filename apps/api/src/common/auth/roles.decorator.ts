import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";
export const Roles = (...roles: Array<"admin" | "editor" | "viewer" | "auditor">) =>
  SetMetadata(ROLES_KEY, roles);
