import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { MfaVerifyDto } from "./dto/mfa-verify.dto";
import { RefreshDto } from "./dto/refresh.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("mfa/verify")
  async verifyMfa(@Body() dto: MfaVerifyDto) {
    return this.authService.verifyMfa(dto);
  }

  @Post("refresh")
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Post("logout")
  async logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: { userId: string }) {
    return this.authService.me(user.userId);
  }
}
