import { createHash, createHmac, randomBytes, randomInt, randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { hash, verify } from "@node-rs/argon2";
import type { User } from "@prisma/client";
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
    const user = await this.users.findByEmailOrUsername(dto.emailOrUsername);
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const passwordMatches = await this.verifyPasswordHash(user.passwordHash, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException("Ative sua conta pelo e-mail antes de entrar.");
    }

    if (user.twoFactorEnabled) {
      if (!user.twoFactorSecret || !dto.twoFactorCode) {
        throw new UnauthorizedException("Digite o codigo do autenticador para entrar.");
      }

      if (!this.verifyTotpCode(user.twoFactorSecret, dto.twoFactorCode)) {
        throw new UnauthorizedException("Codigo do autenticador invalido.");
      }
    }

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

  async changeEmail(userId: string, dto: ChangeEmailDto) {
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

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { email: dto.email }
    });

    return presentAuthUser(user);
  }

  async changePassword(userId: string, currentSessionId: string, dto: ChangePasswordDto): Promise<{ ok: true }> {
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

  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<PasswordResetRequestResponsePayload> {
    const user = await this.users.findByEmailOrUsername(dto.emailOrUsername);
    if (!user || user.status !== "ACTIVE") {
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

    return {
      ok: true,
      passwordResetEmailSent,
      ...(this.shouldExposeDevVerificationUrl(passwordResetEmailSent) ? { devResetCode: code } : {})
    };
  }

  async verifyPasswordResetCode(dto: VerifyPasswordResetCodeDto): Promise<PasswordResetVerifyResponsePayload> {
    const user = await this.users.findByEmailOrUsername(dto.emailOrUsername);
    if (!user || user.status !== "ACTIVE") {
      throw new BadRequestException("Codigo invalido ou expirado.");
    }

    const code = this.normalizeSixDigitCode(dto.code);
    const resetRecord = await this.prisma.passwordResetCode.findUnique({
      where: { codeHash: this.hashPasswordResetCode(user.id, code) }
    });

    if (!resetRecord || resetRecord.userId !== user.id || resetRecord.usedAt || resetRecord.expiresAt <= new Date()) {
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

    return {
      ok: true,
      resetToken
    };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto): Promise<{ ok: true }> {
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

    return { ok: true };
  }

  async setupTwoFactor(userId: string, dto: SetupTwoFactorDto): Promise<TwoFactorSetupResponsePayload> {
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
        twoFactorSecret: secret,
        twoFactorEnabled: false
      }
    });

    return {
      ok: true,
      secret,
      otpauthUrl: this.buildTotpAuthUrl(currentUser, secret)
    };
  }

  async enableTwoFactor(userId: string, dto: EnableTwoFactorDto) {
    const currentUser = await this.users.findById(userId);
    if (!currentUser) {
      throw new UnauthorizedException("User not found.");
    }

    if (!currentUser.twoFactorSecret || !this.verifyTotpCode(currentUser.twoFactorSecret, dto.code)) {
      throw new BadRequestException("Codigo do autenticador invalido.");
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true }
    });

    return presentAuthUser(user);
  }

  async disableTwoFactor(userId: string, dto: DisableTwoFactorDto) {
    const currentUser = await this.users.findById(userId);
    if (!currentUser) {
      throw new UnauthorizedException("User not found.");
    }

    const passwordMatches = await this.verifyPasswordHash(currentUser.passwordHash, dto.currentPassword);
    if (!passwordMatches) {
      throw new UnauthorizedException("Senha atual incorreta.");
    }

    if (currentUser.twoFactorEnabled && (!currentUser.twoFactorSecret || !dto.code || !this.verifyTotpCode(currentUser.twoFactorSecret, dto.code))) {
      throw new BadRequestException("Codigo do autenticador invalido.");
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    });

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

  async logout(userId: string, sessionId: string): Promise<{ ok: true }> {
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

    return { ok: true };
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
}
