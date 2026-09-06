import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";

export class ResendVerificationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  @Transform(({ value }) => String(value).trim().toLowerCase())
  emailOrUsername!: string;
}
