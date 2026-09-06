import { Transform } from "class-transformer";
import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class SetupTwoFactorDto {
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  currentPassword!: string;
}

export class EnableTwoFactorDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: "Two-factor code must contain 6 digits." })
  @Transform(({ value }) => String(value ?? "").replace(/\D/g, ""))
  code!: string;
}

export class DisableTwoFactorDto {
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  currentPassword!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: "Two-factor code must contain 6 digits." })
  @Transform(({ value }) => String(value ?? "").replace(/\D/g, ""))
  code?: string;
}
