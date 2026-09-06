import { IsIn, IsObject, IsString, MaxLength, MinLength } from "class-validator";

const voiceSignalTypes = ["offer", "answer", "candidate"] as const;

export class VoiceSignalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  channelName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  toUserId!: string;

  @IsIn(voiceSignalTypes)
  type!: (typeof voiceSignalTypes)[number];

  @IsObject()
  payload!: Record<string, unknown>;
}
