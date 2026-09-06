import { Transform } from "class-transformer";
import { IsString, Length, Matches } from "class-validator";

export class StartDirectConversationDto {
  @IsString()
  @Length(3, 32)
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  @Transform(({ value }) => String(value).trim().toLowerCase())
  username!: string;
}
