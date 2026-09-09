export type PresenceStatus = "ONLINE" | "IDLE" | "DND" | "INVISIBLE" | "OFFLINE";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  customStatus: string | null;
  presence: PresenceStatus;
  emailVerifiedAt: string | null;
  blockNonFriendDirectMessages: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  displayName?: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
}

export interface LoginInput {
  emailOrUsername: string;
  password: string;
  twoFactorCode?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface RegisterResponse {
  ok: true;
  email: string;
  username: string;
  emailVerificationRequired: true;
  verificationEmailSent: boolean;
  devVerificationUrl?: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface VerifyEmailResponse {
  ok: true;
  user: AuthUser;
}

export interface ResendVerificationInput {
  emailOrUsername: string;
}

export interface ResendVerificationResponse {
  ok: true;
  emailVerificationRequired: boolean;
  verificationEmailSent: boolean;
  devVerificationUrl?: string;
}

export interface UpdateProfileInput {
  username?: string;
  currentPassword?: string;
  displayName?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  customStatus?: string | null;
  presence?: PresenceStatus;
  blockNonFriendDirectMessages?: boolean;
}

export interface ChangeEmailInput {
  email: string;
  currentPassword: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface DeleteAccountInput {
  currentPassword: string;
}

export interface DeleteServerInput {
  currentPassword: string;
}

export interface PasswordResetRequestInput {
  emailOrUsername: string;
}

export interface PasswordResetRequestResponse {
  ok: true;
  passwordResetEmailSent: boolean;
  devResetCode?: string;
}

export interface PasswordResetVerifyInput {
  emailOrUsername: string;
  code: string;
}

export interface PasswordResetVerifyResponse {
  ok: true;
  resetToken: string;
}

export interface PasswordResetConfirmInput {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetConfirmResponse {
  ok: true;
}

export interface TwoFactorSetupInput {
  currentPassword: string;
}

export interface TwoFactorSetupResponse {
  ok: true;
  secret: string;
  otpauthUrl: string;
}

export interface EnableTwoFactorInput {
  code: string;
}

export interface DisableTwoFactorInput {
  currentPassword: string;
  code?: string;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  customStatus: string | null;
  presence: PresenceStatus;
  blockNonFriendDirectMessages: boolean;
}

export interface DirectMessage {
  id: string;
  authorId: string;
  authorDisplayName: string;
  content: string;
  createdAt: string;
}

export interface DirectConversationSummary {
  id: string;
  participant: PublicUser;
  isFriend: boolean;
  canMessage: boolean;
  lastMessage: DirectMessage | null;
}

export interface DirectConversation {
  id: string;
  participant: PublicUser;
  isFriend: boolean;
  canMessage: boolean;
  messages: DirectMessage[];
}

export interface StartDirectConversationInput {
  username: string;
}

export interface SendDirectMessageInput {
  content: string;
}

export interface FriendRequestInput {
  username: string;
}

export interface FriendRequestResponse {
  ok: true;
  status: "PENDING" | "ALREADY_FRIENDS" | "ALREADY_REQUESTED";
}

export interface FriendRequestItem {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED";
  direction: "incoming" | "outgoing";
  sender: PublicUser;
  receiver: PublicUser;
  otherUser: PublicUser;
  createdAt: string;
  respondedAt: string | null;
}

export interface FriendRequestsResponse {
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
}

export interface FriendRequestActionResponse {
  ok: true;
  status: "ACCEPTED" | "DECLINED" | "CANCELED";
  request: FriendRequestItem;
}

export interface OnlineServerMessage {
  id: string;
  serverId: string;
  channelName: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  authorIsBot?: boolean;
  content: string;
  mentions: Record<string, unknown> | null;
  createdAt: string;
}

export interface OnlineVoiceState {
  id: string;
  serverId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  channelName: string;
  muted: boolean;
  speaking: boolean;
  joinedAt: string;
  lastSeenAt: string;
}

export interface OnlineVoiceSignal {
  id: string;
  serverId: string;
  channelName: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  toUserId: string;
  type: "offer" | "answer" | "candidate";
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface OnlineServerInvite {
  id: string;
  code: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number;
  active: boolean;
}

export interface OnlineServerBundle {
  servers: unknown[];
  messages: OnlineServerMessage[];
  voiceStates: OnlineVoiceState[];
}

export interface OnlineServerResponse {
  server: unknown;
}

export interface DeleteOnlineServerResponse {
  ok: true;
  serverId: string;
}

export interface LeaveOnlineServerResponse {
  ok: true;
  serverId: string;
}

export interface BanServerMemberInput {
  username: string;
  reason?: string;
}

export interface TimeoutServerMemberInput {
  username: string;
  durationMinutes: 120 | 300 | 1440 | 2880 | 10080;
  reason?: string;
}

export interface OnlineServerModerationResponse {
  ok: true;
  server: unknown;
}

export interface OnlineDiscoverServersResponse {
  servers: unknown[];
}

export interface CreateOnlineServerInput {
  server: unknown;
}

export interface UpdateOnlineServerStateInput {
  server: unknown;
}

export interface JoinServerInput {
  code: string;
}

export interface SendServerMessageInput {
  channelName: string;
  content: string;
  mentions?: Record<string, unknown>;
}

export interface ServerMessagesResponse {
  messages: OnlineServerMessage[];
}

export interface ServerMessageResponse {
  message: OnlineServerMessage;
}

export interface CreateServerInviteInput {
  duration?: "24h" | "2d" | "5d" | "30d" | "1m" | "never";
  maxUses?: number | null;
}

export interface OnlineServerInviteResponse {
  invite: OnlineServerInvite;
  server: unknown;
}

export interface OnlineVoiceStateInput {
  channelName: string;
  muted?: boolean;
  speaking?: boolean;
}

export interface OnlineVoiceStateResponse {
  voiceState: OnlineVoiceState;
}

export interface OnlineVoiceStatesResponse {
  voiceStates: OnlineVoiceState[];
}

export interface OnlineVoiceSignalInput {
  channelName: string;
  toUserId: string;
  type: "offer" | "answer" | "candidate";
  payload: Record<string, unknown>;
}

export interface OnlineVoiceSignalResponse {
  signal: OnlineVoiceSignal;
}

export interface OnlineVoiceSignalsResponse {
  signals: OnlineVoiceSignal[];
}

export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
  dependencies: {
    database: "ok" | "error";
    redis: "ok" | "error" | "disabled";
  };
}

export interface PublishDesktopUpdateInput {
  version?: string;
  ref?: string;
  releaseNotes?: string;
}

export interface PublishDesktopUpdateResponse {
  ok: true;
  owner: string;
  repo: string;
  workflowId: string;
  ref: string;
  version: string | null;
  actionsUrl: string;
  message: string;
}
