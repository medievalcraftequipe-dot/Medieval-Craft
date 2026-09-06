import { IsString, MaxLength, MinLength } from "class-validator";

export class JoinServerDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  code!: string;
}
