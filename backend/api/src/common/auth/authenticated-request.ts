import type { Request } from "express";

export interface AuthenticatedPrincipal {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  customStatus: string | null;
  presence: "ONLINE" | "IDLE" | "DND" | "INVISIBLE" | "OFFLINE";
  emailVerifiedAt: string | null;
  blockNonFriendDirectMessages: boolean;
  createdAt: string;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  accessToken: string;
  user: AuthenticatedPrincipal;
}
