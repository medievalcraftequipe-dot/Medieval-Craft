import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
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
  listDiscoverableServers() {
    return this.servers.listDiscoverableServers();
  }

  @Get(":serverId")
  getServer(@Param("serverId") serverId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.getServer(request.user.id, serverId);
  }

  @Post()
  createServer(@Body() dto: CreateServerDto, @Req() request: AuthenticatedRequest) {
    return this.servers.createServer(request.user.id, dto.server);
  }

  @Post("join")
  joinServer(@Body() dto: JoinServerDto, @Req() request: AuthenticatedRequest) {
    return this.servers.joinServerByInvite(request.user.id, dto.code);
  }

  @Post(":serverId/join")
  joinPublicServer(@Param("serverId") serverId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.joinPublicServer(request.user.id, serverId);
  }

  @Patch(":serverId/state")
  updateServerState(@Param("serverId") serverId: string, @Body() dto: UpdateServerStateDto, @Req() request: AuthenticatedRequest) {
    return this.servers.updateServerState(request.user.id, serverId, dto.server);
  }

  @Delete(":serverId")
  deleteServer(@Param("serverId") serverId: string, @Body() dto: DeleteServerDto, @Req() request: AuthenticatedRequest) {
    return this.servers.deleteServer(request.user.id, serverId, dto.currentPassword);
  }

  @Post(":serverId/invites")
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
  banMember(@Param("serverId") serverId: string, @Body() dto: BanMemberDto, @Req() request: AuthenticatedRequest) {
    return this.servers.banMember(request.user.id, serverId, dto.username, dto.reason);
  }

  @Delete(":serverId/bans/:userId")
  unbanMember(@Param("serverId") serverId: string, @Param("userId") userId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.unbanMember(request.user.id, serverId, userId);
  }

  @Post(":serverId/timeouts")
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
  sendMessage(@Param("serverId") serverId: string, @Body() dto: SendServerMessageDto, @Req() request: AuthenticatedRequest) {
    return this.servers.sendMessage(request.user.id, serverId, dto.channelName, dto.content, dto.mentions);
  }

  @Get(":serverId/voice")
  listVoiceStates(@Param("serverId") serverId: string, @Req() request: AuthenticatedRequest) {
    return this.servers.listVoiceStates(request.user.id, serverId);
  }

  @Post(":serverId/voice")
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
  sendVoiceSignal(@Param("serverId") serverId: string, @Body() dto: VoiceSignalDto, @Req() request: AuthenticatedRequest) {
    return this.servers.sendVoiceSignal(request.user.id, serverId, dto.channelName, dto.toUserId, dto.type, dto.payload);
  }
}
