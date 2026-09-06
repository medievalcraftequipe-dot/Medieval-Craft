import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class VoiceStateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  channelName!: string;

  @IsOptional()
  @IsBoolean()
  muted?: boolean;

  @IsOptional()
  @IsBoolean()
  speaking?: boolean;
}
