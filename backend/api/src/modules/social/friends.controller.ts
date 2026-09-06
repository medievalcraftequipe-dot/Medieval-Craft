import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { FriendRequestDto } from "./dto/friend-request.dto";
import { SocialService } from "./social.service";

@Controller("friends")
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly social: SocialService) {}

  @Get("requests")
  listFriendRequests(@Req() request: AuthenticatedRequest) {
    return this.social.listFriendRequests(request.user.id);
  }

  @Post("requests")
  requestFriendship(@Body() dto: FriendRequestDto, @Req() request: AuthenticatedRequest) {
    return this.social.requestFriendship(request.user.id, dto.username);
  }

  @Post("requests/:id/accept")
  acceptFriendship(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.social.acceptFriendship(request.user.id, id);
  }

  @Post("requests/:id/decline")
  declineFriendship(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.social.declineFriendship(request.user.id, id);
  }

  @Post("requests/:id/cancel")
  cancelFriendship(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.social.cancelFriendship(request.user.id, id);
  }
}
