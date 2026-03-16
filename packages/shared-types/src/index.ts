export type LanguageCode = "ES" | "EN" | "FR" | "DE";

export type UserRole = "admin" | "editor" | "viewer" | "auditor";

export type SourceType = "pdf" | "api" | "web" | "database" | "manual";

export type SourceStatus = "synced" | "pending" | "error";

export interface SourceReference {
  id: string;
  label: string;
  updatedAt: string;
}

export interface ChatMessageDto {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: SourceReference[];
}

export interface UserSessionDto {
  id: string;
  email: string;
  role: UserRole;
  mfaEnabled: boolean;
}
