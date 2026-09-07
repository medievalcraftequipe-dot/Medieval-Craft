import { IsString, MaxLength, MinLength } from "class-validator";

export class DeleteServerDto {
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  currentPassword!: string;
}
