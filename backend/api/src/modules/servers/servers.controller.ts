import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { AuthenticatedRequest } from "../../common/auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AddServerStarsDto } from "./dto/add-server-stars.dto";
import { BanMemberDto } from "./dto/ban-member.dto";
import { CreateInviteDto } from "./dto/create-invite.dto";
import { CreateServerDto } from "./dto/create-server.dto";
import { DeleteServerDto } from "./dto/delete-server.dto";
import { JoinServerDto } from "./dto/join-server.dto";
import { SendServerMessageDto } from "./dto/send-server-message.dto";
import { TimeoutMemberDto } from "./dto/timeout-member.dto";
import { UpdateInviteDto } from "./dto/update-invite.dto";
import { UpdateServerStateDto } from "./dto/update-server-state.dto";
import { VoiceSignalDto } from "./dto/voice-signal.dto";
import { VoiceStateDto } from "./dto/voice-state.dto";
import { ServersService } from "./servers.service";

@Controller("servers")
@UseGuards(JwtAuthGuard)
export class ServersController {
  constructor(private readonly servers: ServersService) {}

  @Get()
  listServers(@Req() request: AuthenticatedRequest) {
    return this.servers.listServers(request.user.id);
  }

  @Get("discover")
  listDiscoverableServers(@Req() request: AuthenticatedRequest) {
    return this.servers.listDiscoverableServers(request.user.id);
  }

  @Get(":serverId")
  getServer(@Param("serverId") serverId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.getServer(request.user.id, serverId);
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000, blockDuration: 10 * 60_000 } })
  createServer(@Body() dto: CreateServerDto, @Req() request: AuthenticatedRequest) {
    return this.servers.createServer(request.user.id, dto.server);
  }

  @Post("join")
  @Throttle({ default: { limit: 12, ttl: 60_000, blockDuration: 10 * 60_000 } })
  joinServer(@Body() dto: JoinServerDto, @Req() request: AuthenticatedRequest) {
    return this.servers.joinServerByInvite(request.user.id, dto.code);
  }

  @Post(":serverId/join")
  @Throttle({ default: { limit: 12, ttl: 60_000, blockDuration: 10 * 60_000 } })
  joinPublicServer(@Param("serverId") serverId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.joinPublicServer(request.user.id, serverId);
  }

  @Patch(":serverId/state")
  @Throttle({ default: { limit: 20, ttl: 60_000, blockDuration: 5 * 60_000 } })
  updateServerState(@Param("serverId") serverId: string, @Body() dto: UpdateServerStateDto, @Req() request: AuthenticatedRequest) {
    return this.servers.updateServerState(request.user.id, serverId, dto.server);
  }

  @Delete(":serverId/members/me")
  leaveServer(@Param("serverId") serverId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.leaveServer(request.user.id, serverId);
  }

  @Delete(":serverId")
  deleteServer(@Param("serverId") serverId: string, @Body() dto: DeleteServerDto, @Req() request: AuthenticatedRequest) {
    return this.servers.deleteServer(request.user.id, serverId, dto.currentPassword);
  }

  @Get(":serverId/likes")
  getServerLikes(@Param("serverId") serverId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.getServerLikes(request.user.id, serverId);
  }

  @Post(":serverId/likes")
  likeServer(@Param("serverId") serverId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.likeServer(request.user.id, serverId);
  }

  @Delete(":serverId/likes")
  unlikeServer(@Param("serverId") serverId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.unlikeServer(request.user.id, serverId);
  }

  @Post(":serverId/stars")
  @Throttle({ default: { limit: 20, ttl: 60_000, blockDuration: 5 * 60_000 } })
  addStars(@Param("serverId") serverId: string, @Body() dto: AddServerStarsDto, @Req() request: AuthenticatedRequest) {
    return this.servers.addStarsToServer(request.user.id, serverId, dto.amount);
  }

  @Post(":serverId/invites")
  @Throttle({ default: { limit: 10, ttl: 60_000, blockDuration: 10 * 60_000 } })
  createInvite(@Param("serverId") serverId: string, @Body() dto: CreateInviteDto, @Req() request: AuthenticatedRequest) {
    return this.servers.createInvite(request.user.id, serverId, dto.duration, dto.maxUses);
  }

  @Patch(":serverId/invites/:inviteId")
  updateInvite(
    @Param("serverId") serverId: string,
    @Param("inviteId") inviteId: string,
    @Body() dto: UpdateInviteDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.servers.updateInvite(request.user.id, serverId, inviteId, dto.active);
  }

  @Delete(":serverId/invites/:inviteId")
  deleteInvite(@Param("serverId") serverId: string, @Param("inviteId") inviteId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.deleteInvite(request.user.id, serverId, inviteId);
  }

  @Post(":serverId/bans")
  @Throttle({ default: { limit: 20, ttl: 60_000, blockDuration: 10 * 60_000 } })
  banMember(@Param("serverId") serverId: string, @Body() dto: BanMemberDto, @Req() request: AuthenticatedRequest) {
    return this.servers.banMember(request.user.id, serverId, dto.username, dto.reason);
  }

  @Delete(":serverId/bans/:userId")
  unbanMember(@Param("serverId") serverId: string, @Param("userId") userId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.unbanMember(request.user.id, serverId, userId);
  }

  @Post(":serverId/timeouts")
  @Throttle({ default: { limit: 20, ttl: 60_000, blockDuration: 10 * 60_000 } })
  timeoutMember(@Param("serverId") serverId: string, @Body() dto: TimeoutMemberDto, @Req() request: AuthenticatedRequest) {
    return this.servers.timeoutMember(request.user.id, serverId, dto.username, dto.durationMinutes, dto.reason);
  }

  @Delete(":serverId/timeouts/:userId")
  clearMemberTimeout(@Param("serverId") serverId: string, @Param("userId") userId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.clearMemberTimeout(request.user.id, serverId, userId);
  }

  @Get(":serverId/messages")
  listMessages(
    @Param("serverId") serverId: string,
    @Query("channelName") channelName: string,
    @Query("after") after: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    return this.servers.listMessages(request.user.id, serverId, channelName, after);
  }

  @Post(":serverId/messages")
  @Throttle({ default: { limit: 30, ttl: 60_000, blockDuration: 2 * 60_000 } })
  sendMessage(@Param("serverId") serverId: string, @Body() dto: SendServerMessageDto, @Req() request: AuthenticatedRequest) {
    return this.servers.sendMessage(request.user.id, serverId, dto.channelName, dto.content, dto.mentions);
  }

  @Delete(":serverId/messages/:messageId")
  deleteMessage(@Param("serverId") serverId: string, @Param("messageId") messageId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.deleteMessage(request.user.id, serverId, messageId);
  }

  @Get(":serverId/voice")
  listVoiceStates(@Param("serverId") serverId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.listVoiceStates(request.user.id, serverId);
  }

  @Post(":serverId/voice")
  @Throttle({ default: { limit: 180, ttl: 60_000, blockDuration: 60_000 } })
  updateVoiceState(@Param("serverId") serverId: string, @Body() dto: VoiceStateDto, @Req() request: AuthenticatedRequest) {
    return this.servers.upsertVoiceState(request.user.id, serverId, dto.channelName, dto.muted, dto.speaking);
  }

  @Delete(":serverId/voice")
  leaveVoice(@Param("serverId") serverId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.leaveVoice(request.user.id, serverId);
  }

  @Get(":serverId/voice/signals")
  listVoiceSignals(
    @Param("serverId") serverId: string,
    @Query("channelName") channelName: string,
    @Query("after") after: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    return this.servers.listVoiceSignals(request.user.id, serverId, channelName, after);
  }

  @Post(":serverId/voice/signals")
  @Throttle({ default: { limit: 360, ttl: 60_000, blockDuration: 60_000 } })
  sendVoiceSignal(@Param("serverId") serverId: string, @Body() dto: VoiceSignalDto, @Req() request: AuthenticatedRequest) {
    return this.servers.sendVoiceSignal(request.user.id, serverId, dto.channelName, dto.toUserId, dto.type, dto.payload);
  }
}
