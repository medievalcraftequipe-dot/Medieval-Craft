import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { PresenceStatus, User } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

export interface CreateUserInput {
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  birthDate: Date;
}

export interface UpdateUserProfileInput {
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  customStatus?: string | null;
  presence?: PresenceStatus;
  blockNonFriendDirectMessages?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput): Promise<User> {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();
    await this.releaseDeletedAccountConflicts(email, username);

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: "insensitive" } },
          { username: { equals: username, mode: "insensitive" } }
        ]
      }
    });

    if (existingUser?.email.toLowerCase() === email) {
      throw new ConflictException("Email is already registered.");
    }

    if (existingUser?.username.toLowerCase() === username) {
      throw new ConflictException("Username is already in use.");
    }

    return this.prisma.user.create({
      data: {
        ...input,
        email,
        username
      }
    });
  }

  private async releaseDeletedAccountConflicts(email: string, username: string) {
    const deletedUsers = await this.prisma.user.findMany({
      where: {
        status: "DELETED",
        OR: [
          { email: { equals: email, mode: "insensitive" } },
          { username: { equals: username, mode: "insensitive" } }
        ]
      }
    });

    for (const user of deletedUsers) {
      const stamp = Date.now().toString(36);
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: `deleted-${stamp}-${user.id}@tempest-light.invalid`,
          username: `deleted_${stamp}_${user.id.slice(-6)}`.slice(0, 32),
          twoFactorEnabled: false,
          twoFactorSecret: null
        }
      });
    }
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    const normalized = emailOrUsername.trim().toLowerCase();

    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalized, mode: "insensitive" } },
          { username: { equals: normalized, mode: "insensitive" } }
        ]
      }
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  async updateProfile(id: string, input: UpdateUserProfileInput): Promise<User> {
    if (input.username) {
      input.username = input.username.trim().toLowerCase();
      const existingUser = await this.prisma.user.findFirst({
        where: { username: { equals: input.username, mode: "insensitive" } }
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException("Username is already in use.");
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: input
    });
  }

  async getPublicProfile(username: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: username.trim().toLowerCase(), mode: "insensitive" } }
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return user;
  }
}
