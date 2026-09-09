import type {
  AddServerStarsInput,
  AddServerStarsResponse,
  AddStarBalanceInput,
  AuthResponse,
  AuthUser,
  BanServerMemberInput,
  ChangeEmailInput,
  ChangePasswordInput,
  DeleteServerMessageResponse,
  DeleteOnlineServerResponse,
  DeleteAccountInput,
  DeleteServerInput,
  DirectConversation,
  DirectConversationSummary,
  DirectMessage,
  DisableTwoFactorInput,
  EnableTwoFactorInput,
  FriendRequestActionResponse,
  FriendRequestInput,
  FriendRequestResponse,
  FriendRequestsResponse,
  HealthResponse,
  CreateOnlineServerInput,
  CreateServerInviteInput,
  JoinServerInput,
  LeaveOnlineServerResponse,
  LoginInput,
  OnlineDiscoverServersResponse,
  OnlineServerBundle,
  OnlineServerInviteResponse,
  OnlineServerModerationResponse,
  OnlineServerResponse,
  OnlineVoiceStateInput,
  OnlineVoiceStateResponse,
  OnlineVoiceStatesResponse,
  OnlineVoiceSignalInput,
  OnlineVoiceSignalResponse,
  OnlineVoiceSignalsResponse,
  PasswordResetConfirmInput,
  PasswordResetConfirmResponse,
  PasswordResetRequestInput,
  PasswordResetRequestResponse,
  PasswordResetVerifyInput,
  PasswordResetVerifyResponse,
  PublishDesktopUpdateInput,
  PublishDesktopUpdateResponse,
  RegisterInput,
  RegisterResponse,
  ResendVerificationInput,
  ResendVerificationResponse,
  SendServerMessageInput,
  SendDirectMessageInput,
  ServerMessageResponse,
  ServerMessagesResponse,
  StarBalanceResponse,
  StartDirectConversationInput,
  TimeoutServerMemberInput,
  TwoFactorSetupInput,
  TwoFactorSetupResponse,
  UpdateOnlineServerStateInput,
  UpdateProfileInput,
  VerifyEmailInput,
  VerifyEmailResponse
} from "@tempest-light/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface TempestLightApiClient {
  health(): Promise<HealthResponse>;
  register(input: RegisterInput): Promise<RegisterResponse>;
  login(input: LoginInput): Promise<AuthResponse>;
  verifyEmail(input: VerifyEmailInput): Promise<VerifyEmailResponse>;
  resendVerification(input: ResendVerificationInput): Promise<ResendVerificationResponse>;
  requestPasswordReset(input: PasswordResetRequestInput): Promise<PasswordResetRequestResponse>;
  verifyPasswordResetCode(input: PasswordResetVerifyInput): Promise<PasswordResetVerifyResponse>;
  confirmPasswordReset(input: PasswordResetConfirmInput): Promise<PasswordResetConfirmResponse>;
  me(): Promise<AuthUser>;
  updateMe(input: UpdateProfileInput): Promise<AuthUser>;
  addStarBalance(input: AddStarBalanceInput): Promise<StarBalanceResponse>;
  changeEmail(input: ChangeEmailInput): Promise<AuthUser>;
  changePassword(input: ChangePasswordInput): Promise<{ ok: true }>;
  deleteAccount(input: DeleteAccountInput): Promise<{ ok: true }>;
  setupTwoFactor(input: TwoFactorSetupInput): Promise<TwoFactorSetupResponse>;
  enableTwoFactor(input: EnableTwoFactorInput): Promise<AuthUser>;
  disableTwoFactor(input: DisableTwoFactorInput): Promise<AuthUser>;
  listDirectConversations(): Promise<DirectConversationSummary[]>;
  startDirectConversation(input: StartDirectConversationInput): Promise<DirectConversation>;
  getDirectConversation(id: string): Promise<DirectConversation>;
  sendDirectMessage(id: string, input: SendDirectMessageInput): Promise<DirectMessage>;
  listFriendRequests(): Promise<FriendRequestsResponse>;
  requestFriendship(input: FriendRequestInput): Promise<FriendRequestResponse>;
  acceptFriendship(id: string): Promise<FriendRequestActionResponse>;
  declineFriendship(id: string): Promise<FriendRequestActionResponse>;
  cancelFriendship(id: string): Promise<FriendRequestActionResponse>;
  listServers(): Promise<OnlineServerBundle>;
  listDiscoverableServers(): Promise<OnlineDiscoverServersResponse>;
  getServer(serverId: string): Promise<OnlineServerResponse>;
  createServer(input: CreateOnlineServerInput): Promise<OnlineServerResponse>;
  updateServerState(serverId: string, input: UpdateOnlineServerStateInput): Promise<OnlineServerResponse>;
  deleteServer(serverId: string, input: DeleteServerInput): Promise<DeleteOnlineServerResponse>;
  joinServer(input: JoinServerInput): Promise<OnlineServerResponse>;
  joinPublicServer(serverId: string): Promise<OnlineServerResponse>;
  leaveServer(serverId: string): Promise<LeaveOnlineServerResponse>;
  createServerInvite(serverId: string, input: CreateServerInviteInput): Promise<OnlineServerInviteResponse>;
  updateServerInvite(serverId: string, inviteId: string, input: { active?: boolean }): Promise<OnlineServerInviteResponse>;
  deleteServerInvite(serverId: string, inviteId: string): Promise<{ ok: true; server: unknown }>;
  banServerMember(serverId: string, input: BanServerMemberInput): Promise<OnlineServerModerationResponse>;
  unbanServerMember(serverId: string, userId: string): Promise<OnlineServerModerationResponse>;
  timeoutServerMember(serverId: string, input: TimeoutServerMemberInput): Promise<OnlineServerModerationResponse>;
  removeServerMemberTimeout(serverId: string, userId: string): Promise<OnlineServerModerationResponse>;
  listServerMessages(serverId: string, channelName: string, after?: string): Promise<ServerMessagesResponse>;
  sendServerMessage(serverId: string, input: SendServerMessageInput): Promise<ServerMessageResponse>;
  deleteServerMessage(serverId: string, messageId: string): Promise<DeleteServerMessageResponse>;
  addStarsToServer(serverId: string, input: AddServerStarsInput): Promise<AddServerStarsResponse>;
  listServerVoiceStates(serverId: string): Promise<OnlineVoiceStatesResponse>;
  updateServerVoiceState(serverId: string, input: OnlineVoiceStateInput): Promise<OnlineVoiceStateResponse>;
  leaveServerVoice(serverId: string): Promise<{ ok: true }>;
  listServerVoiceSignals(serverId: string, channelName: string, after?: string): Promise<OnlineVoiceSignalsResponse>;
  sendServerVoiceSignal(serverId: string, input: OnlineVoiceSignalInput): Promise<OnlineVoiceSignalResponse>;
  publishDesktopUpdate(input: PublishDesktopUpdateInput): Promise<PublishDesktopUpdateResponse>;
  logout(): Promise<{ ok: true }>;
}

export function createApiClient(baseUrl: string, getToken?: () => string | null): TempestLightApiClient {
  const apiBase = baseUrl.replace(/\/$/, "");

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken?.();
    const headers = new Headers(options.headers);

    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const rawBody = await response.text();
    let body: unknown;

    try {
      body = rawBody ? JSON.parse(rawBody) : undefined;
    } catch {
      const preview = rawBody.trim().replace(/\s+/g, " ").slice(0, 160);
      const details = { responsePreview: preview };
      const suffix = preview ? `: ${preview}` : ".";

      throw new ApiError(
        response.ok ? `A API respondeu em formato invalido${suffix}` : `Request failed with status ${response.status}${suffix}`,
        response.status,
        details
      );
    }

    if (!response.ok) {
      const message =
        typeof body === "object" && body && "message" in body
          ? String((body as { message: unknown }).message)
          : `Request failed with status ${response.status}`;

      throw new ApiError(message, response.status, body);
    }

    return body as T;
  }

  return {
    health: () => request<HealthResponse>("/health"),
    register: (input) =>
      request<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    login: (input) =>
      request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    verifyEmail: (input) =>
      request<VerifyEmailResponse>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    resendVerification: (input) =>
      request<ResendVerificationResponse>("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    requestPasswordReset: (input) =>
      request<PasswordResetRequestResponse>("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    verifyPasswordResetCode: (input) =>
      request<PasswordResetVerifyResponse>("/auth/password-reset/verify", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    confirmPasswordReset: (input) =>
      request<PasswordResetConfirmResponse>("/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    me: () => request<AuthUser>("/auth/me"),
    updateMe: (input) =>
      request<AuthUser>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(input)
      }),
    addStarBalance: (input) =>
      request<StarBalanceResponse>("/auth/me/stars", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    changeEmail: (input) =>
      request<AuthUser>("/auth/me/email", {
        method: "PATCH",
        body: JSON.stringify(input)
      }),
    changePassword: (input) =>
      request<{ ok: true }>("/auth/me/password", {
        method: "PATCH",
        body: JSON.stringify(input)
      }),
    deleteAccount: (input) =>
      request<{ ok: true }>("/auth/me", {
        method: "DELETE",
        body: JSON.stringify(input)
      }),
    setupTwoFactor: (input) =>
      request<TwoFactorSetupResponse>("/auth/me/two-factor/setup", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    enableTwoFactor: (input) =>
      request<AuthUser>("/auth/me/two-factor/enable", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    disableTwoFactor: (input) =>
      request<AuthUser>("/auth/me/two-factor/disable", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    listDirectConversations: () => request<DirectConversationSummary[]>("/direct/conversations"),
    startDirectConversation: (input) =>
      request<DirectConversation>("/direct/conversations", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    getDirectConversation: (id) => request<DirectConversation>(`/direct/conversations/${encodeURIComponent(id)}`),
    sendDirectMessage: (id, input) =>
      request<DirectMessage>(`/direct/conversations/${encodeURIComponent(id)}/messages`, {
        method: "POST",
        body: JSON.stringify(input)
      }),
    listFriendRequests: () => request<FriendRequestsResponse>("/friends/requests"),
    requestFriendship: (input) =>
      request<FriendRequestResponse>("/friends/requests", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    acceptFriendship: (id) =>
      request<FriendRequestActionResponse>(`/friends/requests/${encodeURIComponent(id)}/accept`, {
        method: "POST"
      }),
    declineFriendship: (id) =>
      request<FriendRequestActionResponse>(`/friends/requests/${encodeURIComponent(id)}/decline`, {
        method: "POST"
      }),
    cancelFriendship: (id) =>
      request<FriendRequestActionResponse>(`/friends/requests/${encodeURIComponent(id)}/cancel`, {
        method: "POST"
      }),
    listServers: () => request<OnlineServerBundle>("/servers"),
    listDiscoverableServers: () => request<OnlineDiscoverServersResponse>("/servers/discover"),
    getServer: (serverId) => request<OnlineServerResponse>(`/servers/${encodeURIComponent(serverId)}`),
    createServer: (input) =>
      request<OnlineServerResponse>("/servers", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    updateServerState: (serverId, input) =>
      request<OnlineServerResponse>(`/servers/${encodeURIComponent(serverId)}/state`, {
        method: "PATCH",
        body: JSON.stringify(input)
      }),
    deleteServer: (serverId, input) =>
      request<DeleteOnlineServerResponse>(`/servers/${encodeURIComponent(serverId)}`, {
        method: "DELETE",
        body: JSON.stringify(input)
      }),
    joinServer: (input) =>
      request<OnlineServerResponse>("/servers/join", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    joinPublicServer: (serverId) =>
      request<OnlineServerResponse>(`/servers/${encodeURIComponent(serverId)}/join`, {
        method: "POST"
      }),
    leaveServer: (serverId) =>
      request<LeaveOnlineServerResponse>(`/servers/${encodeURIComponent(serverId)}/members/me`, {
        method: "DELETE"
      }),
    createServerInvite: (serverId, input) =>
      request<OnlineServerInviteResponse>(`/servers/${encodeURIComponent(serverId)}/invites`, {
        method: "POST",
        body: JSON.stringify(input)
      }),
    updateServerInvite: (serverId, inviteId, input) =>
      request<OnlineServerInviteResponse>(`/servers/${encodeURIComponent(serverId)}/invites/${encodeURIComponent(inviteId)}`, {
        method: "PATCH",
        body: JSON.stringify(input)
      }),
    deleteServerInvite: (serverId, inviteId) =>
      request<{ ok: true; server: unknown }>(`/servers/${encodeURIComponent(serverId)}/invites/${encodeURIComponent(inviteId)}`, {
        method: "DELETE"
      }),
    banServerMember: (serverId, input) =>
      request<OnlineServerModerationResponse>(`/servers/${encodeURIComponent(serverId)}/bans`, {
        method: "POST",
        body: JSON.stringify(input)
      }),
    unbanServerMember: (serverId, userId) =>
      request<OnlineServerModerationResponse>(`/servers/${encodeURIComponent(serverId)}/bans/${encodeURIComponent(userId)}`, {
        method: "DELETE"
      }),
    timeoutServerMember: (serverId, input) =>
      request<OnlineServerModerationResponse>(`/servers/${encodeURIComponent(serverId)}/timeouts`, {
        method: "POST",
        body: JSON.stringify(input)
      }),
    removeServerMemberTimeout: (serverId, userId) =>
      request<OnlineServerModerationResponse>(`/servers/${encodeURIComponent(serverId)}/timeouts/${encodeURIComponent(userId)}`, {
        method: "DELETE"
      }),
    listServerMessages: (serverId, channelName, after) => {
      const query = new URLSearchParams({ channelName });
      if (after) {
        query.set("after", after);
      }
      return request<ServerMessagesResponse>(`/servers/${encodeURIComponent(serverId)}/messages?${query.toString()}`);
    },
    sendServerMessage: (serverId, input) =>
      request<ServerMessageResponse>(`/servers/${encodeURIComponent(serverId)}/messages`, {
        method: "POST",
        body: JSON.stringify(input)
      }),
    deleteServerMessage: (serverId, messageId) =>
      request<DeleteServerMessageResponse>(`/servers/${encodeURIComponent(serverId)}/messages/${encodeURIComponent(messageId)}`, {
        method: "DELETE"
      }),
    addStarsToServer: (serverId, input) =>
      request<AddServerStarsResponse>(`/servers/${encodeURIComponent(serverId)}/stars`, {
        method: "POST",
        body: JSON.stringify(input)
      }),
    listServerVoiceStates: (serverId) => request<OnlineVoiceStatesResponse>(`/servers/${encodeURIComponent(serverId)}/voice`),
    updateServerVoiceState: (serverId, input) =>
      request<OnlineVoiceStateResponse>(`/servers/${encodeURIComponent(serverId)}/voice`, {
        method: "POST",
        body: JSON.stringify(input)
      }),
    leaveServerVoice: (serverId) =>
      request<{ ok: true }>(`/servers/${encodeURIComponent(serverId)}/voice`, {
        method: "DELETE"
      }),
    listServerVoiceSignals: (serverId, channelName, after) => {
      const query = new URLSearchParams({ channelName });
      if (after) {
        query.set("after", after);
      }
      return request<OnlineVoiceSignalsResponse>(`/servers/${encodeURIComponent(serverId)}/voice/signals?${query.toString()}`);
    },
    sendServerVoiceSignal: (serverId, input) =>
      request<OnlineVoiceSignalResponse>(`/servers/${encodeURIComponent(serverId)}/voice/signals`, {
        method: "POST",
        body: JSON.stringify(input)
      }),
    publishDesktopUpdate: (input) =>
      request<PublishDesktopUpdateResponse>("/desktop/updates/publish", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" })
  };
}
