import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class RequestPasswordResetDto {
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  @Transform(({ value }) => String(value ?? "").trim().toLowerCase())
  emailOrUsername!: string;
}

export class VerifyPasswordResetCodeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  @Transform(({ value }) => String(value ?? "").trim().toLowerCase())
  emailOrUsername!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: "Password reset code must contain 6 digits." })
  @Transform(({ value }) => String(value ?? "").replace(/\D/g, ""))
  code!: string;
}

export class ConfirmPasswordResetDto {
  @IsString()
  @MinLength(20)
  @MaxLength(256)
  resetToken!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  newPassword!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  confirmPassword!: string;
}
