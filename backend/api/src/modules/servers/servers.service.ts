import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma, User } from "@prisma/client";
import { verify } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../../common/prisma/prisma.service";
import { presentAuthUser } from "../users/user.presenter";

type ClientServerState = Record<string, unknown>;
type InviteDuration = "24h" | "2d" | "5d" | "30d" | "1m" | "never";

const voiceSessionTtlMs = 8 * 60_000;
const voiceSignalTtlMs = 5 * 60_000;
const channelNameMaxLength = 100;
const maxServerStarSupportAmount = 25;
const fallbackDeveloperEmails = ["rafaeltanki1212@gmail.com", "izigamer47@gmail.com"];
const fallbackDeveloperUsernames = ["armadura_prime"];

@Injectable()
export class ServersService {
  private readonly serverStateInclude = {
    members: { include: { user: true } },
    invites: { include: { createdBy: true }, orderBy: { createdAt: "desc" as const } },
    bans: { include: { user: true, moderator: true }, orderBy: { createdAt: "desc" as const } },
    serverVoiceSessions: { include: { user: true } }
  } satisfies Prisma.ServerInclude;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async listServers(userId: string) {
    await this.pruneStaleVoiceSessions();

    const memberships = await this.prisma.serverMember.findMany({
      where: { userId },
      include: {
        server: {
          include: this.serverStateInclude
        }
      },
      orderBy: { joinedAt: "asc" }
    });

    const serverIds = memberships.map((membership) => membership.serverId);
    const messages = serverIds.length
      ? await this.prisma.serverChannelMessage.findMany({
          where: { serverId: { in: serverIds } },
          include: { author: true },
          orderBy: { createdAt: "desc" },
          take: 400
        })
      : [];

    return {
      servers: memberships.map((membership) => this.presentServerState(membership.server)),
      messages: messages.reverse().map((message) => this.presentServerMessage(message)),
      voiceStates: memberships.flatMap((membership) => membership.server.serverVoiceSessions.map((session) => this.presentVoiceState(session)))
    };
  }

  async listDiscoverableServers() {
    const servers = await this.prisma.server.findMany({
      include: this.serverStateInclude,
      orderBy: { updatedAt: "desc" },
      take: 80
    });

    return {
      servers: servers
        .map((server) => this.presentServerState(server))
        .filter((server) => server.isDiscoverable === true)
    };
  }

  async getServer(userId: string, serverId: string) {
    await this.pruneStaleVoiceSessions();
    await this.ensureMember(serverId, userId);

    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: this.serverStateInclude
    });

    if (!server) {
      throw new NotFoundException("Servidor nao encontrado.");
    }

    return { server: this.presentServerState(server) };
  }

  async createServer(userId: string, rawState: ClientServerState) {
    const user = await this.getUser(userId);
    const serverId = this.readOptionalString(rawState.id) ?? `srv_${randomBytes(9).toString("hex")}`;
    const state = this.mergeCurrentUserMember({ ...rawState, id: serverId, ownerId: userId }, user, new Date(), true);

    const existing = await this.prisma.server.findUnique({ where: { id: serverId }, select: { id: true } });
    if (existing) {
      throw new BadRequestException("Esse servidor online ja existe.");
    }

    const server = await this.prisma.server.create({
      data: {
        id: serverId,
        ownerId: userId,
        name: this.readOptionalString(state.name) ?? "Servidor Tempest",
        iconUrl: this.readOptionalString(state.iconUrl),
        bannerUrl: this.readOptionalString(state.bannerUrl),
        description: this.readOptionalString(state.description),
        clientState: this.toInputJson(state),
        members: {
          create: {
            userId,
            nickname: this.readOptionalString(state.displayName)
          }
        }
      },
      include: this.serverStateInclude
    });

    return { server: this.presentServerState(server) };
  }

  async updateServerState(userId: string, serverId: string, rawState: ClientServerState) {
    const server = await this.getServerForMember(serverId, userId);
    if (!(await this.canManageServer(server, userId))) {
      throw new ForbiddenException("Seu cargo nao permite salvar configuracoes deste servidor.");
    }

    const user = await this.getUser(userId);
    const currentMembership = server.members.find((member) => member.userId === userId);
    const state = this.mergeCurrentUserMember(
      { ...rawState, id: serverId, ownerId: server.ownerId },
      user,
      currentMembership?.joinedAt ?? new Date(),
      server.ownerId === userId
    );
    const updated = await this.prisma.server.update({
      where: { id: serverId },
      data: {
        name: this.readOptionalString(state.name) ?? server.name,
        iconUrl: this.readOptionalString(state.iconUrl),
        bannerUrl: this.readOptionalString(state.bannerUrl),
        description: this.readOptionalString(state.description),
        clientState: this.toInputJson(this.mergeDatabaseMembers(state, server))
      },
      include: this.serverStateInclude
    });

    return { server: this.presentServerState(updated) };
  }

  async deleteServer(userId: string, serverId: string, currentPassword: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: { id: true, ownerId: true, owner: { select: { passwordHash: true } } }
    });

    if (!server) {
      throw new NotFoundException("Servidor nao encontrado.");
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException("Somente o dono pode excluir este servidor.");
    }

    const passwordMatches = await verify(server.owner.passwordHash, currentPassword);
    if (!passwordMatches) {
      throw new UnauthorizedException("Senha atual incorreta.");
    }

    const [members, roles, channels] = await Promise.all([
      this.prisma.serverMember.findMany({ where: { serverId }, select: { id: true } }),
      this.prisma.role.findMany({ where: { serverId }, select: { id: true } }),
      this.prisma.channel.findMany({ where: { serverId }, select: { id: true } })
    ]);
    const memberIds = members.map((member) => member.id);
    const roleIds = roles.map((role) => role.id);
    const channelIds = channels.map((channel) => channel.id);
    const channelMessages = channelIds.length
      ? await this.prisma.message.findMany({ where: { channelId: { in: channelIds } }, select: { id: true } })
      : [];
    const channelMessageIds = channelMessages.map((message) => message.id);

    await this.prisma.$transaction([
      this.prisma.voiceSignal.deleteMany({ where: { serverId } }),
      this.prisma.serverVoiceSession.deleteMany({ where: { serverId } }),
      this.prisma.serverChannelMessage.deleteMany({ where: { serverId } }),
      this.prisma.invite.deleteMany({ where: { serverId } }),
      this.prisma.ban.deleteMany({ where: { serverId } }),
      this.prisma.moderationAction.deleteMany({ where: { serverId } }),
      this.prisma.auditLog.deleteMany({ where: { serverId } }),
      this.prisma.customEmoji.deleteMany({ where: { serverId } }),
      this.prisma.sticker.deleteMany({ where: { serverId } }),
      this.prisma.permissionOverride.deleteMany({ where: { serverId } }),
      this.prisma.reaction.deleteMany({ where: { messageId: { in: channelMessageIds } } }),
      this.prisma.messageAttachment.deleteMany({ where: { messageId: { in: channelMessageIds } } }),
      this.prisma.message.deleteMany({ where: { id: { in: channelMessageIds } } }),
      this.prisma.serverMemberRole.deleteMany({
        where: {
          OR: [
            { memberId: { in: memberIds } },
            { roleId: { in: roleIds } }
          ]
        }
      }),
      this.prisma.channel.deleteMany({ where: { serverId } }),
      this.prisma.category.deleteMany({ where: { serverId } }),
      this.prisma.role.deleteMany({ where: { serverId } }),
      this.prisma.serverMember.deleteMany({ where: { serverId } }),
      this.prisma.server.delete({ where: { id: serverId } })
    ]);

    return { ok: true as const, serverId };
  }

  async addStarsToServer(userId: string, serverId: string, amountInput: number) {
    await this.ensureMember(serverId, userId);

    const amount = Math.min(Math.max(Math.floor(amountInput) || 0, 1), maxServerStarSupportAmount);
    const [server, user] = await Promise.all([
      this.prisma.server.findUnique({
        where: { id: serverId },
        include: this.serverStateInclude
      }),
      this.getUser(userId)
    ]);

    if (!server) {
      throw new NotFoundException("Servidor nao encontrado.");
    }

    if (user.starBalance < amount) {
      throw new ForbiddenException("Saldo de estrelas insuficiente.");
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);
    const currentState = this.presentServerState(server);
    const activeBoosts = Array.isArray(currentState.boosts)
      ? currentState.boosts.filter((boost) => this.isRecord(boost) && !this.boostExpired(boost))
      : [];
    const boosts = Array.from({ length: amount }, (_, index) => ({
      id: `boost-${now.getTime()}-${index}-${randomBytes(3).toString("hex")}`,
      appliedBy: user.id,
      appliedByName: user.displayName,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    }));
    const nextState: ClientServerState = {
      ...currentState,
      boosts: [...boosts, ...activeBoosts],
      boostProgressVisible: true
    };

    const [updatedServer, updatedUser] = await this.prisma.$transaction(async (tx) => {
      const decrement = await tx.user.updateMany({
        where: {
          id: userId,
          starBalance: { gte: amount }
        },
        data: {
          starBalance: { decrement: amount }
        }
      });

      if (decrement.count !== 1) {
        throw new ForbiddenException("Saldo de estrelas insuficiente.");
      }

      const savedServer = await tx.server.update({
        where: { id: serverId },
        data: { clientState: this.toInputJson(nextState) },
        include: this.serverStateInclude
      });
      const savedUser = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      return [savedServer, savedUser] as const;
    });

    return {
      server: this.presentServerState(updatedServer),
      user: presentAuthUser(updatedUser),
      starsSpent: amount
    };
  }

  async leaveServer(userId: string, serverId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: {
        id: true,
        ownerId: true,
        members: {
          where: { userId },
          select: { id: true }
        }
      }
    });

    if (!server) {
      throw new NotFoundException("Servidor nao encontrado.");
    }

    if (!server.members.length) {
      throw new ForbiddenException("Voce nao participa deste servidor.");
    }

    if (server.ownerId === userId) {
      throw new ForbiddenException("O dono precisa transferir ou excluir o servidor antes de sair.");
    }

    await this.prisma.$transaction([
      this.prisma.serverMember.deleteMany({ where: { serverId, userId } }),
      this.prisma.serverVoiceSession.deleteMany({ where: { serverId, userId } }),
      this.prisma.voiceSignal.deleteMany({
        where: {
          serverId,
          OR: [{ fromUserId: userId }, { toUserId: userId }]
        }
      })
    ]);

    await this.refreshPresentedServerState(serverId);
    return { ok: true as const, serverId };
  }

  async joinServerByInvite(userId: string, codeInput: string) {
    const code = this.extractInviteCode(codeInput);
    if (!code) {
      throw new BadRequestException("Convite invalido.");
    }

    const invite = await this.prisma.invite.findUnique({
      where: { code },
      include: {
        server: {
          include: this.serverStateInclude
        }
      }
    });

    if (!invite || !invite.active) {
      throw new NotFoundException("Convite nao encontrado ou desativado.");
    }

    if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException("Esse convite expirou.");
    }

    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
      throw new ForbiddenException("Esse convite chegou ao limite de usos.");
    }

    await this.assertNotBanned(invite.serverId, userId);

    const user = await this.getUser(userId);
    const alreadyMember = invite.server.members.some((member) => member.userId === userId);
    const joinedAt = new Date();

    if (!alreadyMember) {
      await this.prisma.$transaction([
        this.prisma.serverMember.create({
          data: {
            serverId: invite.serverId,
            userId
          }
        }),
        this.prisma.invite.update({
          where: { id: invite.id },
          data: { uses: { increment: 1 } }
        })
      ]);
    }

    const refreshed = await this.prisma.server.findUnique({
      where: { id: invite.serverId },
      include: this.serverStateInclude
    });

    if (!refreshed) {
      throw new NotFoundException("Servidor do convite nao encontrado.");
    }

    const nextState = this.mergeCurrentUserMember(this.presentServerState(refreshed), user, joinedAt, false);
    await this.prisma.server.update({
      where: { id: invite.serverId },
      data: { clientState: this.toInputJson(nextState) }
    });

    return { server: nextState };
  }

  async joinPublicServer(userId: string, serverId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: this.serverStateInclude
    });

    if (!server) {
      throw new NotFoundException("Servidor nao encontrado.");
    }

    const currentState = this.presentServerState(server);
    if (currentState.isDiscoverable !== true) {
      throw new ForbiddenException("Esse servidor nao esta publico no Descubra.");
    }

    const user = await this.getUser(userId);
    await this.assertNotBanned(serverId, userId);
    const alreadyMember = server.members.some((member) => member.userId === userId);
    if (!alreadyMember) {
      await this.prisma.serverMember.create({
        data: {
          serverId,
          userId
        }
      });
    }

    const refreshed = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: this.serverStateInclude
    });

    if (!refreshed) {
      throw new NotFoundException("Servidor nao encontrado.");
    }

    const joinedAt = refreshed.members.find((member) => member.userId === userId)?.joinedAt ?? new Date();
    const nextState = this.mergeCurrentUserMember(this.presentServerState(refreshed), user, joinedAt, false);
    await this.prisma.server.update({
      where: { id: serverId },
      data: { clientState: this.toInputJson(nextState) }
    });

    return { server: nextState };
  }

  async createInvite(userId: string, serverId: string, duration: InviteDuration = "never", maxUses = 25) {
    const server = await this.getServerForMember(serverId, userId);
    if (!(await this.canCreateInvite(server, userId))) {
      throw new ForbiddenException("Seu cargo nao permite criar convites.");
    }

    const invite = await this.prisma.invite.create({
      data: {
        serverId,
        createdById: userId,
        code: await this.generateUniqueInviteCode(),
        maxUses: this.clampMaxUses(maxUses),
        expiresAt: this.getInviteExpiresAt(new Date(), duration)
      },
      include: { createdBy: true }
    });

    const state = this.withInviteInState(this.presentServerState(server), invite);
    await this.prisma.server.update({ where: { id: serverId }, data: { clientState: this.toInputJson(state) } });

    return { invite: this.presentInvite(invite), server: state };
  }

  async updateInvite(userId: string, serverId: string, inviteId: string, active?: boolean) {
    const server = await this.getServerForMember(serverId, userId);
    if (!(await this.canCreateInvite(server, userId))) {
      throw new ForbiddenException("Seu cargo nao permite gerenciar convites.");
    }

    const existingInvite = await this.prisma.invite.findFirst({
      where: { id: inviteId, serverId },
      select: { id: true }
    });
    if (!existingInvite) {
      throw new NotFoundException("Convite nao encontrado neste servidor.");
    }

    const invite = await this.prisma.invite.update({
      where: { id: inviteId },
      data: { active: active ?? true },
      include: { createdBy: true }
    });

    const state = this.withInviteInState(this.presentServerState(server), invite);
    await this.prisma.server.update({ where: { id: serverId }, data: { clientState: this.toInputJson(state) } });

    return { invite: this.presentInvite(invite), server: state };
  }

  async deleteInvite(userId: string, serverId: string, inviteId: string) {
    const server = await this.getServerForMember(serverId, userId);
    if (!(await this.canCreateInvite(server, userId))) {
      throw new ForbiddenException("Seu cargo nao permite excluir convites.");
    }

    const result = await this.prisma.invite.deleteMany({ where: { id: inviteId, serverId } });
    if (!result.count) {
      throw new NotFoundException("Convite nao encontrado neste servidor.");
    }

    const state = this.withoutInviteInState(this.presentServerState(server), inviteId);
    await this.prisma.server.update({ where: { id: serverId }, data: { clientState: this.toInputJson(state) } });

    return { ok: true, server: state };
  }

  async banMember(moderatorId: string, serverId: string, usernameInput: string, reasonInput?: string) {
    const server = await this.getServerForMember(serverId, moderatorId);
    const moderator = await this.getUser(moderatorId);
    if (!this.canModerateServer(server, moderator, ["administrator", "ban_members", "manage_server"])) {
      throw new ForbiddenException("Seu cargo nao permite banir membros.");
    }

    const target = this.findServerMemberByUsername(server, usernameInput);
    if (!target) {
      throw new NotFoundException("Esse usuario nao esta neste servidor.");
    }

    this.assertCanModerateTarget(server, moderatorId, target.userId, "banir");
    const reason = this.cleanReason(reasonInput);

    await this.prisma.$transaction([
      this.prisma.ban.upsert({
        where: {
          serverId_userId: {
            serverId,
            userId: target.userId
          }
        },
        update: {
          moderatorId,
          reason,
          expiresAt: null
        },
        create: {
          serverId,
          userId: target.userId,
          moderatorId,
          reason
        }
      }),
      this.prisma.serverMember.deleteMany({ where: { serverId, userId: target.userId } }),
      this.prisma.serverVoiceSession.deleteMany({ where: { serverId, userId: target.userId } }),
      this.prisma.moderationAction.create({
        data: {
          serverId,
          targetUserId: target.userId,
          moderatorId,
          type: "BAN",
          reason
        }
      })
    ]);

    const state = await this.refreshPresentedServerState(serverId);
    return { ok: true, server: state };
  }

  async unbanMember(moderatorId: string, serverId: string, userId: string) {
    const server = await this.getServerForMember(serverId, moderatorId);
    const moderator = await this.getUser(moderatorId);
    if (!this.canModerateServer(server, moderator, ["administrator", "ban_members", "manage_server"])) {
      throw new ForbiddenException("Seu cargo nao permite remover banimentos.");
    }

    const ban = await this.prisma.ban.findUnique({
      where: {
        serverId_userId: {
          serverId,
          userId
        }
      },
      include: { user: true }
    });
    if (!ban) {
      throw new NotFoundException("Banimento nao encontrado neste servidor.");
    }

    await this.prisma.$transaction([
      this.prisma.ban.delete({ where: { id: ban.id } }),
      this.prisma.moderationAction.create({
        data: {
          serverId,
          targetUserId: ban.userId,
          moderatorId,
          type: "UNBAN",
          reason: "Banimento removido."
        }
      })
    ]);

    const state = await this.refreshPresentedServerState(serverId);
    return { ok: true, server: state };
  }

  async timeoutMember(moderatorId: string, serverId: string, usernameInput: string, durationMinutes: number, reasonInput?: string) {
    const server = await this.getServerForMember(serverId, moderatorId);
    const moderator = await this.getUser(moderatorId);
    if (!this.canModerateServer(server, moderator, ["administrator", "moderate_members", "manage_server"])) {
      throw new ForbiddenException("Seu cargo nao permite colocar membros de castigo.");
    }

    const duration = this.normalizeTimeoutDuration(durationMinutes);
    const target = this.findServerMemberByUsername(server, usernameInput);
    if (!target) {
      throw new NotFoundException("Esse usuario nao esta neste servidor.");
    }

    this.assertCanModerateTarget(server, moderatorId, target.userId, "colocar de castigo");
    const reason = this.cleanReason(reasonInput);
    const timeoutUntil = new Date(Date.now() + duration * 60_000);

    await this.prisma.$transaction([
      this.prisma.serverMember.update({
        where: {
          serverId_userId: {
            serverId,
            userId: target.userId
          }
        },
        data: { timeoutUntil }
      }),
      this.prisma.moderationAction.create({
        data: {
          serverId,
          targetUserId: target.userId,
          moderatorId,
          type: "TIMEOUT",
          reason,
          expiresAt: timeoutUntil,
          metadata: this.toInputJson({ durationMinutes: duration })
        }
      })
    ]);

    const state = await this.refreshPresentedServerState(serverId);
    return { ok: true, server: state };
  }

  async clearMemberTimeout(moderatorId: string, serverId: string, userId: string) {
    const server = await this.getServerForMember(serverId, moderatorId);
    const moderator = await this.getUser(moderatorId);
    if (!this.canModerateServer(server, moderator, ["administrator", "moderate_members", "manage_server"])) {
      throw new ForbiddenException("Seu cargo nao permite remover castigos.");
    }

    const target = server.members.find((member) => member.userId === userId);
    if (!target) {
      throw new NotFoundException("Esse usuario nao esta neste servidor.");
    }

    this.assertCanModerateTarget(server, moderatorId, target.userId, "remover castigo");

    await this.prisma.$transaction([
      this.prisma.serverMember.update({
        where: {
          serverId_userId: {
            serverId,
            userId: target.userId
          }
        },
        data: { timeoutUntil: null }
      }),
      this.prisma.moderationAction.create({
        data: {
          serverId,
          targetUserId: target.userId,
          moderatorId,
          type: "TIMEOUT",
          reason: "Castigo removido."
        }
      })
    ]);

    const state = await this.refreshPresentedServerState(serverId);
    return { ok: true, server: state };
  }

  async listMessages(userId: string, serverId: string, channelName: string, after?: string) {
    await this.ensureMember(serverId, userId);
    const cleanChannelName = (channelName ?? "").trim().slice(0, channelNameMaxLength);
    if (!cleanChannelName) {
      throw new BadRequestException("Canal obrigatorio.");
    }

    const afterDate = after ? new Date(after) : null;
    const messages = await this.prisma.serverChannelMessage.findMany({
      where: {
        serverId,
        channelName: cleanChannelName,
        ...(afterDate && Number.isFinite(afterDate.getTime()) ? { createdAt: { gt: afterDate } } : {})
      },
      include: { author: true },
      orderBy: { createdAt: "desc" },
      take: afterDate ? 200 : 80
    });

    return { messages: messages.reverse().map((message) => this.presentServerMessage(message)) };
  }

  async sendMessage(userId: string, serverId: string, channelName: string, content: string, mentions?: Record<string, unknown>) {
    const member = await this.ensureMember(serverId, userId);
    this.assertNotTimedOut(member);

    const cleanChannelName = channelName.trim().slice(0, channelNameMaxLength);
    const cleanContent = content.trim();
    if (!cleanChannelName || !cleanContent) {
      throw new BadRequestException("Canal e mensagem sao obrigatorios.");
    }

    const message = await this.prisma.serverChannelMessage.create({
      data: {
        serverId,
        channelName: cleanChannelName,
        authorId: userId,
        content: cleanContent,
        mentions: mentions ? this.toInputJson(mentions) : undefined
      },
      include: { author: true }
    });

    await this.createMentionNotifications(serverId, cleanChannelName, message, mentions);

    return { message: this.presentServerMessage(message) };
  }

  async deleteMessage(userId: string, serverId: string, messageId: string) {
    await this.ensureMember(serverId, userId);

    const cleanMessageId = (messageId ?? "").trim();
    if (!cleanMessageId) {
      throw new BadRequestException("Mensagem obrigatoria.");
    }

    const message = await this.prisma.serverChannelMessage.findUnique({
      where: { id: cleanMessageId },
      include: {
        server: {
          select: {
            id: true,
            ownerId: true,
            clientState: true
          }
        }
      }
    });

    if (!message || message.serverId !== serverId) {
      throw new NotFoundException("Mensagem nao encontrada.");
    }

    if (message.authorId !== userId) {
      const moderator = await this.getUser(userId);
      const canDeleteOthers = this.canModerateServer(message.server, moderator, ["administrator", "manage_messages", "manage_server"]);
      if (!canDeleteOthers) {
        throw new ForbiddenException("Voce so pode excluir suas proprias mensagens.");
      }
    }

    await this.prisma.serverChannelMessage.delete({ where: { id: message.id } });

    return {
      ok: true as const,
      messageId: message.id,
      serverId: message.serverId,
      channelName: message.channelName
    };
  }

  async upsertVoiceState(userId: string, serverId: string, channelName: string, muted = false, speaking = false) {
    await this.ensureMember(serverId, userId);
    await this.pruneStaleVoiceSessions();

    const cleanChannelName = (channelName ?? "").trim().slice(0, channelNameMaxLength);
    if (!cleanChannelName) {
      throw new BadRequestException("Canal de voz obrigatorio.");
    }

    const state = await this.prisma.serverVoiceSession.upsert({
      where: {
        serverId_userId: {
          serverId,
          userId
        }
      },
      create: {
        serverId,
        userId,
        channelName: cleanChannelName,
        muted,
        speaking,
        lastSeenAt: new Date()
      },
      update: {
        channelName: cleanChannelName,
        muted,
        speaking,
        lastSeenAt: new Date()
      },
      include: { user: true }
    });

    return { voiceState: this.presentVoiceState(state) };
  }

  async leaveVoice(userId: string, serverId: string) {
    await this.prisma.serverVoiceSession.deleteMany({
      where: { serverId, userId }
    });
    return { ok: true };
  }

  async listVoiceStates(userId: string, serverId: string) {
    await this.ensureMember(serverId, userId);
    await this.pruneStaleVoiceSessions();

    const sessions = await this.prisma.serverVoiceSession.findMany({
      where: { serverId },
      include: { user: true },
      orderBy: { joinedAt: "asc" }
    });

    return { voiceStates: sessions.map((session) => this.presentVoiceState(session)) };
  }

  async sendVoiceSignal(
    userId: string,
    serverId: string,
    channelName: string,
    toUserId: string,
    type: "offer" | "answer" | "candidate",
    payload: Record<string, unknown>
  ) {
    if (userId === toUserId) {
      throw new BadRequestException("Nao e possivel sinalizar para a propria conta.");
    }

    await this.ensureMember(serverId, userId);
    await this.ensureMember(serverId, toUserId);
    await this.pruneOldVoiceSignals();

    const cleanChannelName = (channelName ?? "").trim().slice(0, channelNameMaxLength);
    if (!cleanChannelName) {
      throw new BadRequestException("Canal de voz obrigatorio.");
    }

    const signal = await this.prisma.voiceSignal.create({
      data: {
        serverId,
        channelName: cleanChannelName,
        fromUserId: userId,
        toUserId,
        type,
        payload: this.toInputJson(payload)
      },
      include: { sender: true }
    });

    return { signal: this.presentVoiceSignal(signal) };
  }

  async listVoiceSignals(userId: string, serverId: string, channelName: string, after?: string) {
    await this.ensureMember(serverId, userId);
    await this.pruneOldVoiceSignals();

    const cleanChannelName = (channelName ?? "").trim().slice(0, channelNameMaxLength);
    if (!cleanChannelName) {
      throw new BadRequestException("Canal de voz obrigatorio.");
    }

    const afterDate = after ? new Date(after) : null;
    const signals = await this.prisma.voiceSignal.findMany({
      where: {
        serverId,
        channelName: cleanChannelName,
        toUserId: userId,
        ...(afterDate && Number.isFinite(afterDate.getTime()) ? { createdAt: { gt: afterDate } } : {})
      },
      include: { sender: true },
      orderBy: { createdAt: "asc" },
      take: 100
    });

    return { signals: signals.map((signal) => this.presentVoiceSignal(signal)) };
  }

  private async getServerForMember(serverId: string, userId: string) {
    const server = await this.prisma.server.findFirst({
      where: {
        id: serverId,
        members: {
          some: { userId }
        }
      },
      include: this.serverStateInclude
    });

    if (!server) {
      throw new NotFoundException("Servidor nao encontrado.");
    }

    return server;
  }

  private async ensureMember(serverId: string, userId: string) {
    const member = await this.prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId,
          userId
        }
      },
      select: { id: true, timeoutUntil: true }
    });

    if (!member) {
      throw new ForbiddenException("Voce nao participa deste servidor.");
    }

    return member;
  }

  private async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("Usuario nao encontrado.");
    }
    return user;
  }

  private async refreshPresentedServerState(serverId: string) {
    const refreshed = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: this.serverStateInclude
    });

    if (!refreshed) {
      throw new NotFoundException("Servidor nao encontrado.");
    }

    const state = this.presentServerState(refreshed);
    await this.prisma.server.update({
      where: { id: serverId },
      data: { clientState: this.toInputJson(state) }
    });
    return state;
  }

  private presentServerState(server: {
    id: string;
    ownerId: string;
    name: string;
    iconUrl: string | null;
    bannerUrl: string | null;
    description: string | null;
    clientState: unknown;
    members: Array<{ userId: string; joinedAt: Date; timeoutUntil: Date | null; user: User }>;
    invites: Array<{ id: string; code: string; createdAt: Date; expiresAt: Date | null; maxUses: number | null; uses: number; active: boolean; createdBy: User }>;
    bans: Array<{ id: string; userId: string; reason: string | null; createdAt: Date; moderator: User; user: User }>;
  }): ClientServerState {
    const storedState = this.isRecord(server.clientState) ? { ...server.clientState } : {};
    const state: ClientServerState = {
      ...storedState,
      id: server.id,
      ownerId: server.ownerId,
      name: this.readOptionalString(storedState.name) ?? server.name,
      description: this.readOptionalString(storedState.description) ?? server.description ?? "Servidor online no Tempest Light.",
      iconUrl: this.readOptionalString(storedState.iconUrl) ?? server.iconUrl,
      bannerUrl: this.readOptionalString(storedState.bannerUrl) ?? server.bannerUrl
    };

    state.members = this.mergeDatabaseMembers(state, server).members;
    state.invites = server.invites.map((invite) => this.presentInvite(invite));
    state.bans = server.bans.map((ban) => this.presentBan(ban));
    state.timeouts = this.presentTimeoutsFromMembers(server.members);

    return state;
  }

  private mergeDatabaseMembers(
    state: ClientServerState,
    server: { members: Array<{ userId: string; joinedAt: Date; timeoutUntil: Date | null; user: User }> }
  ): ClientServerState & { members: unknown[] } {
    const existingMembers = Array.isArray(state.members) ? state.members.filter((member) => this.isRecord(member)) : [];
    const memberById = new Map(
      existingMembers
        .filter((member) => member.isBot === true)
        .map((member) => [String(member.id ?? ""), member])
    );

    for (const membership of server.members) {
      const existing = memberById.get(membership.userId) ?? {};
      memberById.set(membership.userId, {
        ...existing,
        id: membership.user.id,
        username: membership.user.username,
        displayName: membership.user.displayName,
        avatarUrl: membership.user.avatarUrl,
        bannerUrl: membership.user.bannerUrl,
        bio: membership.user.bio,
        presence: membership.user.presence === "INVISIBLE" ? "OFFLINE" : membership.user.presence,
        starBalance: membership.user.starBalance,
        accountCreatedAt: membership.user.createdAt.toISOString(),
        joinedAt: membership.joinedAt.toISOString(),
        roleIds: this.readStringArray(existing.roleIds, ["everyone"]),
        timeoutUntil: membership.timeoutUntil?.toISOString() ?? null,
        isBot: Boolean(existing.isBot)
      });
    }

    return {
      ...state,
      members: Array.from(memberById.values())
    };
  }

  private mergeCurrentUserMember(state: ClientServerState, user: User, joinedAt: Date, owner: boolean): ClientServerState {
    const members = Array.isArray(state.members) ? state.members.filter((member) => this.isRecord(member)) : [];
    const roleIds = owner ? this.getOwnerRoleIds(state, user.id) : ["everyone"];
    const existingIndex = members.findIndex((member) => member.id === user.id);
    const member = {
      ...(existingIndex >= 0 ? members[existingIndex] : {}),
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      presence: user.presence,
      starBalance: user.starBalance,
      accountCreatedAt: user.createdAt.toISOString(),
      joinedAt: existingIndex >= 0 ? this.readOptionalString(members[existingIndex].joinedAt) ?? joinedAt.toISOString() : joinedAt.toISOString(),
      roleIds,
      timeoutUntil: existingIndex >= 0 ? this.readOptionalString(members[existingIndex].timeoutUntil) : null,
      isBot: false
    };

    if (existingIndex >= 0) {
      members[existingIndex] = member;
    } else {
      members.push(member);
    }

    return { ...state, members };
  }

  private getOwnerRoleIds(state: ClientServerState, userId: string) {
    const members = Array.isArray(state.members) ? state.members.filter((member) => this.isRecord(member)) : [];
    const existing = members.find((member) => member.id === userId);
    const existingRoleIds = this.readStringArray(existing?.roleIds);
    if (existingRoleIds.length) {
      return existingRoleIds;
    }

    const roles = Array.isArray(state.roles) ? state.roles.filter((role) => this.isRecord(role)) : [];
    const adminRole = roles.find((role) => this.permissionsContain(role.permissions, "administrator"));
    return adminRole?.id ? ["everyone", String(adminRole.id)] : ["everyone"];
  }

  private async canManageServer(server: { ownerId: string; clientState: unknown }, userId: string) {
    if (server.ownerId === userId || this.userHasStatePermission(server.clientState, userId, ["administrator", "manage_server"])) {
      return true;
    }

    return this.isDeveloperAccount(await this.getUser(userId));
  }

  private async canCreateInvite(server: { ownerId: string; clientState: unknown }, userId: string) {
    if (server.ownerId === userId || this.userHasStatePermission(server.clientState, userId, ["administrator", "create_invite", "manage_server"])) {
      return true;
    }

    return this.isDeveloperAccount(await this.getUser(userId));
  }

  private canModerateServer(server: { ownerId: string; clientState: unknown }, moderator: User, permissions: string[]) {
    return server.ownerId === moderator.id || this.isDeveloperAccount(moderator) || this.userHasStatePermission(server.clientState, moderator.id, permissions);
  }

  private isDeveloperAccount(user: Pick<User, "email" | "username">) {
    const configuredEmails = this.readConfiguredList("TEMPEST_LIGHT_DEVELOPER_EMAILS");
    const configuredUsernames = this.readConfiguredList("TEMPEST_LIGHT_DEVELOPER_USERNAMES");
    const email = user.email.trim().toLowerCase();
    const username = user.username.trim().toLowerCase();

    return [...configuredEmails, ...fallbackDeveloperEmails].map((item) => item.toLowerCase()).includes(email)
      || [...configuredUsernames, ...fallbackDeveloperUsernames].map((item) => item.toLowerCase()).includes(username);
  }

  private readConfiguredList(key: string) {
    const value = this.config.get<string>(key);
    return value
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  }

  private boostExpired(boost: Record<string, unknown>) {
    const expiresAt = this.readOptionalString(boost.expiresAt);
    if (!expiresAt) {
      return true;
    }

    const expiresAtTime = Date.parse(expiresAt);
    return !Number.isFinite(expiresAtTime) || expiresAtTime <= Date.now();
  }

  private async assertNotBanned(serverId: string, userId: string) {
    const ban = await this.prisma.ban.findUnique({
      where: {
        serverId_userId: {
          serverId,
          userId
        }
      }
    });

    if (!ban) {
      return;
    }

    if (ban.expiresAt && ban.expiresAt.getTime() <= Date.now()) {
      await this.prisma.ban.delete({ where: { id: ban.id } });
      return;
    }

    throw new ForbiddenException("Voce esta banido deste servidor.");
  }

  private assertNotTimedOut(member: { timeoutUntil: Date | null }) {
    if (!member.timeoutUntil || member.timeoutUntil.getTime() <= Date.now()) {
      return;
    }

    throw new ForbiddenException(`Voce esta de castigo neste servidor ate ${member.timeoutUntil.toLocaleString("pt-BR")}.`);
  }

  private normalizeTimeoutDuration(durationMinutes: number) {
    const allowed = [120, 300, 1440, 2880, 10080];
    if (!allowed.includes(durationMinutes)) {
      throw new BadRequestException("Duracao de castigo invalida.");
    }

    return durationMinutes;
  }

  private cleanReason(reason?: string) {
    const clean = reason?.trim().slice(0, 180);
    return clean || null;
  }

  private findServerMemberByUsername(
    server: { members: Array<{ userId: string; user: User }> },
    usernameInput: string
  ) {
    const clean = usernameInput.trim().replace(/^@+/, "").toLowerCase();
    if (!clean) {
      throw new BadRequestException("Informe um usuario do servidor.");
    }

    return server.members.find((member) => {
      const username = member.user.username.toLowerCase();
      const displayName = member.user.displayName.toLowerCase();
      return username === clean || displayName === clean || member.userId === clean;
    }) ?? null;
  }

  private assertCanModerateTarget(server: { ownerId: string }, moderatorId: string, targetUserId: string, action: string) {
    if (targetUserId === moderatorId) {
      throw new BadRequestException(`Voce nao pode ${action} a propria conta.`);
    }

    if (targetUserId === server.ownerId) {
      throw new ForbiddenException(`Nao e possivel ${action} o dono do servidor.`);
    }
  }

  private presentBan(ban: { id: string; userId: string; reason: string | null; createdAt: Date; moderator: User; user: User }) {
    return {
      id: ban.id,
      userId: ban.userId,
      username: ban.user.username,
      displayName: ban.user.displayName,
      reason: ban.reason ?? "Sem motivo informado.",
      bannedBy: ban.moderator.displayName,
      bannedAt: ban.createdAt.toISOString()
    };
  }

  private presentTimeoutsFromMembers(members: Array<{ userId: string; timeoutUntil: Date | null; user: User }>) {
    const now = Date.now();
    return members
      .filter((member) => member.timeoutUntil && member.timeoutUntil.getTime() > now)
      .map((member) => ({
        id: `timeout-${member.userId}`,
        userId: member.userId,
        username: member.user.username,
        displayName: member.user.displayName,
        reason: "Castigo ativo.",
        timeoutBy: "Moderacao",
        timeoutUntil: member.timeoutUntil?.toISOString() ?? new Date().toISOString(),
        createdAt: new Date().toISOString()
      }));
  }

  private getPresentedMemberCount(server: ClientServerState) {
    return Array.isArray(server.members) ? server.members.length : 0;
  }

  private userHasStatePermission(stateValue: unknown, userId: string, permissions: string[]) {
    if (!this.isRecord(stateValue)) {
      return false;
    }

    const members = Array.isArray(stateValue.members) ? stateValue.members.filter((member) => this.isRecord(member)) : [];
    const member = members.find((item) => item.id === userId);
    if (!member) {
      return false;
    }

    const memberRoleIds = new Set(this.readStringArray(member.roleIds));
    const roles = Array.isArray(stateValue.roles) ? stateValue.roles.filter((role) => this.isRecord(role)) : [];
    return roles.some((role) => memberRoleIds.has(String(role.id)) && permissions.some((permission) => this.permissionsContain(role.permissions, permission)));
  }

  private permissionsContain(value: unknown, permission: string) {
    if (Array.isArray(value)) {
      return value.includes(permission);
    }

    return this.isRecord(value) && value[permission] === true;
  }

  private withInviteInState(state: ClientServerState, invite: { id: string; code: string; createdAt: Date; expiresAt: Date | null; maxUses: number | null; uses: number; active: boolean; createdBy: User }) {
    const inviteRecord = this.presentInvite(invite);
    const invites = Array.isArray(state.invites) ? state.invites.filter((item) => this.isRecord(item) && item.id !== invite.id) : [];
    return { ...state, invites: [inviteRecord, ...invites] };
  }

  private withoutInviteInState(state: ClientServerState, inviteId: string) {
    const invites = Array.isArray(state.invites) ? state.invites.filter((item) => this.isRecord(item) && item.id !== inviteId) : [];
    return { ...state, invites };
  }

  private presentInvite(invite: { id: string; code: string; createdAt: Date; expiresAt: Date | null; maxUses: number | null; uses: number; active: boolean; createdBy: User }) {
    return {
      id: invite.id,
      code: invite.code,
      createdBy: invite.createdBy.displayName,
      createdAt: invite.createdAt.toISOString(),
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      maxUses: invite.maxUses,
      uses: invite.uses,
      active: invite.active
    };
  }

  private presentServerMessage(message: {
    id: string;
    serverId: string;
    channelName: string;
    authorId: string;
    content: string;
    mentions: unknown;
    createdAt: Date;
    author: User;
  }) {
    const mentions = this.isRecord(message.mentions) ? message.mentions : null;
    const botAuthor = this.readTempestBotAuthor(mentions);

    return {
      id: message.id,
      serverId: message.serverId,
      channelName: message.channelName,
      authorId: botAuthor?.id ?? message.authorId,
      authorUsername: botAuthor?.username ?? message.author.username,
      authorDisplayName: botAuthor?.displayName ?? message.author.displayName,
      authorAvatarUrl: botAuthor ? botAuthor.avatarUrl : message.author.avatarUrl,
      authorIsBot: Boolean(botAuthor),
      content: message.content,
      mentions,
      createdAt: message.createdAt.toISOString()
    };
  }

  private presentVoiceState(session: {
    id: string;
    serverId: string;
    userId: string;
    channelName: string;
    muted: boolean;
    speaking: boolean;
    joinedAt: Date;
    lastSeenAt: Date;
    user: User;
  }) {
    return {
      id: session.id,
      serverId: session.serverId,
      userId: session.userId,
      username: session.user.username,
      displayName: session.user.displayName,
      avatarUrl: session.user.avatarUrl,
      channelName: session.channelName,
      muted: session.muted,
      speaking: session.speaking,
      joinedAt: session.joinedAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString()
    };
  }

  private presentVoiceSignal(signal: {
    id: string;
    serverId: string;
    channelName: string;
    fromUserId: string;
    toUserId: string;
    type: string;
    payload: unknown;
    createdAt: Date;
    sender: User;
  }) {
    return {
      id: signal.id,
      serverId: signal.serverId,
      channelName: signal.channelName,
      fromUserId: signal.fromUserId,
      fromUsername: signal.sender.username,
      fromDisplayName: signal.sender.displayName,
      toUserId: signal.toUserId,
      type: signal.type,
      payload: this.isRecord(signal.payload) ? signal.payload : {},
      createdAt: signal.createdAt.toISOString()
    };
  }

  private async createMentionNotifications(
    serverId: string,
    channelName: string,
    message: { authorId: string; author: User; content: string },
    mentions?: Record<string, unknown>
  ) {
    const botAuthor = this.readTempestBotAuthor(mentions);
    const mentionedUserIds = this.readStringArray(mentions?.mentionedUserIds).filter(
      (userId) => userId !== message.authorId && userId !== botAuthor?.id
    );
    if (!mentionedUserIds.length) {
      return;
    }

    const uniqueRecipientIds = Array.from(new Set(mentionedUserIds));
    const existingUsers = await this.prisma.user.findMany({
      where: { id: { in: uniqueRecipientIds } },
      select: { id: true }
    });
    const existingUserIds = new Set(existingUsers.map((recipient) => recipient.id));
    const recipients = uniqueRecipientIds.filter((recipientId) => existingUserIds.has(recipientId));
    if (!recipients.length) {
      return;
    }

    await this.prisma.notification.createMany({
      data: recipients.map((userId) => ({
        userId,
        type: "MENTION",
        title: `${botAuthor?.displayName ?? message.author.displayName} mencionou voce`,
        body: message.content.slice(0, 240),
        data: this.toInputJson({
          serverId,
          channelName,
          messageAuthorId: botAuthor?.id ?? message.authorId,
          messageAuthorUsername: botAuthor?.username ?? message.author.username
        })
      }))
    });
  }

  private async generateUniqueInviteCode() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = randomBytes(6).toString("base64url");
      const existing = await this.prisma.invite.findUnique({ where: { code }, select: { id: true } });
      if (!existing) {
        return code;
      }
    }

    throw new Error("Nao foi possivel gerar um convite unico.");
  }

  private getInviteExpiresAt(createdAt: Date, duration: InviteDuration) {
    if (duration === "never") {
      return null;
    }

    const expiresAt = new Date(createdAt);
    if (duration === "24h") {
      expiresAt.setHours(expiresAt.getHours() + 24);
    } else if (duration === "2d") {
      expiresAt.setDate(expiresAt.getDate() + 2);
    } else if (duration === "5d") {
      expiresAt.setDate(expiresAt.getDate() + 5);
    } else if (duration === "30d" || duration === "1m") {
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    return expiresAt;
  }

  private clampMaxUses(maxUses: number | null | undefined) {
    if (maxUses === null || maxUses === undefined || !Number.isFinite(maxUses)) {
      return 25;
    }

    return Math.min(Math.max(Math.floor(maxUses), 1), 200);
  }

  private extractInviteCode(input: string) {
    const rawInput = String(input ?? "").trim();
    if (!rawInput) {
      return null;
    }

    try {
      const url = new URL(rawInput);
      const parts = url.pathname.split("/").filter(Boolean);
      return parts.at(-1) ?? rawInput;
    } catch {
      return rawInput.replace(/^@+/, "").replace(/^https?:\/\/[^/]+\//i, "").split(/[?#]/)[0];
    }
  }

  private async pruneStaleVoiceSessions() {
    await this.prisma.serverVoiceSession.deleteMany({
      where: {
        lastSeenAt: {
          lt: new Date(Date.now() - voiceSessionTtlMs)
        }
      }
    });
  }

  private async pruneOldVoiceSignals() {
    await this.prisma.voiceSignal.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - voiceSignalTtlMs)
        }
      }
    });
  }

  private readOptionalString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private readStringArray(value: unknown, fallback: string[] = []) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : fallback;
  }

  private readTempestBotAuthor(mentions: unknown) {
    if (!this.isRecord(mentions) || !this.isRecord(mentions.tempestBotAuthor)) {
      return null;
    }

    const id = this.readOptionalString(mentions.tempestBotAuthor.id);
    const username = this.readOptionalString(mentions.tempestBotAuthor.username);
    const displayName = this.readOptionalString(mentions.tempestBotAuthor.displayName) ?? username;
    if (!id || !username || !displayName) {
      return null;
    }

    return {
      id,
      username,
      displayName,
      avatarUrl: this.readOptionalString(mentions.tempestBotAuthor.avatarUrl)
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  private toInputJson(value: Record<string, unknown>) {
    return value as Prisma.InputJsonValue;
  }
}
