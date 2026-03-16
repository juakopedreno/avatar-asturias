import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsObject } from "class-validator";

export class UpdateSettingsDto {
  @ApiProperty()
  @IsObject()
  branding!: {
    name: string;
    primaryColor: string;
  };

  @ApiProperty({ type: [Object] })
  @IsArray()
  channels!: Array<{ id: string; name: string; active: boolean }>;

  @ApiProperty()
  @IsObject()
  voice!: {
    provider: string;
    defaultVoice: string;
    speed: number;
    pitch: number;
  };

  @ApiProperty()
  @IsObject()
  privacy!: {
    dataRetentionDays: number;
    anonymizeAfterDays: number;
    cookieConsent: boolean;
    gdprCompliant: boolean;
  };

  @ApiProperty({ type: [Object] })
  @IsArray()
  notifications!: Array<{ label: string; checked: boolean }>;
}

export function validateSettingsShape(input: UpdateSettingsDto) {
  if (!input.branding?.name || !input.branding?.primaryColor) return false;
  if (!Array.isArray(input.channels)) return false;
  if (!input.voice?.provider || !input.voice?.defaultVoice) return false;
  if (typeof input.voice.speed !== "number" || typeof input.voice.pitch !== "number") return false;
  if (typeof input.privacy?.dataRetentionDays !== "number") return false;
  if (typeof input.privacy?.anonymizeAfterDays !== "number") return false;
  if (typeof input.privacy?.cookieConsent !== "boolean") return false;
  if (typeof input.privacy?.gdprCompliant !== "boolean") return false;
  if (!Array.isArray(input.notifications)) return false;
  return true;
}
