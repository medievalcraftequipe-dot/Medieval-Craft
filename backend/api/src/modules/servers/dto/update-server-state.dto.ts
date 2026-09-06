import { IsObject } from "class-validator";

export class UpdateServerStateDto {
  @IsObject()
  server!: Record<string, unknown>;
}
