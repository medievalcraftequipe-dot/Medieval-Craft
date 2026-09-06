import { Transform } from "class-transformer";
import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength
} from "class-validator";

export class RegisterDto {
  @IsEmail()
  @Transform(({ value }) => String(value).trim().toLowerCase())
  email!: string;

  @IsString()
  @Length(3, 32)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: "Username can only contain letters, numbers, underscores, dots, and hyphens."
  })
  @Transform(({ value }) => String(value).trim().toLowerCase())
  username!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  displayName?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  confirmPassword!: string;

  @IsISO8601({ strict: true })
  birthDate!: string;
}
