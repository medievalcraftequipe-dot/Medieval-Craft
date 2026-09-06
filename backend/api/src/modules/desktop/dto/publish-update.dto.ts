import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class PublishUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/)
  version?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ref?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  releaseNotes?: string;
}
