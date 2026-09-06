import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SendDirectMessageDto } from "./dto/send-direct-message.dto";
import { StartDirectConversationDto } from "./dto/start-direct-conversation.dto";
import { SocialService } from "./social.service";

@Controller("direct")
@UseGuards(JwtAuthGuard)
export class DirectController {
  constructor(private readonly social: SocialService) {}

  @Get("conversations")
  listConversations(@Req() request: AuthenticatedRequest) {
    return this.social.listDirectConversations(request.user.id);
  }

  @Post("conversations")
  startConversation(@Body() dto: StartDirectConversationDto, @Req() request: AuthenticatedRequest) {
    return this.social.startDirectConversation(request.user.id, dto.username);
  }

  @Get("conversations/:id")
  getConversation(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.social.getDirectConversation(request.user.id, id);
  }

  @Post("conversations/:id/messages")
  sendMessage(@Param("id") id: string, @Body() dto: SendDirectMessageDto, @Req() request: AuthenticatedRequest) {
    return this.social.sendDirectMessage(request.user.id, id, dto.content);
  }
}
