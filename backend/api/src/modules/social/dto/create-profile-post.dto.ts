import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateProfilePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Transform(({ value }) => String(value ?? "").trim())
  content!: string;
}
