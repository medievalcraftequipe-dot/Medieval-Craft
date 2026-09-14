import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { AuthenticatedRequest } from "../../common/auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateProfilePostDto } from "./dto/create-profile-post.dto";
import { SocialService } from "./social.service";

@Controller("profiles")
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly social: SocialService) {}

  @Get(":userId/social")
  getProfileSocial(@Param("userId") userId: string, @Req() request: AuthenticatedRequest) {
    return this.social.getProfileSocial(request.user.id, userId);
  }

  @Post("me/posts")
  @Throttle({ default: { limit: 12, ttl: 60_000, blockDuration: 5 * 60_000 } })
  createMyProfilePost(@Body() dto: CreateProfilePostDto, @Req() request: AuthenticatedRequest) {
    return this.social.createProfilePost(request.user.id, dto.content);
  }

  @Delete("posts/:postId")
  deleteProfilePost(@Param("postId") postId: string, @Req() request: AuthenticatedRequest) {
    return this.social.deleteProfilePost(request.user.id, postId);
  }

  @Post("posts/:postId/likes")
  @Throttle({ default: { limit: 60, ttl: 60_000, blockDuration: 2 * 60_000 } })
  likeProfilePost(@Param("postId") postId: string, @Req() request: AuthenticatedRequest) {
    return this.social.likeProfilePost(request.user.id, postId);
  }

  @Delete("posts/:postId/likes")
  unlikeProfilePost(@Param("postId") postId: string, @Req() request: AuthenticatedRequest) {
    return this.social.unlikeProfilePost(request.user.id, postId);
  }

  @Post(":userId/likes")
  @Throttle({ default: { limit: 60, ttl: 60_000, blockDuration: 2 * 60_000 } })
  likeProfile(@Param("userId") userId: string, @Req() request: AuthenticatedRequest) {
    return this.social.likeProfile(request.user.id, userId);
  }

  @Delete(":userId/likes")
  unlikeProfile(@Param("userId") userId: string, @Req() request: AuthenticatedRequest) {
    return this.social.unlikeProfile(request.user.id, userId);
  }
}
