import { IsBoolean, IsOptional } from "class-validator";

export class UpdateInviteDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
