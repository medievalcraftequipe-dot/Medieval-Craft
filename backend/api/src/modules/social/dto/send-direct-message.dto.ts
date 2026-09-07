import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";

export class SendDirectMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(70_000_000)
  @Transform(({ value }) => String(value ?? "").trim())
  content!: string;
}
