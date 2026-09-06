import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

const inviteDurations = ["24h", "2d", "5d", "30d", "1m", "never"] as const;

export class CreateInviteDto {
  @IsOptional()
  @IsIn(inviteDurations)
  duration?: (typeof inviteDurations)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  maxUses?: number;
}
