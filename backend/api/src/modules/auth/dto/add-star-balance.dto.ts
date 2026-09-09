import { IsInt, Max, Min } from "class-validator";

export class AddStarBalanceDto {
  @IsInt()
  @Min(1)
  @Max(999_999_999)
  amount!: number;
}
