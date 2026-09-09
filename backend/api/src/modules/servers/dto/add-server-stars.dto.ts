import { IsInt, Max, Min } from "class-validator";

export class AddServerStarsDto {
  @IsInt()
  @Min(1)
  @Max(25)
  amount!: number;
}
