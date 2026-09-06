import { IsObject } from "class-validator";

export class CreateServerDto {
  @IsObject()
  server!: Record<string, unknown>;
}
