import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength, ValidateBy } from "class-validator";

const profileImageDataUrlMaxLength = 6_000_000;

function emptyToNull(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function isProfileImageSource(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  if (value.length <= 2048) {
    try {
      const url = new URL(value);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return true;
      }
    } catch {
      // Data URLs are checked below.
    }
  }

  return value.length <= profileImageDataUrlMaxLength && /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[A-Za-z0-9+/=]+$/i.test(value);
}

function IsProfileImageSource() {
  return ValidateBy({
    name: "isProfileImageSource",
    validator: {
      validate: isProfileImageSource,
      defaultMessage: () => "Use uma URL http/https ou uma imagem enviada pelo aplicativo."
    }
  });
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(3, 32)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: "Username can only contain letters, numbers, underscores, dots, and hyphens."
  })
  @Transform(({ value }) => String(value ?? "").trim().toLowerCase())
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Transform(({ value }) => String(value ?? "").trim())
  displayName?: string;

  @IsOptional()
  @IsProfileImageSource()
  @Transform(({ value }) => emptyToNull(value))
  avatarUrl?: string | null;

  @IsOptional()
  @IsProfileImageSource()
  @Transform(({ value }) => emptyToNull(value))
  bannerUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Transform(({ value }) => emptyToNull(value))
  bio?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => emptyToNull(value))
  customStatus?: string | null;

  @IsOptional()
  @IsIn(["ONLINE", "IDLE", "DND", "INVISIBLE"])
  presence?: "ONLINE" | "IDLE" | "DND" | "INVISIBLE";

  @IsOptional()
  @IsBoolean()
  blockNonFriendDirectMessages?: boolean;
}
