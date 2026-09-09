import { Body, Controller, Delete, Get, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../common/auth/authenticated-request";
import { AuthService } from "./auth.service";
import { AddStarBalanceDto } from "./dto/add-star-balance.dto";
import { ChangeEmailDto } from "./dto/change-email.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { DeleteAccountDto } from "./dto/delete-account.dto";
import { LoginDto } from "./dto/login.dto";
import { ConfirmPasswordResetDto, RequestPasswordResetDto, VerifyPasswordResetCodeDto } from "./dto/password-reset.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResendVerificationDto } from "./dto/resend-verification.dto";
import { DisableTwoFactorDto, EnableTwoFactorDto, SetupTwoFactorDto } from "./dto/two-factor.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.auth.login(dto, this.getClientMetadata(request));
  }

  @Post("verify-email")
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }

  @Get("verify-email")
  async verifyEmailLink(@Query("token") token: string, @Res() response: Response) {
    if (!token) {
      return this.renderEmailVerificationPage(
        response,
        400,
        "Link invalido",
        "Nao encontramos o token de ativacao nesse link."
      );
    }

    try {
      await this.auth.verifyEmail({ token });
      return this.renderEmailVerificationPage(
        response,
        200,
        "Conta ativada",
        "Sua conta Tempest Light foi ativada. Volte ao app e entre normalmente."
      );
    } catch {
      return this.renderEmailVerificationPage(
        response,
        400,
        "Link invalido ou expirado",
        "Volte ao app e peca um novo e-mail de ativacao."
      );
    }
  }

  @Post("resend-verification")
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.auth.resendVerification(dto);
  }

  @Post("password-reset/request")
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.auth.requestPasswordReset(dto);
  }

  @Post("password-reset/verify")
  verifyPasswordResetCode(@Body() dto: VerifyPasswordResetCodeDto) {
    return this.auth.verifyPasswordResetCode(dto);
  }

  @Post("password-reset/confirm")
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.auth.confirmPasswordReset(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  updateMe(@Body() dto: UpdateProfileDto, @Req() request: AuthenticatedRequest) {
    return this.auth.updateProfile(request.user.id, dto);
  }

  @Post("me/stars")
  @UseGuards(JwtAuthGuard)
  addStars(@Body() dto: AddStarBalanceDto, @Req() request: AuthenticatedRequest) {
    return this.auth.addDeveloperStars(request.user.id, dto.amount);
  }

  @Patch("me/email")
  @UseGuards(JwtAuthGuard)
  changeEmail(@Body() dto: ChangeEmailDto, @Req() request: AuthenticatedRequest) {
    return this.auth.changeEmail(request.user.id, dto);
  }

  @Patch("me/password")
  @UseGuards(JwtAuthGuard)
  changePassword(@Body() dto: ChangePasswordDto, @Req() request: AuthenticatedRequest) {
    return this.auth.changePassword(request.user.id, request.user.sessionId, dto);
  }

  @Post("me/two-factor/setup")
  @UseGuards(JwtAuthGuard)
  setupTwoFactor(@Body() dto: SetupTwoFactorDto, @Req() request: AuthenticatedRequest) {
    return this.auth.setupTwoFactor(request.user.id, dto);
  }

  @Post("me/two-factor/enable")
  @UseGuards(JwtAuthGuard)
  enableTwoFactor(@Body() dto: EnableTwoFactorDto, @Req() request: AuthenticatedRequest) {
    return this.auth.enableTwoFactor(request.user.id, dto);
  }

  @Post("me/two-factor/disable")
  @UseGuards(JwtAuthGuard)
  disableTwoFactor(@Body() dto: DisableTwoFactorDto, @Req() request: AuthenticatedRequest) {
    return this.auth.disableTwoFactor(request.user.id, dto);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  logout(@Req() request: AuthenticatedRequest) {
    return this.auth.logout(request.user.id, request.user.sessionId);
  }

  @Delete("me")
  @UseGuards(JwtAuthGuard)
  deleteMe(@Body() dto: DeleteAccountDto, @Req() request: AuthenticatedRequest) {
    return this.auth.deleteAccount(request.user.id, dto);
  }

  private getClientMetadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"]
    };
  }

  private renderEmailVerificationPage(response: Response, statusCode: number, title: string, message: string) {
    return response
      .status(statusCode)
      .type("html")
      .send(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - Tempest Light</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #07110f; color: #eef6f2; font-family: Arial, sans-serif; }
    main { width: min(92vw, 480px); border: 1px solid #263b34; border-radius: 12px; background: #15211d; padding: 28px; box-shadow: 0 18px 70px rgba(0,0,0,.35); }
    h1 { margin: 0 0 10px; font-size: 28px; }
    p { margin: 0; color: #b8c9c2; line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>${message}</p>
  </main>
</body>
</html>`);
  }
}
