import type { User } from "@prisma/client";

export function presentAuthUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    bio: user.bio,
    customStatus: user.customStatus,
    presence: user.presence,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    blockNonFriendDirectMessages: user.blockNonFriendDirectMessages,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt.toISOString()
  };
}
