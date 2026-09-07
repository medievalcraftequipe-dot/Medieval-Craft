import { IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SendServerMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  channelName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(70_000_000)
  content!: string;

  @IsOptional()
  @IsObject()
  mentions?: Record<string, unknown>;
}
