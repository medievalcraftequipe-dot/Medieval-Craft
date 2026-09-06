import { Transform } from "class-transformer";
import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  @Transform(({ value }) => String(value).trim().toLowerCase())
  emailOrUsername!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: "Two-factor code must contain 6 digits." })
  @Transform(({ value }) => String(value ?? "").replace(/\D/g, ""))
  twoFactorCode?: string;
}
