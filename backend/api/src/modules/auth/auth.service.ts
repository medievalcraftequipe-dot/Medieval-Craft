import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { hash, verify } from "@node-rs/argon2";
import type { Prisma, User } from "@prisma/client";
import type { AuthenticatedPrincipal } from "../../common/auth/authenticated-request";
import { MailService } from "../../common/mail/mail.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { presentAuthUser } from "../users/user.presenter";
import { UsersService } from "../users/users.service";
import { ChangeEmailDto } from "./dto/change-email.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { DeleteAccountDto } from "./dto/delete-account.dto";
import { LoginDto } from "./dto/login.dto";
import { ConfirmPasswordResetDto, RequestPasswordResetDto, VerifyPasswordResetCodeDto } from "./dto/password-reset.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResendVerificationDto } from "./dto/resend-verification.dto";
import { DisableTwoFactorDto, EnableTwoFactorDto, SetupTwoFactorDto } from "./dto/two-factor.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { validatePasswordPolicy } from "./password-policy";

const maxUserStarBalance = 999_999_999;
const authAttemptRetentionMs = 24 * 60 * 60 * 1000;
const loginIdentifierWindowMs = 15 * 60 * 1000;
const loginIpWindowMs = 15 * 60 * 1000;
const loginIdentifierFailureLimit = 5;
const loginIpFailureLimit = 30;
const passwordResetFailureLimit = 6;
const messageSecurityMetadataMaxLength = 240;
const fallbackDeveloperEmails = ["rafaeltanki1212@gmail.com", "izigamer47@gmail.com"];
const fallbackDeveloperUsernames = ["armadura_prime"];

interface ClientMetadata {
  ipAddress?: string;
  userAgent?: string;
}

interface JwtPayload {
  sub: string;
  sid: string;
  username: string;
}

interface AuthResponsePayload {
  accessToken: string;
  user: ReturnType<typeof presentAuthUser>;
}

interface RegisterResponsePayload {
  ok: true;
  email: string;
  username: string;
  emailVerificationRequired: true;
  verificationEmailSent: boolean;
  devVerificationUrl?: string;
}

interface ResendVerificationResponsePayload {
  ok: true;
  emailVerificationRequired: boolean;
  verificationEmailSent: boolean;
  devVerificationUrl?: string;
}

interface VerifyEmailResponsePayload {
  ok: true;
  user: ReturnType<typeof presentAuthUser>;
}

interface PasswordResetRequestResponsePayload {
  ok: true;
  passwordResetEmailSent: boolean;
  devResetCode?: string;
}

interface PasswordResetVerifyResponsePayload {
  ok: true;
  resetToken: string;
}

interface TwoFactorSetupResponsePayload {
  ok: true;
  secret: string;
  otpauthUrl: string;
}

interface SessionView {
  id: string;
  current: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
}

interface UpdateProfilePayload {
  username?: string;
  currentPassword?: string;
  displayName?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  customStatus?: string | null;
  presence?: "ONLINE" | "IDLE" | "DND" | "INVISIBLE" | "OFFLINE";
  blockNonFriendDirectMessages?: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
    private readonly users: UsersService
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponsePayload> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException("Password confirmation does not match.");
    }

    const passwordIssues = validatePasswordPolicy(dto.password);
    if (passwordIssues.length > 0) {
      throw new BadRequestException(`Password policy failed: ${passwordIssues.join(" ")}`);
    }

    const birthDate = new Date(dto.birthDate);
    if (Number.isNaN(birthDate.getTime())) {
      throw new BadRequestException("Birth date is invalid.");
    }

    const passwordHash = await hash(dto.password);
    const user = await this.users.create({
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName || dto.username,
      passwordHash,
      birthDate
    });

    return this.issueEmailVerification(user);
  }

  async login(dto: LoginDto, metadata: ClientMetadata): Promise<AuthResponsePayload> {
    const identifier = dto.emailOrUsername.trim().toLowerCase();
    await this.enforceAuthAttemptLimit("login", identifier, metadata, loginIdentifierFailureLimit, loginIdentifierWindowMs, loginIpFailureLimit, loginIpWindowMs);

    const user = await this.users.findByEmailOrUsername(dto.emailOrUsername);
    if (!user || user.status !== "ACTIVE") {
      await this.recordAuthAttempt("login", identifier, metadata, false, "invalid_credentials", user?.id);
      throw new UnauthorizedException("Invalid credentials.");
    }

    const passwordMatches = await this.verifyPasswordHash(user.passwordHash, dto.password);
    if (!passwordMatches) {
      await this.recordAuthAttempt("login", identifier, metadata, false, "invalid_credentials", user.id);
      throw new UnauthorizedException("Invalid credentials.");
    }

    if (!user.emailVerifiedAt) {
      await this.recordAuthAttempt("login", identifier, metadata, false, "email_not_verified", user.id);
      throw new UnauthorizedException("Ative sua conta pelo e-mail antes de entrar.");
    }

    if (user.twoFactorEnabled) {
      if (!user.twoFactorSecret || !dto.twoFactorCode) {
        await this.recordAuthAttempt("login", identifier, metadata, false, "two_factor_required", user.id);
        throw new UnauthorizedException("Digite o codigo do autenticador para entrar.");
      }

      const twoFactorSecret = this.unprotectTwoFactorSecret(user.twoFactorSecret);
      if (!twoFactorSecret || !this.verifyTotpCode(twoFactorSecret, dto.twoFactorCode)) {
        await this.recordAuthAttempt("login", identifier, metadata, false, "two_factor_invalid", user.id);
        throw new UnauthorizedException("Codigo do autenticador invalido.");
      }
    }

    await this.recordAuthAttempt("login", identifier, metadata, true, "success", user.id);
    await this.recordSecurityEvent("login_success", user.id, user.id, metadata);
    return this.createAuthResponse(user.id, metadata);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<VerifyEmailResponsePayload> {
    const tokenHash = this.hashToken(dto.token);
    const token = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      throw new BadRequestException("Link de ativacao invalido ou expirado.");
    }

    if (token.user.status !== "ACTIVE") {
      throw new UnauthorizedException("Esta conta nao pode ser ativada.");
    }

    const verifiedAt = token.user.emailVerifiedAt ?? new Date();
    const [, user] = await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() }
      }),
      this.prisma.user.update({
        where: { id: token.userId },
        data: { emailVerifiedAt: verifiedAt }
      })
    ]);

    return {
      ok: true,
      user: presentAuthUser(user)
    };
  }

  async resendVerification(dto: ResendVerificationDto): Promise<ResendVerificationResponsePayload> {
    const user = await this.users.findByEmailOrUsername(dto.emailOrUsername);
    if (!user) {
      return {
        ok: true,
        emailVerificationRequired: true,
        verificationEmailSent: true
      };
    }

    if (user.emailVerifiedAt) {
      return {
        ok: true,
        emailVerificationRequired: false,
        verificationEmailSent: false
      };
    }

    return this.issueEmailVerification(user);
  }

  async updateProfile(userId: string, input: UpdateProfilePayload) {
    const currentUser = await this.users.findById(userId);
    if (!currentUser) {
      throw new UnauthorizedException("User not found.");
    }

    const requestedUsername = input.username?.trim().toLowerCase();
    const usernameChanged = Boolean(requestedUsername && requestedUsername !== currentUser.username);

    if (usernameChanged) {
      if (!input.currentPassword) {
        throw new BadRequestException("Digite a senha atual para mudar o nick da conta.");
      }

      const passwordMatches = await this.verifyPasswordHash(currentUser.passwordHash, input.currentPassword);
      if (!passwordMatches) {
        throw new UnauthorizedException("Senha atual incorreta.");
      }
    }

    let displayName = input.displayName?.trim();
    if (displayName !== undefined && displayName.length === 0) {
      displayName = requestedUsername ?? currentUser.username;
    }

    const user = await this.users.updateProfile(userId, {
      username: usernameChanged ? requestedUsername : undefined,
      displayName,
      avatarUrl: input.avatarUrl,
      bannerUrl: input.bannerUrl,
      bio: input.bio,
      customStatus: input.customStatus,
      presence: input.presence,
      blockNonFriendDirectMessages: input.blockNonFriendDirectMessages
    });

    return presentAuthUser(user);
  }

  async addDeveloperStars(userId: string, amountInput: number, metadata: ClientMetadata = {}) {
    const currentUser = await this.users.findById(userId);
    if (!currentUser) {
      throw new UnauthorizedException("User not found.");
    }

    if (!this.isDeveloperAccount(currentUser)) {
      throw new ForbiddenException("Somente conta developer pode adicionar saldo de estrelas.");
    }

    this.assertHighPrivilegeTwoFactor(currentUser);

    const amount = Math.min(Math.max(Math.floor(amountInput) || 0, 1), maxUserStarBalance);
    const nextBalance = Math.min(maxUserStarBalance, currentUser.starBalance + amount);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { starBalance: nextBalance }
    });

    await this.recordSecurityEvent("developer_stars_added", userId, userId, metadata, { amount, nextBalance });
    return { user: presentAuthUser(user) };
  }

  async changeEmail(userId: string, currentSessionId: string, dto: ChangeEmailDto, metadata: ClientMetadata) {
    const currentUser = await this.users.findById(userId);
    if (!currentUser) {
      throw new UnauthorizedException("User not found.");
    }

    const passwordMatches = await this.verifyPasswordHash(currentUser.passwordHash, dto.currentPassword);
    if (!passwordMatches) {
      throw new UnauthorizedException("Senha atual incorreta.");
    }

    if (dto.email === currentUser.email) {
      return presentAuthUser(currentUser);
    }

    const emailOwner = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });
    if (emailOwner && emailOwner.id !== userId) {
      throw new ConflictException("Email is already registered.");
    }

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { email: dto.email }
      }),
      this.prisma.session.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    await this.recordSecurityEvent("account_email_changed", userId, userId, metadata);
    return presentAuthUser(user);
  }

  async changePassword(userId: string, currentSessionId: string, dto: ChangePasswordDto, metadata: ClientMetadata): Promise<{ ok: true }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException("Password confirmation does not match.");
    }

    const passwordIssues = validatePasswordPolicy(dto.newPassword);
    if (passwordIssues.length > 0) {
      throw new BadRequestException(`Password policy failed: ${passwordIssues.join(" ")}`);
    }

    const currentUser = await this.users.findById(userId);
    if (!currentUser) {
      throw new UnauthorizedException("User not found.");
    }

    const passwordMatches = await this.verifyPasswordHash(currentUser.passwordHash, dto.currentPassword);
    if (!passwordMatches) {
      throw new UnauthorizedException("Senha atual incorreta.");
    }

    const passwordHash = await hash(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      }),
      this.prisma.session.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    await this.recordSecurityEvent("account_password_changed", userId, userId, metadata);
    return { ok: true };
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto): Promise<{ ok: true }> {
    const currentUser = await this.users.findById(userId);
    if (!currentUser) {
      throw new UnauthorizedException("User not found.");
    }

    const passwordMatches = await this.verifyPasswordHash(currentUser.passwordHash, dto.currentPassword);
    if (!passwordMatches) {
      throw new UnauthorizedException("Senha atual incorreta.");
    }

    await this.prisma.$transaction([
      this.prisma.server.deleteMany({ where: { ownerId: userId } }),
      this.prisma.ban.deleteMany({ where: { moderatorId: userId } }),
      this.prisma.moderationAction.deleteMany({ where: { moderatorId: userId } }),
      this.prisma.user.delete({ where: { id: userId } })
    ]);

    return { ok: true };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto, metadata: ClientMetadata = {}): Promise<PasswordResetRequestResponsePayload> {
    const identifier = dto.emailOrUsername.trim().toLowerCase();
    await this.enforceAuthAttemptLimit("password_reset", identifier, metadata, passwordResetFailureLimit, 15 * 60 * 1000, 20, 15 * 60 * 1000);

    const user = await this.users.findByEmailOrUsername(dto.emailOrUsername);
    if (!user || user.status !== "ACTIVE") {
      await this.recordAuthAttempt("password_reset", identifier, metadata, true, "accepted");
      return {
        ok: true,
        passwordResetEmailSent: true
      };
    }

    await this.prisma.passwordResetCode.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    });

    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        codeHash: this.hashPasswordResetCode(user.id, code),
        expiresAt
      }
    });

    const passwordResetEmailSent = await this.mail.sendPasswordResetCode({
      to: user.email,
      username: user.username,
      code,
      expiresAt
    });

    await this.recordAuthAttempt("password_reset", identifier, metadata, true, "accepted", user.id);
    await this.recordSecurityEvent("password_reset_requested", user.id, user.id, metadata);
    return {
      ok: true,
      passwordResetEmailSent,
      ...(this.shouldExposeDevVerificationUrl(passwordResetEmailSent) ? { devResetCode: code } : {})
    };
  }

  async verifyPasswordResetCode(dto: VerifyPasswordResetCodeDto, metadata: ClientMetadata = {}): Promise<PasswordResetVerifyResponsePayload> {
    const identifier = dto.emailOrUsername.trim().toLowerCase();
    await this.enforceAuthAttemptLimit("password_reset_verify", identifier, metadata, passwordResetFailureLimit, 15 * 60 * 1000, 20, 15 * 60 * 1000);

    const user = await this.users.findByEmailOrUsername(dto.emailOrUsername);
    if (!user || user.status !== "ACTIVE") {
      await this.recordAuthAttempt("password_reset_verify", identifier, metadata, false, "invalid_code");
      throw new BadRequestException("Codigo invalido ou expirado.");
    }

    const code = this.normalizeSixDigitCode(dto.code);
    const resetRecord = await this.prisma.passwordResetCode.findUnique({
      where: { codeHash: this.hashPasswordResetCode(user.id, code) }
    });

    if (!resetRecord || resetRecord.userId !== user.id || resetRecord.usedAt || resetRecord.expiresAt <= new Date()) {
      await this.recordAuthAttempt("password_reset_verify", identifier, metadata, false, "invalid_code", user.id);
      throw new BadRequestException("Codigo invalido ou expirado.");
    }

    const resetToken = randomBytes(32).toString("base64url");
    await this.prisma.passwordResetCode.update({
      where: { id: resetRecord.id },
      data: {
        resetTokenHash: this.hashToken(resetToken),
        verifiedAt: new Date()
      }
    });

    await this.recordAuthAttempt("password_reset_verify", identifier, metadata, true, "success", user.id);
    await this.recordSecurityEvent("password_reset_code_verified", user.id, user.id, metadata);
    return {
      ok: true,
      resetToken
    };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto, metadata: ClientMetadata = {}): Promise<{ ok: true }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException("Password confirmation does not match.");
    }

    const passwordIssues = validatePasswordPolicy(dto.newPassword);
    if (passwordIssues.length > 0) {
      throw new BadRequestException(`Password policy failed: ${passwordIssues.join(" ")}`);
    }

    const resetRecord = await this.prisma.passwordResetCode.findUnique({
      where: { resetTokenHash: this.hashToken(dto.resetToken) }
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt <= new Date()) {
      throw new BadRequestException("Codigo invalido ou expirado.");
    }

    const passwordHash = await hash(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash }
      }),
      this.prisma.passwordResetCode.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() }
      }),
      this.prisma.session.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    await this.recordSecurityEvent("password_reset_completed", resetRecord.userId, resetRecord.userId, metadata);
    return { ok: true };
  }

  async setupTwoFactor(userId: string, dto: SetupTwoFactorDto, metadata: ClientMetadata = {}): Promise<TwoFactorSetupResponsePayload> {
    const currentUser = await this.users.findById(userId);
    if (!currentUser) {
      throw new UnauthorizedException("User not found.");
    }

    const passwordMatches = await this.verifyPasswordHash(currentUser.passwordHash, dto.currentPassword);
    if (!passwordMatches) {
      throw new UnauthorizedException("Senha atual incorreta.");
    }

    const secret = this.createTwoFactorSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: this.protectTwoFactorSecret(secret),
        twoFactorEnabled: false
      }
    });

    await this.recordSecurityEvent("two_factor_setup_started", userId, userId, metadata);
    return {
      ok: true,
      secret,
      otpauthUrl: this.buildTotpAuthUrl(currentUser, secret)
    };
  }

  async enableTwoFactor(userId: string, currentSessionId: string, dto: EnableTwoFactorDto, metadata: ClientMetadata) {
    const currentUser = await this.users.findById(userId);
    if (!currentUser) {
      throw new UnauthorizedException("User not found.");
    }

    const twoFactorSecret = currentUser.twoFactorSecret ? this.unprotectTwoFactorSecret(currentUser.twoFactorSecret) : null;
    if (!twoFactorSecret || !this.verifyTotpCode(twoFactorSecret, dto.code)) {
      throw new BadRequestException("Codigo do autenticador invalido.");
    }

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true }
      }),
      this.prisma.session.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    await this.recordSecurityEvent("two_factor_enabled", userId, userId, metadata);
    return presentAuthUser(user);
  }

  async disableTwoFactor(userId: string, currentSessionId: string, dto: DisableTwoFactorDto, metadata: ClientMetadata) {
    const currentUser = await this.users.findById(userId);
    if (!currentUser) {
      throw new UnauthorizedException("User not found.");
    }

    const passwordMatches = await this.verifyPasswordHash(currentUser.passwordHash, dto.currentPassword);
    if (!passwordMatches) {
      throw new UnauthorizedException("Senha atual incorreta.");
    }

    const twoFactorSecret = currentUser.twoFactorSecret ? this.unprotectTwoFactorSecret(currentUser.twoFactorSecret) : null;
    if (currentUser.twoFactorEnabled && (!twoFactorSecret || !dto.code || !this.verifyTotpCode(twoFactorSecret, dto.code))) {
      throw new BadRequestException("Codigo do autenticador invalido.");
    }

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null
        }
      }),
      this.prisma.session.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    await this.recordSecurityEvent("two_factor_disabled", userId, userId, metadata);
    return presentAuthUser(user);
  }

  async validateAccessToken(token: string): Promise<AuthenticatedPrincipal> {
    let payload: JwtPayload;

    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired token.");
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true }
    });

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException("Session not found.");
    }

    if (session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Session expired.");
    }

    if (session.tokenHash !== this.hashToken(token)) {
      throw new UnauthorizedException("Session token mismatch.");
    }

    if (session.user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is not active.");
    }

    if (!session.user.emailVerifiedAt) {
      throw new UnauthorizedException("Ative sua conta pelo e-mail antes de entrar.");
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() }
    });

    return {
      ...presentAuthUser(session.user),
      sessionId: session.id
    };
  }

  private isDeveloperAccount(user: Pick<User, "email" | "username">) {
    const configuredEmails = this.readConfiguredList("TEMPEST_LIGHT_DEVELOPER_EMAILS");
    const configuredUsernames = this.readConfiguredList("TEMPEST_LIGHT_DEVELOPER_USERNAMES");
    const email = user.email.trim().toLowerCase();
    const username = user.username.trim().toLowerCase();

    return [...configuredEmails, ...fallbackDeveloperEmails].map((item) => item.toLowerCase()).includes(email)
      || [...configuredUsernames, ...fallbackDeveloperUsernames].map((item) => item.toLowerCase()).includes(username);
  }

  private assertHighPrivilegeTwoFactor(user: Pick<User, "twoFactorEnabled">) {
    if (!user.twoFactorEnabled) {
      throw new ForbiddenException("Ative a autenticacao em dois fatores antes de usar acoes developer.");
    }
  }

  private readConfiguredList(key: string) {
    const value = this.config.get<string>(key);
    return String(value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async listSessions(userId: string, currentSessionId: string): Promise<{ sessions: SessionView[] }> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { lastSeenAt: "desc" },
      take: 50
    });

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        current: session.id === currentSessionId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt.toISOString(),
        lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
        expiresAt: session.expiresAt.toISOString(),
        revokedAt: session.revokedAt?.toISOString() ?? null
      }))
    };
  }

  async revokeSession(userId: string, currentSessionId: string, targetSessionId: string, metadata: ClientMetadata): Promise<{ ok: true; revokedSessionId: string }> {
    const cleanSessionId = targetSessionId.trim();
    if (!cleanSessionId) {
      throw new BadRequestException("Sessao obrigatoria.");
    }

    const result = await this.prisma.session.updateMany({
      where: { id: cleanSessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    if (!result.count) {
      throw new NotFoundException("Sessao nao encontrada ou ja encerrada.");
    }

    await this.recordSecurityEvent(
      cleanSessionId === currentSessionId ? "session_revoked_current" : "session_revoked",
      userId,
      userId,
      metadata,
      { sessionId: cleanSessionId }
    );
    return { ok: true, revokedSessionId: cleanSessionId };
  }

  async revokeOtherSessions(userId: string, currentSessionId: string, metadata: ClientMetadata): Promise<{ ok: true; revoked: number }> {
    const result = await this.prisma.session.updateMany({
      where: { userId, id: { not: currentSessionId }, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    await this.recordSecurityEvent("sessions_revoked_others", userId, userId, metadata, { revoked: result.count });
    return { ok: true, revoked: result.count };
  }

  async logout(userId: string, sessionId: string, metadata: ClientMetadata): Promise<{ ok: true }> {
    const now = new Date();
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: now }
    });

    const activeSessions = await this.prisma.session.count({
      where: {
        userId,
        id: { not: sessionId },
        revokedAt: null,
        expiresAt: { gt: now }
      }
    });

    if (activeSessions === 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { presence: "OFFLINE" }
      });
    }

    await this.recordSecurityEvent("logout", userId, userId, metadata, { sessionId });
    return { ok: true };
  }

  private async enforceAuthAttemptLimit(
    scope: string,
    identifier: string,
    metadata: ClientMetadata,
    identifierLimit: number,
    identifierWindowMs: number,
    ipLimit = identifierLimit * 4,
    ipWindowMs = identifierWindowMs
  ) {
    const now = Date.now();
    const identifierHash = this.hashSecurityIdentifier(identifier);
    const ipHash = metadata.ipAddress ? this.hashSecurityIdentifier(`ip:${metadata.ipAddress}`) : null;

    await this.pruneAuthAttempts();
    const [identifierFailures, latestIdentifierFailure, ipFailures, latestIpFailure] = await Promise.all([
      this.prisma.authAttempt.count({
        where: {
          scope,
          identifierHash,
          success: false,
          createdAt: { gte: new Date(now - identifierWindowMs) }
        }
      }),
      this.prisma.authAttempt.findFirst({
        where: {
          scope,
          identifierHash,
          success: false,
          createdAt: { gte: new Date(now - identifierWindowMs) }
        },
        orderBy: { createdAt: "desc" }
      }),
      ipHash
        ? this.prisma.authAttempt.count({
            where: {
              scope,
              ipHash,
              success: false,
              createdAt: { gte: new Date(now - ipWindowMs) }
            }
          })
        : Promise.resolve(0),
      ipHash
        ? this.prisma.authAttempt.findFirst({
            where: {
              scope,
              ipHash,
              success: false,
              createdAt: { gte: new Date(now - ipWindowMs) }
            },
            orderBy: { createdAt: "desc" }
          })
        : Promise.resolve(null)
    ]);

    const identifierRetryAt = this.getRetryAt(latestIdentifierFailure?.createdAt ?? null, identifierFailures, identifierLimit);
    const ipRetryAt = this.getRetryAt(latestIpFailure?.createdAt ?? null, ipFailures, ipLimit);
    const retryAt = Math.max(identifierRetryAt, ipRetryAt);
    if (retryAt > now) {
      const seconds = Math.max(30, Math.ceil((retryAt - now) / 1000));
      throw new UnauthorizedException(`Muitas tentativas. Aguarde ${Math.ceil(seconds / 60)} minuto(s) antes de tentar novamente.`);
    }
  }

  private getRetryAt(latestFailureAt: Date | null, failureCount: number, limit: number) {
    if (!latestFailureAt || failureCount < limit) {
      return 0;
    }

    const overLimit = Math.max(0, failureCount - limit);
    const lockoutMs = Math.min(60 * 60 * 1000, 5 * 60 * 1000 * 2 ** Math.min(overLimit, 4));
    return latestFailureAt.getTime() + lockoutMs;
  }

  private async pruneAuthAttempts() {
    await this.prisma.authAttempt.deleteMany({
      where: {
        createdAt: { lt: new Date(Date.now() - authAttemptRetentionMs) }
      }
    });
  }

  private async recordAuthAttempt(
    scope: string,
    identifier: string,
    metadata: ClientMetadata,
    success: boolean,
    reason: string,
    userId?: string
  ) {
    const safeMetadata = this.cleanClientMetadata(metadata);
    await this.prisma.authAttempt.create({
      data: {
        scope: scope.slice(0, 40),
        identifierHash: this.hashSecurityIdentifier(identifier),
        ipHash: safeMetadata.ipAddress ? this.hashSecurityIdentifier(`ip:${safeMetadata.ipAddress}`) : null,
        userId,
        success,
        reason: reason.slice(0, 80)
      }
    });

    if (!success) {
      await this.recordSecurityEvent(`${scope}_failed`, userId ?? null, userId ?? null, safeMetadata, { reason });
    }
  }

  private async recordSecurityEvent(
    action: string,
    actorId: string | null,
    targetId: string | null,
    metadata: ClientMetadata,
    eventMetadata?: Record<string, unknown>
  ) {
    const safeMetadata = this.cleanClientMetadata(metadata);
    await this.prisma.securityEvent.create({
      data: {
        action: action.slice(0, 80),
        actorId,
        targetId,
        ipAddress: safeMetadata.ipAddress,
        userAgent: safeMetadata.userAgent,
        metadata: eventMetadata ? this.toInputJson(this.sanitizeSecurityMetadata(eventMetadata)) : undefined
      }
    });
  }

  private sanitizeSecurityMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(metadata).map(([key, value]) => [
        key.slice(0, 80),
        typeof value === "string" ? value.slice(0, messageSecurityMetadataMaxLength) : typeof value === "number" || typeof value === "boolean" ? value : null
      ])
    );
  }

  private cleanClientMetadata(metadata: ClientMetadata): ClientMetadata {
    return {
      ipAddress: metadata.ipAddress?.slice(0, 80),
      userAgent: metadata.userAgent?.slice(0, 240)
    };
  }

  private hashSecurityIdentifier(value: string): string {
    return createHmac("sha256", this.getSecurityHashSecret()).update(value.trim().toLowerCase()).digest("hex");
  }

  private getSecurityHashSecret(): string {
    return this.config.get<string>("SECURITY_EVENT_HASH_SECRET")?.trim() || this.config.get<string>("JWT_SECRET")?.trim() || "tempest-light-dev-secret";
  }

  private async verifyPasswordHash(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  private async createAuthResponse(userId: string, metadata: ClientMetadata): Promise<AuthResponsePayload> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    const expiresAt = this.resolveSessionExpiry();
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: `pending:${randomUUID()}`,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        expiresAt,
        lastSeenAt: new Date()
      }
    });

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      sid: session.id,
      username: user.username
    });

    await this.prisma.session.update({
      where: { id: session.id },
      data: { tokenHash: this.hashToken(accessToken) }
    });

    return {
      accessToken,
      user: presentAuthUser(user)
    };
  }

  private async issueEmailVerification(user: User): Promise<RegisterResponsePayload> {
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    });

    const rawToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(rawToken),
        expiresAt
      }
    });

    const verificationUrl = this.buildVerificationUrl(rawToken);
    const verificationEmailSent = await this.mail.sendVerificationEmail({
      to: user.email,
      username: user.username,
      verificationUrl,
      expiresAt
    });

    return {
      ok: true,
      email: user.email,
      username: user.username,
      emailVerificationRequired: true,
      verificationEmailSent,
      ...(this.shouldExposeDevVerificationUrl(verificationEmailSent) ? { devVerificationUrl: verificationUrl } : {})
    };
  }

  private buildVerificationUrl(token: string): string {
    const explicitVerificationUrl = this.config.get<string>("PUBLIC_VERIFY_EMAIL_URL")?.trim();
    if (explicitVerificationUrl) {
      const separator = explicitVerificationUrl.includes("?") ? "&" : "?";
      return `${explicitVerificationUrl}${separator}token=${encodeURIComponent(token)}`;
    }

    const publicApiUrl =
      this.config.get<string>("PUBLIC_API_URL")?.trim() ||
      this.config.get<string>("PUBLIC_WEB_URL")?.trim() ||
      "https://tempest-light-api.shardweb.app";
    const normalizedApiUrl = publicApiUrl.replace(/\/$/, "");
    const apiBaseUrl = normalizedApiUrl.endsWith("/api/v1") ? normalizedApiUrl : `${normalizedApiUrl}/api/v1`;

    return `${apiBaseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
  }

  private shouldExposeDevVerificationUrl(emailSent: boolean): boolean {
    return !emailSent && this.config.get<string>("NODE_ENV") !== "production";
  }

  private resolveSessionExpiry(): Date {
    const duration = this.config.get<string>("JWT_EXPIRES_IN") ?? "7d";
    const match = /^(\d+)([smhd])$/.exec(duration);
    const now = Date.now();

    if (!match) {
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multiplier =
      unit === "s"
        ? 1000
        : unit === "m"
          ? 60 * 1000
          : unit === "h"
            ? 60 * 60 * 1000
            : 24 * 60 * 60 * 1000;

    return new Date(now + value * multiplier);
  }

  private protectTwoFactorSecret(secret: string): string {
    const key = this.getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
  }

  private unprotectTwoFactorSecret(value: string): string | null {
    if (!value.startsWith("enc:v1:")) {
      return value;
    }

    const [, , ivText, tagText, encryptedText] = value.split(":");
    if (!ivText || !tagText || !encryptedText) {
      return null;
    }

    try {
      const decipher = createDecipheriv("aes-256-gcm", this.getEncryptionKey(), Buffer.from(ivText, "base64url"));
      decipher.setAuthTag(Buffer.from(tagText, "base64url"));
      return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
    } catch {
      return null;
    }
  }

  private getEncryptionKey(): Buffer {
    const configured = this.config.get<string>("TWO_FACTOR_SECRET_ENCRYPTION_KEY")?.trim();
    const fallback = this.config.get<string>("JWT_SECRET")?.trim();
    return createHash("sha256").update(configured || fallback || "tempest-light-dev-secret").digest();
  }

  private createTwoFactorSecret(): string {
    return this.base32Encode(randomBytes(20));
  }

  private buildTotpAuthUrl(user: User, secret: string): string {
    const issuer = "Tempest Light";
    const label = `${issuer}:${user.email}`;
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: "SHA1",
      digits: "6",
      period: "30"
    });

    return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
  }

  private verifyTotpCode(secret: string, code: string): boolean {
    const normalizedCode = this.normalizeSixDigitCode(code);
    if (!normalizedCode) {
      return false;
    }

    const counter = Math.floor(Date.now() / 1000 / 30);
    for (const offset of [-1, 0, 1]) {
      if (this.createTotpCode(secret, counter + offset) === normalizedCode) {
        return true;
      }
    }

    return false;
  }

  private createTotpCode(secret: string, counter: number): string {
    const key = this.base32Decode(secret);
    const buffer = Buffer.alloc(8);
    let value = BigInt(counter);

    for (let index = 7; index >= 0; index -= 1) {
      buffer[index] = Number(value & 0xffn);
      value >>= 8n;
    }

    const digest = createHmac("sha1", key).update(buffer).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    return String(binary % 1_000_000).padStart(6, "0");
  }

  private base32Encode(buffer: Buffer): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0;
    let value = 0;
    let output = "";

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
  }

  private base32Decode(secret: string): Buffer {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const cleanSecret = secret.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;

    for (const char of cleanSecret) {
      const index = alphabet.indexOf(char);
      if (index < 0) {
        continue;
      }

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }

  private normalizeSixDigitCode(code: string): string {
    const normalized = code.replace(/\D/g, "");
    return /^\d{6}$/.test(normalized) ? normalized : "";
  }

  private hashPasswordResetCode(userId: string, code: string): string {
    return this.hashToken(`${userId}:${code}`);
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private toInputJson(value: Record<string, unknown>) {
    return value as Prisma.InputJsonValue;
  }
}
