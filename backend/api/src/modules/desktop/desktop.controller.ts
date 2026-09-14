import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { AuthenticatedRequest } from "../../common/auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DesktopService } from "./desktop.service";
import { PublishUpdateDto } from "./dto/publish-update.dto";

@Controller("desktop")
@UseGuards(JwtAuthGuard)
export class DesktopController {
  constructor(private readonly desktop: DesktopService) {}

  @Post("updates/publish")
  @Throttle({ default: { limit: 3, ttl: 60 * 60_000, blockDuration: 60 * 60_000 } })
  publishUpdate(@Body() dto: PublishUpdateDto, @Req() request: AuthenticatedRequest) {
    return this.desktop.publishUpdate(request.user, dto);
  }
}
