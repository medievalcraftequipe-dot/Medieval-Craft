import { IsString, MaxLength, MinLength } from "class-validator";

export class DeleteAccountDto {
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  currentPassword!: string;
}
