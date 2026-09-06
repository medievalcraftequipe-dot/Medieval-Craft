import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

const timeoutDurations = [120, 300, 1440, 2880, 10080] as const;

export class TimeoutMemberDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username!: string;

  @IsIn(timeoutDurations)
  durationMinutes!: (typeof timeoutDurations)[number];

  @IsOptional()
  @IsString()
  @MaxLength(180)
  reason?: string;
}
