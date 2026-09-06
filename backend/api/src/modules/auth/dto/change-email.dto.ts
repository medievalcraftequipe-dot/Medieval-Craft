import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class ChangeEmailDto {
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) => String(value ?? "").trim().toLowerCase())
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  currentPassword!: string;
}
