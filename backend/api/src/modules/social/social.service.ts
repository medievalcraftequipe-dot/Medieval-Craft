import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { FriendRequest, Message, ProfilePost, User } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

type ProfilePostWithSocial = ProfilePost & {
  author: User;
  likes?: Array<{ userId: string }>;
  _count?: { likes: number };
};

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  async listDirectConversations(userId: string) {
    const conversations = await this.prisma.directConversation.findMany({
      where: {
        participants: {
          some: { userId }
        }
      },
      include: {
        participants: { include: { user: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { author: true }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return Promise.all(conversations.map((conversation) => this.presentConversationSummary(userId, conversation)));
  }

  async startDirectConversation(userId: string, username: string) {
    const target = await this.findUserByUsername(username);
    this.ensureDifferentUsers(userId, target.id);

    const isFriend = await this.areFriends(userId, target.id);
    if (!isFriend && target.blockNonFriendDirectMessages) {
      throw new ForbiddenException("Essa pessoa bloqueia mensagens diretas de quem nao e amigo.");
    }

    const conversation = await this.findOrCreateConversation(userId, target.id);
    return this.getDirectConversation(userId, conversation.id);
  }

  async getDirectConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.directConversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: { userId }
        }
      },
      include: {
        participants: { include: { user: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 80,
          include: { author: true }
        }
      }
    });

    if (!conversation) {
      throw new NotFoundException("Conversa direta nao encontrada.");
    }

    return this.presentConversation(userId, conversation);
  }

  async sendDirectMessage(userId: string, conversationId: string, content: string) {
    const conversation = await this.prisma.directConversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: { userId }
        }
      },
      include: { participants: { include: { user: true } } }
    });

    if (!conversation) {
      throw new NotFoundException("Conversa direta nao encontrada.");
    }

    const target = this.getOtherParticipant(userId, conversation.participants);
    if (!target) {
      throw new BadRequestException("Conversa direta invalida.");
    }

    const isFriend = await this.areFriends(userId, target.id);
    if (!isFriend && target.blockNonFriendDirectMessages) {
      throw new ForbiddenException("Essa pessoa bloqueia mensagens diretas de quem nao e amigo.");
    }

    const message = await this.prisma.message.create({
      data: {
        directConversationId: conversation.id,
        authorId: userId,
        content
      },
      include: { author: true }
    });

    await this.prisma.directConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    });

    return this.presentMessage(message);
  }

  async listFriendRequests(userId: string) {
    const [incoming, outgoing] = await Promise.all([
      this.prisma.friendRequest.findMany({
        where: { receiverId: userId, status: "PENDING" },
        include: { sender: true, receiver: true },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      this.prisma.friendRequest.findMany({
        where: { senderId: userId, status: "PENDING" },
        include: { sender: true, receiver: true },
        orderBy: { createdAt: "desc" },
        take: 50
      })
    ]);

    return {
      incoming: incoming.map((request) => this.presentFriendRequest(userId, request)),
      outgoing: outgoing.map((request) => this.presentFriendRequest(userId, request))
    };
  }

  async requestFriendship(userId: string, username: string) {
    const target = await this.findUserByUsername(username);
    this.ensureDifferentUsers(userId, target.id);

    if (await this.areFriends(userId, target.id)) {
      return { ok: true, status: "ALREADY_FRIENDS" as const };
    }

    const existing = await this.prisma.friendRequest.findFirst({
      where: {
        status: "PENDING",
        OR: [
          { senderId: userId, receiverId: target.id },
          { senderId: target.id, receiverId: userId }
        ]
      }
    });

    if (existing) {
      return { ok: true, status: "ALREADY_REQUESTED" as const };
    }

    await this.prisma.friendRequest.create({
      data: {
        senderId: userId,
        receiverId: target.id
      }
    });

    return { ok: true, status: "PENDING" as const };
  }

  async acceptFriendship(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findFirst({
      where: { id: requestId, receiverId: userId, status: "PENDING" },
      include: { sender: true, receiver: true }
    });

    if (!request) {
      throw new NotFoundException("Solicitacao de amizade nao encontrada.");
    }

    await this.prisma.$transaction([
      this.prisma.friendRequest.update({
        where: { id: request.id },
        data: { status: "ACCEPTED", respondedAt: new Date() }
      }),
      this.prisma.friend.upsert({
        where: {
          requesterId_addresseeId: {
            requesterId: request.senderId,
            addresseeId: request.receiverId
          }
        },
        update: {},
        create: {
          requesterId: request.senderId,
          addresseeId: request.receiverId
        }
      })
    ]);

    return { ok: true, status: "ACCEPTED" as const, request: this.presentFriendRequest(userId, request) };
  }

  async declineFriendship(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findFirst({
      where: { id: requestId, receiverId: userId, status: "PENDING" },
      include: { sender: true, receiver: true }
    });

    if (!request) {
      throw new NotFoundException("Solicitacao de amizade nao encontrada.");
    }

    await this.prisma.friendRequest.update({
      where: { id: request.id },
      data: { status: "DECLINED", respondedAt: new Date() }
    });

    return { ok: true, status: "DECLINED" as const, request: this.presentFriendRequest(userId, request) };
  }

  async cancelFriendship(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findFirst({
      where: { id: requestId, senderId: userId, status: "PENDING" },
      include: { sender: true, receiver: true }
    });

    if (!request) {
      throw new NotFoundException("Solicitacao de amizade nao encontrada.");
    }

    await this.prisma.friendRequest.update({
      where: { id: request.id },
      data: { status: "CANCELED", respondedAt: new Date() }
    });

    return { ok: true, status: "CANCELED" as const, request: this.presentFriendRequest(userId, request) };
  }

  async getProfileSocial(viewerId: string, profileUserId: string) {
    const profile = await this.prisma.user.findUnique({
      where: { id: profileUserId }
    });

    if (!profile) {
      throw new NotFoundException("Usuario nao encontrado.");
    }

    const [likeCount, likedByMe, posts] = await Promise.all([
      this.prisma.userProfileLike.count({ where: { targetUserId: profileUserId } }),
      this.prisma.userProfileLike.findUnique({
        where: {
          targetUserId_userId: {
            targetUserId: profileUserId,
            userId: viewerId
          }
        },
        select: { userId: true }
      }),
      this.prisma.profilePost.findMany({
        where: { authorId: profileUserId, deletedAt: null },
        include: this.getProfilePostInclude(viewerId),
        orderBy: { createdAt: "desc" },
        take: 30
      })
    ]);

    return {
      profile: this.presentPublicUser(profile),
      likeCount,
      likedByMe: Boolean(likedByMe),
      posts: posts.map((post) => this.presentProfilePost(post, viewerId))
    };
  }

  async createProfilePost(userId: string, contentInput: string) {
    const content = this.cleanProfilePostContent(contentInput);
    const post = await this.prisma.profilePost.create({
      data: {
        authorId: userId,
        content
      },
      include: this.getProfilePostInclude(userId)
    });

    return { post: this.presentProfilePost(post, userId) };
  }

  async deleteProfilePost(userId: string, postId: string) {
    const post = await this.prisma.profilePost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, deletedAt: true }
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException("Publicacao nao encontrada.");
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException("Voce so pode excluir publicacoes do seu perfil.");
    }

    await this.prisma.profilePost.update({
      where: { id: postId },
      data: { deletedAt: new Date() }
    });

    return { ok: true as const, postId };
  }

  async likeProfile(userId: string, targetUserId: string) {
    await this.ensureUserExists(targetUserId);
    await this.prisma.userProfileLike.upsert({
      where: {
        targetUserId_userId: {
          targetUserId,
          userId
        }
      },
      update: {},
      create: {
        targetUserId,
        userId
      }
    });

    return this.getUserProfileLikeSummary(userId, targetUserId);
  }

  async unlikeProfile(userId: string, targetUserId: string) {
    await this.ensureUserExists(targetUserId);
    await this.prisma.userProfileLike.deleteMany({
      where: {
        targetUserId,
        userId
      }
    });

    return this.getUserProfileLikeSummary(userId, targetUserId);
  }

  async likeProfilePost(userId: string, postId: string) {
    await this.ensureProfilePostExists(postId);
    await this.prisma.profilePostLike.upsert({
      where: {
        postId_userId: {
          postId,
          userId
        }
      },
      update: {},
      create: {
        postId,
        userId
      }
    });

    return this.getProfilePostLikeSummary(userId, postId);
  }

  async unlikeProfilePost(userId: string, postId: string) {
    await this.ensureProfilePostExists(postId);
    await this.prisma.profilePostLike.deleteMany({
      where: {
        postId,
        userId
      }
    });

    return this.getProfilePostLikeSummary(userId, postId);
  }

  private async findUserByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      throw new NotFoundException("Usuario nao encontrado.");
    }

    return user;
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      throw new NotFoundException("Usuario nao encontrado.");
    }
  }

  private async ensureProfilePostExists(postId: string) {
    const post = await this.prisma.profilePost.findUnique({
      where: { id: postId },
      select: { id: true, deletedAt: true }
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException("Publicacao nao encontrada.");
    }
  }

  private cleanProfilePostContent(contentInput: string) {
    const content = String(contentInput ?? "").trim();
    if (!content) {
      throw new BadRequestException("Escreva algo para publicar no perfil.");
    }

    if (content.length > 500) {
      throw new BadRequestException("A publicacao pode ter ate 500 caracteres.");
    }

    return content;
  }

  private ensureDifferentUsers(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new BadRequestException("Voce nao pode abrir uma conversa direta com voce mesmo.");
    }
  }

  private async findOrCreateConversation(userId: string, targetId: string) {
    const existing = await this.prisma.directConversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: targetId } } },
          { participants: { every: { userId: { in: [userId, targetId] } } } }
        ]
      }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.directConversation.create({
      data: {
        participants: {
          create: [{ userId }, { userId: targetId }]
        }
      }
    });
  }

  private async areFriends(userId: string, targetId: string): Promise<boolean> {
    const friendship = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetId },
          { requesterId: targetId, addresseeId: userId }
        ]
      },
      select: { id: true }
    });

    return Boolean(friendship);
  }

  private getOtherParticipant(
    userId: string,
    participants: Array<{ userId: string; user: User }>
  ): User | null {
    return participants.find((participant) => participant.userId !== userId)?.user ?? null;
  }

  private async presentConversationSummary(
    userId: string,
    conversation: {
      id: string;
      participants: Array<{ userId: string; user: User }>;
      messages: Array<Message & { author: User }>;
    }
  ) {
    const target = this.getOtherParticipant(userId, conversation.participants);
    if (!target) {
      throw new BadRequestException("Conversa direta invalida.");
    }

    const isFriend = await this.areFriends(userId, target.id);
    return {
      id: conversation.id,
      participant: this.presentPublicUser(target),
      isFriend,
      canMessage: isFriend || !target.blockNonFriendDirectMessages,
      lastMessage: conversation.messages[0] ? this.presentMessage(conversation.messages[0]) : null
    };
  }

  private async presentConversation(
    userId: string,
    conversation: {
      id: string;
      participants: Array<{ userId: string; user: User }>;
      messages: Array<Message & { author: User }>;
    }
  ) {
    const summary = await this.presentConversationSummary(userId, {
      id: conversation.id,
      participants: conversation.participants,
      messages: []
    });

    return {
      ...summary,
      messages: conversation.messages.map((message) => this.presentMessage(message))
    };
  }

  private presentPublicUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      customStatus: user.customStatus,
      presence: this.presentPublicPresence(user.presence),
      blockNonFriendDirectMessages: user.blockNonFriendDirectMessages
    };
  }

  private getProfilePostInclude(viewerId: string) {
    return {
      author: true,
      likes: {
        where: { userId: viewerId },
        select: { userId: true }
      },
      _count: {
        select: { likes: true }
      }
    };
  }

  private presentProfilePost(post: ProfilePostWithSocial, viewerId: string) {
    return {
      id: post.id,
      authorId: post.authorId,
      authorUsername: post.author.username,
      authorDisplayName: post.author.displayName,
      authorAvatarUrl: post.author.avatarUrl,
      content: post.content,
      likeCount: post._count?.likes ?? 0,
      likedByMe: Boolean(post.likes?.some((like) => like.userId === viewerId)),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    };
  }

  private async getUserProfileLikeSummary(userId: string, targetUserId: string) {
    const [likeCount, likedByMe] = await Promise.all([
      this.prisma.userProfileLike.count({ where: { targetUserId } }),
      this.prisma.userProfileLike.findUnique({
        where: {
          targetUserId_userId: {
            targetUserId,
            userId
          }
        },
        select: { userId: true }
      })
    ]);

    return { userId: targetUserId, likeCount, likedByMe: Boolean(likedByMe) };
  }

  private async getProfilePostLikeSummary(userId: string, postId: string) {
    const [likeCount, likedByMe] = await Promise.all([
      this.prisma.profilePostLike.count({ where: { postId } }),
      this.prisma.profilePostLike.findUnique({
        where: {
          postId_userId: {
            postId,
            userId
          }
        },
        select: { userId: true }
      })
    ]);

    return { postId, likeCount, likedByMe: Boolean(likedByMe) };
  }

  private presentPublicPresence(presence: User["presence"]) {
    return presence === "INVISIBLE" ? "OFFLINE" : presence;
  }

  private presentFriendRequest(
    userId: string,
    request: FriendRequest & { sender: User; receiver: User }
  ) {
    return {
      id: request.id,
      status: request.status,
      direction: request.senderId === userId ? "outgoing" : "incoming",
      sender: this.presentPublicUser(request.sender),
      receiver: this.presentPublicUser(request.receiver),
      otherUser: this.presentPublicUser(request.senderId === userId ? request.receiver : request.sender),
      createdAt: request.createdAt.toISOString(),
      respondedAt: request.respondedAt?.toISOString() ?? null
    };
  }

  private presentMessage(message: Message & { author: User }) {
    return {
      id: message.id,
      authorId: message.authorId,
      authorDisplayName: message.author.displayName,
      content: message.content,
      createdAt: message.createdAt.toISOString()
    };
  }
}
