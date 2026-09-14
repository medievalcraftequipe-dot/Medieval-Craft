import { describe, expect, it } from "vitest";
import { PresenceStatus, UserAccountStatus, type User } from "@prisma/client";

import { presentPublicUser } from "./user.presenter";

describe("presentPublicUser", () => {
  it("does not expose private account fields", () => {
    const createdAt = new Date("2026-09-14T12:00:00.000Z");
    const updatedAt = new Date("2026-09-14T12:30:00.000Z");
    const user: User = {
      id: "user-1",
      email: "owner@example.com",
      username: "armadura_prime",
      displayName: "Armadura Prime",
      passwordHash: "argon2id-secret",
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      avatarUrl: "https://cdn.example/avatar.png",
      bannerUrl: null,
      bio: "Bio publica",
      customStatus: null,
      presence: PresenceStatus.ONLINE,
      emailVerifiedAt: createdAt,
      blockNonFriendDirectMessages: true,
      starBalance: 999999,
      twoFactorEnabled: true,
      twoFactorSecret: "encrypted-secret",
      status: UserAccountStatus.ACTIVE,
      createdAt,
      updatedAt
    };

    const presented = presentPublicUser(user);

    expect(presented).toEqual({
      id: "user-1",
      username: "armadura_prime",
      displayName: "Armadura Prime",
      avatarUrl: "https://cdn.example/avatar.png",
      bannerUrl: null,
      bio: "Bio publica",
      customStatus: null,
      presence: PresenceStatus.ONLINE,
      createdAt: createdAt.toISOString()
    });
    expect(presented).not.toHaveProperty("email");
    expect(presented).not.toHaveProperty("passwordHash");
    expect(presented).not.toHaveProperty("starBalance");
    expect(presented).not.toHaveProperty("twoFactorEnabled");
    expect(presented).not.toHaveProperty("twoFactorSecret");
  });

  it("hides invisible users as offline on public profiles", () => {
    const now = new Date("2026-09-14T12:00:00.000Z");
    const user: User = {
      id: "user-2",
      email: "invisible@example.com",
      username: "quiet",
      displayName: "Quiet",
      passwordHash: "argon2id-secret",
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      avatarUrl: null,
      bannerUrl: null,
      bio: null,
      customStatus: null,
      presence: PresenceStatus.INVISIBLE,
      emailVerifiedAt: now,
      blockNonFriendDirectMessages: false,
      starBalance: 0,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      status: UserAccountStatus.ACTIVE,
      createdAt: now,
      updatedAt: now
    };

    expect(presentPublicUser(user).presence).toBe(PresenceStatus.OFFLINE);
  });
});
