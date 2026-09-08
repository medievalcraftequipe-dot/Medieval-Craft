import {
  type CSSProperties,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  AtSign,
  Bell,
  BellRing,
  BookOpen,
  Bot,
  CalendarPlus,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clipboard,
  Compass,
  Download,
  Edit3,
  FileAudio,
  FolderPlus,
  Gamepad2,
  Globe2,
  GraduationCap,
  GripVertical,
  Hash,
  Headphones,
  Heart,
  ImageIcon,
  Lock,
  LogOut,
  MessageCircle,
  MessagesSquare,
  Mic,
  MicOff,
  Monitor,
  Moon,
  MoreHorizontal,
  Paperclip,
  PhoneCall,
  PhoneOff,
  Play,
  Plus,
  Radio,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  UserRoundCog,
  Users,
  VolumeX,
  Volume2,
  X
} from "lucide-react";
import { createApiClient, ApiError } from "@tempest-light/api-client";
import type {
  AuthResponse,
  AuthUser,
  DirectConversation,
  DirectConversationSummary,
  DirectMessage,
  DeleteServerInput,
  FriendRequestItem,
  OnlineServerMessage,
  OnlineVoiceSignal,
  OnlineVoiceState,
  PresenceStatus,
  PublishDesktopUpdateInput,
  PublishDesktopUpdateResponse,
  RegisterResponse,
  TimeoutServerMemberInput,
  UpdateProfileInput
} from "@tempest-light/types";
import { Button } from "@tempest-light/ui";

const BRAND_LOGO_URL = new URL("./assets/tempest-night-logo.png", import.meta.url).href;
const brandCoverStyle = { "--brand-cover": `url(${BRAND_LOGO_URL})` } as CSSProperties;
const API_URL = import.meta.env.VITE_API_URL || "";
const API_CONFIGURED = Boolean(API_URL && !/seu-dominio/i.test(API_URL));
const PUBLIC_WEB_URL = String(import.meta.env.VITE_PUBLIC_WEB_URL || API_URL || "https://tempest-light-api.shardweb.app").replace(/\/+$/, "");
const TOKEN_KEY = "tempestLight.accessToken";
const WORKSPACE_STATE_PREFIX = "tempestLight.workspace";
const MENTION_NOTIFICATIONS_KEY = "tempestLight.mentionNotifications";
const LOCAL_PROFILE_IMAGES_PREFIX = "tempestLight.localProfileImages";
const LOCAL_DEVELOPER_TOOLS_ENABLED = import.meta.env.VITE_ENABLE_LOCAL_DEVELOPER_TOOLS === "true";
const termsOfUseSections = [
  {
    title: "1. Conta e acesso",
    body:
      "Ao criar uma conta no Tempest Light, voce confirma que as informacoes informadas sao suas e que a senha deve ser mantida em sigilo. Cada pessoa e responsavel pelo uso da propria conta, comunidades, mensagens, bots e configuracoes."
  },
  {
    title: "2. Comunidades e conteudo",
    body:
      "O usuario e o dono de cada servidor sao responsaveis por mensagens, canais, cargos, convites, imagens, bots, atividades e qualquer conteudo publicado. Conteudos ilegais, abusivos, fraudulentos, invasivos, discriminatorios ou que violem direitos de terceiros podem ser removidos e a conta pode ser limitada ou banida."
  },
  {
    title: "3. Moderacao e registros",
    body:
      "Servidores podem ter moderacao, AutoMod, banimentos, expulsao, permissoes, logs de auditoria e outros controles administrativos. Essas informacoes podem ser exibidas aos donos, administradores e moderadores conforme as permissoes do servidor."
  },
  {
    title: "4. Estrelas e recursos pagos",
    body:
      "Estrelas e beneficios de servidor podem ser recursos pagos, temporarios ou promocionais. Beneficios como banners, guias, links personalizados, estilos visuais e outros desbloqueios podem depender do nivel de Estrelas ativo e podem expirar quando o periodo pago terminar."
  },
  {
    title: "5. Bots e integracoes",
    body:
      "Ao conectar bots, tokens, Steam ou outros servicos externos, o usuario declara que tem permissao para usar esses recursos. O funcionamento pode depender das regras, disponibilidade e limites das plataformas externas conectadas."
  },
  {
    title: "6. Dados e privacidade",
    body:
      "Dados de conta, comunidades, mensagens, logs, compras e integracoes podem ser tratados pela API online para login, seguranca, sincronizacao, suporte, moderacao e funcionamento do programa."
  },
  {
    title: "7. Atualizacoes e mudancas",
    body:
      "O Tempest Light pode receber atualizacoes para corrigir erros, adicionar recursos, ajustar regras e melhorar seguranca. Estes Termos tambem podem ser atualizados, e o uso continuo do programa apos mudancas indica aceite da versao mais recente."
  },
  {
    title: "8. Rascunho juridico",
    body:
      "Este texto e um rascunho inicial para o projeto. Antes de publicar oficialmente, revise com um profissional juridico para adequar cobrancas, suporte, privacidade, idade minima, reembolso e regras da sua operacao."
  }
];

type AuthMode = "login" | "register";
type ThemeMode = "system" | "dark" | "light";
type ChannelKind = "text" | "voice";
type ShellView = "direct" | "server" | "discover";
type ServerPurpose = "friends" | "community";
type ServerTemplateId = "blank" | "games" | "friends" | "study" | "school";
type RoleStyle = "solid" | "gradient" | "holographic";
type DiscordBridgeStatus = "connected" | "pending" | "error";
type BotCommandModule = "utility" | "music" | "moderation" | "fun" | "economy";
type MessageMentionKind = "member" | "bot" | "role";
type InAppUpdateState = "available" | "checking" | "installing" | "restarting" | "current" | "error";
type InviteDurationId = "24h" | "2d" | "5d" | "30d" | "1m" | "never";
type TimeoutDurationId = "2h" | "5h" | "24h" | "2d" | "1w";
type ChatComposerTarget = "server" | "direct";
type ServerAccessMode = "invite" | "request" | "discoverable";
type ScreenShareQualityId = "144p" | "360p" | "720p" | "1080p" | "2k" | "4k" | "8k";
type ScreenShareCaptureMode = "screen" | "game";

const soundboardMaxSounds = 24;
const soundboardAudioMaxBytes = 50 * 1024 * 1024;
const customEmojiMaxBytes = 2 * 1024 * 1024;
const defaultSoundEmoji = "\u{1F508}";
const soundEmojiOptions = ["\u{1F508}", "\u{1F3B5}", "\u{1F514}", "\u{26A1}", "\u{1F389}", "\u{1F525}", "\u{1F4A7}", "\u{1F4A5}"];
const serverRuleExamples = [
  "Comporte-se e mostre respeito",
  "Nada de spam ou autopromocao",
  "Nada de conteudo com restricao de idade ou obsceno",
  "Ajude a manter a seguranca de todos"
];

const inviteDurationOptions: Array<{ id: InviteDurationId; label: string }> = [
  { id: "24h", label: "24 horas" },
  { id: "2d", label: "2 dias" },
  { id: "5d", label: "5 dias" },
  { id: "30d", label: "30 dias" },
  { id: "1m", label: "1 mes" },
  { id: "never", label: "Infinito" }
];
const timeoutDurationOptions: Array<{ id: TimeoutDurationId; label: string; minutes: number }> = [
  { id: "2h", label: "2 horas", minutes: 120 },
  { id: "5h", label: "5 horas", minutes: 300 },
  { id: "24h", label: "24 horas", minutes: 1440 },
  { id: "2d", label: "2 dias", minutes: 2880 },
  { id: "1w", label: "1 semana", minutes: 10080 }
];
const chatAttachmentMaxBytes = 3 * 1024 * 1024 * 1024;
const chatInlineAttachmentMaxBytes = 24 * 1024 * 1024;
const chatImageMaxWidth = 1280;
const chatImageMaxHeight = 720;
const profileImageDataUrlMaxBytes = 4 * 1024 * 1024;
const youtubeHostPattern = /(^|\.)youtu\.be$|(^|\.)youtube\.com$/i;
const trustedMediaHostPattern = /(^|\.)youtu\.be$|(^|\.)youtube\.com$|(^|\.)twitch\.tv$/i;
const dangerousFileExtensionPattern = /\.(?:exe|msi|bat|cmd|ps1|scr|vbs|jar|com|pif|apk|dll|reg|lnk|iso|img|app|dmg)(?:[?#].*)?$/i;
const imageFileNamePattern = /\.(?:png|jpe?g|gif|webp|avif)$/i;
const screenShareQualities: Array<{ id: ScreenShareQualityId; label: string; width: number; height: number }> = [
  { id: "144p", label: "144p", width: 256, height: 144 },
  { id: "360p", label: "360p", width: 640, height: 360 },
  { id: "720p", label: "720p", width: 1280, height: 720 },
  { id: "1080p", label: "1080p", width: 1920, height: 1080 },
  { id: "2k", label: "2K", width: 2560, height: 1440 },
  { id: "4k", label: "4K", width: 3840, height: 2160 },
  { id: "8k", label: "8K", width: 7680, height: 4320 }
];
const voiceAudioConstraints: MediaTrackConstraints = {
  echoCancellation: { ideal: true },
  noiseSuppression: { ideal: true },
  autoGainControl: { ideal: true },
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 },
  sampleSize: { ideal: 16 }
};
const defaultVoiceIceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" }
];

function getVoiceIceServers() {
  const turnUrls = String(import.meta.env.VITE_TEMPEST_LIGHT_TURN_URLS || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  const username = String(import.meta.env.VITE_TEMPEST_LIGHT_TURN_USERNAME || "").trim();
  const credential = String(import.meta.env.VITE_TEMPEST_LIGHT_TURN_CREDENTIAL || "").trim();
  const turnServers = turnUrls.map((url): RTCIceServer =>
    username && credential ? { urls: url, username, credential } : { urls: url }
  );

  return [...defaultVoiceIceServers, ...turnServers];
}
const autoPresenceIdleAfterMs = 5 * 60_000;
const autoPresenceCheckIntervalMs = 15_000;
const autoPresenceHeartbeatMs = 45_000;
const autoPresenceActivityEvents = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "focus"] as const;

function isManualPresenceMode(presence: PresenceStatus) {
  return presence === "DND" || presence === "INVISIBLE";
}
type CreateServerStep = "start" | "purpose" | "personalize" | "discord";
type EditablePresenceStatus = Exclude<PresenceStatus, "OFFLINE">;
type ServerSettingsView =
  | "profile"
  | "tag"
  | "engagement"
  | "emoji"
  | "stickers"
  | "soundboard"
  | "members"
  | "roles"
  | "invites"
  | "access"
  | "integrations"
  | "appDirectory"
  | "security"
  | "boosts"
  | "bots"
  | "audit"
  | "bans"
  | "automod"
  | "onboarding"
  | "analytics"
  | "community";
type RoleEditorTab = "display" | "permissions" | "links" | "members";
type CommunityChannelKind = "rules" | "updates" | "safety";
type AuditAction =
  | "server_created"
  | "server_updated"
  | "channel_created"
  | "category_created"
  | "invite_created"
  | "privacy_updated"
  | "notifications_updated"
  | "role_created"
  | "role_updated"
  | "role_assigned"
  | "invite_disabled"
  | "tag_updated"
  | "engagement_updated"
  | "security_updated"
  | "automod_updated"
  | "automod_blocked"
  | "expressions_updated"
  | "access_updated"
  | "apps_updated"
  | "analytics_updated"
  | "boost_added"
  | "boost_perk_updated"
  | "community_enabled"
  | "community_disabled"
  | "bot_added"
  | "bot_updated"
  | "member_kicked"
  | "member_banned"
  | "member_unbanned"
  | "member_timed_out"
  | "member_timeout_removed";
type PermissionKey =
  | "administrator"
  | "manage_server"
  | "manage_roles"
  | "manage_channels"
  | "create_invite"
  | "change_nickname"
  | "manage_nicknames"
  | "kick_members"
  | "ban_members"
  | "moderate_members"
  | "send_messages"
  | "send_messages_in_threads"
  | "create_public_threads"
  | "create_private_threads"
  | "embed_links"
  | "attach_files"
  | "add_reactions"
  | "use_external_emojis"
  | "use_external_stickers"
  | "mention_everyone"
  | "manage_messages"
  | "pin_messages"
  | "manage_threads"
  | "read_message_history"
  | "send_tts_messages"
  | "send_voice_messages"
  | "create_polls"
  | "connect"
  | "speak"
  | "video"
  | "use_soundboard"
  | "use_external_sounds"
  | "use_voice_activation"
  | "priority_speaker"
  | "mute_members"
  | "deafen_members"
  | "move_members"
  | "set_voice_channel_status"
  | "use_application_commands"
  | "use_activities"
  | "use_external_apps"
  | "create_events"
  | "manage_events";

interface ChannelDefinition {
  name: string;
  type: ChannelKind;
  isPrivate?: boolean;
  special?: CommunityChannelKind;
  isNew?: boolean;
  userLimit?: number | null;
}

interface ChannelGroupDefinition {
  name: string;
  channels: ChannelDefinition[];
}

interface ServerDefinition {
  id: string;
  name: string;
  initials: string;
  iconUrl: string | null;
  ownerId: string;
  purpose: ServerPurpose;
  templateId?: ServerTemplateId;
  serverTag: string | null;
  description: string;
  bannerColor: string;
  memberListVisible: boolean;
  isDiscoverable: boolean;
  notificationsEnabled: boolean;
  communityEnabled: boolean;
  rulesChannelName: string | null;
  updatesChannelName: string | null;
  safetyChannelName: string | null;
  language: string;
  explicitMediaFilter: boolean;
  emailVerificationRequired: boolean;
  riskyPermissionsDisabled: boolean;
  boostProgressVisible: boolean;
  boostMessageEnabled: boolean;
  boostMessageChannelName: string | null;
  engagement: ServerEngagementSettings;
  expressions: ServerExpressionSettings;
  access: ServerAccessSettings;
  apps: ServerAppsSettings;
  analytics: ServerAnalyticsSettings;
  invites: ServerInvite[];
  bans: ServerBan[];
  timeouts: ServerTimeout[];
  automod: ServerAutomodSettings;
  security: ServerSecuritySettings;
  boosts: ServerBoost[];
  boostPerks: ServerBoostPerks;
  bots: ServerBotIntegration[];
  auditLogs: ServerAuditLog[];
  categories: ChannelGroupDefinition[];
  roles: ServerRole[];
  members: ServerMemberDefinition[];
}

interface ServerRole {
  id: string;
  name: string;
  color: string;
  style?: RoleStyle;
  iconUrl?: string | null;
  permissions: Record<PermissionKey, boolean>;
  separateMembers?: boolean;
  isDefault?: boolean;
}

interface ServerMemberDefinition {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  presence: PresenceStatus;
  accountCreatedAt?: string | null;
  joinedAt: string;
  roleIds: string[];
  timeoutUntil?: string | null;
  isBot?: boolean;
}

interface ServerBotIntegration {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  tokenPreview: string;
  discordApplicationId: string | null;
  bridgeStatus: DiscordBridgeStatus;
  runtimeEnabled: boolean;
  prefix: string;
  commandName: string;
  replyText: string;
  commandChannelNames: string[];
  commandModules: BotCommandModule[];
  addedBy: string;
  addedAt: string;
}

interface ServerAuditLog {
  id: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  target: string;
  details: string;
  createdAt: string;
}

interface ServerEngagementSettings {
  welcomeScreenEnabled: boolean;
  onboardingEnabled: boolean;
  eventHighlightsEnabled: boolean;
  weeklySummaryEnabled: boolean;
}

interface ServerExpressionSettings {
  emojiEnabled: boolean;
  externalEmojiEnabled: boolean;
  stickersEnabled: boolean;
  externalStickersEnabled: boolean;
  soundboardEnabled: boolean;
  soundEffectsEnabled: boolean;
  soundEffects: ServerSoundEffect[];
  customEmojis: ServerEmojiDefinition[];
}

interface ServerEmojiDefinition {
  id: string;
  name: string;
  imageUrl: string;
  animated: boolean;
  uploadedBy: string;
  uploadedAt: string;
}

interface ServerSoundEffect {
  id: string;
  name: string;
  emoji: string;
  fileName: string;
  audioUrl: string;
  volume: number;
  uploadedBy: string;
  uploadedByAvatarUrl: string | null;
  uploadedAt: string;
}

interface ServerAccessSettings {
  entryMode: ServerAccessMode;
  approvalRequired: boolean;
  requireVerifiedEmail: boolean;
  ageRestricted: boolean;
  rulesEnabled: boolean;
  rules: string[];
  minAccountAgeDays: number;
  hideInviteLinksFromMembers: boolean;
}

interface ServerAppsSettings {
  integrationsEnabled: boolean;
  appDirectoryEnabled: boolean;
  botReviewRequired: boolean;
  webhooksEnabled: boolean;
}

interface ServerAnalyticsSettings {
  overviewEnabled: boolean;
  serverAnalyticsEnabled: boolean;
  weeklyDigestEnabled: boolean;
}

interface ServerInvite {
  id: string;
  code: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number;
  active: boolean;
}

interface ServerBan {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  reason: string;
  bannedBy: string;
  bannedAt: string;
}

interface ServerTimeout {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  reason: string;
  timeoutBy: string;
  timeoutUntil: string;
  createdAt: string;
}

interface ServerAutomodSettings {
  blockSpam: boolean;
  blockMassMentions: boolean;
  blockInvites: boolean;
  blockLinks: boolean;
  blockedWords: string[];
  maxMentions: number;
  slowModeSeconds: number;
}

interface ServerSecuritySettings {
  raidProtection: boolean;
  require2FaForModeration: boolean;
  onlyMentionsByDefault: boolean;
  scanInvites: boolean;
}

interface ServerBoost {
  id: string;
  appliedBy: string;
  appliedByName: string;
  createdAt: string;
  expiresAt: string;
}

interface ServerBoostPerks {
  channelBannerUrl: string | null;
  animatedBannerUrl: string | null;
  inviteBackgroundUrl: string | null;
  customInviteSlug: string | null;
  serverAccentColor: string | null;
  welcomeCardUrl: string | null;
  serverBadgeText: string | null;
  starProgressPalette: string | null;
  legendaryThemeEnabled: boolean;
  serverGuideBannerUrl: string | null;
  serverGuideChannelNames: string[];
}

interface SavedWorkspaceState {
  activeView: ShellView;
  activeServerId: string | null;
  activeChannel: string;
  activeDirectId: string | null;
  servers: ServerDefinition[];
  messages: LocalMessage[];
  directContacts: DirectContact[];
  directMessages: Record<string, LocalMessage[]>;
  readServerChannelAt: Record<string, string>;
  readDirectConversationAt: Record<string, string>;
  steamActivity: SteamActivitySettings;
  activityCardsVisible: boolean;
}

interface DiscoveryServer {
  id: string;
  onlineServerId?: string;
  name: string;
  description: string;
  tags: string[];
  members: number;
  purpose: ServerPurpose;
  templateId?: ServerTemplateId;
}

interface ServerTemplate {
  id: ServerTemplateId;
  name: string;
  description: string;
  purpose: ServerPurpose;
  bannerColor: string;
  isDiscoverable: boolean;
  communityEnabled: boolean;
  rulesChannelName: string | null;
  updatesChannelName: string | null;
  safetyChannelName: string | null;
  explicitMediaFilter: boolean;
  emailVerificationRequired: boolean;
  riskyPermissionsDisabled: boolean;
  boostProgressVisible: boolean;
  categories: ChannelGroupDefinition[];
  roles: ServerRole[];
}

interface DiscordTemplatePayload {
  code?: string;
  name?: string;
  description?: string | null;
  serialized_source_guild?: DiscordSerializedGuild;
}

interface DiscordSerializedGuild {
  id?: string;
  name?: string;
  description?: string | null;
  preferred_locale?: string | null;
  verification_level?: number | null;
  explicit_content_filter?: number | null;
  premium_progress_bar_enabled?: boolean | null;
  rules_channel_id?: string | null;
  public_updates_channel_id?: string | null;
  safety_alerts_channel_id?: string | null;
  features?: string[];
  roles?: DiscordRole[];
  channels?: DiscordChannel[];
}

interface DiscordRole {
  id?: string;
  name?: string;
  color?: number;
  permissions?: string;
  managed?: boolean;
  position?: number;
}

interface DiscordChannel {
  id?: string;
  parent_id?: string | null;
  name?: string;
  type?: number;
  position?: number;
  nsfw?: boolean;
  user_limit?: number | null;
}

interface DirectContact {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  customStatus?: string | null;
  createdAt?: string | null;
  status: PresenceStatus;
  isFriend: boolean;
  blocksNonFriendMessages: boolean;
  friendRequestSent?: boolean;
}

interface ProfileCardUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  customStatus?: string | null;
  presence: PresenceStatus;
  accountCreatedAt?: string | null;
  serverJoinedAt?: string | null;
  isOwnProfile: boolean;
  isFriend?: boolean;
  canMessage?: boolean;
  mutualFriends?: number;
  mutualServers?: number;
  voiceStatus?: {
    channelName: string;
    elapsedLabel: string;
    muted: boolean;
  };
  steamActivity?: ActivityCard;
}

interface LocalMessage {
  id?: string;
  authorId?: string;
  authorUsername?: string;
  author: string;
  authorAvatarUrl?: string | null;
  authorIsBot?: boolean;
  time: string;
  createdAt?: string;
  text: string;
  attachments?: ChatAttachment[];
  serverId?: string;
  channelName?: string;
  mentions?: MessageMention[];
  mentionedUserIds?: string[];
  mentionedUsernames?: string[];
  system?: boolean;
}

interface ChatAttachment {
  id: string;
  kind: "image" | "file";
  name: string;
  mimeType: string;
  url: string;
  sizeBytes: number;
}

interface VoiceSoundEffectEvent {
  playbackId: string;
  effectId: string;
  name: string;
  emoji: string;
  volume: number;
  triggeredAt: string;
}

interface MessageMention {
  kind: MessageMentionKind;
  id: string;
  name: string;
  username?: string;
  label: string;
}

interface MentionNotification {
  id: string;
  recipientUserId: string;
  recipientUsername: string;
  serverId: string;
  serverName: string;
  channelName: string;
  authorId: string;
  authorUsername: string;
  authorName: string;
  messageText: string;
  mentionLabel: string;
  createdAt: string;
  read: boolean;
}

interface SteamActivitySettings {
  linked: boolean;
  steamName: string;
  currentGame: string;
  gameImageUrl: string | null;
  startedAt: string | null;
}

interface ActivityCard {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  gameName: string;
  imageUrl: string | null;
  startedAt: string;
}

const defaultServerCategories: ChannelGroupDefinition[] = [
  {
    name: "CANAIS DE TEXTO",
    channels: [{ name: "geral", type: "text" }]
  },
  {
    name: "CANAIS DE VOZ",
    channels: [{ name: "Geral", type: "voice" }]
  }
];

const roleColors = ["#99aab5", "#22c8a6", "#3bd56d", "#31a9e8", "#9b59b6", "#e91e63", "#f1c40f", "#e67e22", "#e74c3c", "#607d8b"];

function normalizeRoleStyle(style: unknown): RoleStyle {
  return style === "gradient" || style === "holographic" ? style : "solid";
}

const bannerColors = ["#30343a", "#d83a73", "#f05243", "#f28c28", "#f4d44d", "#9b59b6", "#2ca8e0", "#65d8cf", "#5b8f1d", "#4b5563"];
const defaultStarProgressGradient = "linear-gradient(90deg, var(--accent), var(--amber))";
const starProgressPalettes = [
  { id: "default", label: "Padrao", gradient: defaultStarProgressGradient },
  { id: "aurora", label: "Aurora", gradient: "linear-gradient(90deg, #32d3aa, #8fd36a, #f2ae49)" },
  { id: "sunset", label: "Por do sol", gradient: "linear-gradient(90deg, #ff5f6d, #ffc371)" },
  { id: "ocean", label: "Oceano", gradient: "linear-gradient(90deg, #20c6b7, #2f80ed, #7a5cff)" },
  { id: "amethyst", label: "Ametista", gradient: "linear-gradient(90deg, #8b5cf6, #ec4899, #f59e0b)" }
] as const;
const defaultBotCommandModules: BotCommandModule[] = ["utility", "music", "moderation", "fun", "economy"];
const botCommandModuleLabels: Record<BotCommandModule, string> = {
  utility: "Utilidades",
  music: "Musica",
  moderation: "Moderacao",
  fun: "Diversao",
  economy: "Economia"
};

function getStarProgressGradient(paletteId?: string | null) {
  return starProgressPalettes.find((palette) => palette.id === paletteId)?.gradient ?? defaultStarProgressGradient;
}

const auditActionLabels: Record<AuditAction, string> = {
  server_created: "Servidor criado",
  server_updated: "Servidor atualizado",
  channel_created: "Canal criado",
  category_created: "Categoria criada",
  invite_created: "Convite criado",
  privacy_updated: "Privacidade alterada",
  notifications_updated: "Notificacoes alteradas",
  role_created: "Cargo criado",
  role_updated: "Cargo atualizado",
  role_assigned: "Cargo atribuido",
  invite_disabled: "Convite desativado",
  tag_updated: "Tag atualizada",
  engagement_updated: "Engajamento atualizado",
  security_updated: "Seguranca atualizada",
  automod_updated: "AutoMod atualizado",
  automod_blocked: "AutoMod bloqueou mensagem",
  expressions_updated: "Expressoes atualizadas",
  access_updated: "Acesso atualizado",
  apps_updated: "Apps atualizados",
  analytics_updated: "Analises atualizadas",
  boost_added: "Estrela adicionada",
  boost_perk_updated: "Vantagem de estrela atualizada",
  community_enabled: "Comunidade habilitada",
  community_disabled: "Comunidade desabilitada",
  bot_added: "Bot adicionado",
  bot_updated: "Bot atualizado",
  member_kicked: "Membro expulso",
  member_banned: "Membro banido",
  member_unbanned: "Membro desbanido",
  member_timed_out: "Castigo aplicado",
  member_timeout_removed: "Castigo removido"
};

const communityRiskyPermissions: PermissionKey[] = [
  "administrator",
  "manage_server",
  "manage_roles",
  "manage_channels",
  "manage_messages",
  "manage_events",
  "kick_members",
  "ban_members",
  "mention_everyone",
  "create_events"
];

const permissionSections: Array<{
  title: string;
  permissions: Array<{ key: PermissionKey; label: string; description: string }>;
}> = [
  {
    title: "Permissoes da assinatura",
    permissions: [
      { key: "create_invite", label: "Criar convite", description: "Permite que os membros convidem pessoas novas para este servidor." },
      { key: "change_nickname", label: "Alterar apelido", description: "Permite que membros mudem seus proprios apelidos neste servidor." },
      { key: "manage_nicknames", label: "Gerenciar apelidos", description: "Permite que membros mudem os apelidos de outros membros." },
      {
        key: "kick_members",
        label: "Expulsar, aprovar e rejeitar membros",
        description: "Permite remover membros do servidor e controlar aprovacoes de entrada."
      },
      { key: "ban_members", label: "Banir membros", description: "Permite banir permanentemente membros e apagar historico recente." },
      {
        key: "moderate_members",
        label: "Membros de castigo",
        description: "Impede temporariamente que um membro envie mensagens, reaja ou fale em canais."
      }
    ]
  },
  {
    title: "Permissoes administrativas",
    permissions: [
      { key: "administrator", label: "Administrador", description: "Concede todas as permissoes e ignora restricoes de canal." },
      { key: "manage_server", label: "Gerenciar servidor", description: "Permite editar perfil, privacidade, notificacoes e configuracoes do servidor." },
      { key: "manage_roles", label: "Gerenciar cargos", description: "Permite criar, editar, ordenar e atribuir cargos." },
      { key: "manage_channels", label: "Gerenciar canais", description: "Permite criar categorias, canais de texto, voz e alterar configuracoes." }
    ]
  },
  {
    title: "Permissoes de canal de texto",
    permissions: [
      { key: "send_messages", label: "Enviar mensagens e criar postagens", description: "Permite enviar mensagens em canais de texto e criar postagens." },
      { key: "send_messages_in_threads", label: "Enviar mensagens em topicos e postagens", description: "Permite responder em topicos e postagens." },
      { key: "create_public_threads", label: "Criar topicos publicos", description: "Permite criar topicos que todos podem visualizar." },
      { key: "create_private_threads", label: "Criar topicos privados", description: "Permite criar topicos controlados por convite." },
      { key: "embed_links", label: "Inserir links", description: "Mostra conteudo integrado quando um membro compartilha links." },
      { key: "attach_files", label: "Anexar arquivos", description: "Permite enviar arquivos ou midia em canais de texto." },
      { key: "add_reactions", label: "Adicionar reacoes", description: "Permite adicionar novas reacoes de emoji a mensagens." },
      { key: "use_external_emojis", label: "Usar emojis externos", description: "Permite usar emojis de outros servidores." },
      { key: "use_external_stickers", label: "Usar figurinhas externas", description: "Permite usar figurinhas de outros servidores." },
      {
        key: "mention_everyone",
        label: "Mencionar @everyone, @here e todos os cargos",
        description: "Permite mencionar todos no servidor, membros online e cargos."
      },
      { key: "manage_messages", label: "Gerenciar mensagens", description: "Permite excluir mensagens e remover anexos de outras pessoas." },
      { key: "pin_messages", label: "Fixar mensagens", description: "Permite fixar ou desafixar qualquer mensagem." },
      { key: "manage_threads", label: "Gerenciar topicos e postagens", description: "Permite renomear, excluir, fechar e ativar modo lento de topicos." },
      { key: "read_message_history", label: "Ver historico de mensagens", description: "Permite ler mensagens anteriores enviadas nos canais." },
      { key: "send_tts_messages", label: "Enviar mensagens em Texto-para-voz", description: "Permite enviar mensagens com /tts." },
      { key: "send_voice_messages", label: "Enviar mensagens de voz", description: "Permite enviar mensagens de voz." },
      { key: "create_polls", label: "Criar Enquetes", description: "Permite criar enquetes." }
    ]
  },
  {
    title: "Permissoes de canal de voz",
    permissions: [
      { key: "connect", label: "Conectar", description: "Permite que membros entrem em canais de voz e oucam outros." },
      { key: "speak", label: "Falar", description: "Permite falar em canais de voz." },
      { key: "video", label: "Video", description: "Permite compartilhar tela, video ou transmitir um jogo." },
      { key: "use_soundboard", label: "Usar efeitos sonoros", description: "Permite mandar sons do painel de efeitos do servidor." },
      { key: "use_external_sounds", label: "Usar sons externos", description: "Permite usar sons de outros servidores." },
      { key: "use_voice_activation", label: "Usar Deteccao de voz", description: "Permite falar usando deteccao de voz em vez de apertar para falar." },
      { key: "priority_speaker", label: "Voz prioritaria", description: "Permite ser ouvido com mais facilidade nos canais de voz." },
      { key: "mute_members", label: "Silenciar membros", description: "Permite silenciar outros membros em canais de voz." },
      { key: "deafen_members", label: "Ensurdecer membros", description: "Permite desativar o audio de outros membros em canais de voz." },
      { key: "move_members", label: "Mover membros", description: "Permite mover membros entre canais de voz." },
      { key: "set_voice_channel_status", label: "Definir status do canal de voz", description: "Permite criar e editar o status do canal de voz." }
    ]
  },
  {
    title: "Permissoes de Aplicativos",
    permissions: [
      { key: "use_application_commands", label: "Usar comandos de aplicativo", description: "Permite comandos de barra e menu contextual." },
      { key: "use_activities", label: "Usar atividades", description: "Permite utilizar Atividades." },
      { key: "use_external_apps", label: "Utilize Aplicativos Externos", description: "Permite que aplicativos adicionados na conta postem mensagens." }
    ]
  },
  {
    title: "Permissoes de eventos",
    permissions: [
      { key: "create_events", label: "Criar eventos", description: "Permite criar eventos." },
      { key: "manage_events", label: "Gerenciar eventos", description: "Permite editar e cancelar eventos." }
    ]
  }
];

const defaultEveryonePermissions = permissionSections
  .flatMap((section) => section.permissions)
  .reduce(
    (permissions, permission) => ({
      ...permissions,
      [permission.key]: [
        "create_invite",
        "change_nickname",
        "send_messages",
        "send_messages_in_threads",
        "create_public_threads",
        "embed_links",
        "attach_files",
        "add_reactions",
        "use_external_emojis",
        "use_external_stickers",
        "read_message_history",
        "send_voice_messages",
        "create_polls",
        "connect",
        "speak",
        "video",
        "use_voice_activation",
        "use_application_commands",
        "use_activities",
        "create_events"
      ].includes(permission.key)
    }),
    {} as Record<PermissionKey, boolean>
  );

const moderationPermissionKeys: PermissionKey[] = [
  "manage_channels",
  "manage_messages",
  "pin_messages",
  "manage_threads",
  "create_invite",
  "create_events",
  "manage_events",
  "kick_members",
  "moderate_members",
  "mute_members",
  "deafen_members",
  "move_members",
  "set_voice_channel_status"
];

const coordinationPermissionKeys: PermissionKey[] = [
  "manage_channels",
  "create_invite",
  "create_events",
  "manage_events",
  "pin_messages",
  "move_members",
  "set_voice_channel_status"
];

const serverTemplates: ServerTemplate[] = [
  {
    id: "blank",
    name: "Criar o meu",
    description: "Modelo basico para montar tudo do zero depois.",
    purpose: "community",
    bannerColor: "#30343a",
    isDiscoverable: false,
    communityEnabled: false,
    rulesChannelName: null,
    updatesChannelName: null,
    safetyChannelName: null,
    explicitMediaFilter: false,
    emailVerificationRequired: false,
    riskyPermissionsDisabled: false,
    boostProgressVisible: false,
    categories: defaultServerCategories,
    roles: []
  },
  {
    id: "games",
    name: "Jogos",
    description: "Comunidade pronta para partidas, grupos, clipes, eventos e voz.",
    purpose: "community",
    bannerColor: "#d83a73",
    isDiscoverable: false,
    communityEnabled: false,
    rulesChannelName: "regras",
    updatesChannelName: "anuncios",
    safetyChannelName: null,
    explicitMediaFilter: true,
    emailVerificationRequired: true,
    riskyPermissionsDisabled: true,
    boostProgressVisible: true,
    categories: [
      {
        name: "INICIO",
        channels: [textChannel("regras"), textChannel("anuncios"), textChannel("eventos")]
      },
      {
        name: "CHAT DE JOGOS",
        channels: [textChannel("geral"), textChannel("clipes"), textChannel("memes"), textChannel("screenshots"), textChannel("comandos")]
      },
      {
        name: "SQUADS",
        channels: [textChannel("procurando-grupo"), textChannel("ranked"), textChannel("torneios")]
      },
      {
        name: "CANAIS DE VOZ",
        channels: [voiceChannel("Lobby"), voiceChannel("Squad 1"), voiceChannel("Squad 2"), voiceChannel("Ranked"), voiceChannel("Stream"), voiceChannel("AFK")]
      }
    ],
    roles: [
      createTemplateRole("admin", "Admin", "#e74c3c", ["administrator"], false),
      createTemplateRole("moderador", "Moderador", "#31a9e8", moderationPermissionKeys),
      createTemplateRole("streamer", "Streamer", "#9b59b6", ["video", "use_soundboard", "use_external_sounds", "create_events"]),
      createTemplateRole("membro", "Membro", "#22c8a6", [])
    ]
  },
  {
    id: "friends",
    name: "Amigos",
    description: "Servidor leve para mensagens privadas, planos, memes e salas de voz.",
    purpose: "friends",
    bannerColor: "#2ca8e0",
    isDiscoverable: false,
    communityEnabled: false,
    rulesChannelName: null,
    updatesChannelName: null,
    safetyChannelName: null,
    explicitMediaFilter: false,
    emailVerificationRequired: false,
    riskyPermissionsDisabled: false,
    boostProgressVisible: false,
    categories: [
      {
        name: "CHAT",
        channels: [textChannel("geral"), textChannel("memes"), textChannel("fotos"), textChannel("planos")]
      },
      {
        name: "CANAIS DE VOZ",
        channels: [voiceChannel("Sala"), voiceChannel("Jogos"), voiceChannel("Musica"), voiceChannel("AFK")]
      }
    ],
    roles: [
      createTemplateRole("dono", "Dono", "#f1c40f", ["administrator"], false),
      createTemplateRole("amigos", "Amigos", "#22c8a6", ["create_invite", "video", "use_soundboard"]),
      createTemplateRole("visitante", "Visitante", "#99aab5", [])
    ]
  },
  {
    id: "study",
    name: "Grupo de estudos",
    description: "Organizado para aulas, tarefas, materiais, duvidas e grupos menores.",
    purpose: "community",
    bannerColor: "#65d8cf",
    isDiscoverable: false,
    communityEnabled: false,
    rulesChannelName: "regras",
    updatesChannelName: "avisos",
    safetyChannelName: null,
    explicitMediaFilter: true,
    emailVerificationRequired: true,
    riskyPermissionsDisabled: true,
    boostProgressVisible: false,
    categories: [
      {
        name: "INICIO",
        channels: [textChannel("regras"), textChannel("avisos"), textChannel("calendario")]
      },
      {
        name: "ESTUDOS",
        channels: [textChannel("geral"), textChannel("tarefas"), textChannel("materiais"), textChannel("duvidas")]
      },
      {
        name: "GRUPOS",
        channels: [textChannel("grupo-1"), textChannel("grupo-2"), textChannel("orientacao", true)]
      },
      {
        name: "CANAIS DE VOZ",
        channels: [voiceChannel("Sala de estudo"), voiceChannel("Grupo 1"), voiceChannel("Grupo 2"), voiceChannel("Apresentacao")]
      }
    ],
    roles: [
      createTemplateRole("professor", "Professor", "#f1c40f", ["administrator"], false),
      createTemplateRole("monitor", "Monitor", "#31a9e8", [...coordinationPermissionKeys, "moderate_members", "manage_messages"]),
      createTemplateRole("aluno", "Aluno", "#22c8a6", []),
      createTemplateRole("convidado", "Convidado", "#99aab5", [])
    ]
  },
  {
    id: "school",
    name: "Clube escolar",
    description: "Pronto para clube, diretoria, eventos, propostas e reunioes.",
    purpose: "community",
    bannerColor: "#9b59b6",
    isDiscoverable: false,
    communityEnabled: false,
    rulesChannelName: "regras",
    updatesChannelName: "avisos",
    safetyChannelName: null,
    explicitMediaFilter: true,
    emailVerificationRequired: true,
    riskyPermissionsDisabled: true,
    boostProgressVisible: false,
    categories: [
      {
        name: "INICIO",
        channels: [textChannel("regras"), textChannel("avisos"), textChannel("apresentacoes")]
      },
      {
        name: "CLUBE",
        channels: [textChannel("geral"), textChannel("encontros"), textChannel("propostas"), textChannel("midia")]
      },
      {
        name: "ORGANIZACAO",
        channels: [textChannel("diretoria", true), textChannel("eventos")]
      },
      {
        name: "CANAIS DE VOZ",
        channels: [voiceChannel("Reuniao"), voiceChannel("Planejamento"), voiceChannel("Social"), voiceChannel("Palco")]
      }
    ],
    roles: [
      createTemplateRole("coordenador", "Coordenador", "#f1c40f", ["administrator"], false),
      createTemplateRole("lider", "Lider", "#e91e63", [...coordinationPermissionKeys, "manage_messages"]),
      createTemplateRole("membro", "Membro", "#22c8a6", [])
    ]
  }
];

const initialMessages: LocalMessage[] = [];

const initialDirectContacts: DirectContact[] = [];

const initialDirectMessages: Record<string, LocalMessage[]> = {};

const defaultSteamActivitySettings: SteamActivitySettings = {
  linked: false,
  steamName: "",
  currentGame: "",
  gameImageUrl: null,
  startedAt: null
};

function useVoiceActivity(active: boolean, muted: boolean, providedStream?: MediaStream | null) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!active || muted || !navigator.mediaDevices?.getUserMedia) {
      setSpeaking(false);
      return;
    }

    let stopped = false;
    let animationFrame = 0;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let ownsStream = false;

    async function startVoiceDetection() {
      try {
        if (providedStream) {
          stream = providedStream;
        } else {
          ownsStream = true;
          stream = await navigator.mediaDevices.getUserMedia({
            audio: voiceAudioConstraints,
            video: false
          });
        }

        if (stopped) {
          if (ownsStream) {
            stream.getTracks().forEach((track) => track.stop());
          }
          return;
        }

        const AudioContextConstructor =
          window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextConstructor) {
          setSpeaking(false);
          return;
        }

        audioContext = new AudioContextConstructor();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.35;
        source.connect(analyser);

        const samples = new Uint8Array(analyser.fftSize);
        let lastSpeaking = false;

        const tick = () => {
          if (stopped) {
            return;
          }

          analyser.getByteTimeDomainData(samples);
          let total = 0;
          samples.forEach((sample) => {
            const centered = (sample - 128) / 128;
            total += centered * centered;
          });

          const rms = Math.sqrt(total / samples.length);
          const nextSpeaking = rms > 0.022;
          if (nextSpeaking !== lastSpeaking) {
            lastSpeaking = nextSpeaking;
            setSpeaking(nextSpeaking);
          }

          animationFrame = window.requestAnimationFrame(tick);
        };

        tick();
      } catch {
        if (!stopped) {
          setSpeaking(false);
        }
      }
    }

    void startVoiceDetection();

    return () => {
      stopped = true;
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      if (ownsStream) {
        stream?.getTracks().forEach((track) => track.stop());
      }
      void audioContext?.close();
      setSpeaking(false);
    };
  }, [active, muted, providedStream]);

  return speaking;
}

function serializeSessionDescription(description: RTCSessionDescriptionInit): Record<string, unknown> {
  return {
    type: description.type,
    sdp: description.sdp ?? ""
  };
}

function parseSessionDescription(payload: Record<string, unknown>, expectedType: "offer" | "answer"): RTCSessionDescriptionInit | null {
  if (payload.type !== expectedType || typeof payload.sdp !== "string") {
    return null;
  }

  return {
    type: expectedType,
    sdp: payload.sdp
  };
}

function serializeIceCandidate(candidate: RTCIceCandidate): Record<string, unknown> {
  const payload = candidate.toJSON();
  return {
    candidate: payload.candidate,
    sdpMid: payload.sdpMid ?? null,
    sdpMLineIndex: payload.sdpMLineIndex ?? null,
    usernameFragment: payload.usernameFragment
  };
}

function parseIceCandidate(payload: Record<string, unknown>): RTCIceCandidateInit | null {
  if (typeof payload.candidate !== "string") {
    return null;
  }

  return {
    candidate: payload.candidate,
    sdpMid: typeof payload.sdpMid === "string" ? payload.sdpMid : null,
    sdpMLineIndex: typeof payload.sdpMLineIndex === "number" ? payload.sdpMLineIndex : null,
    usernameFragment: typeof payload.usernameFragment === "string" ? payload.usernameFragment : undefined
  };
}

function useOnlineVoiceCall({
  active,
  api,
  serverId,
  channelName,
  currentUserId,
  participants,
  muted
}: {
  active: boolean;
  api: ReturnType<typeof createApiClient> | null | undefined;
  serverId: string | null | undefined;
  channelName: string | null;
  currentUserId: string;
  participants: OnlineVoiceState[];
  muted: boolean;
}) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const offerStartedRef = useRef<Set<string>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const signalCursorRef = useRef<string | null>(null);
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const reconnectTimersRef = useRef<Map<string, number>>(new Map());
  const connectionRetriesRef = useRef<Map<string, number>>(new Map());
  const activeRef = useRef(active);
  const participantsRef = useRef(participants);
  const channelNameRef = useRef(channelName);

  useEffect(() => {
    activeRef.current = active;
    participantsRef.current = participants;
    channelNameRef.current = channelName;
  }, [active, participants, channelName]);

  function clearReconnectTimer(remoteUserId: string) {
    const timer = reconnectTimersRef.current.get(remoteUserId);
    if (timer) {
      window.clearTimeout(timer);
    }
    reconnectTimersRef.current.delete(remoteUserId);
  }

  function remoteParticipantIsActive(remoteUserId: string) {
    return (
      activeRef.current &&
      Boolean(channelNameRef.current) &&
      participantsRef.current.some((participant) => participant.userId === remoteUserId && participant.channelName === channelNameRef.current)
    );
  }

  function queueIceCandidate(remoteUserId: string, candidate: RTCIceCandidateInit) {
    const candidates = pendingIceCandidatesRef.current.get(remoteUserId) ?? [];
    candidates.push(candidate);
    pendingIceCandidatesRef.current.set(remoteUserId, candidates.slice(-50));
  }

  async function flushIceCandidates(remoteUserId: string, peer: RTCPeerConnection) {
    if (!peer.remoteDescription) {
      return;
    }

    const candidates = pendingIceCandidatesRef.current.get(remoteUserId);
    if (!candidates?.length) {
      return;
    }

    pendingIceCandidatesRef.current.delete(remoteUserId);
    for (const candidate of candidates) {
      await peer.addIceCandidate(candidate).catch(() => undefined);
    }
  }

  function closePeer(remoteUserId: string) {
    clearReconnectTimer(remoteUserId);
    const peer = peersRef.current.get(remoteUserId);
    if (peer) {
      peer.close();
    }
    peersRef.current.delete(remoteUserId);
    offerStartedRef.current.delete(remoteUserId);
    pendingIceCandidatesRef.current.delete(remoteUserId);
    setRemoteStreams((current) => {
      const { [remoteUserId]: _removed, ...next } = current;
      return next;
    });
  }

  function closeAllPeers() {
    reconnectTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    reconnectTimersRef.current.clear();
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    offerStartedRef.current.clear();
    pendingIceCandidatesRef.current.clear();
    connectionRetriesRef.current.clear();
    signalCursorRef.current = null;
    setRemoteStreams({});
  }

  function sendVoiceSignal(toUserId: string, type: "offer" | "answer" | "candidate", payload: Record<string, unknown>) {
    if (!api || !serverId || !channelName) {
      return;
    }

    void api.sendServerVoiceSignal(serverId, {
      channelName,
      toUserId,
      type,
      payload
    });
  }

  function ensurePeer(remoteUserId: string) {
    const existingPeer = peersRef.current.get(remoteUserId);
    if (existingPeer) {
      return existingPeer;
    }

    const peer = new RTCPeerConnection({
      iceCandidatePoolSize: 10,
      iceServers: getVoiceIceServers()
    });

    [localStreamRef.current, screenStreamRef.current].forEach((stream) => {
      stream?.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });
    });

    peer.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        sendVoiceSignal(remoteUserId, "candidate", serializeIceCandidate(event.candidate));
      }
    });

    peer.addEventListener("track", (event) => {
      const [stream] = event.streams;
      if (!stream) {
        return;
      }

      connectionRetriesRef.current.delete(remoteUserId);
      clearReconnectTimer(remoteUserId);
      setRemoteStreams((current) => ({ ...current, [remoteUserId]: stream }));
    });

    peer.addEventListener("connectionstatechange", () => {
      if (peer.connectionState === "connected") {
        connectionRetriesRef.current.delete(remoteUserId);
        clearReconnectTimer(remoteUserId);
        return;
      }

      if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
        scheduleReconnect(remoteUserId);
        return;
      }

      if (peer.connectionState === "closed") {
        closePeer(remoteUserId);
      }
    });

    peersRef.current.set(remoteUserId, peer);
    return peer;
  }

  async function startOffer(remoteUserId: string) {
    if (offerStartedRef.current.has(remoteUserId)) {
      return;
    }

    offerStartedRef.current.add(remoteUserId);
    const peer = ensurePeer(remoteUserId);
    if (peer.localDescription || peer.signalingState !== "stable") {
      return;
    }

    const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await peer.setLocalDescription(offer);
    sendVoiceSignal(remoteUserId, "offer", serializeSessionDescription(offer));
  }

  function scheduleReconnect(remoteUserId: string) {
    if (!remoteParticipantIsActive(remoteUserId)) {
      closePeer(remoteUserId);
      return;
    }

    if (reconnectTimersRef.current.has(remoteUserId)) {
      return;
    }

    const retryCount = connectionRetriesRef.current.get(remoteUserId) ?? 0;
    if (retryCount >= 4) {
      closePeer(remoteUserId);
      return;
    }

    const timer = window.setTimeout(() => {
      reconnectTimersRef.current.delete(remoteUserId);
      if (!remoteParticipantIsActive(remoteUserId)) {
        closePeer(remoteUserId);
        return;
      }

      closePeer(remoteUserId);
      connectionRetriesRef.current.set(remoteUserId, retryCount + 1);
      void startOffer(remoteUserId).catch(() => closePeer(remoteUserId));
    }, 900 + retryCount * 1400);
    reconnectTimersRef.current.set(remoteUserId, timer);
  }

  async function applyVoiceSignal(signal: OnlineVoiceSignal) {
    if (signal.fromUserId === currentUserId) {
      return;
    }

    const peer = ensurePeer(signal.fromUserId);
    if (signal.type === "offer") {
      const offer = parseSessionDescription(signal.payload, "offer");
      if (!offer || peer.signalingState !== "stable") {
        return;
      }

      await peer.setRemoteDescription(offer);
      await flushIceCandidates(signal.fromUserId, peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      sendVoiceSignal(signal.fromUserId, "answer", serializeSessionDescription(answer));
      return;
    }

    if (signal.type === "answer") {
      const answer = parseSessionDescription(signal.payload, "answer");
      if (!answer || peer.signalingState !== "have-local-offer") {
        return;
      }

      await peer.setRemoteDescription(answer);
      await flushIceCandidates(signal.fromUserId, peer);
      return;
    }

    const candidate = parseIceCandidate(signal.payload);
    if (candidate) {
      if (peer.remoteDescription) {
        await peer.addIceCandidate(candidate).catch(() => queueIceCandidate(signal.fromUserId, candidate));
      } else {
        queueIceCandidate(signal.fromUserId, candidate);
      }
    }
  }

  async function startScreenShare(
    qualityId: ScreenShareQualityId,
    frameRate: 30 | 60,
    displaySurface: "monitor" | "window" = "monitor",
    sourceId?: string
  ) {
    if (!active || (!navigator.mediaDevices?.getDisplayMedia && !navigator.mediaDevices?.getUserMedia)) {
      throw new Error("Transmissao de tela indisponivel neste ambiente.");
    }

    const quality = screenShareQualities.find((item) => item.id === qualityId) ?? screenShareQualities[2];
    const stream = sourceId
      ? await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: sourceId,
              minWidth: 1,
              maxWidth: quality.width,
              minHeight: 1,
              maxHeight: quality.height,
              maxFrameRate: frameRate
            }
          }
        } as unknown as MediaStreamConstraints)
      : await navigator.mediaDevices.getDisplayMedia({
          audio: false,
          video: (() => {
            const videoConstraints: MediaTrackConstraints = {
              width: { ideal: quality.width },
              height: { ideal: quality.height },
              frameRate: { ideal: frameRate, max: frameRate }
            };
            (videoConstraints as MediaTrackConstraints & { displaySurface?: string }).displaySurface = displaySurface;
            return videoConstraints;
          })()
        });

    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = stream;
    stream.getVideoTracks().forEach((track) => {
      track.addEventListener("ended", () => stopScreenShare(), { once: true });
    });
    setScreenStream(stream);
    closeAllPeers();
  }

  function stopScreenShare() {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    closeAllPeers();
  }

  useEffect(() => {
    if (!active || !navigator.mediaDevices?.getUserMedia) {
      return undefined;
    }

    let stopped = false;
    async function openMicrophone() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: voiceAudioConstraints,
          video: false
        });

        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        stream.getAudioTracks().forEach((track) => {
          track.enabled = !muted;
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch {
        setLocalStream(null);
      }
    }

    void openMicrophone();

    return () => {
      stopped = true;
      closeAllPeers();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      screenStreamRef.current = null;
      setLocalStream(null);
      setScreenStream(null);
    };
  }, [active, serverId, channelName]);

  useEffect(() => {
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, [localStream, muted]);

  useEffect(() => {
    if (!active || !api || !serverId || !channelName || !localStream) {
      return;
    }

    const remoteParticipantIds = participants
      .filter((participant) => participant.channelName === channelName && participant.userId !== currentUserId)
      .map((participant) => participant.userId);
    const remoteParticipantIdSet = new Set(remoteParticipantIds);

    Array.from(peersRef.current.keys()).forEach((remoteUserId) => {
      if (!remoteParticipantIdSet.has(remoteUserId)) {
        closePeer(remoteUserId);
      }
    });

    remoteParticipantIds.forEach((remoteUserId) => {
      ensurePeer(remoteUserId);
      if (currentUserId < remoteUserId) {
        void startOffer(remoteUserId).catch(() => closePeer(remoteUserId));
      }
    });
  }, [active, api, serverId, channelName, currentUserId, localStream, participants, screenStream]);

  useEffect(() => {
    if (!active || !api || !serverId || !channelName || !localStream) {
      return undefined;
    }

    const voiceApi = api;
    const activeServerId = serverId;
    const activeChannelName = channelName;
    let cancelled = false;
    async function pollSignals() {
      try {
        const result = await voiceApi.listServerVoiceSignals(activeServerId, activeChannelName, signalCursorRef.current ?? undefined);
        if (cancelled) {
          return;
        }

        for (const signal of result.signals) {
          signalCursorRef.current = signal.createdAt;
          await applyVoiceSignal(signal);
        }
      } catch {
        // Presence polling already shows connection state; keep the call attempt quiet on transient signaling errors.
      }
    }

    void pollSignals();
    const interval = window.setInterval(() => void pollSignals(), 1500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [active, api, serverId, channelName, currentUserId, localStream]);

  return { localStream, remoteStreams, screenStream, screenSharing: Boolean(screenStream), startScreenShare, stopScreenShare };
}

function createDefaultServerExtras() {
  return {
    serverTag: null,
    engagement: {
      welcomeScreenEnabled: true,
      onboardingEnabled: false,
      eventHighlightsEnabled: true,
      weeklySummaryEnabled: true
    },
    invites: [],
    bans: [],
    timeouts: [],
    automod: {
      blockSpam: true,
      blockMassMentions: true,
      blockInvites: false,
      blockLinks: false,
      blockedWords: [],
      maxMentions: 5,
      slowModeSeconds: 0
    },
    security: {
      raidProtection: true,
      require2FaForModeration: false,
      onlyMentionsByDefault: true,
      scanInvites: true
    },
    boostMessageEnabled: false,
    boostMessageChannelName: null,
    expressions: {
      emojiEnabled: true,
      externalEmojiEnabled: false,
      stickersEnabled: true,
      externalStickersEnabled: false,
      soundboardEnabled: true,
      soundEffectsEnabled: true,
      soundEffects: [],
      customEmojis: []
    },
    access: {
      entryMode: "invite" as ServerAccessMode,
      approvalRequired: false,
      requireVerifiedEmail: false,
      ageRestricted: false,
      rulesEnabled: false,
      rules: [],
      minAccountAgeDays: 0,
      hideInviteLinksFromMembers: false
    },
    apps: {
      integrationsEnabled: true,
      appDirectoryEnabled: true,
      botReviewRequired: true,
      webhooksEnabled: false
    },
    analytics: {
      overviewEnabled: true,
      serverAnalyticsEnabled: true,
      weeklyDigestEnabled: true
    },
    boosts: [],
    boostPerks: {
      channelBannerUrl: null,
      animatedBannerUrl: null,
      inviteBackgroundUrl: null,
      customInviteSlug: null,
      serverAccentColor: null,
      welcomeCardUrl: null,
      serverBadgeText: null,
      starProgressPalette: null,
      legendaryThemeEnabled: false,
      serverGuideBannerUrl: null,
      serverGuideChannelNames: []
    },
    bots: []
  };
}

function getInviteExpiresAt(createdAt: Date, duration: InviteDurationId) {
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
  } else if (duration === "30d") {
    expiresAt.setDate(expiresAt.getDate() + 30);
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  }

  return expiresAt.toISOString();
}

function clampInviteMaxUses(maxUses: number | null | undefined) {
  if (maxUses === null || maxUses === undefined || !Number.isFinite(maxUses)) {
    return null;
  }

  return Math.min(Math.max(Math.floor(maxUses), 1), 200);
}

function isInviteExpired(invite: ServerInvite, now = Date.now()) {
  return Boolean(invite.expiresAt && Date.parse(invite.expiresAt) <= now);
}

function isInviteUseLimitReached(invite: ServerInvite) {
  return invite.maxUses !== null && invite.uses >= invite.maxUses;
}

function isInviteUsable(invite: ServerInvite, now = Date.now()) {
  return invite.active && !isInviteExpired(invite, now) && !isInviteUseLimitReached(invite);
}

function getTimeoutDurationMinutes(duration: TimeoutDurationId) {
  return timeoutDurationOptions.find((option) => option.id === duration)?.minutes ?? 120;
}

function isFutureIsoDate(value: string | null | undefined, now = Date.now()) {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && timestamp > now;
}

function formatTimeoutUntil(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function getMemberTimeoutNotice(member: ServerMemberDefinition | null, now = Date.now()) {
  if (!member?.timeoutUntil || !isFutureIsoDate(member.timeoutUntil, now)) {
    return null;
  }

  return `Voce esta de castigo neste servidor ate ${formatTimeoutUntil(member.timeoutUntil)}.`;
}

function formatInviteExpiration(invite: ServerInvite) {
  return invite.expiresAt ? new Date(invite.expiresAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nunca expira";
}

function formatInviteUses(invite: ServerInvite) {
  return invite.maxUses === null ? `${invite.uses} usos` : `${invite.uses}/${invite.maxUses} usos`;
}

function getInviteStatusLabel(invite: ServerInvite) {
  if (isInviteExpired(invite)) {
    return "Expirado";
  }

  if (isInviteUseLimitReached(invite)) {
    return "Esgotado";
  }

  return invite.active ? "Ativo" : "Desativado";
}

function normalizeServerInvite(invite: Partial<ServerInvite>): ServerInvite {
  const createdAt = typeof invite.createdAt === "string" && invite.createdAt ? invite.createdAt : new Date().toISOString();
  const rawUses = typeof invite.uses === "number" && Number.isFinite(invite.uses) ? Math.max(0, Math.floor(invite.uses)) : 0;
  const maxUses = invite.maxUses === null ? null : clampInviteMaxUses(typeof invite.maxUses === "number" ? invite.maxUses : 25);

  return {
    id: String(invite.id || `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    code: String(invite.code || Math.random().toString(36).slice(2, 10).toUpperCase()),
    createdBy: String(invite.createdBy || "Sistema"),
    createdAt,
    expiresAt: typeof invite.expiresAt === "string" && invite.expiresAt ? invite.expiresAt : null,
    maxUses,
    uses: maxUses === null ? rawUses : Math.min(rawUses, maxUses),
    active: invite.active !== false
  };
}

function normalizeServerBan(ban: Partial<ServerBan>): ServerBan | null {
  const userId = typeof ban.userId === "string" && ban.userId.trim() ? ban.userId : "";
  const username = typeof ban.username === "string" && ban.username.trim() ? ban.username.trim().replace(/^@+/, "").slice(0, 32) : "";
  if (!userId || !username) {
    return null;
  }

  return {
    id: String(ban.id || `ban-${userId}`),
    userId,
    username,
    displayName: typeof ban.displayName === "string" && ban.displayName.trim() ? ban.displayName.trim().slice(0, 48) : username,
    reason: typeof ban.reason === "string" && ban.reason.trim() ? ban.reason.trim().slice(0, 180) : "Sem motivo informado.",
    bannedBy: typeof ban.bannedBy === "string" && ban.bannedBy.trim() ? ban.bannedBy.trim().slice(0, 48) : "Moderacao",
    bannedAt: typeof ban.bannedAt === "string" && !Number.isNaN(Date.parse(ban.bannedAt)) ? ban.bannedAt : new Date().toISOString()
  };
}

function normalizeServerTimeout(timeout: Partial<ServerTimeout>, now = Date.now()): ServerTimeout | null {
  const userId = typeof timeout.userId === "string" && timeout.userId.trim() ? timeout.userId : "";
  const username =
    typeof timeout.username === "string" && timeout.username.trim() ? timeout.username.trim().replace(/^@+/, "").slice(0, 32) : "";
  const timeoutUntil =
    typeof timeout.timeoutUntil === "string" && isFutureIsoDate(timeout.timeoutUntil, now) ? timeout.timeoutUntil : "";

  if (!userId || !username || !timeoutUntil) {
    return null;
  }

  return {
    id: String(timeout.id || `timeout-${userId}`),
    userId,
    username,
    displayName: typeof timeout.displayName === "string" && timeout.displayName.trim() ? timeout.displayName.trim().slice(0, 48) : username,
    reason: typeof timeout.reason === "string" && timeout.reason.trim() ? timeout.reason.trim().slice(0, 180) : "Sem motivo informado.",
    timeoutBy:
      typeof timeout.timeoutBy === "string" && timeout.timeoutBy.trim() ? timeout.timeoutBy.trim().slice(0, 48) : "Moderacao",
    timeoutUntil,
    createdAt: typeof timeout.createdAt === "string" && !Number.isNaN(Date.parse(timeout.createdAt)) ? timeout.createdAt : new Date().toISOString()
  };
}

function clampSoundVolume(value: unknown) {
  return Math.min(Math.max(Math.round(typeof value === "number" && Number.isFinite(value) ? value : 80), 0), 100);
}

function normalizeEmojiName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

function normalizeServerEmoji(emoji: Partial<ServerEmojiDefinition>): ServerEmojiDefinition | null {
  const imageUrl = sanitizeImageSource(emoji.imageUrl);
  const name = normalizeEmojiName(String(emoji.name || "emoji"));
  if (!imageUrl || name.length < 2) {
    return null;
  }

  return {
    id: String(emoji.id || `emoji-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    name,
    imageUrl,
    animated: Boolean(emoji.animated),
    uploadedBy: typeof emoji.uploadedBy === "string" && emoji.uploadedBy.trim() ? emoji.uploadedBy.trim().slice(0, 48) : "Sistema",
    uploadedAt: typeof emoji.uploadedAt === "string" && emoji.uploadedAt ? emoji.uploadedAt : new Date().toISOString()
  };
}

async function readCustomEmojiFile(file: File) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    throw new Error("Escolha PNG, JPG, WebP ou GIF.");
  }

  if (file.size > customEmojiMaxBytes) {
    throw new Error("Emoji grande demais. Use uma imagem ou GIF de ate 2 MB.");
  }

  return file.type === "image/gif" ? readFileAsDataUrl(file) : readImageFileAsDataUrl(file, { width: 64, height: 64 });
}

function normalizeServerSoundEffect(effect: Partial<ServerSoundEffect>): ServerSoundEffect | null {
  const audioUrl = typeof effect.audioUrl === "string" && effect.audioUrl.startsWith("data:audio/") ? effect.audioUrl : "";
  if (!audioUrl) {
    return null;
  }

  const name = typeof effect.name === "string" && effect.name.trim() ? effect.name.trim().slice(0, 40) : "Som";
  const emoji = typeof effect.emoji === "string" && effect.emoji.trim() ? effect.emoji.trim().slice(0, 8) : defaultSoundEmoji;

  return {
    id: String(effect.id || `sound-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    name,
    emoji,
    fileName: typeof effect.fileName === "string" && effect.fileName.trim() ? effect.fileName.trim().slice(0, 120) : `${name}.audio`,
    audioUrl,
    volume: clampSoundVolume(effect.volume),
    uploadedBy: typeof effect.uploadedBy === "string" && effect.uploadedBy.trim() ? effect.uploadedBy.trim().slice(0, 48) : "Sistema",
    uploadedByAvatarUrl: sanitizeImageSource(effect.uploadedByAvatarUrl),
    uploadedAt: typeof effect.uploadedAt === "string" && effect.uploadedAt ? effect.uploadedAt : new Date().toISOString()
  };
}

function createDeveloperBoost(user: AuthUser): ServerBoost {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    id: `boost-${createdAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    appliedBy: user.id,
    appliedByName: user.displayName,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };
}

function getActiveBoosts(boosts: ServerBoost[], now = Date.now()) {
  return boosts.filter((boost) => Date.parse(boost.expiresAt) > now);
}

const boostLevelTargets = [
  2, 5, 10, 18, 28, 40, 55, 72, 92, 115,
  140, 170, 205, 245, 290, 350, 420, 500, 590, 690,
  800, 920, 1050, 1190, 1340, 1500, 1670, 1850, 2040, 2250
];
const BOOST_MAX_LEVEL = boostLevelTargets.length;
const SERVER_ICON_UNLOCK_LEVEL = 6;
const SERVER_BADGE_UNLOCK_LEVEL = 7;
const SERVER_GUIDE_UNLOCK_LEVEL = 8;
const SERVER_LEGENDARY_THEME_UNLOCK_LEVEL = 10;
const SERVER_GUIDE_BANNER_UNLOCK_LEVEL = BOOST_MAX_LEVEL;
const boostRewardLabels = [
  "Plano de fundo do convite",
  "Banner do servidor",
  "Convite personalizado e banner animado",
  "Cor de destaque do servidor",
  "Cartao de boas-vindas",
  "Foto do servidor",
  "Selo e paleta da barra",
  "Guia do servidor",
  "Mais canais em destaque",
  "Tema lendario",
  "Destaque avancado de cargos",
  "Slots extras de som",
  "Expressoes extras",
  "Prioridade visual de comunidade",
  "Marco de comunidade 15",
  "Recompensa de comunidade 16",
  "Recompensa de comunidade 17",
  "Recompensa de comunidade 18",
  "Recompensa de comunidade 19",
  "Recompensa de comunidade 20",
  "Recompensa de comunidade 21",
  "Recompensa de comunidade 22",
  "Recompensa de comunidade 23",
  "Recompensa de comunidade 24",
  "Recompensa de comunidade 25",
  "Recompensa de comunidade 26",
  "Recompensa de comunidade 27",
  "Recompensa de comunidade 28",
  "Recompensa de comunidade 29",
  "Banner completo da Guia"
];

function getBoostLevel(boostCount: number) {
  return boostLevelTargets.reduce((level, target, index) => (boostCount >= target ? index + 1 : level), 0);
}

function getNextBoostTarget(boostCount: number) {
  return boostLevelTargets.find((target) => boostCount < target) ?? boostLevelTargets[boostLevelTargets.length - 1];
}

function getBoostOverflowCount(boostCount: number) {
  return Math.max(0, boostCount - boostLevelTargets[boostLevelTargets.length - 1]);
}

function getServerInviteLink(server: ServerDefinition, code: string) {
  const boostLevel = getBoostLevel(getActiveBoosts(server.boosts).length);
  const inviteBaseUrl = getPublicInviteBaseUrl();
  if (boostLevel >= 3 && server.boostPerks.customInviteSlug) {
    return `${inviteBaseUrl}/${encodeURIComponent(server.boostPerks.customInviteSlug)}/${encodeURIComponent(code)}`;
  }

  return `${inviteBaseUrl}/${encodeURIComponent(code)}`;
}

function getPublicInviteBaseUrl() {
  const baseUrl = PUBLIC_WEB_URL.replace(/\/+$/, "");
  return /\/api\/v1$/i.test(baseUrl) ? `${baseUrl}/invite` : `${baseUrl}/api/v1/invite`;
}

function isTempestInviteLink(value: string) {
  try {
    const url = new URL(value);
    const protocol = url.protocol.toLowerCase();

    if (protocol === "tempest-light:") {
      return url.hostname.toLowerCase() === "invite" && url.pathname.split("/").filter(Boolean).length > 0;
    }

    if (protocol !== "http:" && protocol !== "https:") {
      return false;
    }

    const hostname = url.hostname.toLowerCase();
    const pathParts = url.pathname.split("/").filter(Boolean).map((part) => part.toLowerCase());
    const isTempestHost = hostname === "tempest.gg" || hostname.endsWith(".tempest.gg") || hostname.includes("tempest") || hostname.endsWith(".shardweb.app");
    return isTempestHost && pathParts.includes("invite") && pathParts.length > pathParts.indexOf("invite") + 1;
  } catch {
    return false;
  }
}

function splitTrailingInvitePunctuation(value: string) {
  let inviteLink = value;
  let trailing = "";

  while (inviteLink.length) {
    const lastChar = inviteLink[inviteLink.length - 1];
    if (!".,!?;:)]}".includes(lastChar)) {
      break;
    }

    trailing = `${lastChar}${trailing}`;
    inviteLink = inviteLink.slice(0, -1);
  }

  return { inviteLink, trailing };
}

function renderInviteLinksInText(text: string, renderInviteLink: (inviteLink: string, key: string) => ReactNode) {
  const parts: ReactNode[] = [];
  const invitePattern = /tempest-light:\/\/invite\/[^\s<>"']+|https?:\/\/[^\s<>"']*(?:tempest|shardweb\.app)[^\s<>"']*\/invite\/[^\s<>"']+/giu;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = invitePattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const rawInvite = match[0];
    const { inviteLink, trailing } = splitTrailingInvitePunctuation(rawInvite);

    if (isTempestInviteLink(inviteLink)) {
      parts.push(renderInviteLink(inviteLink, `invite-${match.index}-${inviteLink}`));
      if (trailing) {
        parts.push(trailing);
      }
    } else {
      parts.push(rawInvite);
    }

    lastIndex = match.index + rawInvite.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
}

function getServerBannerUrl(server: ServerDefinition, boostLevel: number) {
  if (boostLevel >= 3 && server.boostPerks.animatedBannerUrl) {
    return server.boostPerks.animatedBannerUrl;
  }

  if (boostLevel >= 2 && server.boostPerks.channelBannerUrl) {
    return server.boostPerks.channelBannerUrl;
  }

  return null;
}

function getServerIconUrl(server: ServerDefinition, boostLevel: number) {
  return boostLevel >= SERVER_ICON_UNLOCK_LEVEL ? server.iconUrl : null;
}

function formatElapsedDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  return hours > 0 ? `${hours}:${paddedMinutes}:${paddedSeconds}` : `${paddedMinutes}:${paddedSeconds}`;
}

function normalizeServerTag(tag: string) {
  return tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

const developerAccountEmails = new Set(
  String(import.meta.env.VITE_TEMPEST_LIGHT_DEVELOPER_EMAILS || "rafaeltanki1212@gmail.com,izigamer47@gmail.com")
    .split(",")
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean)
);
const developerAccountUsernames = new Set(
  String(import.meta.env.VITE_TEMPEST_LIGHT_DEVELOPER_USERNAMES || "armadura_prime")
    .split(",")
    .map((username: string) => username.trim().toLowerCase())
    .filter(Boolean)
);

function isDeveloperUser(user: AuthUser) {
  const email = user.email.trim().toLowerCase();
  const username = user.username.trim().toLowerCase();
  return developerAccountEmails.has(email) || developerAccountUsernames.has(username) || LOCAL_DEVELOPER_TOOLS_ENABLED;
}

function updateEveryoneRiskyPermissions(roles: ServerRole[], enabled: boolean) {
  return roles.map((role) => {
    if (role.id !== "everyone") {
      return role;
    }

    const permissions = { ...role.permissions };
    communityRiskyPermissions.forEach((permission) => {
      permissions[permission] = !enabled && permissions[permission];
    });

    return { ...role, permissions };
  });
}

function evaluateAutomodMessage(text: string, automod: ServerAutomodSettings) {
  const lowered = text.toLowerCase();

  if (automod.blockInvites && /(discord\.gg|discord\.new|discord\.com\/invite)/i.test(text)) {
    return "AutoMod bloqueou convite externo.";
  }

  if (automod.blockLinks && /https?:\/\/\S+/i.test(text)) {
    return "AutoMod bloqueou link.";
  }

  if (automod.blockMassMentions) {
    const mentionCount = (text.match(/@\w+/g) ?? []).length;
    if (/@everyone|@here/i.test(text) || mentionCount > automod.maxMentions) {
      return "AutoMod bloqueou excesso de mencoes.";
    }
  }

  if (automod.blockSpam && (/([^\s])\1{10,}/i.test(text) || text.length > 18 && text === text.toUpperCase())) {
    return "AutoMod bloqueou possivel spam.";
  }

  const blockedWord = automod.blockedWords.find((word) => word && lowered.includes(word.toLowerCase()));
  if (blockedWord) {
    return `AutoMod bloqueou a palavra "${blockedWord}".`;
  }

  return null;
}

interface LinkedAccountLoginInput {
  identifier: string;
  password: string;
}

function normalizeAccountUsername(username: string) {
  const normalized = username.trim().replace(/@+/g, "").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 32);
  if (!normalized) {
    return "usuario";
  }

  return normalized.length >= 3 ? normalized : normalized.padEnd(3, "_");
}

function getWorkspaceStateKey(user: Pick<AuthUser, "id" | "username">) {
  return `${WORKSPACE_STATE_PREFIX}:${user.id || user.username}`;
}

function readWorkspaceState(user: AuthUser): SavedWorkspaceState | null {
  try {
    const stored = localStorage.getItem(getWorkspaceStateKey(user));
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<SavedWorkspaceState>;
    const servers = Array.isArray(parsed.servers) ? parsed.servers.map((server) => normalizeSavedServer(server, user)) : [];
    const activeServerId = parsed.activeServerId && servers.some((server) => server.id === parsed.activeServerId) ? parsed.activeServerId : null;
    const activeView = parsed.activeView === "server" && !activeServerId ? "direct" : parsed.activeView ?? "direct";

    return {
      activeView,
      activeServerId,
      activeChannel: typeof parsed.activeChannel === "string" ? parsed.activeChannel : "geral",
      activeDirectId: typeof parsed.activeDirectId === "string" ? parsed.activeDirectId : null,
      servers,
      messages: Array.isArray(parsed.messages) ? parsed.messages : initialMessages,
      directContacts: Array.isArray(parsed.directContacts) ? parsed.directContacts : initialDirectContacts,
      directMessages: parsed.directMessages && typeof parsed.directMessages === "object" ? parsed.directMessages : initialDirectMessages,
      readServerChannelAt: normalizeStringRecord(parsed.readServerChannelAt),
      readDirectConversationAt: normalizeStringRecord(parsed.readDirectConversationAt),
      steamActivity: normalizeSteamActivity(parsed.steamActivity),
      activityCardsVisible: typeof parsed.activityCardsVisible === "boolean" ? parsed.activityCardsVisible : true
    };
  } catch {
    return null;
  }
}

function saveWorkspaceState(user: AuthUser, state: SavedWorkspaceState) {
  try {
    localStorage.setItem(getWorkspaceStateKey(user), JSON.stringify(state));
  } catch {
    // Arquivos grandes, como efeitos sonoros, podem exceder a cota local; a API online preserva o estado sincronizado.
  }
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function getMentionNotificationKey(user: Pick<AuthUser, "id" | "username"> | Pick<ServerMemberDefinition, "id" | "username">) {
  return user.id || `username:${user.username.toLowerCase()}`;
}

function normalizeMentionNotification(value: unknown): MentionNotification | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<MentionNotification>;
  if (
    typeof item.id !== "string" ||
    typeof item.recipientUserId !== "string" ||
    typeof item.recipientUsername !== "string" ||
    typeof item.serverId !== "string" ||
    typeof item.serverName !== "string" ||
    typeof item.channelName !== "string" ||
    typeof item.authorId !== "string" ||
    typeof item.authorUsername !== "string" ||
    typeof item.authorName !== "string" ||
    typeof item.messageText !== "string" ||
    typeof item.mentionLabel !== "string" ||
    typeof item.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: item.id,
    recipientUserId: item.recipientUserId,
    recipientUsername: item.recipientUsername,
    serverId: item.serverId,
    serverName: item.serverName,
    channelName: item.channelName,
    authorId: item.authorId,
    authorUsername: item.authorUsername,
    authorName: item.authorName,
    messageText: item.messageText,
    mentionLabel: item.mentionLabel,
    createdAt: item.createdAt,
    read: Boolean(item.read)
  };
}

function readMentionNotificationStore() {
  try {
    const stored = localStorage.getItem(MENTION_NOTIFICATIONS_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {} as Record<string, MentionNotification[]>;
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [
        key,
        Array.isArray(value)
          ? value
              .map((item) => normalizeMentionNotification(item))
              .filter((item): item is MentionNotification => Boolean(item))
          : []
      ])
    ) as Record<string, MentionNotification[]>;
  } catch {
    return {};
  }
}

function writeMentionNotificationStore(store: Record<string, MentionNotification[]>) {
  localStorage.setItem(MENTION_NOTIFICATIONS_KEY, JSON.stringify(store));
}

function readMentionNotifications(user: Pick<AuthUser, "id" | "username">) {
  const key = getMentionNotificationKey(user);
  return (readMentionNotificationStore()[key] ?? [])
    .slice()
    .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

function appendMentionNotifications(notifications: MentionNotification[]) {
  if (!notifications.length) {
    return;
  }

  const store = readMentionNotificationStore();
  notifications.forEach((notification) => {
    const key = notification.recipientUserId;
    const existing = store[key] ?? [];
    store[key] = [notification, ...existing.filter((item) => item.id !== notification.id)].slice(0, 100);
  });
  writeMentionNotificationStore(store);
}

function updateMentionNotificationsForUser(
  user: Pick<AuthUser, "id" | "username">,
  updater: (notifications: MentionNotification[]) => MentionNotification[]
) {
  const store = readMentionNotificationStore();
  const key = getMentionNotificationKey(user);
  const nextNotifications = updater(store[key] ?? []);
  store[key] = nextNotifications;
  writeMentionNotificationStore(store);
  return readMentionNotifications(user);
}

function normalizeSteamActivity(value: unknown): SteamActivitySettings {
  if (!value || typeof value !== "object") {
    return defaultSteamActivitySettings;
  }

  const activity = value as Partial<SteamActivitySettings>;
  return {
    linked: Boolean(activity.linked),
    steamName: typeof activity.steamName === "string" ? activity.steamName.slice(0, 80) : "",
    currentGame: typeof activity.currentGame === "string" ? activity.currentGame.slice(0, 80) : "",
    gameImageUrl: sanitizeImageSource(activity.gameImageUrl),
    startedAt: typeof activity.startedAt === "string" && !Number.isNaN(Date.parse(activity.startedAt)) ? activity.startedAt : null
  };
}

function normalizeServerMember(member: Partial<ServerMemberDefinition>): ServerMemberDefinition {
  const joinedAt = typeof member.joinedAt === "string" ? member.joinedAt : new Date().toISOString();
  return {
    id: String(member.id || `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    username: String(member.username || "usuario").slice(0, 32),
    displayName: String(member.displayName || member.username || "Usuario").slice(0, 48),
    avatarUrl: sanitizeImageSource(member.avatarUrl),
    bannerUrl: sanitizeImageSource(member.bannerUrl),
    bio: typeof member.bio === "string" && member.bio.trim() ? member.bio.trim().slice(0, 240) : null,
    presence: member.presence ?? (member.isBot ? "OFFLINE" : "ONLINE"),
    accountCreatedAt:
      typeof member.accountCreatedAt === "string" && !Number.isNaN(Date.parse(member.accountCreatedAt)) ? member.accountCreatedAt : joinedAt,
    joinedAt,
    roleIds: Array.from(new Set(["everyone", ...(Array.isArray(member.roleIds) ? member.roleIds.map(String) : [])])),
    timeoutUntil: isFutureIsoDate(member.timeoutUntil) ? member.timeoutUntil : null,
    isBot: Boolean(member.isBot)
  };
}

function normalizeServerBot(bot: Partial<ServerBotIntegration>): ServerBotIntegration {
  const id = String(bot.id || `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const displayName = String(bot.displayName || bot.username || "Discord Bot").slice(0, 48);
  const rawPrefix = typeof bot.prefix === "string" && bot.prefix.trim() ? bot.prefix.trim().slice(0, 4) : "!";
  const rawCommandName =
    typeof bot.commandName === "string" && bot.commandName.trim() ? bot.commandName.trim().replace(/^\W+/, "").slice(0, 24) : "ping";
  const commandModules =
    Array.isArray(bot.commandModules) && bot.commandModules.length
      ? bot.commandModules.filter((module): module is BotCommandModule => defaultBotCommandModules.includes(module as BotCommandModule))
      : defaultBotCommandModules;
  return {
    id,
    username: String(bot.username || normalizeTextChannelName(displayName)).slice(0, 32),
    displayName,
    avatarUrl: sanitizeImageSource(bot.avatarUrl),
    bannerUrl: sanitizeImageSource(bot.bannerUrl),
    description: typeof bot.description === "string" && bot.description.trim() ? bot.description.trim().slice(0, 240) : null,
    tokenPreview: String(bot.tokenPreview || "token mascarado").slice(0, 24),
    discordApplicationId: typeof bot.discordApplicationId === "string" && bot.discordApplicationId.trim() ? bot.discordApplicationId : null,
    bridgeStatus: bot.bridgeStatus === "connected" || bot.bridgeStatus === "error" ? bot.bridgeStatus : "pending",
    runtimeEnabled: bot.runtimeEnabled ?? true,
    prefix: rawPrefix,
    commandName: rawCommandName || "ping",
    replyText:
      typeof bot.replyText === "string" && bot.replyText.trim()
        ? bot.replyText.trim().slice(0, 240)
        : "Pong! Bot funcionando dentro do Tempest Light.",
    commandChannelNames: Array.isArray(bot.commandChannelNames) ? bot.commandChannelNames.map(String).slice(0, 80) : [],
    commandModules,
    addedBy: String(bot.addedBy || "Sistema").slice(0, 48),
    addedAt: typeof bot.addedAt === "string" ? bot.addedAt : new Date().toISOString()
  };
}

function createServerBotMember(bot: ServerBotIntegration): ServerMemberDefinition {
  return {
    id: bot.id,
    username: bot.username,
    displayName: bot.displayName,
    avatarUrl: bot.avatarUrl,
    bannerUrl: bot.bannerUrl,
    bio: bot.description,
    presence: "OFFLINE",
    accountCreatedAt: bot.addedAt,
    joinedAt: bot.addedAt,
    roleIds: ["everyone"],
    isBot: true
  };
}

function maskBotToken(token: string) {
  const cleanToken = token.trim();
  if (cleanToken.length <= 12) {
    return "token mascarado";
  }

  return `${cleanToken.slice(0, 6)}...${cleanToken.slice(-4)}`;
}

function createServerBotFromToken(
  token: string,
  user: AuthUser,
  options?: {
    discordApplicationId?: string | null;
    username?: string;
    displayName?: string;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    description?: string | null;
    bridgeStatus?: DiscordBridgeStatus;
    prefix?: string;
    commandName?: string;
    replyText?: string;
    commandChannelNames?: string[];
    commandModules?: BotCommandModule[];
  }
) {
  const cleanToken = token.trim();
  const safeSuffix = cleanToken
    .replace(/[^a-z0-9]/gi, "")
    .slice(-5)
    .toLowerCase() || Math.random().toString(36).slice(2, 7);
  const now = new Date().toISOString();
  const displayName = options?.displayName?.trim().slice(0, 48) || `Bot migrado ${safeSuffix.toUpperCase()}`;
  const username = options?.username?.trim().slice(0, 32) || `bot-${safeSuffix}`;
  const commandName = options?.commandName?.trim().replace(/^\W+/, "").slice(0, 24) || "ping";
  const bot: ServerBotIntegration = {
    id: options?.discordApplicationId ? `discord-bot-${options.discordApplicationId}` : `bot-${Date.now()}-${safeSuffix}`,
    username,
    displayName,
    avatarUrl: options?.avatarUrl ?? null,
    bannerUrl: options?.bannerUrl ?? null,
    description: options?.description?.trim().slice(0, 240) || null,
    tokenPreview: maskBotToken(cleanToken),
    discordApplicationId: options?.discordApplicationId ?? null,
    bridgeStatus: options?.bridgeStatus ?? "pending",
    runtimeEnabled: true,
    prefix: options?.prefix?.trim().slice(0, 4) || "!",
    commandName,
    replyText: options?.replyText?.trim().slice(0, 240) || "Pong! Bot funcionando dentro do Tempest Light.",
    commandChannelNames: options?.commandChannelNames ?? [],
    commandModules: options?.commandModules?.length ? options.commandModules : defaultBotCommandModules,
    addedBy: user.displayName,
    addedAt: now
  };

  return {
    bot,
    member: createServerBotMember(bot)
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Arquivo invalido."));
      }
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Falha ao ler arquivo.")));
    reader.readAsDataURL(file);
  });
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || imageFileNamePattern.test(file.name);
}

function isGifFile(file: File) {
  return file.type === "image/gif" || /\.gif$/i.test(file.name);
}

function readImageFileAsDataUrl(file: File, resize?: { width: number; height: number; maxBytes?: number }) {
  if (!resize || isGifFile(file)) {
    return readFileAsDataUrl(file);
  }

  return new Promise<string>((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    image.addEventListener("load", () => {
      const canvas = document.createElement("canvas");
      canvas.width = resize.width;
      canvas.height = resize.height;

      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(sourceUrl);
        reject(new Error("Canvas indisponivel."));
        return;
      }

      const sourceRatio = image.width / image.height;
      const targetRatio = resize.width / resize.height;
      let sourceWidth = image.width;
      let sourceHeight = image.height;
      let sourceX = 0;
      let sourceY = 0;

      if (sourceRatio > targetRatio) {
        sourceWidth = image.height * targetRatio;
        sourceX = (image.width - sourceWidth) / 2;
      } else {
        sourceHeight = image.width / targetRatio;
        sourceY = (image.height - sourceHeight) / 2;
      }

      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, resize.width, resize.height);
      URL.revokeObjectURL(sourceUrl);
      const qualities = [0.88, 0.78, 0.68, 0.58, 0.48];
      let dataUrl = canvas.toDataURL("image/webp", qualities[0]);
      for (const quality of qualities.slice(1)) {
        if (!resize.maxBytes || getDataUrlByteLength(dataUrl) <= resize.maxBytes) {
          break;
        }
        dataUrl = canvas.toDataURL("image/webp", quality);
      }
      resolve(dataUrl);
    });
    image.addEventListener("error", () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("Imagem invalida."));
    });
    image.src = sourceUrl;
  });
}

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isSafeImageSource(value: string | null | undefined) {
  const source = String(value ?? "").trim();
  if (!source) {
    return false;
  }

  if (isDataImageSource(source)) {
    return true;
  }

  if (source.startsWith("blob:")) {
    return true;
  }

  return isSafeHttpUrl(source);
}

function sanitizeImageSource(value: string | null | undefined) {
  const source = String(value ?? "").trim();
  return isSafeImageSource(source) ? source : null;
}

function isDataImageSource(value: string | null | undefined) {
  return /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(String(value ?? "").trim());
}

function isDataAttachmentSource(value: string | null | undefined) {
  return /^data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,/i.test(String(value ?? "").trim());
}

function isSafeAttachmentSource(value: string | null | undefined) {
  const source = String(value ?? "").trim();
  return Boolean(source && (isSafeImageSource(source) || isDataAttachmentSource(source)));
}

function sanitizeAttachmentSource(value: string | null | undefined) {
  const source = String(value ?? "").trim();
  return isSafeAttachmentSource(source) ? source : null;
}

function getLocalProfileImagesKey(user: Pick<AuthUser, "id">) {
  return `${LOCAL_PROFILE_IMAGES_PREFIX}:${user.id}`;
}

function readLocalProfileImages(user: AuthUser) {
  try {
    const stored = localStorage.getItem(getLocalProfileImagesKey(user));
    const parsed = stored ? JSON.parse(stored) as Partial<Pick<AuthUser, "avatarUrl" | "bannerUrl">> : null;
    return {
      avatarUrl: isDataImageSource(parsed?.avatarUrl) ? parsed?.avatarUrl ?? null : null,
      bannerUrl: isDataImageSource(parsed?.bannerUrl) ? parsed?.bannerUrl ?? null : null
    };
  } catch {
    return { avatarUrl: null, bannerUrl: null };
  }
}

function mergeUserWithLocalProfileImages(user: AuthUser) {
  const localImages = readLocalProfileImages(user);
  return {
    ...user,
    avatarUrl: localImages.avatarUrl ?? user.avatarUrl,
    bannerUrl: localImages.bannerUrl ?? user.bannerUrl
  };
}

function updateLocalProfileImages(user: AuthUser, input: UpdateProfileInput) {
  const current = readLocalProfileImages(user);
  const next: Partial<Pick<AuthUser, "avatarUrl" | "bannerUrl">> = { ...current };

  if ("avatarUrl" in input) {
    if (isDataImageSource(input.avatarUrl)) {
      next.avatarUrl = input.avatarUrl;
    } else {
      delete next.avatarUrl;
    }
  }

  if ("bannerUrl" in input) {
    if (isDataImageSource(input.bannerUrl)) {
      next.bannerUrl = input.bannerUrl;
    } else {
      delete next.bannerUrl;
    }
  }

  try {
    if (next.avatarUrl || next.bannerUrl) {
      localStorage.setItem(getLocalProfileImagesKey(user), JSON.stringify(next));
    } else {
      localStorage.removeItem(getLocalProfileImagesKey(user));
    }
  } catch {
    // Se o navegador nao conseguir persistir, o perfil online ainda continua salvo.
  }
}

function isLegacyProfileImageValidationError(caught: unknown) {
  const text = [
    caught instanceof Error ? caught.message : "",
    caught instanceof ApiError && caught.details ? JSON.stringify(caught.details) : ""
  ].join(" ");

  return /(avatarUrl|bannerUrl)/i.test(text) && /(URL address|2048|isProfileImageSource|imagem enviada pelo aplicativo)/i.test(text);
}

function toCssImageUrl(value: string | null | undefined) {
  const source = sanitizeImageSource(value);
  return source ? `url("${source.replace(/["\\]/g, "\\$&")}")` : undefined;
}

function getDataUrlByteLength(dataUrl: string) {
  const base64 = dataUrl.split(",", 2)[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}

function formatBytes(bytes: number) {
  const safeBytes = Math.max(0, bytes);
  if (safeBytes < 1024) {
    return `${safeBytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = safeBytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function encodeJsonBase64(value: unknown) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
}

function decodeJsonBase64<T>(value: string): T | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(value)))) as T;
  } catch {
    return null;
  }
}

function normalizeChatAttachment(value: unknown): ChatAttachment | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<ChatAttachment>;
  const kind: ChatAttachment["kind"] = item.kind === "file" ? "file" : "image";
  const url = sanitizeAttachmentSource(item.url);
  const name = typeof item.name === "string" && item.name.trim() ? item.name.trim().slice(0, 120) : kind === "file" ? "arquivo" : "imagem";
  const mimeType = typeof item.mimeType === "string" && item.mimeType.trim() ? item.mimeType.trim().slice(0, 120) : kind === "file" ? "application/octet-stream" : "image/png";
  const sizeBytes = typeof item.sizeBytes === "number" && Number.isFinite(item.sizeBytes) ? Math.max(0, Math.floor(item.sizeBytes)) : 0;

  if (!url || mimeType.toLowerCase() === "image/svg+xml" || (kind === "image" && (!mimeType.startsWith("image/") || !isSafeImageSource(url)))) {
    return null;
  }

  return {
    id: String(item.id || `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    kind,
    name,
    mimeType,
    url,
    sizeBytes
  };
}

function serializeMessageContent(text: string, attachments: ChatAttachment[]) {
  const cleanText = text.trim();
  const markers = attachments
    .map((attachment) => `[[TL_ATTACHMENT:${encodeJsonBase64(attachment)}]]`)
    .join("\n");
  return [cleanText, markers].filter(Boolean).join("\n");
}

function parseMessageContent(rawText: string, existingAttachments?: ChatAttachment[]) {
  const attachments = [...(existingAttachments ?? [])];
  const text = rawText
    .replace(/\[\[TL_ATTACHMENT:([A-Za-z0-9+/=]+)\]\]/g, (_marker, encoded: string) => {
      const attachment = normalizeChatAttachment(decodeJsonBase64<ChatAttachment>(encoded));
      if (attachment) {
        attachments.push(attachment);
      }
      return "";
    })
    .replace(/\[\[TL_VOICE_SOUND:[A-Za-z0-9+/=]+\]\]/g, "");

  return {
    text: text.replace(/\n{3,}/g, "\n\n").trim(),
    attachments
  };
}

function normalizeVoiceSoundEffectEvent(value: unknown): VoiceSoundEffectEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<VoiceSoundEffectEvent>;
  const effectId = typeof item.effectId === "string" ? item.effectId.trim() : "";
  const name = typeof item.name === "string" && item.name.trim() ? item.name.trim().slice(0, 40) : "Som";
  const emoji = typeof item.emoji === "string" && item.emoji.trim() ? item.emoji.trim().slice(0, 8) : defaultSoundEmoji;
  const triggeredAt = typeof item.triggeredAt === "string" && item.triggeredAt ? item.triggeredAt : new Date().toISOString();

  if (!effectId) {
    return null;
  }

  return {
    playbackId: typeof item.playbackId === "string" && item.playbackId ? item.playbackId : `${effectId}-${triggeredAt}`,
    effectId,
    name,
    emoji,
    volume: clampSoundVolume(item.volume),
    triggeredAt
  };
}

function serializeVoiceSoundEffectContent(effect: ServerSoundEffect) {
  const playback: VoiceSoundEffectEvent = {
    playbackId: `sound-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    effectId: effect.id,
    name: effect.name,
    emoji: effect.emoji,
    volume: effect.volume,
    triggeredAt: new Date().toISOString()
  };

  return `[[TL_VOICE_SOUND:${encodeJsonBase64(playback)}]]`;
}

function parseVoiceSoundEffectEvent(rawText: string) {
  const match = rawText.match(/\[\[TL_VOICE_SOUND:([A-Za-z0-9+/=]+)\]\]/);
  return match ? normalizeVoiceSoundEffectEvent(decodeJsonBase64<VoiceSoundEffectEvent>(match[1])) : null;
}

function stripVoiceSoundEffectMarkers(rawText: string) {
  return rawText.replace(/\[\[TL_VOICE_SOUND:[A-Za-z0-9+/=]+\]\]/g, "").trim();
}

function playAudioSource(audioUrl: string, volume: number) {
  const audio = new Audio(audioUrl);
  audio.volume = clampSoundVolume(volume) / 100;
  return audio.play();
}

function extractExternalLinks(text: string) {
  const links: string[] = [];
  const pattern = /https?:\/\/[^\s<>"']+/giu;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    const { inviteLink } = splitTrailingInvitePunctuation(match[0]);
    if (isSafeHttpUrl(inviteLink) && !links.includes(inviteLink)) {
      links.push(inviteLink);
    }
  }

  return links.slice(0, 4);
}

function getYoutubeVideoId(link: string) {
  try {
    const url = new URL(link);
    if (!youtubeHostPattern.test(url.hostname)) {
      return null;
    }

    if (url.hostname.toLowerCase().endsWith("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/").filter(Boolean)[1] ?? null;
    }

    return url.searchParams.get("v");
  } catch {
    return null;
  }
}

function getYoutubePreviewTitle(link: string) {
  const videoId = getYoutubeVideoId(link);
  return videoId ? "Abrir video no YouTube" : "YouTube";
}

function looksLikeImageLink(link: string) {
  try {
    const url = new URL(link);
    return /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(url.pathname + url.search);
  } catch {
    return false;
  }
}

function isTrustedMediaLink(link: string) {
  try {
    return trustedMediaHostPattern.test(new URL(link).hostname);
  } catch {
    return false;
  }
}

function isPotentiallyDangerousExternalLink(link: string) {
  try {
    const url = new URL(link);
    const path = `${url.pathname}${url.search}`.toLowerCase();
    return dangerousFileExtensionPattern.test(path);
  } catch {
    return true;
  }
}

function isDangerousAttachmentFile(file: File) {
  return dangerousFileExtensionPattern.test(file.name) || file.type === "image/svg+xml";
}

function getPastedImageFileName(mimeType: string) {
  if (mimeType.includes("gif")) {
    return "imagem-colada.gif";
  }

  if (mimeType.includes("png")) {
    return "imagem-colada.png";
  }

  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return "imagem-colada.jpg";
  }

  if (mimeType.includes("webp")) {
    return "imagem-colada.webp";
  }

  return "imagem-colada.png";
}

function getSafeAttachmentMimeType(file: File) {
  if (file.type && !/[\r\n;]/.test(file.type)) {
    return file.type;
  }

  return "application/octet-stream";
}

async function readChatAttachment(file: File): Promise<ChatAttachment> {
  if (file.size > chatAttachmentMaxBytes) {
    throw new Error("Arquivo grande demais. O limite planejado do chat e 3 GB por arquivo.");
  }

  if (file.size > chatInlineAttachmentMaxBytes) {
    throw new Error("Arquivo acima de 24 MB precisa do armazenamento dedicado para chegar a outras pessoas sem travar o chat.");
  }

  if (isImageFile(file) && isGifFile(file)) {
    const url = await readFileAsDataUrl(file);
    return {
      id: `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: "image",
      name: file.name || "imagem.gif",
      mimeType: getSafeAttachmentMimeType(file),
      url,
      sizeBytes: file.size
    };
  }

  if (!isImageFile(file)) {
    const url = await readFileAsDataUrl(file);
    return {
      id: `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: "file",
      name: file.name || "arquivo",
      mimeType: getSafeAttachmentMimeType(file),
      url,
      sizeBytes: file.size
    };
  }

  const url = await resizeChatImageFile(file);
  const sizeBytes = getDataUrlByteLength(url);
  if (sizeBytes > chatInlineAttachmentMaxBytes) {
    throw new Error("Imagem grande demais para enviar no chat.");
  }

  return {
    id: `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: "image",
    name: file.name || "imagem.webp",
    mimeType: "image/webp",
    url,
    sizeBytes
  };
}

function resizeChatImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    image.addEventListener("load", () => {
      const ratio = Math.min(1, chatImageMaxWidth / image.width, chatImageMaxHeight / image.height);
      const width = Math.max(1, Math.round(image.width * ratio));
      const height = Math.max(1, Math.round(image.height * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(sourceUrl);
        reject(new Error("Canvas indisponivel."));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(sourceUrl);
      resolve(canvas.toDataURL("image/webp", 0.82));
    });
    image.addEventListener("error", () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("Imagem invalida."));
    });
    image.src = sourceUrl;
  });
}

function getCurrentSteamActivity(user: AuthUser, settings: SteamActivitySettings, now: number): ActivityCard | null {
  if (!settings.linked || !settings.currentGame.trim() || !settings.startedAt) {
    return null;
  }

  const startedAt = Date.parse(settings.startedAt);
  if (Number.isNaN(startedAt) || now - startedAt > 5 * 24 * 60 * 60 * 1000) {
    return null;
  }

  return {
    id: `steam-${user.id}-${settings.startedAt}-${settings.currentGame}`,
    userId: user.id,
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    gameName: settings.currentGame.trim(),
    imageUrl: settings.gameImageUrl,
    startedAt: settings.startedAt
  };
}

function formatActivityAge(startedAt: string, now: number) {
  const elapsed = Math.max(0, now - Date.parse(startedAt));
  const minutes = Math.max(1, Math.floor(elapsed / 60000));
  if (minutes < 60) {
    return `${minutes} min atras`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h atras`;
  }

  return `${Math.floor(hours / 24)}d atras`;
}

function normalizeSavedServer(server: Partial<ServerDefinition>, user: AuthUser): ServerDefinition {
  const extras = createDefaultServerExtras();
  const serverName = String(server.name || "Servidor").slice(0, 48);
  const categories =
    Array.isArray(server.categories) && server.categories.length
      ? server.categories.map((group) => ({
          name: normalizeServerStructureName(String(group.name || "CATEGORIA"), "CATEGORIA"),
          channels: Array.isArray(group.channels)
            ? group.channels
                .filter((channel) => channel && (channel.type === "text" || channel.type === "voice"))
                .map((channel) => {
                  const fallbackName = channel.type === "voice" ? "Geral" : "geral";
                  return {
                    name: normalizeServerStructureName(String(channel.name || fallbackName), fallbackName),
                    type: channel.type,
                    isPrivate: Boolean(channel.isPrivate),
                    special: channel.special,
                    isNew: Boolean(channel.isNew),
                    userLimit:
                      typeof channel.userLimit === "number" && channel.userLimit > 0
                        ? Math.min(Math.floor(channel.userLimit), 99)
                        : null
                  };
                })
            : []
        }))
      : cloneServerCategories(defaultServerCategories);
  const roles =
    Array.isArray(server.roles) && server.roles.length
      ? server.roles.map((role) => ({
          id: String(role.id || "everyone"),
          name: String(role.name || "@everyone"),
          color: String(role.color || "#99aab5"),
          style: normalizeRoleStyle(role.style),
          iconUrl: sanitizeImageSource(role.iconUrl),
          permissions: { ...defaultEveryonePermissions, ...(role.permissions ?? {}) },
          separateMembers: Boolean(role.separateMembers),
          isDefault: Boolean(role.isDefault)
        }))
      : [createEveryoneRole()];
  const members =
    Array.isArray(server.members) && server.members.length
      ? server.members
      : [createServerMember(user, getOwnerRoleId(roles.filter((role) => !role.isDefault)) ? [String(getOwnerRoleId(roles.filter((role) => !role.isDefault)))] : [])];
  const normalizedBoosts = Array.isArray(server.boosts) ? getActiveBoosts(server.boosts) : extras.boosts;
  const bots = Array.isArray(server.bots) ? server.bots.map((bot) => normalizeServerBot(bot)) : extras.bots;
  const rawBoostPerks = { ...extras.boostPerks, ...(server.boostPerks ?? {}) };
  const boostPerks: ServerBoostPerks = {
    ...rawBoostPerks,
    channelBannerUrl: sanitizeImageSource(rawBoostPerks.channelBannerUrl),
    animatedBannerUrl: sanitizeImageSource(rawBoostPerks.animatedBannerUrl),
    inviteBackgroundUrl: sanitizeImageSource(rawBoostPerks.inviteBackgroundUrl),
    welcomeCardUrl: sanitizeImageSource(rawBoostPerks.welcomeCardUrl),
    serverGuideBannerUrl: sanitizeImageSource(rawBoostPerks.serverGuideBannerUrl),
    serverGuideChannelNames: Array.isArray(rawBoostPerks.serverGuideChannelNames)
      ? rawBoostPerks.serverGuideChannelNames.map(String).slice(0, 10)
      : []
  };
  const botById = new Map(bots.map((bot) => [bot.id, bot]));
  const normalizedMembersWithBots = [
    ...members.map((member) => normalizeServerMember(member)),
    ...bots
      .filter((bot) => !members.some((member) => member.id === bot.id))
      .map((bot) => createServerBotMember(bot))
  ].map((member) => {
    if (!member.isBot) {
      return member;
    }

    const bot = botById.get(member.id);
    return { ...member, presence: bot && isBotRuntimeOnline(bot) ? "ONLINE" as PresenceStatus : "OFFLINE" as PresenceStatus };
  });
  const normalizedTimeouts = (
    Array.isArray(server.timeouts)
      ? server.timeouts
          .map((timeout) => normalizeServerTimeout(timeout))
          .filter((timeout): timeout is ServerTimeout => Boolean(timeout))
      : normalizedMembersWithBots
          .filter((member) => !member.isBot && isFutureIsoDate(member.timeoutUntil))
          .map((member) => ({
            id: `timeout-${member.id}`,
            userId: member.id,
            username: member.username,
            displayName: member.displayName,
            reason: "Castigo ativo.",
            timeoutBy: "Moderacao",
            timeoutUntil: member.timeoutUntil as string,
            createdAt: new Date().toISOString()
          }))
  ).slice(0, 250);
  const timeoutByUserId = new Map(normalizedTimeouts.map((timeout) => [timeout.userId, timeout]));
  const membersWithBots = normalizedMembersWithBots.map((member) => {
    const timeout = timeoutByUserId.get(member.id);
    return timeout && !member.isBot ? { ...member, timeoutUntil: timeout.timeoutUntil } : member;
  });
  const soundEffects = Array.isArray(server.expressions?.soundEffects)
    ? server.expressions.soundEffects
        .map((effect) => normalizeServerSoundEffect(effect))
        .filter((effect): effect is ServerSoundEffect => Boolean(effect))
        .slice(0, soundboardMaxSounds)
    : [];
  const customEmojis = Array.isArray(server.expressions?.customEmojis)
    ? server.expressions.customEmojis
        .map((emoji) => normalizeServerEmoji(emoji))
        .filter((emoji): emoji is ServerEmojiDefinition => Boolean(emoji))
        .slice(0, 100)
    : [];
  const rawAccess = { ...extras.access, ...(server.access ?? {}) };
  const accessRules = Array.isArray(rawAccess.rules)
    ? rawAccess.rules.map((rule) => String(rule).trim()).filter(Boolean).slice(0, 12)
    : [];
  const entryMode: ServerAccessMode =
    rawAccess.entryMode === "request" || rawAccess.entryMode === "discoverable"
      ? rawAccess.entryMode
      : rawAccess.approvalRequired
      ? "request"
      : server.isDiscoverable
      ? "discoverable"
      : "invite";

  return {
    id: String(server.id || `server-${Date.now()}`),
    name: serverName,
    initials: String(server.initials || getInitials(serverName) || "SV"),
    iconUrl: sanitizeImageSource(server.iconUrl),
    ownerId: String(server.ownerId || user.id),
    purpose: server.purpose === "friends" ? "friends" : "community",
    templateId: server.templateId,
    serverTag: server.serverTag ?? extras.serverTag,
    description: String(server.description || "Servidor salvo no Tempest Light."),
    bannerColor: String(server.bannerColor || "#30343a"),
    memberListVisible: server.memberListVisible ?? true,
    isDiscoverable: server.isDiscoverable ?? false,
    notificationsEnabled: server.notificationsEnabled ?? true,
    communityEnabled: server.communityEnabled ?? false,
    rulesChannelName: server.rulesChannelName ?? null,
    updatesChannelName: server.updatesChannelName ?? null,
    safetyChannelName: server.safetyChannelName ?? null,
    language: server.language ?? "pt-BR",
    explicitMediaFilter: server.explicitMediaFilter ?? false,
    emailVerificationRequired: server.emailVerificationRequired ?? false,
    riskyPermissionsDisabled: server.riskyPermissionsDisabled ?? false,
    boostProgressVisible: server.boostProgressVisible ?? false,
    boostMessageEnabled: server.boostMessageEnabled ?? false,
    boostMessageChannelName: server.boostMessageChannelName ?? null,
    engagement: { ...extras.engagement, ...(server.engagement ?? {}) },
    expressions: { ...extras.expressions, ...(server.expressions ?? {}), soundEffects, customEmojis },
    access: {
      ...rawAccess,
      entryMode,
      approvalRequired: entryMode === "request",
      ageRestricted: Boolean(rawAccess.ageRestricted),
      rulesEnabled: Boolean(rawAccess.rulesEnabled),
      rules: accessRules,
      minAccountAgeDays:
        typeof server.access?.minAccountAgeDays === "number"
          ? Math.min(Math.max(Math.floor(server.access.minAccountAgeDays), 0), 90)
          : extras.access.minAccountAgeDays
    },
    apps: { ...extras.apps, ...(server.apps ?? {}) },
    analytics: { ...extras.analytics, ...(server.analytics ?? {}) },
    invites: Array.isArray(server.invites) ? server.invites.map((invite) => normalizeServerInvite(invite)) : extras.invites,
    bans: Array.isArray(server.bans)
      ? server.bans.map((ban) => normalizeServerBan(ban)).filter((ban): ban is ServerBan => Boolean(ban))
      : extras.bans,
    timeouts: normalizedTimeouts,
    automod: { ...extras.automod, ...(server.automod ?? {}) },
    security: { ...extras.security, ...(server.security ?? {}) },
    boosts: normalizedBoosts,
    boostPerks,
    bots,
    auditLogs: Array.isArray(server.auditLogs) ? server.auditLogs.slice(0, 250) : [],
    categories,
    roles,
    members: membersWithBots
  };
}

function formatMessageClock(value: string) {
  const date = new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return safeDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function onlineServerMessageToLocalMessage(message: OnlineServerMessage): LocalMessage {
  const mentions = message.mentions && Array.isArray(message.mentions.mentions) ? (message.mentions.mentions as MessageMention[]) : [];
  const mentionedUserIds =
    message.mentions && Array.isArray(message.mentions.mentionedUserIds)
      ? message.mentions.mentionedUserIds.filter((item): item is string => typeof item === "string")
      : [];
  const mentionedUsernames =
    message.mentions && Array.isArray(message.mentions.mentionedUsernames)
      ? message.mentions.mentionedUsernames.filter((item): item is string => typeof item === "string")
      : [];

  return {
    id: message.id,
    authorId: message.authorId,
    authorUsername: message.authorUsername,
    author: message.authorDisplayName,
    authorAvatarUrl: message.authorAvatarUrl,
    authorIsBot: message.authorIsBot,
    time: formatMessageClock(message.createdAt),
    createdAt: message.createdAt,
    text: message.content,
    serverId: message.serverId,
    channelName: message.channelName,
    mentions,
    mentionedUserIds,
    mentionedUsernames
  };
}

function directSummaryToContact(summary: DirectConversationSummary): DirectContact {
  return {
    id: summary.id,
    username: summary.participant.username,
    displayName: summary.participant.displayName,
    avatarUrl: summary.participant.avatarUrl,
    customStatus: summary.participant.customStatus,
    createdAt: null,
    status: summary.participant.presence,
    isFriend: summary.isFriend,
    blocksNonFriendMessages: !summary.canMessage
  };
}

function directConversationToContact(conversation: DirectConversation): DirectContact {
  return {
    id: conversation.id,
    username: conversation.participant.username,
    displayName: conversation.participant.displayName,
    avatarUrl: conversation.participant.avatarUrl,
    customStatus: conversation.participant.customStatus,
    createdAt: null,
    status: conversation.participant.presence,
    isFriend: conversation.isFriend,
    blocksNonFriendMessages: !conversation.canMessage
  };
}

function onlineDirectMessageToLocalMessage(message: DirectMessage): LocalMessage {
  return {
    authorId: message.authorId,
    author: message.authorDisplayName,
    time: formatMessageClock(message.createdAt),
    createdAt: message.createdAt,
    text: message.content
  };
}

function getServerChannelReadKey(serverId: string, channelName: string) {
  return `${serverId}:${channelName}`;
}

function getDirectConversationReadKey(conversationId: string) {
  return conversationId;
}

function getVoiceChatChannelName(channelName: string) {
  return `call:${channelName}`;
}

function getLatestMessageReadToken(messages: LocalMessage[]) {
  const latestTimestamp = messages.reduce((latest, message) => {
    const timestamp = Date.parse(message.createdAt ?? "");
    return Number.isNaN(timestamp) ? latest : Math.max(latest, timestamp);
  }, 0);

  return latestTimestamp ? new Date(latestTimestamp).toISOString() : "";
}

function messageBelongsToCurrentUser(message: LocalMessage, user: AuthUser) {
  return (
    message.authorId === user.id ||
    message.authorUsername?.toLowerCase() === user.username.toLowerCase() ||
    message.author === user.displayName
  );
}

function hasUnreadMessages(messages: LocalMessage[], readAt: string | undefined, user: AuthUser) {
  const readTimestamp = Date.parse(readAt ?? "");
  return messages.some((message) => {
    if (messageBelongsToCurrentUser(message, user)) {
      return false;
    }

    const timestamp = Date.parse(message.createdAt ?? "");
    if (Number.isNaN(timestamp)) {
      return false;
    }

    return Number.isNaN(readTimestamp) || timestamp > readTimestamp;
  });
}

function getLocalMessageIdentity(message: LocalMessage) {
  return (
    message.id ??
    [
      message.serverId ?? "direct",
      message.channelName ?? "",
      message.authorId ?? message.authorUsername ?? message.author,
      message.createdAt ?? message.time,
      message.text
    ].join("|")
  );
}

function appendUniqueLocalMessages(current: LocalMessage[], additions: LocalMessage[]) {
  const seen = new Set(current.map((message) => getLocalMessageIdentity(message)));
  const next = [...current];

  additions.forEach((message) => {
    const identity = getLocalMessageIdentity(message);
    if (seen.has(identity)) {
      return;
    }

    seen.add(identity);
    next.push(message);
  });

  return next;
}

export default function App() {
  const api = useMemo(() => (API_CONFIGURED ? createApiClient(API_URL, () => localStorage.getItem(TOKEN_KEY)) : null), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [error, setError] = useState<string | null>(null);
  const [availableUpdate, setAvailableUpdate] = useState<TempestLightDesktopUpdateResult | null>(null);
  const [updateDialogVisible, setUpdateDialogVisible] = useState(false);
  const [updateDialogState, setUpdateDialogState] = useState<InAppUpdateState>("available");
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateDialogMessage, setUpdateDialogMessage] = useState<string | null>(null);
  const [dismissedUpdateVersion, setDismissedUpdateVersion] = useState<string | null>(null);
  const [emailVerificationToken, setEmailVerificationToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return window.location.pathname.endsWith("/verify-email") ? params.get("token") : null;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!window.tempestLightDesktop) {
      return undefined;
    }

    return window.tempestLightDesktop.onUpdateProgress((progress) => {
      const percent = Math.max(0, Math.min(100, Math.round(progress.percent)));
      setUpdateProgress(percent);
      if (percent >= 100) {
        setUpdateDialogState("restarting");
        setUpdateDialogMessage("Atualizacao baixada. O programa sera reiniciado para manter a nova versao.");
      }
    });
  }, []);

  useEffect(() => {
    if (!user || !window.tempestLightDesktop) {
      return undefined;
    }

    let cancelled = false;

    async function checkAvailableUpdate() {
      try {
        const appInfo = await window.tempestLightDesktop?.getAppInfo();
        if (!appInfo?.packaged || !appInfo.updateFeedConfigured) {
          return;
        }

        const result = await window.tempestLightDesktop?.checkForUpdates();
        if (cancelled || !result || result.status !== "available" || result.version === dismissedUpdateVersion) {
          return;
        }

        setAvailableUpdate(result);
        setUpdateDialogState("available");
        setUpdateProgress(0);
        setUpdateDialogMessage(null);
        setUpdateDialogVisible(true);
      } catch {
        // The launcher already has a manual checker; avoid interrupting login for transient network errors.
      }
    }

    void checkAvailableUpdate();

    return () => {
      cancelled = true;
    };
  }, [dismissedUpdateVersion, user]);

  useEffect(() => {
    async function restoreSession() {
      if (!api) {
        localStorage.removeItem(TOKEN_KEY);
        setError("Configure a API online do Tempest Light para entrar.");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setUser(mergeUserWithLocalProfileImages(await api.me()));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    }

    void restoreSession();
  }, [api]);

  function handleAuth(auth: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, auth.accessToken);
    setUser(mergeUserWithLocalProfileImages(auth.user));
    setError(null);
  }

  async function handleLogout() {
    if (api) {
      try {
        await api.logout();
      } catch {
        // Local logout still protects the browser if the API is temporarily unavailable.
      }
    }

    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  function dismissUpdateDialog() {
    if (availableUpdate?.version) {
      setDismissedUpdateVersion(availableUpdate.version);
    }
    setUpdateDialogVisible(false);
    setUpdateDialogMessage(null);
  }

  async function verifyAndInstallUpdate() {
    if (!window.tempestLightDesktop) {
      setUpdateDialogState("error");
      setUpdateDialogMessage("Atualizacao automatica disponivel apenas no app instalado.");
      return;
    }

    setUpdateDialogState("checking");
    setUpdateDialogMessage("Verificando arquivos no GitHub...");
    setUpdateProgress(0);

    try {
      const result = await window.tempestLightDesktop.checkForUpdates();
      if (result.status !== "available") {
        setUpdateDialogState(result.status === "current" ? "current" : "error");
        setUpdateDialogMessage(result.status === "current" ? "Voce ja esta usando a versao mais recente." : result.message ?? "Nao foi possivel confirmar a atualizacao.");
        return;
      }

      setAvailableUpdate(result);
      setUpdateDialogState("installing");
      setUpdateDialogMessage("Baixando atualizacao...");

      const installResult = await window.tempestLightDesktop.installUpdate();
      if (!installResult.ok) {
        setUpdateDialogState("error");
        setUpdateDialogMessage(installResult.message ?? "Nao foi possivel instalar a atualizacao.");
        return;
      }

      setUpdateProgress(100);
      setUpdateDialogState("restarting");
      setUpdateDialogMessage("Atualizacao baixada. O programa sera reiniciado para manter a nova versao.");
    } catch {
      setUpdateDialogState("error");
      setUpdateDialogMessage("Falha ao baixar a atualizacao pelo GitHub.");
    }
  }

  async function handleProfileSave(input: UpdateProfileInput) {
    if (!api) {
      throw new Error("API online obrigatoria para salvar o perfil.");
    }

    try {
      const updatedUser = await api.updateMe(input);
      updateLocalProfileImages(updatedUser, input);
      const mergedUser = mergeUserWithLocalProfileImages(updatedUser);
      setUser(mergedUser);
      return mergedUser;
    } catch (caught) {
      if (!isLegacyProfileImageValidationError(caught) || (!isDataImageSource(input.avatarUrl) && !isDataImageSource(input.bannerUrl))) {
        throw caught;
      }

      const fallbackInput = { ...input };
      delete fallbackInput.avatarUrl;
      delete fallbackInput.bannerUrl;
      const updatedUser = await api.updateMe(fallbackInput);
      updateLocalProfileImages(updatedUser, input);
      const mergedUser = mergeUserWithLocalProfileImages(updatedUser);
      setUser(mergedUser);
      return mergedUser;
    }
  }

  function closeVerificationView() {
    window.history.replaceState(null, "", "/");
    setEmailVerificationToken(null);
  }

  if (emailVerificationToken && api) {
    return <VerifyEmailView api={api} token={emailVerificationToken} onDone={closeVerificationView} />;
  }

  if (loading) {
    return (
      <main className="loading-screen" style={brandCoverStyle}>
        <BrandLogo className="loading-brand-logo" />
      </main>
    );
  }

  if (!user) {
    return <AuthView api={api} onAuth={handleAuth} error={error} setError={setError} />;
  }

  return (
    <>
      <WorkspaceShell
        key={user.id}
        user={user}
        theme={theme}
        setTheme={setTheme}
        onLogout={handleLogout}
        onProfileSave={handleProfileSave}
        onUserChange={setUser}
        api={api}
      />
      {updateDialogVisible && availableUpdate ? (
        <InAppUpdateDialog
          update={availableUpdate}
          state={updateDialogState}
          progress={updateProgress}
          message={updateDialogMessage}
          onClose={dismissUpdateDialog}
          onVerifyInstall={() => void verifyAndInstallUpdate()}
        />
      ) : null}
    </>
  );
}

function BrandLogo({ className = "" }: { className?: string }) {
  return <img className={["brand-logo", className].filter(Boolean).join(" ")} src={BRAND_LOGO_URL} alt="Tempest Night" />;
}

function VerifyEmailView({
  api,
  token,
  onDone
}: {
  api: ReturnType<typeof createApiClient>;
  token: string;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<"checking" | "done" | "error">("checking");
  const [message, setMessage] = useState("Ativando sua conta...");

  useEffect(() => {
    let mounted = true;

    async function verify() {
      try {
        const response = await api.verifyEmail({ token });
        if (!mounted) {
          return;
        }

        setStatus("done");
        setMessage(`Conta @${response.user.username} ativada. Agora entre com seu nick e senha.`);
      } catch (caught) {
        if (!mounted) {
          return;
        }

        setStatus("error");
        setMessage(caught instanceof ApiError ? caught.message : "Nao foi possivel ativar esta conta.");
      }
    }

    void verify();

    return () => {
      mounted = false;
    };
  }, [api, token]);

  return (
    <main className="auth-screen verify-screen" style={brandCoverStyle}>
      <section className="auth-panel" aria-label="Ativacao de conta Tempest Light">
        <div className="auth-brand">
          <BrandLogo />
          <div>
            <h1>Tempest Light</h1>
            <p>Ativacao de conta</p>
          </div>
        </div>

        <div className={`activation-status ${status}`}>
          {status === "done" ? <CheckCircle2 size={24} /> : status === "checking" ? <Circle size={24} /> : <Shield size={24} />}
          <p>{message}</p>
        </div>

        <Button className="submit-button" variant="primary" type="button" onClick={onDone}>
          Ir para entrada
        </Button>
      </section>
    </main>
  );
}

function InAppUpdateDialog({
  update,
  state,
  progress,
  message,
  onClose,
  onVerifyInstall
}: {
  update: TempestLightDesktopUpdateResult;
  state: InAppUpdateState;
  progress: number;
  message: string | null;
  onClose: () => void;
  onVerifyInstall: () => void;
}) {
  const busy = state === "checking" || state === "installing" || state === "restarting";
  const canClose = !busy;
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const title =
    state === "restarting"
      ? "Atualizacao pronta"
      : state === "installing"
        ? "Baixando atualizacao"
        : state === "checking"
          ? "Verificando GitHub"
          : state === "current"
            ? "Programa atualizado"
            : state === "error"
              ? "Falha na atualizacao"
              : "Atualizacao disponivel";
  const actionLabel =
    state === "checking"
      ? "Verificando..."
      : state === "installing"
        ? `Baixando ${normalizedProgress}%`
        : state === "restarting"
          ? "Reiniciando..."
          : state === "error"
            ? "Tentar novamente"
            : "Verificar atualizacao";

  return (
    <div className="modal-backdrop update-backdrop" role="presentation" onMouseDown={canClose ? onClose : undefined}>
      <section className="modal-panel update-panel" aria-label="Atualizacao do Tempest Light" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div className="update-icon">
            {state === "restarting" || state === "current" ? <CheckCircle2 size={24} /> : state === "error" ? <Shield size={24} /> : <Download size={24} />}
          </div>
          <div>
            <span>Tempest Light</span>
            <h2>{title}</h2>
            <p>Versao {update.version ?? "nova"} encontrada no GitHub.</p>
          </div>
          {canClose ? (
            <button className="icon-button" title="Fechar aviso" type="button" onClick={onClose}>
              <X size={18} />
            </button>
          ) : null}
        </header>

        {update.notes ? <p className="update-notes">{update.notes}</p> : null}
        {message ? <p className={state === "error" ? "update-message error" : "update-message"}>{message}</p> : null}

        <div className="update-progress" aria-label="Progresso do download" aria-valuemax={100} aria-valuemin={0} aria-valuenow={normalizedProgress} role="progressbar">
          <span style={{ width: `${normalizedProgress}%` }} />
        </div>
        <small>{normalizedProgress}%</small>

        <div className="update-actions">
          {canClose ? (
            <Button variant="secondary" type="button" onClick={onClose}>
              Agora nao
            </Button>
          ) : null}
          <Button variant="primary" type="button" onClick={onVerifyInstall} disabled={busy}>
            {actionLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

function AuthView({
  api,
  onAuth,
  error,
  setError
}: {
  api: ReturnType<typeof createApiClient> | null;
  onAuth: (auth: AuthResponse) => void;
  error: string | null;
  setError: (error: string | null) => void;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [devVerificationUrl, setDevVerificationUrl] = useState<string | null>(null);
  const [lastIdentifier, setLastIdentifier] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);

  useEffect(() => {
    setTermsAccepted(false);
    setTermsError(null);
    setTermsOpen(false);
  }, [mode]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    setDevVerificationUrl(null);
    const form = new FormData(event.currentTarget);

    try {
      if (mode === "register" && form.get("termsAccepted") !== "on") {
        setTermsError("Obrigatorio preencher este campo para aceitar os Termos de Uso.");
        return;
      }
      setTermsError(null);

      if (!api) {
        throw new Error("API online nao configurada. Corrija a URL da API antes de entrar.");
      }

      if (mode === "login") {
        const identifier = String(form.get("emailOrUsername") ?? "");
        const twoFactorCode = String(form.get("twoFactorCode") ?? "").replace(/\D/g, "").slice(0, 6);
        setLastIdentifier(identifier);
        onAuth(
          await api.login({
            emailOrUsername: identifier,
            password: String(form.get("password") ?? ""),
            ...(twoFactorCode ? { twoFactorCode } : {})
          })
        );
      } else {
        const password = String(form.get("password") ?? "");
        const username = normalizeAccountUsername(String(form.get("nickname") ?? form.get("username") ?? ""));
        if (username.toLowerCase() === password.trim().toLowerCase()) {
          throw new Error("O nick nao pode ser igual a senha. Digite o nick que vai aparecer no perfil.");
        }

        const response = await api.register({
          email: String(form.get("email") ?? ""),
          username,
          password,
          confirmPassword: password,
          birthDate: String(form.get("birthDate") ?? "")
        });

        setMode("login");
        setLastIdentifier(response.username);
        showVerificationNotice(response);
      }
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel concluir a acao.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerification() {
    if (!api) {
      setError("API online nao configurada. Corrija a URL da API antes de reenviar a ativacao.");
      return;
    }

    const identifier = lastIdentifier.trim();
    if (!identifier) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);
    setDevVerificationUrl(null);

    try {
      const response = await api.resendVerification({ emailOrUsername: identifier });
      if (!response.emailVerificationRequired) {
        setNotice("Essa conta ja esta ativada. Entre com seu nick e senha.");
      } else {
        setNotice(
          response.verificationEmailSent
            ? "Enviamos outro e-mail de ativacao."
            : "Geramos outro link de ativacao. Configure SMTP na host para envio real."
        );
        setDevVerificationUrl(response.devVerificationUrl ?? null);
      }
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel reenviar a ativacao.");
    } finally {
      setSubmitting(false);
    }
  }

  function showVerificationNotice(response: RegisterResponse) {
    setNotice(
      response.verificationEmailSent
        ? `Cadastro criado para @${response.username}. Verifique o e-mail ${response.email} para ativar a conta.`
        : `Cadastro criado para @${response.username}. Configure SMTP na host para enviar o e-mail real de ativacao.`
    );
    setDevVerificationUrl(response.devVerificationUrl ?? null);
  }

  return (
    <main className="auth-screen" style={brandCoverStyle}>
      <section className="auth-panel" aria-label="Acesso Tempest Light">
        <div className="auth-brand">
          <BrandLogo />
          <div>
            <h1>Tempest Light</h1>
            <p>Comunidades, voz e presenca em uma base propria.</p>
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Modo de acesso">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
            Entrar
          </button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">
            Criar conta
          </button>
        </div>

        <form className="auth-form" key={mode} onSubmit={onSubmit}>
          {mode === "login" ? (
            <>
              <label>
                Nick ou e-mail
                <input name="emailOrUsername" autoComplete="username" required />
              </label>
              <label>
                Senha
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
              <label>
                Codigo do autenticador
                <input
                  name="twoFactorCode"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  autoComplete="one-time-code"
                  placeholder="Opcional, se o 2FA estiver ativo"
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Email
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label>
                Nick
                <input name="nickname" autoComplete="nickname" minLength={3} maxLength={32} spellCheck={false} required />
              </label>
              <label>
                Data de nascimento
                <input name="birthDate" type="date" required />
              </label>
              <label>
                Senha
                <input name="password" type="password" autoComplete="new-password" minLength={10} required />
              </label>
              <label className="terms-check">
                <input
                  name="termsAccepted"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => {
                    setTermsAccepted(event.target.checked);
                    if (event.target.checked) {
                      setTermsError(null);
                    }
                  }}
                />
                <span>
                  Li e concordo com os{" "}
                  <button className="terms-inline-button" type="button" onClick={() => setTermsOpen(true)}>
                    Termos de Uso
                  </button>
                  .
                </span>
              </label>
              {termsError ? <p className="terms-error">{termsError}</p> : null}
            </>
          )}

          {notice ? <p className="form-success">{notice}</p> : null}
          {devVerificationUrl ? (
            <a className="dev-link" href={devVerificationUrl} target="_blank" rel="noreferrer">
              Abrir link de ativacao de teste
            </a>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <Button className="submit-button" variant="primary" type="submit" disabled={submitting}>
            {submitting ? "Enviando..." : mode === "login" ? "Entrar" : "Concluir cadastro"}
          </Button>
          {mode === "login" && lastIdentifier && api ? (
            <Button variant="secondary" type="button" onClick={resendVerification} disabled={submitting}>
              Reenviar ativacao
            </Button>
          ) : null}
        </form>
        {mode === "login" ? <PasswordResetBox api={api} defaultIdentifier={lastIdentifier} /> : null}
      </section>

      <aside className="auth-status">
        <div className="status-line">
          <Shield size={18} />
          Argon2id e sessoes revogaveis
        </div>
        <div className="status-line">
          <Circle size={18} />
          Presenca sincronizada pela API online
        </div>
        <div className="status-line">
          <Sparkles size={18} />
          UI web e desktop compartilhaveis
        </div>
      </aside>

      {termsOpen ? <TermsDialog onClose={() => setTermsOpen(false)} /> : null}
    </main>
  );
}

function PasswordResetBox({
  api,
  defaultIdentifier = "",
  compact = false
}: {
  api: ReturnType<typeof createApiClient> | null | undefined;
  defaultIdentifier?: string;
  compact?: boolean;
}) {
  const [step, setStep] = useState<"request" | "code" | "new">("request");
  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setIdentifier((current) => (current.trim() ? current : defaultIdentifier));
  }, [defaultIdentifier]);

  async function submitRequest(event: FormEvent) {
    event.preventDefault();
    if (!api) {
      setError("API online obrigatoria para recuperar senha.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await api.requestPasswordReset({ emailOrUsername: identifier });
      setStep("code");
      setNotice(
        response.passwordResetEmailSent
          ? "Enviamos um codigo para esse e-mail."
          : response.devResetCode
          ? `Codigo de teste: ${response.devResetCode}`
          : "Codigo gerado. Configure SMTP na host para envio real por e-mail."
      );
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel enviar o codigo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    if (!api) {
      setError("API online obrigatoria para conferir o codigo.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await api.verifyPasswordResetCode({
        emailOrUsername: identifier,
        code: code.replace(/\D/g, "").slice(0, 6)
      });
      setResetToken(response.resetToken);
      setStep("new");
      setNotice("Codigo confirmado. Digite a nova senha.");
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : "Codigo invalido ou expirado.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitNewPassword(event: FormEvent) {
    event.preventDefault();
    if (!api) {
      setError("API online obrigatoria para trocar senha.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("A confirmacao precisa ser igual a nova senha.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await api.confirmPasswordReset({
        resetToken,
        newPassword,
        confirmPassword
      });
      setStep("request");
      setCode("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Senha alterada. A senha antiga nao entra mais.");
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel trocar a senha.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={compact ? "password-reset-card compact" : "password-reset-card"} aria-label="Recuperar senha">
      <header>
        <Lock size={17} />
        <div>
          <strong>Esqueceu a senha?</strong>
          <span>Receba um codigo, confira e defina uma senha nova.</span>
        </div>
      </header>

      {step === "request" ? (
        <form className="profile-form" onSubmit={submitRequest}>
          <label>
            E-mail ou nick da conta
            <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" required />
          </label>
          <Button variant="secondary" type="submit" disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar codigo"}
          </Button>
        </form>
      ) : step === "code" ? (
        <form className="profile-form" onSubmit={submitCode}>
          <label>
            Codigo recebido
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              required
            />
          </label>
          <div className="security-actions">
            <Button variant="secondary" type="button" onClick={() => setStep("request")}>
              Voltar
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "Conferindo..." : "Conferir codigo"}
            </Button>
          </div>
        </form>
      ) : (
        <form className="profile-form" onSubmit={submitNewPassword}>
          <label>
            Nova senha
            <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" minLength={10} required />
          </label>
          <label>
            Confirmar nova senha
            <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" minLength={10} required />
          </label>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : "Concluido"}
          </Button>
        </form>
      )}

      {notice ? <p className="form-success">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}

function TermsDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-panel terms-panel" aria-label="Termos de Uso Tempest Light" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>Tempest Light</span>
            <h2>Termos de Uso</h2>
            <p>Ultima atualizacao: 01/09/2026</p>
          </div>
          <button className="icon-button" title="Fechar termos" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="terms-content">
          {termsOfUseSections.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
        <Button variant="primary" type="button" onClick={onClose}>
          Entendi
        </Button>
      </section>
    </div>
  );
}

function WorkspaceShell({
  user,
  theme,
  setTheme,
  onLogout,
  onProfileSave,
  onUserChange,
  linkedAccounts = [],
  onConnectLinkedAccount,
  onSwitchLinkedAccount,
  onRemoveLinkedAccount,
  api
}: {
  user: AuthUser;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  onLogout: () => void;
  onProfileSave: (input: UpdateProfileInput) => Promise<AuthUser>;
  onUserChange: (user: AuthUser) => void;
  linkedAccounts?: AuthUser[];
  onConnectLinkedAccount?: (input: LinkedAccountLoginInput) => Promise<AuthUser>;
  onSwitchLinkedAccount?: (accountId: string) => void;
  onRemoveLinkedAccount?: (accountId: string) => void;
  api?: ReturnType<typeof createApiClient> | null;
}) {
  const savedWorkspaceState = useMemo(() => readWorkspaceState(user), [user.id, user.username]);
  const initialSavedDirectContacts = savedWorkspaceState?.directContacts ?? initialDirectContacts;
  const [activeView, setActiveView] = useState<ShellView>(() => savedWorkspaceState?.activeView ?? "direct");
  const [activeChannel, setActiveChannel] = useState(() => savedWorkspaceState?.activeChannel ?? "geral");
  const [servers, setServers] = useState<ServerDefinition[]>(() => savedWorkspaceState?.servers ?? []);
  const [activeServerId, setActiveServerId] = useState<string | null>(() => savedWorkspaceState?.activeServerId ?? null);
  const [voiceChannel, setVoiceChannel] = useState<string | null>(null);
  const [voiceConnectedAt, setVoiceConnectedAt] = useState<number | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [voiceDeafened, setVoiceDeafened] = useState(false);
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const [voiceSoundboardOpen, setVoiceSoundboardOpen] = useState(false);
  const [voiceChatDraft, setVoiceChatDraft] = useState("");
  const [screenShareQuality, setScreenShareQuality] = useState<ScreenShareQualityId>("720p");
  const [screenShareFps, setScreenShareFps] = useState<30 | 60>(30);
  const [voiceShareMenuOpen, setVoiceShareMenuOpen] = useState(false);
  const [voiceCaptureMode, setVoiceCaptureMode] = useState<ScreenShareCaptureMode>("screen");
  const [voiceCaptureSources, setVoiceCaptureSources] = useState<TempestLightDesktopCaptureSource[]>([]);
  const [selectedVoiceCaptureSourceId, setSelectedVoiceCaptureSourceId] = useState("");
  const [voiceCaptureSourcesLoading, setVoiceCaptureSourcesLoading] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileCardUser, setProfileCardUser] = useState<ProfileCardUser | null>(null);
  const [mentionInboxOpen, setMentionInboxOpen] = useState(false);
  const [mentionNotifications, setMentionNotifications] = useState<MentionNotification[]>(() => readMentionNotifications(user));
  const [serverGuideOpen, setServerGuideOpen] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const [serverSettingsInitialView, setServerSettingsInitialView] = useState<ServerSettingsView>("profile");
  const [createServerStep, setCreateServerStep] = useState<CreateServerStep | null>(null);
  const [pendingServerPurpose, setPendingServerPurpose] = useState<ServerPurpose>("community");
  const [pendingServerTemplateId, setPendingServerTemplateId] = useState<ServerTemplateId>("blank");
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [draggedCategoryName, setDraggedCategoryName] = useState<string | null>(null);
  const [draggedChannel, setDraggedChannel] = useState<{ groupName: string; channelName: string } | null>(null);
  const [voiceSettingsTarget, setVoiceSettingsTarget] = useState<{ groupName: string; channelName: string } | null>(null);
  const [serverNotice, setServerNotice] = useState<string | null>(null);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [inviteCodeDraft, setInviteCodeDraft] = useState("");
  const [messages, setMessages] = useState<LocalMessage[]>(() => savedWorkspaceState?.messages ?? initialMessages);
  const [draft, setDraft] = useState("");
  const [draftAttachments, setDraftAttachments] = useState<ChatAttachment[]>([]);
  const [composerPasteMenu, setComposerPasteMenu] = useState<{ x: number; y: number; target: ChatComposerTarget } | null>(null);
  const [externalLinkPrompt, setExternalLinkPrompt] = useState<{ link: string; risky: boolean } | null>(null);
  const [directContacts, setDirectContacts] = useState<DirectContact[]>(() => initialSavedDirectContacts);
  const [activeDirectId, setActiveDirectId] = useState<string | null>(
    () => savedWorkspaceState?.activeDirectId ?? initialSavedDirectContacts[0]?.id ?? null
  );
  const [directMessages, setDirectMessages] = useState<Record<string, LocalMessage[]>>(
    () => savedWorkspaceState?.directMessages ?? initialDirectMessages
  );
  const [readServerChannelAt, setReadServerChannelAt] = useState<Record<string, string>>(
    () => savedWorkspaceState?.readServerChannelAt ?? {}
  );
  const [readDirectConversationAt, setReadDirectConversationAt] = useState<Record<string, string>>(
    () => savedWorkspaceState?.readDirectConversationAt ?? {}
  );
  const [steamActivity, setSteamActivity] = useState<SteamActivitySettings>(
    () => savedWorkspaceState?.steamActivity ?? defaultSteamActivitySettings
  );
  const [activityCardsVisible, setActivityCardsVisible] = useState(() => savedWorkspaceState?.activityCardsVisible ?? true);
  const [directDraft, setDirectDraft] = useState("");
  const [directDraftAttachments, setDirectDraftAttachments] = useState<ChatAttachment[]>([]);
  const [directUsername, setDirectUsername] = useState("");
  const [directNotice, setDirectNotice] = useState<string | null>(null);
  const [friendRequests, setFriendRequests] = useState<{ incoming: FriendRequestItem[]; outgoing: FriendRequestItem[] }>({
    incoming: [],
    outgoing: []
  });
  const [lastServerMessageAt, setLastServerMessageAt] = useState<Record<string, number>>({});
  const [onlineVoiceStates, setOnlineVoiceStates] = useState<OnlineVoiceState[]>([]);
  const [onlineDiscoverServers, setOnlineDiscoverServers] = useState<ServerDefinition[]>([]);
  const [onlineSyncStatus, setOnlineSyncStatus] = useState<"idle" | "syncing" | "error">("idle");
  const serverSyncHashesRef = useRef<Record<string, string>>({});
  const serverSyncLoadedRef = useRef(false);
  const serverSyncTimeoutRef = useRef<number | null>(null);
  const serversRef = useRef(servers);
  const userRef = useRef(user);
  const lastPresenceActivityAtRef = useRef(Date.now());
  const lastPresenceHeartbeatAtRef = useRef(0);
  const presenceUpdateInFlightRef = useRef<Promise<void> | null>(null);
  const previousOnlineVoiceServerRef = useRef<string | null>(null);
  const serverFileInputRef = useRef<HTMLInputElement | null>(null);
  const directFileInputRef = useRef<HTMLInputElement | null>(null);
  const playedVoiceSoundEffectEventsRef = useRef<Set<string>>(new Set());
  const onlineMode = Boolean(api);
  const activeServer = servers.find((server) => server.id === activeServerId) ?? null;
  const activeServerMember = activeServer?.members.find((member) => member.id === user.id) ?? null;
  const canManageRoles = memberHasPermission(activeServer, activeServerMember, "manage_roles", user.id);
  const canManageChannels = memberHasPermission(activeServer, activeServerMember, "manage_channels", user.id);
  const canCreateInvite = memberHasPermission(activeServer, activeServerMember, "create_invite", user.id);
  const canCreateEvents = memberHasPermission(activeServer, activeServerMember, "create_events", user.id);
  const canSendServerMessages = memberHasPermission(activeServer, activeServerMember, "send_messages", user.id);
  const canAttachFiles = memberHasPermission(activeServer, activeServerMember, "attach_files", user.id);
  const canConnectVoice = memberHasPermission(activeServer, activeServerMember, "connect", user.id);
  const canSetVoiceStatus = memberHasPermission(activeServer, activeServerMember, "set_voice_channel_status", user.id);
  const canUseSoundboard = memberHasPermission(activeServer, activeServerMember, "use_soundboard", user.id);
  const canShareVideo = memberHasPermission(activeServer, activeServerMember, "video", user.id);
  const activeMemberTimeoutNotice = getMemberTimeoutNotice(activeServerMember, nowTick);

  serversRef.current = servers;
  userRef.current = user;

  useEffect(() => {
    if (!api) {
      return undefined;
    }

    let disposed = false;
    const presenceApi = api;
    const apiBaseUrl = API_URL.replace(/\/$/, "");

    function applyLocalPresence(nextPresence: PresenceStatus) {
      const currentUser = userRef.current;
      if (currentUser.presence === nextPresence) {
        return;
      }

      const nextUser = { ...currentUser, presence: nextPresence };
      userRef.current = nextUser;
      onUserChange(nextUser);
    }

    async function pushPresence(nextPresence: PresenceStatus, options: { force?: boolean; heartbeat?: boolean } = {}) {
      const currentUser = userRef.current;
      const manualMode = isManualPresenceMode(currentUser.presence);
      if (manualMode && !options.force) {
        return;
      }

      const now = Date.now();
      if (
        currentUser.presence === nextPresence &&
        !options.force &&
        (!options.heartbeat || now - lastPresenceHeartbeatAtRef.current < autoPresenceHeartbeatMs)
      ) {
        return;
      }

      applyLocalPresence(nextPresence);
      lastPresenceHeartbeatAtRef.current = now;
      const request = presenceApi
        .updateMe({ presence: nextPresence })
        .then((updatedUser) => {
          if (!disposed) {
            const mergedUser = mergeUserWithLocalProfileImages(updatedUser);
            userRef.current = mergedUser;
            onUserChange(mergedUser);
          }
        })
        .catch(() => undefined);

      presenceUpdateInFlightRef.current = request;
      await request;
      if (presenceUpdateInFlightRef.current === request) {
        presenceUpdateInFlightRef.current = null;
      }
    }

    function refreshPresenceFromActivity() {
      const currentUser = userRef.current;
      if (isManualPresenceMode(currentUser.presence)) {
        return;
      }

      const idle = document.hidden || Date.now() - lastPresenceActivityAtRef.current >= autoPresenceIdleAfterMs;
      const nextPresence: PresenceStatus = idle ? "IDLE" : "ONLINE";
      void pushPresence(nextPresence, { heartbeat: true });
    }

    function registerActivity() {
      lastPresenceActivityAtRef.current = Date.now();
      if (!document.hidden) {
        void pushPresence("ONLINE");
      }
    }

    function sendOfflinePresence() {
      applyLocalPresence("OFFLINE");
      const token = localStorage.getItem(TOKEN_KEY);
      if (!apiBaseUrl || !token) {
        return;
      }

      void fetch(`${apiBaseUrl}/auth/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ presence: "OFFLINE" }),
        keepalive: true
      }).catch(() => undefined);
    }

    autoPresenceActivityEvents.forEach((eventName) => {
      window.addEventListener(eventName, registerActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", refreshPresenceFromActivity);
    window.addEventListener("pagehide", sendOfflinePresence);
    window.addEventListener("beforeunload", sendOfflinePresence);

    registerActivity();
    const interval = window.setInterval(refreshPresenceFromActivity, autoPresenceCheckIntervalMs);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      autoPresenceActivityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, registerActivity);
      });
      document.removeEventListener("visibilitychange", refreshPresenceFromActivity);
      window.removeEventListener("pagehide", sendOfflinePresence);
      window.removeEventListener("beforeunload", sendOfflinePresence);
    };
  }, [api, onUserChange]);

  useEffect(() => {
    if (!composerPasteMenu) {
      return undefined;
    }

    const closeMenu = () => setComposerPasteMenu(null);
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [composerPasteMenu]);

  useEffect(() => {
    if (!voiceShareMenuOpen) {
      return undefined;
    }

    const closeMenu = () => setVoiceShareMenuOpen(false);
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [voiceShareMenuOpen]);

  useEffect(() => {
    if (!voiceShareMenuOpen || !window.tempestLightDesktop?.getDisplaySources) {
      return;
    }

    void loadVoiceCaptureSources(voiceCaptureMode);
  }, [voiceShareMenuOpen]);

  const canReorderServer = Boolean(activeServer && activeServer.ownerId === user.id);
  const canAdministerActiveServer = Boolean(
    activeServer &&
      (activeServer.ownerId === user.id ||
        isDeveloperUser(user) ||
        memberHasPermission(activeServer, activeServerMember, "administrator", user.id))
  );
  const canUseAccountSwitcher =
    Boolean(onConnectLinkedAccount && onSwitchLinkedAccount && onRemoveLinkedAccount) &&
    (isDeveloperUser(user) ||
      servers.some((server) => {
        const member = server.members.find((item) => item.id === user.id || item.username === user.username) ?? null;
        return server.ownerId === user.id || memberHasPermission(server, member, "administrator", user.id);
      }));
  const specialChannels = activeServer ? getAllServerChannels(activeServer).filter((channel) => channel.special) : [];
  const activeServerBoosts = activeServer ? getActiveBoosts(activeServer.boosts, nowTick) : [];
  const activeServerBoostLevel = getBoostLevel(activeServerBoosts.length);
  const activeServerNextBoostTarget = getNextBoostTarget(activeServerBoosts.length);
  const activeServerBoostOverflow = getBoostOverflowCount(activeServerBoosts.length);
  const activeServerBannerUrl = activeServer ? getServerBannerUrl(activeServer, activeServerBoostLevel) : null;
  const activeVoiceSoundEffects = activeServer?.expressions.soundEffects ?? [];
  const canUseVoiceSoundEffects = Boolean(
    activeServer &&
      voiceChannel &&
      canUseSoundboard &&
      activeServer.expressions.soundboardEnabled &&
      activeServer.expressions.soundEffectsEnabled &&
      activeVoiceSoundEffects.length
  );
  const activeServerAccentColor =
    activeServer && activeServerBoostLevel >= 4 && activeServer.boostPerks.serverAccentColor
      ? activeServer.boostPerks.serverAccentColor
      : null;
  const activeServerLegendaryTheme = Boolean(
    activeServer && activeServerBoostLevel >= SERVER_LEGENDARY_THEME_UNLOCK_LEVEL && activeServer.boostPerks.legendaryThemeEnabled
  );
  const canUseActiveServerGuide = Boolean(activeServer && activeServer.communityEnabled && activeServerBoostLevel >= SERVER_GUIDE_UNLOCK_LEVEL);
  const activeStarProgressGradient =
    activeServer && activeServerBoostLevel >= SERVER_BADGE_UNLOCK_LEVEL ? getStarProgressGradient(activeServer.boostPerks.starProgressPalette) : null;
  const activeVoiceChannelDetails =
    activeServer && voiceChannel
      ? getAllServerChannels(activeServer).find((channel) => channel.type === "voice" && channel.name === voiceChannel) ?? null
      : null;
  const activeServerVoiceStates = useMemo(
    () => (activeServer ? onlineVoiceStates.filter((state) => state.serverId === activeServer.id) : []),
    [activeServer?.id, onlineVoiceStates]
  );
  const onlineVoiceCall = useOnlineVoiceCall({
    active: onlineMode && Boolean(activeServer && voiceChannel),
    api,
    serverId: activeServer?.id ?? null,
    channelName: voiceChannel,
    currentUserId: user.id,
    participants: activeServerVoiceStates,
    muted: micMuted
  });
  const voiceSettingsChannel =
    activeServer && voiceSettingsTarget
      ? activeServer.categories
          .find((group) => group.name === voiceSettingsTarget.groupName)
          ?.channels.find((channel) => channel.type === "voice" && channel.name === voiceSettingsTarget.channelName) ?? null
      : null;
  const serverMemberGroups = useMemo(() => (activeServer ? getServerMemberGroups(activeServer) : []), [activeServer]);
  const visibleChannelGroups =
    activeServer?.categories.map((group) => ({
      ...group,
      channels: group.channels.filter((channel) => !channel.special)
    })) ?? [];
  const textChannels = activeServer ? getTextChannels(activeServer) : [];
  const activeChannelDetails = textChannels.find((channel) => channel.name === activeChannel) ?? textChannels[0];
  const channelIsPrivate = Boolean(activeChannelDetails?.isPrivate);
  const activeServerMessages = activeServer
    ? messages.filter(
        (message) =>
          (!message.serverId || message.serverId === activeServer.id) &&
          (!message.channelName || message.channelName === activeChannel)
      )
    : [];
  const serverMentionOptions = activeServer ? getMentionAutocompleteOptions(activeServer, draft) : [];
  const activeVoiceChatChannelName = voiceChannel ? getVoiceChatChannelName(voiceChannel) : null;
  const activeVoiceChatMessages =
    activeServer && activeVoiceChatChannelName
      ? messages.filter((message) => message.serverId === activeServer.id && message.channelName === activeVoiceChatChannelName)
      : [];
  const activeServerLatestReadToken = getLatestMessageReadToken(activeServerMessages);
  const activeDirectLatestReadToken = getLatestMessageReadToken(activeDirectId ? directMessages[activeDirectId] ?? [] : []);
  const activeVoiceChatLatestReadToken = getLatestMessageReadToken(activeVoiceChatMessages);
  const unreadMentionCount = mentionNotifications.filter((notification) => !notification.read).length;
  const unreadMentionCountsByChannel = useMemo(() => {
    const counts = new Map<string, number>();
    mentionNotifications
      .filter((notification) => !notification.read)
      .forEach((notification) => {
        const key = `${notification.serverId}:${notification.channelName}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    return counts;
  }, [mentionNotifications]);
  const activeDirect = directContacts.find((contact) => contact.id === activeDirectId) ?? null;
  const activeDirectMessages = activeDirect ? directMessages[activeDirect.id] ?? [] : [];
  const canMessageActiveDirect = activeDirect ? activeDirect.isFriend || !activeDirect.blocksNonFriendMessages : false;
  const activeDirectStatus = activeDirect
    ? activeDirect.isFriend
      ? "Amigos"
      : activeDirect.blocksNonFriendMessages
      ? "Bloqueia DMs de nao amigos"
      : "Nao amigo; DMs permitidas"
    : "Nenhuma conversa";
  const voiceElapsedLabel = voiceChannel && voiceConnectedAt ? formatElapsedDuration(nowTick - voiceConnectedAt) : null;
  const voiceActivityActive = Boolean(voiceChannel && onlineVoiceCall.localStream);
  const voiceSpeaking = useVoiceActivity(voiceActivityActive, micMuted, onlineVoiceCall.localStream);
  const remoteScreenStreams = useMemo(
    () => Object.entries(onlineVoiceCall.remoteStreams).filter(([, stream]) => stream.getVideoTracks().length > 0),
    [onlineVoiceCall.remoteStreams]
  );
  const hasActiveVoiceStreams = Boolean(onlineVoiceCall.screenStream || remoteScreenStreams.length);
  const currentActivity = useMemo(() => getCurrentSteamActivity(user, steamActivity, nowTick), [nowTick, steamActivity, user]);
  const activeServerActivityCards =
    activeServer && currentActivity && activeServer.members.some((member) => member.id === user.id) ? [currentActivity] : [];
  const ownVoiceStatus =
    voiceChannel && voiceElapsedLabel
      ? {
          channelName: activeVoiceChannelDetails?.name ?? voiceChannel,
          elapsedLabel: voiceElapsedLabel,
          muted: micMuted
        }
      : undefined;
  const discoverResults = useMemo(() => {
    const query = discoverQuery.trim().toLowerCase();
    const localServerIds = new Set(servers.map((server) => server.id));
    const createdServers: DiscoveryServer[] = servers
      .filter((server) => server.isDiscoverable)
      .map((server) => ({
        id: `created-${server.id}`,
        name: server.name,
        description: "Servidor criado no Tempest Light e aberto no Descubra.",
        tags: [server.purpose === "community" ? "comunidade" : "amigos", "tempest"],
        members: server.members.length,
        purpose: server.purpose
      }));
    const onlineServers: DiscoveryServer[] = onlineDiscoverServers
      .filter((server) => !localServerIds.has(server.id))
      .map((server) => ({
        id: `online-${server.id}`,
        onlineServerId: server.id,
        name: server.name,
        description: server.description,
        tags: [server.purpose === "community" ? "comunidade" : "amigos", "online"],
        members: server.members.length,
        purpose: server.purpose,
        templateId: server.templateId
      }));
    const allServers = [...createdServers, ...onlineServers].filter((server) => server.members >= 1000);

    if (!query) {
      return allServers;
    }

    return allServers.filter((server) =>
      [server.name, server.description, ...server.tags].some((value) => value.toLowerCase().includes(query))
    );
  }, [discoverQuery, onlineDiscoverServers, servers]);

  useEffect(() => {
    setServers((currentServers) => {
      let changed = false;
      const nextServers = currentServers.map((server) => {
        let serverChanged = false;
        const members = server.members.map((member) => {
          if (member.id !== user.id) {
            return member;
          }

          if (
            member.username === user.username &&
            member.displayName === user.displayName &&
            member.avatarUrl === user.avatarUrl &&
            member.presence === user.presence &&
            member.accountCreatedAt === user.createdAt
          ) {
            return member;
          }

          serverChanged = true;
          changed = true;
          return {
            ...member,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            presence: user.presence,
            accountCreatedAt: user.createdAt
          };
        });

        return serverChanged ? { ...server, members } : server;
      });

      return changed ? nextServers : currentServers;
    });
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        messageBelongsToCurrentUser(message, user)
          ? {
              ...message,
              authorId: user.id,
              authorUsername: user.username,
              author: user.displayName,
              authorAvatarUrl: user.avatarUrl
            }
          : message
      )
    );
    setDirectMessages((currentDirectMessages) =>
      Object.fromEntries(
        Object.entries(currentDirectMessages).map(([conversationId, conversationMessages]) => [
          conversationId,
          conversationMessages.map((message) =>
            messageBelongsToCurrentUser(message, user)
              ? {
                  ...message,
                  authorId: user.id,
                  authorUsername: user.username,
                  author: user.displayName,
                  authorAvatarUrl: user.avatarUrl
                }
              : message
          )
        ])
      )
    );
  }, [user.avatarUrl, user.createdAt, user.displayName, user.id, user.presence, user.username]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setMentionNotifications(readMentionNotifications(user));
  }, [user.id, user.username]);

  useEffect(() => {
    if (!onlineMode || !api) {
      serverSyncLoadedRef.current = false;
      serverSyncHashesRef.current = {};
      setOnlineVoiceStates([]);
      setOnlineDiscoverServers([]);
      return;
    }

    let cancelled = false;
    const onlineApi = api;
    serverSyncLoadedRef.current = false;
    setOnlineSyncStatus("syncing");

    async function hydrateOnlineWorkspace() {
      try {
        const [serverBundle, directSummaries] = await Promise.all([onlineApi.listServers(), onlineApi.listDirectConversations()]);
        if (cancelled) {
          return;
        }

        const normalizedServers = serverBundle.servers.map((server) => normalizeSavedServer(server as Partial<ServerDefinition>, user));
        serverSyncHashesRef.current = Object.fromEntries(normalizedServers.map((server) => [server.id, JSON.stringify(server)]));
        serverSyncLoadedRef.current = true;
        setServers(normalizedServers);
        setMessages(serverBundle.messages.map((message) => onlineServerMessageToLocalMessage(message)));
        setOnlineVoiceStates(serverBundle.voiceStates);
        setDirectContacts(directSummaries.map((summary) => directSummaryToContact(summary)));
        setActiveDirectId((current) => (current && directSummaries.some((summary) => summary.id === current) ? current : directSummaries[0]?.id ?? null));
        setActiveServerId((current) => (current && normalizedServers.some((server) => server.id === current) ? current : normalizedServers[0]?.id ?? null));
        setOnlineSyncStatus("idle");
      } catch {
        if (!cancelled) {
          serverSyncLoadedRef.current = true;
          setOnlineSyncStatus("error");
          setServerNotice("API online conectada, mas nao consegui sincronizar os servidores agora.");
        }
      }
    }

    void hydrateOnlineWorkspace();

    return () => {
      cancelled = true;
    };
  }, [api, onlineMode, user]);

  useEffect(() => {
    if (!onlineMode || !api || activeView !== "discover") {
      return undefined;
    }

    let cancelled = false;
    const onlineApi = api;
    async function loadOnlineDiscoverServers() {
      try {
        const result = await onlineApi.listDiscoverableServers();
        if (!cancelled) {
          setOnlineDiscoverServers(result.servers.map((server) => normalizeSavedServer(server as Partial<ServerDefinition>, user)));
        }
      } catch {
        if (!cancelled) {
          setOnlineDiscoverServers([]);
        }
      }
    }

    void loadOnlineDiscoverServers();
    return () => {
      cancelled = true;
    };
  }, [activeView, api, onlineMode, user]);

  useEffect(() => {
    if (!window.tempestLightDesktop?.onDeepLink) {
      return undefined;
    }

    function handleDeepLink(url: string) {
      const code = extractTempestInviteCode(url);
      if (!code) {
        return;
      }

      setInviteCodeDraft(code);
      setActiveView("discover");
      if (onlineMode) {
        void joinInviteCode(code);
      } else {
        setServerNotice("Faca login online para entrar por esse convite.");
      }
    }

    void window.tempestLightDesktop
      .getInitialDeepLink?.()
      .then((url) => {
        if (url) {
          handleDeepLink(url);
        }
      })
      .catch(() => undefined);

    return window.tempestLightDesktop.onDeepLink((payload) => handleDeepLink(payload.url));
  }, [api, onlineMode, user.id]);

  useEffect(() => {
    if (!onlineMode || !api || !activeDirectId) {
      return undefined;
    }

    let cancelled = false;
    const onlineApi = api;
    const conversationId = activeDirectId;
    async function refreshDirectConversation() {
      try {
        const conversation = await onlineApi.getDirectConversation(conversationId);
        if (cancelled) {
          return;
        }

        const contact = directConversationToContact(conversation);
        setDirectContacts((current) => {
          const exists = current.some((item) => item.id === contact.id);
          return exists ? current.map((item) => (item.id === contact.id ? contact : item)) : [...current, contact];
        });
        setDirectMessages((current) => ({
          ...current,
          [conversation.id]: conversation.messages.map((message) => onlineDirectMessageToLocalMessage(message))
        }));
      } catch {
        if (!cancelled) {
          setDirectNotice("Nao consegui atualizar essa DM pela API agora.");
        }
      }
    }

    void refreshDirectConversation();
    const interval = window.setInterval(() => void refreshDirectConversation(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeDirectId, api, onlineMode]);

  useEffect(() => {
    if (!onlineMode || !api) {
      setFriendRequests({ incoming: [], outgoing: [] });
      return undefined;
    }

    const apiClient = api;
    let cancelled = false;
    async function refreshFriendRequests() {
      try {
        const result = await apiClient.listFriendRequests();
        if (!cancelled) {
          setFriendRequests(result);
        }
      } catch {
        if (!cancelled) {
          setDirectNotice("Nao consegui atualizar solicitacoes de amizade agora.");
        }
      }
    }

    void refreshFriendRequests();
    const interval = window.setInterval(() => void refreshFriendRequests(), 6000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [api, onlineMode]);

  useEffect(() => {
    setServers((currentServers) => {
      let changed = false;
      const nextServers = currentServers.map((server) => {
        const activeBoosts = getActiveBoosts(server.boosts, nowTick);
        if (activeBoosts.length === server.boosts.length) {
          return server;
        }

        changed = true;
        return { ...server, boosts: activeBoosts };
      });

      return changed ? nextServers : currentServers;
    });
  }, [nowTick]);

  useEffect(() => {
    saveWorkspaceState(user, {
      activeView,
      activeServerId,
      activeChannel,
      activeDirectId,
      servers,
      messages,
      directContacts,
      directMessages,
      readServerChannelAt,
      readDirectConversationAt,
      steamActivity,
      activityCardsVisible
    });
  }, [
    activeChannel,
    activeDirectId,
    activeServerId,
    activeView,
    activityCardsVisible,
    directContacts,
    directMessages,
    messages,
    readDirectConversationAt,
    readServerChannelAt,
    servers,
    steamActivity,
    user
  ]);

  useEffect(() => {
    if (activeView !== "server" || !activeServer) {
      return;
    }

    markServerChannelRead(activeServer.id, activeChannel);
  }, [activeChannel, activeServer?.id, activeServerLatestReadToken, activeView]);

  useEffect(() => {
    if (activeView !== "direct" || !activeDirectId) {
      return;
    }

    markDirectConversationRead(activeDirectId);
  }, [activeDirectId, activeDirectLatestReadToken, activeView]);

  useEffect(() => {
    if (!activeServer || !activeVoiceChatChannelName || !voiceChatOpen) {
      return;
    }

    markServerChannelRead(activeServer.id, activeVoiceChatChannelName);
  }, [activeServer?.id, activeVoiceChatChannelName, activeVoiceChatLatestReadToken, voiceChatOpen]);

  useEffect(() => {
    if (!activeServer || !voiceChannel || !activeVoiceChatChannelName) {
      return;
    }

    for (const message of activeVoiceChatMessages) {
      const playback = parseVoiceSoundEffectEvent(message.text);
      if (!playback || messageBelongsToCurrentUser(message, user)) {
        continue;
      }

      if (playedVoiceSoundEffectEventsRef.current.has(playback.playbackId)) {
        continue;
      }

      const effect = activeVoiceSoundEffects.find((item) => item.id === playback.effectId);
      if (!effect?.audioUrl) {
        continue;
      }

      playedVoiceSoundEffectEventsRef.current.add(playback.playbackId);
      if (playedVoiceSoundEffectEventsRef.current.size > 300) {
        playedVoiceSoundEffectEventsRef.current = new Set(Array.from(playedVoiceSoundEffectEventsRef.current).slice(-120));
      }

      void playAudioSource(effect.audioUrl, playback.volume).catch(() => undefined);
    }
  }, [activeServer?.id, activeVoiceChatChannelName, activeVoiceChatMessages, activeVoiceSoundEffects, user, voiceChannel]);

  useEffect(() => {
    if (!onlineMode || !api || !activeServer) {
      return undefined;
    }

    let cancelled = false;
    const onlineApi = api;
    const serverId = activeServer.id;
    const channelNames = [
      activeChannel,
      ...(voiceChatOpen && voiceChannel ? [getVoiceChatChannelName(voiceChannel)] : [])
    ];

    async function refreshActiveServer() {
      try {
        const [serverResult, messageResults, voiceResult] = await Promise.all([
          onlineApi.getServer(serverId),
          Promise.all(channelNames.map((channelName) => onlineApi.listServerMessages(serverId, channelName))),
          onlineApi.listServerVoiceStates(serverId)
        ]);
        if (cancelled) {
          return;
        }

        applyOnlineServer(serverResult.server, { respectLocalChanges: true });
        channelNames.forEach((channelName, index) => {
          const result = messageResults[index];
          replaceMessagesForChannel(serverId, channelName, result.messages.map((message) => onlineServerMessageToLocalMessage(message)));
        });
        replaceVoiceStatesForServer(serverId, voiceResult.voiceStates);
        setOnlineSyncStatus("idle");
      } catch {
        if (!cancelled) {
          setOnlineSyncStatus("error");
        }
      }
    }

    void refreshActiveServer();
    const interval = window.setInterval(() => void refreshActiveServer(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeChannel, activeServer?.id, api, onlineMode, voiceChannel, voiceChatOpen]);

  useEffect(() => {
    if (!onlineMode || !api || !activeServer || !voiceChannel) {
      return undefined;
    }

    let cancelled = false;
    const onlineApi = api;
    const serverId = activeServer.id;
    const channelName = voiceChannel;

    async function sendVoiceHeartbeat() {
      try {
        const result = await onlineApi.updateServerVoiceState(serverId, {
          channelName,
          muted: micMuted,
          speaking: voiceSpeaking
        });
        if (!cancelled) {
          upsertOnlineVoiceState(result.voiceState);
        }
      } catch {
        if (!cancelled) {
          setOnlineSyncStatus("error");
        }
      }
    }

    void sendVoiceHeartbeat();
    const interval = window.setInterval(() => void sendVoiceHeartbeat(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeServer?.id, api, micMuted, onlineMode, voiceChannel, voiceSpeaking]);

  useEffect(() => {
    if (!onlineMode || !api) {
      previousOnlineVoiceServerRef.current = null;
      return;
    }

    const currentServerId = activeServer?.id ?? null;
    const previousServerId = previousOnlineVoiceServerRef.current;
    if (previousServerId && (!voiceChannel || previousServerId !== currentServerId)) {
      void api.leaveServerVoice(previousServerId);
      previousOnlineVoiceServerRef.current = null;
    }

    if (voiceChannel && currentServerId) {
      previousOnlineVoiceServerRef.current = currentServerId;
    }
  }, [activeServer?.id, api, onlineMode, voiceChannel]);

  useEffect(() => {
    if (!onlineMode || !api || !serverSyncLoadedRef.current) {
      return undefined;
    }

    if (serverSyncTimeoutRef.current) {
      window.clearTimeout(serverSyncTimeoutRef.current);
    }

    serverSyncTimeoutRef.current = window.setTimeout(() => {
      servers.forEach((server) => {
        const currentHash = JSON.stringify(server);
        if (serverSyncHashesRef.current[server.id] === currentHash) {
          return;
        }

        const member = server.members.find((item) => item.id === user.id || item.username === user.username) ?? null;
        const canSyncServer = isDeveloperUser(user) || server.ownerId === user.id || memberHasPermission(server, member, "manage_server", user.id);
        if (!canSyncServer) {
          return;
        }

        serverSyncHashesRef.current[server.id] = currentHash;
        void api
          .updateServerState(server.id, { server })
          .then((result) => applyOnlineServer(result.server, { expectedLocalHash: currentHash }))
          .then(() => setOnlineSyncStatus("idle"))
          .catch(() => {
            delete serverSyncHashesRef.current[server.id];
            setOnlineSyncStatus("error");
          });
      });
    }, 900);

    return () => {
      if (serverSyncTimeoutRef.current) {
        window.clearTimeout(serverSyncTimeoutRef.current);
        serverSyncTimeoutRef.current = null;
      }
    };
  }, [api, onlineMode, servers, user.id, user.username]);

  function withAudit(server: ServerDefinition, action: AuditAction, target: string, details: string): ServerDefinition {
    return {
      ...server,
      auditLogs: [createAuditLog(user, action, target, details), ...server.auditLogs].slice(0, 250)
    };
  }

  function openCreateServerDialog() {
    setPendingServerPurpose("community");
    setPendingServerTemplateId("blank");
    setCreateServerStep("start");
  }

  function openServerSettings(view: ServerSettingsView = "profile") {
    if (!canAdministerActiveServer && view !== "boosts") {
      setServerNotice("Somente o dono ou administradores podem abrir as configuracoes do servidor.");
      setServerMenuOpen(false);
      return;
    }

    setServerSettingsInitialView(view);
    setServerSettingsOpen(true);
    setServerMenuOpen(false);
  }

  function openServerGuide() {
    if (!activeServer) {
      return;
    }

    if (!activeServer.communityEnabled) {
      setServerNotice("A Guia do servidor aparece apenas em servidores com comunidade ativada.");
      return;
    }

    if (activeServerBoostLevel < 8) {
      setServerNotice(`A Guia do servidor desbloqueia no nivel ${SERVER_GUIDE_UNLOCK_LEVEL} de estrelas.`);
      return;
    }

    setServerGuideOpen(true);
    setServerNotice(null);
  }

  function rememberServerSync(server: ServerDefinition) {
    serverSyncHashesRef.current[server.id] = JSON.stringify(server);
  }

  function normalizeOnlineServer(rawServer: unknown) {
    return normalizeSavedServer(rawServer as Partial<ServerDefinition>, user);
  }

  function applyOnlineServer(
    rawServer: unknown,
    options: { expectedLocalHash?: string; respectLocalChanges?: boolean } = {}
  ): ServerDefinition {
    const server = normalizeOnlineServer(rawServer);
    const currentServer = serversRef.current.find((item) => item.id === server.id) ?? null;
    const currentHash = currentServer ? JSON.stringify(currentServer) : null;

    if (options.expectedLocalHash && currentHash !== options.expectedLocalHash) {
      return currentServer ?? server;
    }

    if (options.respectLocalChanges && currentHash && serverSyncHashesRef.current[server.id] !== currentHash) {
      return currentServer ?? server;
    }

    rememberServerSync(server);
    setServers((current) => {
      const exists = current.some((item) => item.id === server.id);
      return exists ? current.map((item) => (item.id === server.id ? server : item)) : [...current, server];
    });
    return server;
  }

  function removeServerFromWorkspace(serverId: string, notice: string) {
    const fallbackServer = servers.find((server) => server.id !== serverId) ?? null;
    delete serverSyncHashesRef.current[serverId];
    setServers((current) => current.filter((server) => server.id !== serverId));
    setMessages((current) => current.filter((message) => message.serverId !== serverId));
    setOnlineVoiceStates((current) => current.filter((state) => state.serverId !== serverId));
    setReadServerChannelAt((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${serverId}:`)))
    );

    if (activeServerId === serverId) {
      setActiveServerId(fallbackServer?.id ?? null);
      setActiveView(fallbackServer ? "server" : "direct");
      setActiveChannel(fallbackServer ? getFirstTextChannelName(fallbackServer) ?? "geral" : "geral");
      setVoiceChannel(null);
      setVoiceConnectedAt(null);
      setServerGuideOpen(false);
    }

    setServerSettingsOpen(false);
    setServerMenuOpen(false);
    setOnlineSyncStatus("idle");
    setServerNotice(notice);
  }

  function replaceMessagesForChannel(serverId: string, channelName: string, nextMessages: LocalMessage[]) {
    setMessages((current) => {
      const localBotMessages = current.filter(
        (message) => message.serverId === serverId && message.channelName === channelName && message.authorIsBot && !message.id
      );
      return [
        ...current.filter((message) => message.serverId !== serverId || message.channelName !== channelName),
        ...appendUniqueLocalMessages(nextMessages, localBotMessages)
      ];
    });
  }

  function replaceVoiceStatesForServer(serverId: string, nextStates: OnlineVoiceState[]) {
    setOnlineVoiceStates((current) => [...current.filter((state) => state.serverId !== serverId), ...nextStates]);
  }

  function upsertOnlineVoiceState(nextState: OnlineVoiceState) {
    setOnlineVoiceStates((current) => [
      ...current.filter((state) => !(state.serverId === nextState.serverId && state.userId === nextState.userId)),
      nextState
    ]);
  }

  function getVoiceChannelParticipants(channelName: string) {
    if (!onlineMode || !activeServer) {
      return [];
    }

    return activeServerVoiceStates.filter((state) => state.channelName === channelName);
  }

  function getVoiceChannelOccupancy(channelName: string) {
    if (!onlineMode) {
      return voiceChannel === channelName ? 1 : 0;
    }

    return getVoiceChannelParticipants(channelName).length;
  }

  function getServerChannelMessages(serverId: string, channelName: string) {
    return messages.filter((message) => message.serverId === serverId && message.channelName === channelName);
  }

  function markServerChannelRead(serverId: string, channelName: string) {
    const readToken = getLatestMessageReadToken(getServerChannelMessages(serverId, channelName));
    if (!readToken) {
      return;
    }

    const key = getServerChannelReadKey(serverId, channelName);
    setReadServerChannelAt((current) => (current[key] === readToken ? current : { ...current, [key]: readToken }));
  }

  function markDirectConversationRead(conversationId: string) {
    const readToken = getLatestMessageReadToken(directMessages[conversationId] ?? []);
    if (!readToken) {
      return;
    }

    const key = getDirectConversationReadKey(conversationId);
    setReadDirectConversationAt((current) => (current[key] === readToken ? current : { ...current, [key]: readToken }));
  }

  function hasUnreadServerChannel(serverId: string, channelName: string) {
    return hasUnreadMessages(
      getServerChannelMessages(serverId, channelName),
      readServerChannelAt[getServerChannelReadKey(serverId, channelName)],
      user
    );
  }

  function hasUnreadDirectConversation(conversationId: string) {
    return hasUnreadMessages(
      directMessages[conversationId] ?? [],
      readDirectConversationAt[getDirectConversationReadKey(conversationId)],
      user
    );
  }

  async function playVoiceSoundEffect(effect: ServerSoundEffect) {
    const playbackContent = serializeVoiceSoundEffectContent(effect);
    const playback = parseVoiceSoundEffectEvent(playbackContent);
    if (playback) {
      playedVoiceSoundEffectEventsRef.current.add(playback.playbackId);
    }

    void playAudioSource(effect.audioUrl, effect.volume).catch(() => {
      setServerNotice("Nao foi possivel tocar esse efeito sonoro neste dispositivo.");
    });

    if (!activeServer || !activeVoiceChatChannelName || !onlineMode || !api) {
      return;
    }

    try {
      const result = await api.sendServerMessage(activeServer.id, {
        channelName: activeVoiceChatChannelName,
        content: playbackContent
      });
      setMessages((current) => appendUniqueLocalMessages(current, [onlineServerMessageToLocalMessage(result.message)]));
      setOnlineSyncStatus("idle");
    } catch {
      setServerNotice("O som tocou aqui, mas nao consegui enviar para a call agora.");
      setOnlineSyncStatus("error");
    }
  }

  async function copyServerGuideInvite() {
    if (!activeServer) {
      return;
    }

    if (!canCreateInvite) {
      setServerNotice("Seu cargo nao permite criar convites.");
      return;
    }

    if (onlineMode && api) {
      try {
        const result = await api.createServerInvite(activeServer.id, { duration: "never", maxUses: 25 });
        const syncedServer = applyOnlineServer(result.server);
        const inviteLink = getServerInviteLink(syncedServer, result.invite.code);
        try {
          await navigator.clipboard.writeText(inviteLink);
          setServerNotice(`Novo convite da comunidade copiado: ${inviteLink}`);
        } catch {
          setServerNotice(inviteLink);
        }
        setOnlineSyncStatus("idle");
      } catch {
        setServerNotice("Nao consegui criar o convite pela API online agora.");
        setOnlineSyncStatus("error");
      }
      return;
    }

    setServerNotice("A API online precisa estar conectada para criar convites.");
  }

  function refreshMentionNotifications() {
    setMentionNotifications(readMentionNotifications(user));
  }

  function markMentionNotificationsRead(predicate: (notification: MentionNotification) => boolean) {
    setMentionNotifications(
      updateMentionNotificationsForUser(user, (notifications) =>
        notifications.map((notification) => (predicate(notification) ? { ...notification, read: true } : notification))
      )
    );
  }

  function clearMentionNotifications() {
    setMentionNotifications(updateMentionNotificationsForUser(user, () => []));
  }

  function openMentionNotification(notification: MentionNotification) {
    markMentionNotificationsRead((item) => item.id === notification.id);
    const targetServer = servers.find((server) => server.id === notification.serverId);
    if (!targetServer) {
      setDirectNotice("Esse servidor nao esta sincronizado nesta conta.");
      setMentionInboxOpen(false);
      return;
    }

    setActiveServerId(targetServer.id);
    setActiveView("server");
    setActiveChannel(notification.channelName);
    setMentionInboxOpen(false);
  }

  function renderDirectMessageText(text: string) {
    return renderInviteLinksInText(text, (inviteLink, key) => (
      <button className="message-invite-link" key={key} type="button" onClick={() => void joinInviteCode(inviteLink)}>
        {inviteLink}
      </button>
    ));
  }

  function renderServerMessageText(message: LocalMessage, rawText = message.text) {
    if (!activeServer) {
      return renderInviteLinksInText(rawText, (inviteLink, key) => (
        <button className="message-invite-link" key={key} type="button" onClick={() => void joinInviteCode(inviteLink)}>
          {inviteLink}
        </button>
      ));
    }

    const parts: ReactNode[] = [];
    const tokenPattern = /tempest-light:\/\/invite\/[^\s<>"']+|https?:\/\/[^\s<>"']*(?:tempest|shardweb\.app)[^\s<>"']*\/invite\/[^\s<>"']+|@[\p{L}\p{N}_.-]{1,64}/giu;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(rawText))) {
      if (match.index > lastIndex) {
        parts.push(rawText.slice(lastIndex, match.index));
      }

      const rawToken = match[0];
      if (!rawToken.startsWith("@")) {
        const { inviteLink, trailing } = splitTrailingInvitePunctuation(rawToken);
        if (isTempestInviteLink(inviteLink)) {
          parts.push(
            <button className="message-invite-link" key={`${message.time}-${match.index}-${inviteLink}`} type="button" onClick={() => void joinInviteCode(inviteLink)}>
              {inviteLink}
            </button>
          );
          if (trailing) {
            parts.push(trailing);
          }
        } else {
          parts.push(rawToken);
        }

        lastIndex = match.index + rawToken.length;
        continue;
      }

      const rawMention = rawToken;
      const target = getMentionTargetByToken(activeServer, rawMention);
      if (!target) {
        parts.push(rawMention);
      } else if (target.kind === "role") {
        parts.push(
          <button
            className="message-mention role"
            key={`${message.time}-${match.index}-${rawMention}`}
            type="button"
            onClick={() => setServerNotice(`Cargo mencionado: ${target.role.name}`)}
          >
            {rawMention}
          </button>
        );
      } else {
        parts.push(
          <button
            className={target.kind === "bot" ? "message-mention bot" : "message-mention"}
            key={`${message.time}-${match.index}-${rawMention}`}
            type="button"
            onClick={() => setProfileCardUser(getMemberProfileCard(target.member))}
          >
            {rawMention}
          </button>
        );
      }

      lastIndex = match.index + rawMention.length;
    }

    if (lastIndex < rawText.length) {
      parts.push(rawText.slice(lastIndex));
    }

    return parts.length ? parts : rawText;
  }

  function renderServerNoticeText(text: string) {
    return renderInviteLinksInText(text, (inviteLink, key) => (
      <button className="notice-invite-link" key={key} type="button" onClick={() => void joinInviteCode(inviteLink)}>
        {inviteLink}
      </button>
    ));
  }

  function renderServerNotice() {
    return serverNotice ? <p className="server-notice-line">{renderServerNoticeText(serverNotice)}</p> : null;
  }

  async function addChatAttachments(files: File[], target: ChatComposerTarget) {
    const blockedFile = files.find(isDangerousAttachmentFile);
    if (blockedFile) {
      const notice = "Arquivo bloqueado por seguranca. Nao envie executaveis, scripts ou SVG no chat.";
      target === "server" ? setServerNotice(notice) : setDirectNotice(notice);
      return;
    }

    const attachableFiles = files.filter((file) => file.type !== "image/svg+xml").slice(0, 4);
    if (!attachableFiles.length) {
      const notice = "Escolha um arquivo valido para enviar.";
      target === "server" ? setServerNotice(notice) : setDirectNotice(notice);
      return;
    }

    try {
      const attachments = await Promise.all(attachableFiles.map((file) => readChatAttachment(file)));
      if (target === "server") {
        setDraftAttachments((current) => [...current, ...attachments].slice(0, 4));
        setServerNotice(null);
      } else {
        setDirectDraftAttachments((current) => [...current, ...attachments].slice(0, 4));
        setDirectNotice(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao consegui carregar esse arquivo.";
      target === "server" ? setServerNotice(message) : setDirectNotice(message);
    }
  }

  function addTextToComposer(text: string, target: ChatComposerTarget) {
    const cleanText = text.replace(/\r\n/g, "\n");
    if (!cleanText) {
      return;
    }

    const append = (current: string) => {
      if (!current) {
        return cleanText;
      }

      const separator = /\s$/.test(current) || /^\s/.test(cleanText) ? "" : " ";
      return `${current}${separator}${cleanText}`;
    };

    if (target === "server") {
      setDraft(append);
    } else {
      setDirectDraft(append);
    }
  }

  function handleChatPaste(event: ClipboardEvent<HTMLInputElement>, target: ChatComposerTarget) {
    const files = Array.from(event.clipboardData.files);
    if (!files.length) {
      return;
    }

    event.preventDefault();
    void addChatAttachments(files, target);
  }

  function handleChatFileChange(event: ChangeEvent<HTMLInputElement>, target: ChatComposerTarget) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void addChatAttachments(files, target);
  }

  function handleComposerContextMenu(event: MouseEvent<HTMLInputElement>, target: ChatComposerTarget) {
    event.preventDefault();
    setComposerPasteMenu({ x: event.clientX, y: event.clientY, target });
  }

  async function pasteFromClipboard(target: ChatComposerTarget) {
    try {
      const pastedImages: File[] = [];
      let pastedText = "";

      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((type) => type.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            pastedImages.push(new File([blob], getPastedImageFileName(imageType), { type: imageType }));
            continue;
          }

          if (!pastedText && item.types.includes("text/plain")) {
            pastedText = await (await item.getType("text/plain")).text();
          }
        }
      }

      if (!pastedText && !pastedImages.length && navigator.clipboard?.readText) {
        pastedText = await navigator.clipboard.readText();
      }

      if (pastedImages.length) {
        await addChatAttachments(pastedImages, target);
      }

      if (pastedText) {
        addTextToComposer(pastedText, target);
      }

      if (!pastedImages.length && !pastedText) {
        const notice = "Nao encontrei texto ou imagem na area de transferencia.";
        target === "server" ? setServerNotice(notice) : setDirectNotice(notice);
      }
    } catch {
      const notice = "Nao consegui acessar a area de transferencia. Use Ctrl+V ou o botao de colar do sistema.";
      target === "server" ? setServerNotice(notice) : setDirectNotice(notice);
    } finally {
      setComposerPasteMenu(null);
    }
  }

  function requestOpenExternalLink(link: string) {
    if (isSafeAttachmentSource(link) && !isSafeHttpUrl(link)) {
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }

    if (!isSafeHttpUrl(link)) {
      return;
    }

    if (isTrustedMediaLink(link)) {
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }

    setExternalLinkPrompt({ link, risky: isPotentiallyDangerousExternalLink(link) });
  }

  function confirmExternalLinkOpen() {
    if (!externalLinkPrompt) {
      return;
    }

    window.open(externalLinkPrompt.link, "_blank", "noopener,noreferrer");
    setExternalLinkPrompt(null);
  }

  function removeDraftAttachment(id: string, target: ChatComposerTarget) {
    if (target === "server") {
      setDraftAttachments((current) => current.filter((attachment) => attachment.id !== id));
      return;
    }

    setDirectDraftAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  function preventEnterSubmit(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  }

  async function sendMessage() {
    const text = draft.trim();
    const attachments = draftAttachments;
    if (activeMemberTimeoutNotice) {
      setServerNotice(activeMemberTimeoutNotice);
      return;
    }

    if ((!text && !attachments.length) || channelIsPrivate || !canSendServerMessages) {
      if (text && !canSendServerMessages) {
        setServerNotice("Seu cargo nao permite enviar mensagens neste servidor.");
      }
      return;
    }

    if (attachments.length && !canAttachFiles) {
      setServerNotice("Seu cargo nao permite anexar arquivos neste servidor.");
      return;
    }

    const mentionResolution = activeServer ? getMessageMentionResolution(activeServer, text) : null;
    if (activeServer && mentionResolution?.roleMentions.length && !canMentionServerRoles(activeServer, activeServerMember, user.id)) {
      setServerNotice("Somente dono, administradores e moderacao podem mencionar membros atraves de cargos.");
      return;
    }

    if (activeServer) {
      const messageKey = `${activeServer.id}:${activeChannel}`;
      const lastSentAt = lastServerMessageAt[messageKey] ?? 0;
      const slowModeWait = Math.ceil((activeServer.automod.slowModeSeconds * 1000 - (Date.now() - lastSentAt)) / 1000);
      if (activeServer.automod.slowModeSeconds > 0 && slowModeWait > 0) {
        setServerNotice(`Modo lento ativo. Espere ${slowModeWait}s para enviar outra mensagem.`);
        return;
      }

      const automodBlock = evaluateAutomodMessage(text, activeServer.automod);
      if (automodBlock) {
        setServerNotice(automodBlock);
        setServers((current) =>
          current.map((server) =>
            server.id === activeServer.id ? withAudit(server, "automod_blocked", activeChannel, automodBlock) : server
          )
        );
        return;
      }

      setLastServerMessageAt((current) => ({ ...current, [messageKey]: Date.now() }));
    }

    const userMessage: LocalMessage = {
      authorId: user.id,
      authorUsername: user.username,
      author: user.displayName,
      authorAvatarUrl: user.avatarUrl,
      time: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      }),
      createdAt: new Date().toISOString(),
      text,
      attachments,
      serverId: activeServer?.id,
      channelName: activeChannel,
      mentions: mentionResolution?.mentions ?? [],
      mentionedUserIds: mentionResolution?.mentionedUserIds ?? [],
      mentionedUsernames: mentionResolution?.mentionedUsernames ?? []
    };
    const botResponses = activeServer ? getTempestBotResponses(activeServer, activeChannel, text) : [];
    const mentionNotifications = activeServer && mentionResolution
      ? createMentionNotifications(activeServer, activeChannel, user, text, mentionResolution.recipientMentions)
      : [];
    const botMentionNotifications = activeServer
      ? botResponses.flatMap((message) => {
          const responseMentionResolution = getMessageMentionResolution(activeServer, message.text);
          return createMentionNotifications(
            activeServer,
            activeChannel,
            {
              id: message.authorId ?? message.author,
              username: message.authorUsername ?? message.author,
              displayName: message.author
            },
            message.text,
            responseMentionResolution.recipientMentions
          );
        })
      : [];

    if (onlineMode && api && activeServer) {
      const savedMessages: LocalMessage[] = [];
      let botMessageSaveFailed = false;

      try {
        const result = await api.sendServerMessage(activeServer.id, {
          channelName: activeChannel,
          content: serializeMessageContent(text, attachments),
          mentions: {
            mentions: mentionResolution?.mentions ?? [],
            mentionedUserIds: mentionResolution?.mentionedUserIds ?? [],
            mentionedUsernames: mentionResolution?.mentionedUsernames ?? []
          }
        });
        savedMessages.push(onlineServerMessageToLocalMessage(result.message));
      } catch {
        setServerNotice("Nao consegui enviar pela API online agora. Tente novamente em alguns segundos.");
        setOnlineSyncStatus("error");
        return;
      }

      for (const botResponse of botResponses) {
        try {
          const result = await api.sendServerMessage(activeServer.id, {
            channelName: activeChannel,
            content: botResponse.text,
            mentions: {
              mentions: botResponse.mentions ?? [],
              mentionedUserIds: botResponse.mentionedUserIds ?? [],
              mentionedUsernames: botResponse.mentionedUsernames ?? [],
              tempestBotAuthor: {
                id: botResponse.authorId ?? botResponse.authorUsername ?? botResponse.author,
                username: botResponse.authorUsername ?? botResponse.author,
                displayName: botResponse.author,
                avatarUrl: botResponse.authorAvatarUrl ?? null
              }
            }
          });
          savedMessages.push(onlineServerMessageToLocalMessage(result.message));
        } catch {
          botMessageSaveFailed = true;
          savedMessages.push(botResponse);
        }
      }

      setMessages((current) => appendUniqueLocalMessages(current, savedMessages));
      setOnlineSyncStatus(botMessageSaveFailed ? "error" : "idle");
      if (botMessageSaveFailed) {
        setServerNotice("A mensagem foi enviada, mas uma resposta de bot nao conseguiu sincronizar agora.");
      }
    } else {
      appendMentionNotifications([...mentionNotifications, ...botMentionNotifications]);
      refreshMentionNotifications();
      setMessages((current) => [...current, userMessage, ...botResponses]);
    }
    setDraft("");
    setDraftAttachments([]);
  }

  function selectChannel(channel: ChannelDefinition) {
    if (channel.type === "voice") {
      if (!canConnectVoice) {
        setServerNotice("Seu cargo nao permite conectar em canais de voz.");
      } else if (!channel.isPrivate) {
        setServerGuideOpen(false);
        setVoiceChannel(channel.name);
        setVoiceConnectedAt((current) => (voiceChannel === channel.name && current ? current : Date.now()));
        setServerNotice(null);
        if (onlineMode && api && activeServer) {
          void api
            .updateServerVoiceState(activeServer.id, {
              channelName: channel.name,
              muted: micMuted,
              speaking: voiceSpeaking
            })
            .then((result) => upsertOnlineVoiceState(result.voiceState))
            .catch(() => setOnlineSyncStatus("error"));
        }
      }
      return;
    }

    setActiveChannel(channel.name);
    setServerGuideOpen(false);
    if (activeServer) {
      markMentionNotificationsRead((notification) => notification.serverId === activeServer.id && notification.channelName === channel.name);
    }
  }

  async function leaveVoiceChannel() {
    if (!voiceChannel) {
      return;
    }

    const serverId = activeServer?.id ?? previousOnlineVoiceServerRef.current;
    previousOnlineVoiceServerRef.current = null;
    setVoiceChannel(null);
    setVoiceConnectedAt(null);
    setMicMuted(false);
    setVoiceDeafened(false);
    setVoiceChatOpen(false);
    setVoiceSoundboardOpen(false);
    setVoiceShareMenuOpen(false);
    setVoiceChatDraft("");
    onlineVoiceCall.stopScreenShare();

    if (serverId) {
      setOnlineVoiceStates((current) => current.filter((state) => !(state.serverId === serverId && state.userId === user.id)));
    }

    if (!onlineMode || !api || !serverId) {
      return;
    }

    try {
      await api.leaveServerVoice(serverId);
      setOnlineSyncStatus("idle");
      setServerNotice("Voce saiu da call.");
    } catch {
      setOnlineSyncStatus("error");
      setServerNotice("Voce saiu da call, mas a API pode demorar alguns segundos para atualizar.");
    }
  }

  function selectServer(serverId: string) {
    const server = servers.find((item) => item.id === serverId);
    if (!server) {
      return;
    }

    const firstTextChannel = server.categories.flatMap((group) => group.channels).find((channel) => channel.type === "text");
    setActiveServerId(server.id);
    setActiveView("server");
    setServerMenuOpen(false);
    setServerNotice(null);
    setServerGuideOpen(false);
    setActiveChannel(firstTextChannel?.name ?? "geral");
    setVoiceChannel(null);
    setVoiceConnectedAt(null);
    setVoiceDeafened(false);
    setVoiceChatOpen(false);
    setVoiceSoundboardOpen(false);
    setVoiceShareMenuOpen(false);
    setVoiceChatDraft("");
    onlineVoiceCall.stopScreenShare();
  }

  function createChannel(channel: ChannelDefinition) {
    if (!activeServer) {
      return;
    }

    if (!canManageChannels) {
      setServerNotice("Seu cargo nao permite criar canais.");
      setChannelDialogOpen(false);
      return;
    }

    const targetGroupName = channel.type === "voice" ? "CANAIS DE VOZ" : "CANAIS DE TEXTO";
    setServers((current) =>
      current.map((server) => {
        if (server.id !== activeServer.id) {
          return server;
        }

        const hasTargetGroup = server.categories.some((group) => group.name === targetGroupName);
        const categories = hasTargetGroup
          ? server.categories.map((group) =>
              group.name === targetGroupName ? { ...group, channels: [...group.channels, channel] } : group
            )
          : [...server.categories, { name: targetGroupName, channels: [channel] }];

        return withAudit({ ...server, categories }, "channel_created", channel.name, `Canal ${channel.type === "voice" ? "de voz" : "de texto"} criado.`);
      })
    );
    setChannelDialogOpen(false);
    setServerMenuOpen(false);

    if (channel.type === "text") {
      setServerGuideOpen(false);
      setActiveChannel(channel.name);
    } else if (!channel.isPrivate) {
      setServerGuideOpen(false);
      setVoiceChannel(channel.name);
    }
  }

  function createCategory(name: string) {
    if (!activeServer) {
      return;
    }

    if (!canManageChannels) {
      setServerNotice("Seu cargo nao permite criar categorias.");
      setCategoryDialogOpen(false);
      return;
    }

    setServers((current) =>
      current.map((server) =>
        server.id === activeServer.id
          ? withAudit({ ...server, categories: [...server.categories, { name, channels: [] }] }, "category_created", name, "Categoria criada.")
          : server
      )
    );
    setCategoryDialogOpen(false);
    setServerMenuOpen(false);
  }

  function createServer(name: string, purpose: ServerPurpose, templateId: ServerTemplateId = "blank") {
    if (!onlineMode || !api) {
      setCreateServerStep(null);
      setServerNotice("A API online precisa estar conectada para criar servidores.");
      return;
    }

    const serverId = `server-${Date.now()}`;
    const template = getServerTemplate(templateId);
    const categories = cloneServerCategories(template.categories);
    const templateRoles = cloneServerRoles(template.roles);
    const ownerRoleId = getOwnerRoleId(templateRoles);
    const server: ServerDefinition = {
      id: serverId,
      name,
      initials: getInitials(name) || "SV",
      iconUrl: null,
      ownerId: user.id,
      purpose,
      templateId: template.id,
      ...createDefaultServerExtras(),
      description: template.id === "blank" ? "Servidor novo em folha no Tempest Light." : template.description,
      bannerColor: template.bannerColor,
      memberListVisible: true,
      isDiscoverable: template.isDiscoverable,
      notificationsEnabled: true,
      communityEnabled: template.communityEnabled,
      rulesChannelName: template.rulesChannelName,
      updatesChannelName: template.updatesChannelName,
      safetyChannelName: template.safetyChannelName,
      language: "pt-BR",
      explicitMediaFilter: template.explicitMediaFilter,
      emailVerificationRequired: template.emailVerificationRequired,
      riskyPermissionsDisabled: template.riskyPermissionsDisabled,
      boostProgressVisible: template.boostProgressVisible,
      auditLogs: [createAuditLog(user, "server_created", name, `Servidor criado com o modelo ${template.name}: ${getTemplateSummary(template)}.`)],
      categories,
      roles: [createEveryoneRole(), ...templateRoles],
      members: [createServerMember(user, ownerRoleId ? [ownerRoleId] : [])]
    };

    rememberServerSync(server);

    setServers((current) => [...current, server]);
    setActiveServerId(server.id);
    setActiveView("server");
    setActiveChannel(getFirstTextChannelName(server) ?? "geral");
    setVoiceChannel(null);
    setVoiceConnectedAt(null);
    setCreateServerStep(null);
    setServerNotice(`Servidor criado com o modelo ${template.name}: ${getTemplateSummary(template)}.`);

    void api
      .createServer({ server })
      .then((result) => {
        const syncedServer = applyOnlineServer(result.server);
        setActiveServerId(syncedServer.id);
        setActiveChannel(getFirstTextChannelName(syncedServer) ?? "geral");
        setOnlineSyncStatus("idle");
      })
      .catch(() => {
        delete serverSyncHashesRef.current[server.id];
        setServers((current) => current.filter((item) => item.id !== server.id));
        setActiveServerId((current) => (current === server.id ? null : current));
        setOnlineSyncStatus("error");
        setServerNotice("Nao consegui criar esse servidor na API online. Tente novamente em alguns segundos.");
      });
  }

  async function importDiscordTemplate(templateInput: string) {
    if (!window.tempestLightDesktop?.importDiscordTemplate) {
      throw new Error("A importacao direta funciona no app instalado do Tempest Light.");
    }

    const result = await window.tempestLightDesktop.importDiscordTemplate(templateInput);
    if (!result.ok || !result.template) {
      throw new Error(result.message ?? "Nao foi possivel importar esse modelo do Discord.");
    }

    const importedServer = createServerFromDiscordTemplate({ ...(result.template as DiscordTemplatePayload), code: result.code }, user);
    if (!onlineMode || !api) {
      setServerNotice("A API online precisa estar conectada para importar servidores.");
      return;
    }

    rememberServerSync(importedServer);
    setServers((current) => [...current, importedServer]);
    setActiveServerId(importedServer.id);
    setActiveView("server");
    setActiveChannel(getFirstTextChannelName(importedServer) ?? "geral");
    setVoiceChannel(null);
    setVoiceConnectedAt(null);
    setCreateServerStep(null);
    setServerNotice(`Modelo do Discord importado: ${importedServer.name}.`);

    void api
      .createServer({ server: importedServer })
      .then((apiResult) => {
        const syncedServer = applyOnlineServer(apiResult.server);
        setActiveServerId(syncedServer.id);
        setOnlineSyncStatus("idle");
      })
      .catch(() => {
        delete serverSyncHashesRef.current[importedServer.id];
        setServers((current) => current.filter((server) => server.id !== importedServer.id));
        setActiveServerId((current) => (current === importedServer.id ? null : current));
        setOnlineSyncStatus("error");
        setServerNotice("Nao consegui importar esse modelo na API online. Tente novamente em alguns segundos.");
      });
  }

  async function joinDiscoveredServer(server: DiscoveryServer) {
    if (onlineMode && api && server.onlineServerId) {
      try {
        const result = await api.joinPublicServer(server.onlineServerId);
        const joinedServer = applyOnlineServer(result.server);
        setActiveServerId(joinedServer.id);
        setActiveView("server");
        setActiveChannel(getFirstTextChannelName(joinedServer) ?? "geral");
        setServerGuideOpen(false);
        setServerNotice("Voce entrou no servidor pelo Descubra online.");
        setOnlineSyncStatus("idle");
      } catch {
        setServerNotice("Nao consegui entrar nesse servidor online agora.");
        setOnlineSyncStatus("error");
      }
      return;
    }

    const existing = servers.find((item) => item.name.toLowerCase() === server.name.toLowerCase());
    if (existing) {
      selectServer(existing.id);
      return;
    }

    setServerNotice("Esse servidor precisa estar publicado na API online para entrar.");
  }

  function extractTempestInviteCode(input: string) {
    const rawInput = input.trim();
    if (!rawInput) {
      return "";
    }

    try {
      const url = new URL(rawInput);
      const hostname = url.hostname.toLowerCase();
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (url.protocol === "tempest-light:" || hostname.includes("tempest") || hostname.endsWith(".shardweb.app")) {
        const parts = url.pathname.split("/").filter(Boolean);
        const inviteIndex = pathParts.findIndex((part) => part.toLowerCase() === "invite");
        const inviteCode = inviteIndex >= 0 ? pathParts.at(-1) : parts.at(-1);
        return decodeURIComponent(inviteCode ?? rawInput);
      }
    } catch {
      // Plain invite codes are valid too.
    }

    return rawInput.replace(/^@+/, "").split(/[?#]/)[0];
  }

  async function joinInviteCode(codeInput: string) {
    const code = extractTempestInviteCode(codeInput);
    if (!code) {
      setServerNotice("Cole um codigo ou link de convite.");
      return;
    }

    if (!onlineMode || !api) {
      setServerNotice("Entrada por convite precisa da API online.");
      return;
    }

    try {
      const result = await api.joinServer({ code });
      const joinedServer = applyOnlineServer(result.server);
      setActiveServerId(joinedServer.id);
      setActiveView("server");
      setActiveChannel(getFirstTextChannelName(joinedServer) ?? "geral");
      setServerGuideOpen(false);
      setVoiceChannel(null);
      setVoiceConnectedAt(null);
      setInviteCodeDraft("");
      setServerNotice("Voce entrou no servidor pelo convite.");
      setOnlineSyncStatus("idle");
    } catch {
      setServerNotice("Convite invalido, expirado ou sem usos disponiveis.");
      setOnlineSyncStatus("error");
    }
  }

  async function joinServerByInvite(event: FormEvent) {
    event.preventDefault();
    await joinInviteCode(inviteCodeDraft);
  }

  function updateActiveServer(input: Partial<ServerDefinition>, audit?: { action: AuditAction; target: string; details: string }) {
    if (!activeServer) {
      return;
    }

    setServers((current) =>
      current.map((server) => {
        if (server.id !== activeServer.id) {
          return server;
        }

        const updatedServer = { ...server, ...input };
        return audit ? withAudit(updatedServer, audit.action, audit.target, audit.details) : updatedServer;
      })
    );
  }

  function reorderActiveCategories(targetGroupName: string) {
    if (!activeServer || !draggedCategoryName || draggedCategoryName === targetGroupName || !canReorderServer) {
      return;
    }

    setServers((current) =>
      current.map((server) => {
        if (server.id !== activeServer.id) {
          return server;
        }

        const fromIndex = server.categories.findIndex((group) => group.name === draggedCategoryName);
        const toIndex = server.categories.findIndex((group) => group.name === targetGroupName);
        if (fromIndex < 0 || toIndex < 0) {
          return server;
        }

        return withAudit(
          { ...server, categories: reorderItems(server.categories, fromIndex, toIndex) },
          "server_updated",
          targetGroupName,
          "Ordem das categorias atualizada."
        );
      })
    );
    setDraggedCategoryName(null);
  }

  function reorderActiveChannel(targetGroupName: string, targetChannelName: string | null) {
    if (!activeServer || !draggedChannel || !canReorderServer) {
      return;
    }

    if (draggedChannel.groupName === targetGroupName && draggedChannel.channelName === targetChannelName) {
      setDraggedChannel(null);
      return;
    }

    setServers((current) =>
      current.map((server) => {
        if (server.id !== activeServer.id) {
          return server;
        }

        let movingChannel: ChannelDefinition | null = null;
        const withoutChannel = server.categories.map((group) => {
          if (group.name !== draggedChannel.groupName) {
            return group;
          }

          return {
            ...group,
            channels: group.channels.filter((channel) => {
              if (!movingChannel && channel.name === draggedChannel.channelName) {
                movingChannel = channel;
                return false;
              }

              return true;
            })
          };
        });

        if (!movingChannel) {
          return server;
        }

        const movedChannel = movingChannel as ChannelDefinition;
        const categories = withoutChannel.map((group) => {
          if (group.name !== targetGroupName) {
            return group;
          }

          const insertAt =
            targetChannelName === null
              ? group.channels.length
              : Math.max(
                  group.channels.findIndex((channel) => channel.name === targetChannelName),
                  0
                );
          const channels = [...group.channels];
          channels.splice(insertAt, 0, movedChannel);
          return { ...group, channels };
        });

        return withAudit(
          { ...server, categories },
          "server_updated",
          movedChannel.name,
          "Ordem dos canais atualizada."
        );
      })
    );
    setDraggedChannel(null);
  }

  function updateVoiceChannelLimit(groupName: string, channelName: string, userLimit: number | null) {
    if (!activeServer || !canReorderServer) {
      return;
    }

    const normalizedLimit = userLimit && userLimit > 0 ? Math.min(Math.max(Math.floor(userLimit), 1), 99) : null;
    setServers((current) =>
      current.map((server) => {
        if (server.id !== activeServer.id) {
          return server;
        }

        const categories = server.categories.map((group) =>
          group.name === groupName
            ? {
                ...group,
                channels: group.channels.map((channel) =>
                  channel.name === channelName && channel.type === "voice" ? { ...channel, userLimit: normalizedLimit } : channel
                )
              }
            : group
        );

        return withAudit(
          { ...server, categories },
          "server_updated",
          channelName,
          normalizedLimit ? `Limite do canal de voz definido como ${normalizedLimit}.` : "Limite do canal de voz removido."
        );
      })
    );
    setVoiceSettingsTarget(null);
  }

  function createServerInvite() {
    if (!activeServer) {
      return;
    }

    if (!canCreateInvite) {
      setServerNotice("Seu cargo nao permite criar convites.");
      setServerMenuOpen(false);
      return;
    }

    if (onlineMode && api) {
      void api
        .createServerInvite(activeServer.id, { duration: "never", maxUses: 25 })
        .then(async (result) => {
          const syncedServer = applyOnlineServer(result.server);
          const inviteLink = getServerInviteLink(syncedServer, result.invite.code);
          try {
            await navigator.clipboard.writeText(inviteLink);
            setServerNotice(`Novo convite copiado: ${inviteLink}`);
          } catch {
            setServerNotice(`Convite criado: ${inviteLink}`);
          }
          setOnlineSyncStatus("idle");
        })
        .catch(() => {
          setOnlineSyncStatus("error");
          setServerNotice("Nao consegui criar o convite pela API online agora.");
        });
      setServerMenuOpen(false);
      return;
    }

    setServerNotice("A API online precisa estar conectada para criar convites.");
    setServerMenuOpen(false);
  }

  async function createInviteFromApi(options: { duration?: InviteDurationId; maxUses?: number | null }) {
    if (!onlineMode || !api || !activeServer) {
      return null;
    }

    const result = await api.createServerInvite(activeServer.id, options);
    applyOnlineServer(result.server);
    setOnlineSyncStatus("idle");
    return normalizeServerInvite(result.invite);
  }

  async function setInviteActiveInApi(inviteId: string, active: boolean) {
    if (!onlineMode || !api || !activeServer) {
      return false;
    }

    const result = await api.updateServerInvite(activeServer.id, inviteId, { active });
    applyOnlineServer(result.server);
    setOnlineSyncStatus("idle");
    return true;
  }

  async function deleteInviteInApi(inviteId: string) {
    if (!onlineMode || !api || !activeServer) {
      return false;
    }

    const result = await api.deleteServerInvite(activeServer.id, inviteId);
    applyOnlineServer(result.server);
    setOnlineSyncStatus("idle");
    return true;
  }

  async function deleteActiveServer(input: DeleteServerInput) {
    if (!activeServer) {
      return false;
    }

    if (activeServer.ownerId !== user.id) {
      throw new Error("Somente o dono pode excluir este servidor.");
    }

    const serverId = activeServer.id;
    const serverName = activeServer.name;
    if (!onlineMode || !api) {
      throw new Error("Conecte a API online para excluir servidor com verificacao de senha.");
    }

    try {
      await api.deleteServer(serverId, input);
    } catch (caught) {
      setOnlineSyncStatus("error");
      throw caught;
    }

    removeServerFromWorkspace(serverId, `Servidor ${serverName} excluido permanentemente.`);
    return true;
  }

  async function banMemberInApi(username: string, reason: string | null) {
    if (!onlineMode || !api || !activeServer) {
      return false;
    }

    const result = await api.banServerMember(activeServer.id, { username, reason: reason ?? undefined });
    applyOnlineServer(result.server);
    setOnlineSyncStatus("idle");
    return true;
  }

  async function unbanMemberInApi(userId: string) {
    if (!onlineMode || !api || !activeServer) {
      return false;
    }

    const result = await api.unbanServerMember(activeServer.id, userId);
    applyOnlineServer(result.server);
    setOnlineSyncStatus("idle");
    return true;
  }

  async function timeoutMemberInApi(username: string, durationMinutes: TimeoutServerMemberInput["durationMinutes"], reason: string | null) {
    if (!onlineMode || !api || !activeServer) {
      return false;
    }

    const result = await api.timeoutServerMember(activeServer.id, { username, durationMinutes, reason: reason ?? undefined });
    applyOnlineServer(result.server);
    setOnlineSyncStatus("idle");
    return true;
  }

  async function removeMemberTimeoutInApi(userId: string) {
    if (!onlineMode || !api || !activeServer) {
      return false;
    }

    const result = await api.removeServerMemberTimeout(activeServer.id, userId);
    applyOnlineServer(result.server);
    setOnlineSyncStatus("idle");
    return true;
  }

  async function publishDesktopUpdate(input: PublishDesktopUpdateInput) {
    if (!onlineMode || !api) {
      throw new Error("A API online precisa estar conectada para enviar atualizacoes.");
    }

    const result = await api.publishDesktopUpdate(input);
    setOnlineSyncStatus("idle");
    setServerNotice("Atualizacao enviada para o GitHub Actions.");
    return result;
  }

  function createRole(serverId: string) {
    if (!memberHasPermission(activeServer, activeServerMember, "manage_roles", user.id)) {
      setServerNotice("Seu cargo nao permite criar cargos.");
      return null;
    }

    const roleId = `role-${Date.now()}`;
    const newRole: ServerRole = {
      id: roleId,
      name: "novo cargo",
      color: "#99aab5",
      style: "solid",
      iconUrl: null,
      separateMembers: false,
      permissions: { ...defaultEveryonePermissions }
    };

    setServers((current) =>
      current.map((server) =>
        server.id === serverId
          ? withAudit({ ...server, roles: [newRole, ...server.roles] }, "role_created", newRole.name, "Cargo criado.")
          : server
      )
    );
    return roleId;
  }

  function updateRole(serverId: string, roleId: string, patchInput: Partial<ServerRole> | ((role: ServerRole) => Partial<ServerRole>)) {
    if (!memberHasPermission(activeServer, activeServerMember, "manage_roles", user.id)) {
      setServerNotice("Seu cargo nao permite editar cargos.");
      return;
    }

    setServers((current) =>
      current.map((server) => {
        if (server.id !== serverId) {
          return server;
        }

        let auditTarget = server.roles.find((role) => role.id === roleId)?.name ?? "cargo";
        const roles = server.roles.map((role) => {
          if (role.id !== roleId) {
            return role;
          }

          const patch = typeof patchInput === "function" ? patchInput(role) : patchInput;
          auditTarget = patch.name ?? role.name;

          return {
            ...role,
            ...patch,
            id: role.id,
            isDefault: role.isDefault,
            name: role.isDefault ? "@everyone" : patch.name ?? role.name
          };
        });

        return withAudit({ ...server, roles }, "role_updated", auditTarget, "Cargo ou permissoes atualizados.");
      })
    );
  }

  function setMemberRole(serverId: string, memberId: string, roleId: string, enabled: boolean) {
    if (!memberHasPermission(activeServer, activeServerMember, "manage_roles", user.id)) {
      setServerNotice("Seu cargo nao permite atribuir cargos.");
      return;
    }

    setServers((current) =>
      current.map((server) =>
        server.id === serverId
          ? withAudit(
              {
                ...server,
                members: server.members.map((member) => {
                  if (member.id !== memberId) {
                    return member;
                  }

                const roleIds = new Set(member.roleIds);
                if (enabled) {
                  roleIds.add(roleId);
                } else if (roleId !== "everyone") {
                  roleIds.delete(roleId);
                }

                  return { ...member, roleIds: ["everyone", ...Array.from(roleIds).filter((id) => id !== "everyone")] };
                })
              },
              "role_assigned",
              server.members.find((member) => member.id === memberId)?.displayName ?? "membro",
              enabled ? "Cargo atribuido ao membro." : "Cargo removido do membro."
            )
          : server
      )
    );
  }

  function getOwnProfileCard(): ProfileCardUser {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      customStatus: user.customStatus,
      presence: user.presence,
      accountCreatedAt: user.createdAt,
      serverJoinedAt: activeServerMember?.joinedAt ?? null,
      isOwnProfile: true,
      mutualFriends: directContacts.filter((contact) => contact.isFriend).length,
      mutualServers: servers.length,
      voiceStatus: ownVoiceStatus,
      steamActivity: currentActivity ?? undefined
    };
  }

  function getDirectProfileCard(contact: DirectContact): ProfileCardUser {
    return {
      id: contact.id,
      username: contact.username,
      displayName: contact.displayName,
      avatarUrl: contact.avatarUrl,
      bannerUrl: contact.bannerUrl,
      bio: contact.bio,
      customStatus: contact.customStatus,
      presence: getPublicPresence(contact.status),
      accountCreatedAt: contact.createdAt ?? null,
      serverJoinedAt: null,
      isOwnProfile: false,
      isFriend: contact.isFriend,
      canMessage: contact.isFriend || !contact.blocksNonFriendMessages,
      mutualFriends: contact.isFriend ? 1 : 0,
      mutualServers: 0
    };
  }

  function getMemberProfileCard(member: ServerMemberDefinition): ProfileCardUser {
    const isOwnMember = member.id === user.id || member.username === user.username;
    if (isOwnMember) {
      return {
        ...getOwnProfileCard(),
        serverJoinedAt: member.joinedAt,
        mutualServers: activeServer ? 1 : servers.length
      };
    }

    const directContact = directContacts.find((contact) => contact.username === member.username);
    if (directContact) {
      const card = getDirectProfileCard(directContact);
      return {
        ...card,
        serverJoinedAt: member.joinedAt,
        isOwnProfile: false
      };
    }

    return {
      id: member.id,
      username: member.username,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
      bannerUrl: member.bannerUrl ?? null,
      bio: member.bio ?? null,
      presence: getPublicPresence(member.presence),
      accountCreatedAt: member.accountCreatedAt ?? member.joinedAt,
      serverJoinedAt: member.joinedAt,
      isOwnProfile: false,
      mutualFriends: 0,
      mutualServers: activeServer ? 1 : 0
    };
  }

  function getMessageAuthorProfile(message: LocalMessage, directContact?: DirectContact | null) {
    if (messageBelongsToCurrentUser(message, user)) {
      return {
        displayName: user.displayName,
        avatarUrl: user.avatarUrl
      };
    }

    const serverMember = activeServer?.members.find(
      (member) => member.id === message.authorId || member.username === message.authorUsername || member.displayName === message.author
    );
    if (serverMember) {
      return {
        displayName: serverMember.displayName,
        avatarUrl: serverMember.avatarUrl
      };
    }

    const contact = directContact ?? directContacts.find(
      (item) => item.id === message.authorId || item.username === message.authorUsername || item.displayName === message.author
    );
    if (contact) {
      return {
        displayName: contact.displayName,
        avatarUrl: contact.avatarUrl
      };
    }

    return {
      displayName: message.author,
      avatarUrl: message.authorAvatarUrl ?? null
    };
  }

  function getVoiceProfileCard(state: OnlineVoiceState): ProfileCardUser {
    const member = activeServer?.members.find((item) => item.id === state.userId || item.username === state.username);
    if (member) {
      return {
        ...getMemberProfileCard(member),
        voiceStatus: {
          channelName: state.channelName,
          elapsedLabel: formatElapsedDuration(Date.now() - Date.parse(state.joinedAt)),
          muted: state.muted
        }
      };
    }

    return {
      id: state.userId,
      username: state.username,
      displayName: state.displayName,
      avatarUrl: state.avatarUrl,
      presence: "ONLINE",
      accountCreatedAt: null,
      serverJoinedAt: state.joinedAt,
      isOwnProfile: state.userId === user.id,
      mutualFriends: 0,
      mutualServers: activeServer ? 1 : 0,
      voiceStatus: {
        channelName: state.channelName,
        elapsedLabel: formatElapsedDuration(Date.now() - Date.parse(state.joinedAt)),
        muted: state.muted
      }
    };
  }

  async function sendDirectMessage() {
    const text = directDraft.trim();
    const attachments = directDraftAttachments;
    if (!activeDirect || (!text && !attachments.length) || !canMessageActiveDirect) {
      return;
    }

    if (onlineMode && api) {
      try {
        const message = await api.sendDirectMessage(activeDirect.id, { content: serializeMessageContent(text, attachments) });
        setDirectMessages((current) => ({
          ...current,
          [activeDirect.id]: [...(current[activeDirect.id] ?? []), onlineDirectMessageToLocalMessage(message)]
        }));
        setDirectDraft("");
        setDirectDraftAttachments([]);
        setDirectNotice(null);
      } catch {
        setDirectNotice("Nao consegui enviar essa DM pela API agora.");
      }
      return;
    }

    setDirectMessages((current) => ({
      ...current,
      [activeDirect.id]: [
        ...(current[activeDirect.id] ?? []),
        {
          authorId: user.id,
          authorUsername: user.username,
          author: user.displayName,
          authorAvatarUrl: user.avatarUrl,
          time: new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
          }),
          createdAt: new Date().toISOString(),
          text,
          attachments
        }
      ]
    }));
    setDirectDraft("");
    setDirectDraftAttachments([]);
  }

  async function sendVoiceChatMessage() {
    const text = voiceChatDraft.trim();
    if (activeMemberTimeoutNotice) {
      setServerNotice(activeMemberTimeoutNotice);
      return;
    }

    if (!activeServer || !activeVoiceChatChannelName || !voiceChannel || !text || !canSendServerMessages) {
      return;
    }

    const message: LocalMessage = {
      authorId: user.id,
      authorUsername: user.username,
      author: user.displayName,
      authorAvatarUrl: user.avatarUrl,
      time: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      }),
      createdAt: new Date().toISOString(),
      text,
      serverId: activeServer.id,
      channelName: activeVoiceChatChannelName
    };

    if (onlineMode && api) {
      try {
        const result = await api.sendServerMessage(activeServer.id, {
          channelName: activeVoiceChatChannelName,
          content: text
        });
        setMessages((current) => appendUniqueLocalMessages(current, [onlineServerMessageToLocalMessage(result.message)]));
        setVoiceChatDraft("");
        setOnlineSyncStatus("idle");
      } catch {
        setServerNotice("Nao consegui enviar no chat da call agora.");
        setOnlineSyncStatus("error");
      }
      return;
    }

    setMessages((current) => [...current, message]);
    setVoiceChatDraft("");
  }

  async function loadVoiceCaptureSources(mode: ScreenShareCaptureMode) {
    const desktopApi = window.tempestLightDesktop;
    setVoiceCaptureMode(mode);

    if (!desktopApi?.getDisplaySources) {
      setVoiceCaptureSources([]);
      setSelectedVoiceCaptureSourceId("");
      return [];
    }

    setVoiceCaptureSourcesLoading(true);
    try {
      const result = await desktopApi.getDisplaySources({ mode });
      const sources = result.ok ? result.sources ?? [] : [];
      setVoiceCaptureSources(sources);
      setSelectedVoiceCaptureSourceId((current) => (sources.some((source) => source.id === current) ? current : sources[0]?.id ?? ""));

      if (!result.ok && result.message) {
        setServerNotice(result.message);
      }

      return sources;
    } catch {
      setVoiceCaptureSources([]);
      setSelectedVoiceCaptureSourceId("");
      setServerNotice("Nao consegui listar as telas e janelas deste computador.");
      return [];
    } finally {
      setVoiceCaptureSourcesLoading(false);
    }
  }

  function getScreenShareFailureNotice(caught: unknown) {
    const name =
      typeof DOMException !== "undefined" && caught instanceof DOMException
        ? caught.name
        : caught instanceof Error
        ? caught.name
        : "";
    const message = caught instanceof Error ? caught.message.trim() : "";

    if (name === "NotAllowedError" || name === "AbortError") {
      return "Transmissao cancelada.";
    }

    if (name === "NotFoundError") {
      return "Nao encontrei nenhuma tela ou janela disponivel para transmitir.";
    }

    if (name === "NotReadableError") {
      return "O sistema bloqueou a captura dessa tela ou janela. Tente outra fonte.";
    }

    return message ? `Nao consegui iniciar a transmissao neste dispositivo. ${message}` : "Nao consegui iniciar a transmissao neste dispositivo.";
  }

  async function startVoiceScreenShare(mode: ScreenShareCaptureMode) {
    if (!voiceChannel) {
      setServerNotice("Entre em uma call para transmitir.");
      return;
    }

    if (!canShareVideo) {
      setServerNotice("Seu cargo nao permite transmitir tela ou jogo.");
      return;
    }

    try {
      const desktopApi = window.tempestLightDesktop;
      let sourceId: string | undefined;

      if (desktopApi?.getDisplaySources) {
        const sources = voiceCaptureMode === mode && voiceCaptureSources.length ? voiceCaptureSources : await loadVoiceCaptureSources(mode);
        sourceId =
          voiceCaptureMode === mode && sources.some((source) => source.id === selectedVoiceCaptureSourceId)
            ? selectedVoiceCaptureSourceId
            : sources[0]?.id;

        if (!sourceId) {
          setServerNotice(mode === "game" ? "Nao encontrei nenhuma janela ou jogo para transmitir." : "Nao encontrei nenhuma tela para transmitir.");
          return;
        }
      } else {
        setServerNotice(mode === "game" ? "Escolha a janela do jogo para transmitir." : "Escolha a tela para transmitir.");
      }

      await onlineVoiceCall.startScreenShare(screenShareQuality, screenShareFps, mode === "game" ? "window" : "monitor", sourceId);
      setVoiceShareMenuOpen(false);
      setServerNotice("Transmissao iniciada.");
    } catch (caught) {
      setServerNotice(getScreenShareFailureNotice(caught));
    }
  }

  function upsertDirectContact(contact: DirectContact) {
    setDirectContacts((current) => {
      const existing = current.find((item) => item.username === contact.username || item.id === contact.id);
      if (!existing) {
        return [...current, contact];
      }

      return current.map((item) => (item.id === existing.id || item.username === contact.username ? { ...item, ...contact } : item));
    });
  }

  async function respondFriendRequest(request: FriendRequestItem, action: "accept" | "decline" | "cancel") {
    if (!onlineMode || !api) {
      return;
    }

    try {
      if (action === "accept") {
        await api.acceptFriendship(request.id);
        const conversation = await api.startDirectConversation({ username: request.otherUser.username });
        const contact = directConversationToContact(conversation);
        upsertDirectContact(contact);
        setDirectMessages((current) => ({
          ...current,
          [conversation.id]: conversation.messages.map((message) => onlineDirectMessageToLocalMessage(message))
        }));
        setActiveDirectId(conversation.id);
        setDirectNotice("Solicitacao aceita.");
      } else if (action === "decline") {
        await api.declineFriendship(request.id);
        setDirectNotice("Solicitacao recusada.");
      } else {
        await api.cancelFriendship(request.id);
        setDirectNotice("Solicitacao cancelada.");
      }

      setFriendRequests((current) => ({
        incoming: current.incoming.filter((item) => item.id !== request.id),
        outgoing: current.outgoing.filter((item) => item.id !== request.id)
      }));
    } catch {
      setDirectNotice("Nao consegui atualizar essa solicitacao agora.");
    }
  }

  function requestFriendship(contactId: string) {
    const contact = directContacts.find((item) => item.id === contactId);
    if (onlineMode && api && contact) {
      void api
        .requestFriendship({ username: contact.username })
        .then(() => {
          setDirectContacts((current) =>
            current.map((item) => (item.id === contactId ? { ...item, friendRequestSent: true } : item))
          );
          setDirectNotice("Solicitacao de amizade enviada.");
        })
        .catch(() => setDirectNotice("Nao consegui enviar a solicitacao pela API agora."));
      return;
    }

    setDirectContacts((current) =>
      current.map((contact) => (contact.id === contactId ? { ...contact, friendRequestSent: true } : contact))
    );
    setDirectNotice("Solicitacao de amizade enviada.");
  }

  async function startDirectByUsername(event: FormEvent) {
    event.preventDefault();
    const username = directUsername.trim().toLowerCase().replace(/^@/, "");
    if (!username) {
      return;
    }

    const existing = directContacts.find((contact) => contact.username === username);
    if (existing) {
      setActiveDirectId(existing.id);
      setDirectUsername("");
      setDirectNotice(null);
      return;
    }

    if (onlineMode && api) {
      try {
        const conversation = await api.startDirectConversation({ username });
        const contact = directConversationToContact(conversation);
        setDirectContacts((current) => {
          const exists = current.some((item) => item.id === contact.id);
          return exists ? current.map((item) => (item.id === contact.id ? contact : item)) : [...current, contact];
        });
        setDirectMessages((current) => ({
          ...current,
          [conversation.id]: conversation.messages.map((message) => onlineDirectMessageToLocalMessage(message))
        }));
        setActiveDirectId(conversation.id);
        setDirectUsername("");
        setDirectNotice(null);
      } catch {
        setDirectNotice("Nao encontrei esse usuario online ou a DM esta bloqueada.");
      }
      return;
    }

    setDirectNotice("A API online precisa estar conectada para iniciar DMs.");
  }

  const liveProfileCardUser = profileCardUser
    ? {
        ...profileCardUser,
        displayName: profileCardUser.id === user.id ? user.displayName : profileCardUser.displayName,
        username: profileCardUser.id === user.id ? user.username : profileCardUser.username,
        avatarUrl: profileCardUser.id === user.id ? user.avatarUrl : profileCardUser.avatarUrl,
        bannerUrl: profileCardUser.id === user.id ? user.bannerUrl : profileCardUser.bannerUrl,
        bio: profileCardUser.id === user.id ? user.bio : profileCardUser.bio,
        customStatus: profileCardUser.id === user.id ? user.customStatus : profileCardUser.customStatus,
        presence: profileCardUser.id === user.id ? user.presence : profileCardUser.presence,
        accountCreatedAt: profileCardUser.id === user.id ? user.createdAt : profileCardUser.accountCreatedAt,
        voiceStatus: profileCardUser.id === user.id ? ownVoiceStatus : profileCardUser.voiceStatus,
        steamActivity: profileCardUser.id === user.id ? currentActivity ?? undefined : profileCardUser.steamActivity
      }
    : null;

  function renderServerGuide() {
    if (!activeServer) {
      return null;
    }

    const guideChannels = getServerGuideChannels(activeServer);
    const guideBannerUrl = activeServerBoostLevel >= SERVER_GUIDE_BANNER_UNLOCK_LEVEL ? activeServer.boostPerks.serverGuideBannerUrl : null;
    const guideIconUrl = getServerIconUrl(activeServer, activeServerBoostLevel);
    const ownerJoinedAt = activeServer.members.find((member) => member.id === activeServer.ownerId)?.joinedAt ?? activeServer.members[0]?.joinedAt;
    const onlineMembers = activeServer.members.filter((member) => member.presence === "ONLINE").length;
    const sinceLabel = ownerJoinedAt
      ? new Date(ownerJoinedAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
      : new Date().toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

    return (
      <div className="server-guide-page">
        <header className="server-guide-title">
          <BookOpen size={18} />
          <strong>Guia do servidor</strong>
        </header>

        <div className="server-guide-layout">
          <div
            className={guideBannerUrl ? "server-guide-banner has-image" : "server-guide-banner"}
            style={guideBannerUrl ? { backgroundImage: toCssImageUrl(guideBannerUrl) } : { background: activeServer.bannerColor }}
          >
            {guideBannerUrl ? null : <ImageIcon size={30} />}
          </div>

          <section className="server-guide-main">
            <div className="server-guide-heading">
              <span className={guideIconUrl ? "server-guide-icon has-image" : "server-guide-icon"}>
                {guideIconUrl ? <img src={guideIconUrl} alt="" /> : activeServer.initials}
              </span>
              <div>
                <h1>{activeServer.name}</h1>
                {activeServerBoostLevel >= SERVER_BADGE_UNLOCK_LEVEL && activeServer.boostPerks.serverBadgeText ? (
                  <span className="server-badge-pill">{activeServer.boostPerks.serverBadgeText}</span>
                ) : null}
              </div>
              <button type="button" onClick={() => void copyServerGuideInvite()}>
                Convite
              </button>
            </div>

            <section className="server-guide-resources">
              <h2>Recursos</h2>
              {guideChannels.length ? (
                guideChannels.map((channel) => (
                  <button key={`${channel.type}-${channel.name}`} type="button" onClick={() => selectChannel(channel)}>
                    {channel.type === "voice" ? <Volume2 size={17} /> : <Hash size={17} />}
                    <span>
                      {channel.type === "voice" ? "Voz" : "Chat"} | {channel.name}
                    </span>
                  </button>
                ))
              ) : (
                <div className="empty-state compact-empty">
                  <BookOpen size={28} />
                  <p>Nenhum canal publico configurado para esta guia.</p>
                </div>
              )}
            </section>
          </section>

          <aside className="server-guide-card">
            <div
              className={guideBannerUrl ? "server-guide-card-banner has-image" : "server-guide-card-banner"}
              style={guideBannerUrl ? { backgroundImage: toCssImageUrl(guideBannerUrl) } : { background: activeServer.bannerColor }}
            />
            <span className={guideIconUrl ? "server-guide-card-icon has-image" : "server-guide-card-icon"}>
              {guideIconUrl ? <img src={guideIconUrl} alt="" /> : activeServer.initials}
            </span>
            <strong>{activeServer.name}</strong>
            <span>
              {onlineMembers} online - {activeServer.members.length} membros
            </span>
            <small>Desde {sinceLabel}</small>
            <div className="server-guide-tags">
              <span>{activeServer.purpose === "community" ? "comunidade" : "amigos"}</span>
              {activeServer.serverTag ? <span>{activeServer.serverTag}</span> : null}
              <span>NV. {activeServerBoostLevel}</span>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <main
      className={activeServerLegendaryTheme ? "app-shell legendary-server-theme" : "app-shell"}
      style={activeServerAccentColor ? ({ "--accent": activeServerAccentColor, "--accent-strong": activeServerAccentColor } as CSSProperties) : undefined}
    >
      {Object.entries(onlineVoiceCall.remoteStreams).map(([remoteUserId, stream]) => (
        <VoiceRemoteMedia key={remoteUserId} stream={stream} deafened={voiceDeafened} />
      ))}
      <nav className="community-rail" aria-label="Comunidades">
        <button
          className={activeView === "direct" ? "community-button active" : "community-button"}
          title="Mensagens diretas"
          type="button"
          onClick={() => {
            setActiveView("direct");
            setServerGuideOpen(false);
          }}
        >
          <MessageCircle size={22} />
        </button>
        {servers.map((server) => (
          <button
            key={server.id}
            className={activeView === "server" && activeServer?.id === server.id ? "community-button active" : "community-button"}
            title={server.name}
            type="button"
            onClick={() => selectServer(server.id)}
          >
            {getServerIconUrl(server, getBoostLevel(getActiveBoosts(server.boosts, nowTick).length)) ? (
              <img src={getServerIconUrl(server, getBoostLevel(getActiveBoosts(server.boosts, nowTick).length)) ?? ""} alt="" />
            ) : (
              server.initials
            )}
          </button>
        ))}
        <button className="community-button add" title="Adicionar servidor" type="button" onClick={openCreateServerDialog}>
          <Plus size={20} />
        </button>
        <button
          className={activeView === "discover" ? "community-button discover active" : "community-button discover"}
          title="Descubra"
          type="button"
          onClick={() => {
            setActiveView("discover");
            setServerMenuOpen(false);
            setServerGuideOpen(false);
          }}
        >
          <Compass size={18} />
          <span>Descubra</span>
        </button>
      </nav>

      <aside className="channel-sidebar">
        {activeView === "direct" ? (
          <>
            <header className="server-header">
              <div>
                <strong>Mensagens diretas</strong>
                <span>Privado entre pessoas</span>
              </div>
              <button className="icon-button" title="Pesquisar" type="button">
                <Search size={18} />
              </button>
            </header>

            <div className="direct-section">
              <form className="direct-search" onSubmit={startDirectByUsername}>
                <input
                  value={directUsername}
                  onChange={(event) => setDirectUsername(event.target.value)}
                  placeholder="Abrir DM por nick"
                />
                <button className="send-button" title="Abrir mensagem direta" type="submit">
                  <Plus size={17} />
                </button>
              </form>

              {friendRequests.incoming.length || friendRequests.outgoing.length ? (
                <div className="friend-request-stack">
                  {friendRequests.incoming.map((request) => (
                    <article className="friend-request-card" key={request.id}>
                      <AvatarBadge user={request.sender} className="friend-request-avatar" />
                      <div>
                        <strong>{request.sender.displayName}</strong>
                        <span>@{request.sender.username} quer amizade</span>
                      </div>
                      <button className="mini-action" title="Aceitar amizade" type="button" onClick={() => void respondFriendRequest(request, "accept")}>
                        <UserCheck size={14} />
                      </button>
                      <button className="mini-action danger-mini-action" title="Recusar amizade" type="button" onClick={() => void respondFriendRequest(request, "decline")}>
                        <X size={14} />
                      </button>
                    </article>
                  ))}
                  {friendRequests.outgoing.map((request) => (
                    <article className="friend-request-card outgoing" key={request.id}>
                      <AvatarBadge user={request.receiver} className="friend-request-avatar" />
                      <div>
                        <strong>{request.receiver.displayName}</strong>
                        <span>Pedido enviado</span>
                      </div>
                      <button className="mini-action danger-mini-action" title="Cancelar pedido" type="button" onClick={() => void respondFriendRequest(request, "cancel")}>
                        <X size={14} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}

              <div className="direct-list">
                {directContacts.map((contact) => {
                  const hasUnreadDirect = hasUnreadDirectConversation(contact.id);
                  return (
                    <button
                      key={contact.id}
                      className={activeDirect?.id === contact.id ? "direct-contact active" : "direct-contact"}
                      type="button"
                      onClick={() => {
                        setActiveDirectId(contact.id);
                        setDirectNotice(null);
                      }}
                    >
                  <span
                    className="avatar-hit"
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      setProfileCardUser(getDirectProfileCard(contact));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        setProfileCardUser(getDirectProfileCard(contact));
                      }
                    }}
                  >
                    <AvatarBadge user={contact} className="avatar" />
                  </span>
                    <div>
                      <strong>{contact.displayName}</strong>
                      <span>@{contact.username}</span>
                    </div>
                    {hasUnreadDirect ? <span className="unread-dot" aria-label="Mensagens nao lidas" /> : null}
                    <span className={`presence ${getPublicPresence(contact.status).toLowerCase()}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : activeView === "discover" ? (
          <>
            <header className="server-header">
              <div>
                <strong>Descubra</strong>
                <span>Encontre servidores publicos</span>
              </div>
              <Compass size={18} />
            </header>

            <div className="discover-filter">
              <label>
                Buscar servidor
                <input
                  value={discoverQuery}
                  onChange={(event) => setDiscoverQuery(event.target.value)}
                  placeholder="Nome ou conteudo"
                />
              </label>
              <p>Pesquise por nome, tipo de conteudo ou comunidade.</p>
            </div>
          </>
        ) : activeServer ? (
          <>
            <header
              className={[
                "server-header",
                "has-menu",
                activeServerBannerUrl ? "banner-header" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                activeServerBannerUrl ? { backgroundImage: toCssImageUrl(activeServerBannerUrl) } : undefined
              }
            >
              <button
                className="server-title-button"
                type="button"
                onClick={() => setServerMenuOpen((current) => !current)}
                title="Abrir menu do servidor"
              >
                <div>
                  <strong>
                    {activeServer.name}
                    {activeServerBoostLevel >= SERVER_BADGE_UNLOCK_LEVEL && activeServer.boostPerks.serverBadgeText ? (
                      <span className="server-badge-pill">{activeServer.boostPerks.serverBadgeText}</span>
                    ) : null}
                  </strong>
                  <span>Servidor de {user.displayName}</span>
                </div>
                <ChevronDown size={17} />
              </button>
              <button className="icon-button" title="Convidar para o servidor" type="button" onClick={createServerInvite}>
                <UserPlus size={17} />
              </button>

              {serverMenuOpen ? (
                <div className="server-menu">
                  <button type="button" onClick={createServerInvite}>
                    <Users size={18} />
                    Convidar para o servidor
                  </button>
                  {canAdministerActiveServer ? (
                    <button type="button" onClick={() => openServerSettings("profile")}>
                      <Settings size={18} />
                      Config. do servidor
                    </button>
                  ) : null}
                  {canManageChannels ? (
                    <button
                      type="button"
                      onClick={() => {
                        setChannelDialogOpen(true);
                        setServerMenuOpen(false);
                      }}
                    >
                      <Plus size={18} />
                      Criar canal
                    </button>
                  ) : null}
                  {canManageChannels ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryDialogOpen(true);
                        setServerMenuOpen(false);
                      }}
                    >
                      <FolderPlus size={18} />
                      Criar categoria
                    </button>
                  ) : null}
                  {canCreateEvents ? (
                    <button
                      type="button"
                      onClick={() => {
                        setServerNotice("Criacao de evento preparada para o modulo de calendario.");
                        setServerMenuOpen(false);
                      }}
                    >
                      <CalendarPlus size={18} />
                      Criar evento
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationDialogOpen(true);
                      setServerMenuOpen(false);
                    }}
                  >
                    <BellRing size={18} />
                    Config. de notificacao
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrivacyDialogOpen(true);
                      setServerMenuOpen(false);
                    }}
                  >
                    <ShieldCheck size={18} />
                    Config. de privacidade
                  </button>
                  <button type="button" disabled>
                    <UserRoundCog size={18} />
                    Editar perfil por servidor
                  </button>
                </div>
              ) : null}
            </header>

            <div className="channel-list">
              {activeServer.boostProgressVisible ? (
                <section
                  className="boost-progress-card"
                  aria-label="Progresso de estrelas"
                  style={activeStarProgressGradient ? ({ "--star-progress-gradient": activeStarProgressGradient } as CSSProperties) : undefined}
                >
                  <div>
                    <strong>Objetivo de estrelas</strong>
                    <span>
                      {activeServerBoosts.length}/{activeServerNextBoostTarget} Estrelas
                      {activeServerBoostOverflow ? ` (+${activeServerBoostOverflow})` : ""}
                      <ChevronRight size={13} />
                    </span>
                  </div>
                  <progress
                    value={Math.min(activeServerBoosts.length, activeServerNextBoostTarget)}
                    max={Math.max(activeServerNextBoostTarget, 1)}
                  />
                </section>
              ) : null}
              <section className="server-quick-links" aria-label="Atalhos do servidor">
                {canUseActiveServerGuide ? (
                  <button className={serverGuideOpen ? "active" : ""} type="button" onClick={openServerGuide}>
                    <BookOpen size={18} />
                    <span>Guia do servidor</span>
                  </button>
                ) : null}
                {canCreateEvents ? (
                  <button type="button" onClick={() => setServerNotice("Eventos preparados para o modulo de calendario do servidor.")}>
                    <CalendarPlus size={18} />
                    <span>Eventos</span>
                  </button>
                ) : null}
                {canAdministerActiveServer || canManageChannels || canManageRoles ? (
                  <button type="button" onClick={() => openServerSettings("roles")}>
                    <Settings size={18} />
                    <span>Canais &amp; Cargos</span>
                  </button>
                ) : null}
                {canAdministerActiveServer ? (
                  <button type="button" onClick={() => openServerSettings("members")}>
                    <Users size={18} />
                    <span>Membros</span>
                  </button>
                ) : null}
                <button type="button" onClick={() => openServerSettings("boosts")}>
                  <Shield size={18} />
                  <span>Estrelas de servidor</span>
                </button>
              </section>
              {specialChannels.length ? (
                <section className="channel-group special-channel-group">
                  {specialChannels.map((channel) => (
                    (() => {
                      const channelMentionCount = unreadMentionCountsByChannel.get(`${activeServer.id}:${channel.name}`) ?? 0;
                      return (
                        <button
                          key={`special-${channel.special}-${channel.name}`}
                          className={[
                            "channel",
                            "special-channel",
                            activeChannel === channel.name && channel.type === "text" ? "active" : "",
                            channel.isPrivate ? "private" : ""
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => selectChannel(channel)}
                          type="button"
                          title={channel.isPrivate ? "Canal privado da comunidade" : "Canal da comunidade"}
                        >
                          {channel.special === "rules" ? <BookOpen size={16} /> : <ShieldCheck size={16} />}
                          <span>{channel.name}</span>
                          {channelMentionCount ? <small className="mention-badge">{channelMentionCount}</small> : null}
                          {channel.isNew ? <small className="new-badge">NOVO</small> : null}
                        </button>
                      );
                    })()
                  ))}
                </section>
              ) : null}
              {visibleChannelGroups.map((group) => (
                <section
                  key={group.name}
                  className="channel-group"
                  onMouseUp={() => {
                    setDraggedCategoryName(null);
                    setDraggedChannel(null);
                  }}
                  onDragOver={(event) => {
                    if (canReorderServer && (draggedCategoryName || draggedChannel)) {
                      event.preventDefault();
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedCategoryName) {
                      reorderActiveCategories(group.name);
                    } else if (draggedChannel) {
                      reorderActiveChannel(group.name, null);
                    }
                  }}
                >
                  <h2
                    draggable={canReorderServer}
                    onContextMenu={(event) => {
                      if (canReorderServer) {
                        event.preventDefault();
                      }
                    }}
                    onMouseDown={(event) => {
                      if (canReorderServer && event.button === 2) {
                        setDraggedCategoryName(group.name);
                      }
                    }}
                    onMouseEnter={() => {
                      if (canReorderServer && draggedCategoryName && draggedCategoryName !== group.name) {
                        reorderActiveCategories(group.name);
                      }
                    }}
                    onDragStart={(event) => {
                      if (!canReorderServer) {
                        return;
                      }

                      setDraggedCategoryName(group.name);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDraggedCategoryName(null)}
                  >
                    <span className="channel-category-title">
                      {canReorderServer ? <GripVertical className="drag-handle" size={14} /> : null}
                      {group.name}
                    </span>
                    <button
                      className="mini-action"
                      title={canManageChannels ? "Criar canal" : "Sem permissao para criar canal"}
                      type="button"
                      disabled={!canManageChannels}
                      onClick={() => setChannelDialogOpen(true)}
                    >
                      <Plus size={14} />
                    </button>
                  </h2>
                  {group.channels.length ? (
                    group.channels.map((channel) => {
                      const isJoinedVoice = voiceChannel === channel.name && channel.type === "voice";
                      const hasUnreadChannel = channel.type === "text" && hasUnreadServerChannel(activeServer.id, channel.name);
                      const voiceParticipants = channel.type === "voice" ? getVoiceChannelParticipants(channel.name) : [];
                      const voiceOccupancy = channel.type === "voice" ? getVoiceChannelOccupancy(channel.name) : 0;
                      const showVoiceMemberList = channel.type === "voice" && (isJoinedVoice || voiceParticipants.length > 0);
                      return (
                        <div
                          className="channel-shell"
                          key={`${group.name}-${channel.type}-${channel.name}`}
                          onDragOver={(event) => {
                            if (canReorderServer && draggedChannel) {
                              event.stopPropagation();
                              event.preventDefault();
                            }
                          }}
                          onDrop={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            reorderActiveChannel(group.name, channel.name);
                          }}
                        >
                          <div className={canReorderServer && channel.type === "voice" ? "channel-row has-config" : "channel-row"}>
                            <button
                              className={[
                                "channel",
                                canReorderServer ? "drag-enabled" : "",
                                activeChannel === channel.name && channel.type === "text" ? "active" : "",
                                channel.isPrivate ? "private" : "",
                                isJoinedVoice ? "joined" : ""
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              draggable={canReorderServer}
                              onContextMenu={(event) => {
                                if (canReorderServer) {
                                  event.preventDefault();
                                }
                              }}
                              onMouseDown={(event) => {
                                if (canReorderServer && event.button === 2) {
                                  setDraggedChannel({ groupName: group.name, channelName: channel.name });
                                }
                              }}
                              onMouseEnter={() => {
                                if (canReorderServer && draggedChannel && draggedChannel.channelName !== channel.name) {
                                  reorderActiveChannel(group.name, channel.name);
                                }
                              }}
                              onDragStart={(event) => {
                                if (!canReorderServer) {
                                  return;
                                }

                                setDraggedChannel({ groupName: group.name, channelName: channel.name });
                                event.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={() => setDraggedChannel(null)}
                              onClick={() => selectChannel(channel)}
                              type="button"
                              title={channel.isPrivate ? "Canal privado" : channel.type === "voice" ? "Entrar no canal de voz" : "Canal publico"}
                            >
                              {canReorderServer ? <GripVertical className="drag-handle" size={14} /> : null}
                              {channel.isPrivate ? <Lock size={16} /> : channel.type === "voice" ? <Volume2 size={16} /> : <Hash size={16} />}
                              <span>{channel.name}</span>
                              {channel.type === "voice" && channel.userLimit ? (
                                <small className="voice-channel-meta">
                                  {String(voiceOccupancy).padStart(2, "0")}/{channel.userLimit}
                                </small>
                              ) : null}
                              {channel.type === "text" && (unreadMentionCountsByChannel.get(`${activeServer.id}:${channel.name}`) ?? 0) ? (
                                <small className="mention-badge">{unreadMentionCountsByChannel.get(`${activeServer.id}:${channel.name}`)}</small>
                              ) : null}
                              {hasUnreadChannel ? <span className="unread-dot" aria-label="Mensagens nao lidas" /> : null}
                              {isJoinedVoice ? <Radio size={13} /> : null}
                            </button>
                            {canReorderServer && channel.type === "voice" ? (
                              <button
                                className="channel-config-button"
                                type="button"
                                title="Configurar limite do canal de voz"
                                onClick={() => setVoiceSettingsTarget({ groupName: group.name, channelName: channel.name })}
                              >
                                <Settings size={14} />
                              </button>
                            ) : null}
                          </div>
                          {showVoiceMemberList ? (
                            <div className="voice-member-list" aria-label={`Membros no canal ${channel.name}`}>
                              <button
                                className="voice-channel-status"
                                type="button"
                                disabled={!canSetVoiceStatus}
                                onClick={() => setServerNotice("Status do canal de voz preparado para edicao.")}
                              >
                                <span>Definir um status do canal</span>
                                <Edit3 size={12} />
                              </button>
                              {(onlineMode ? voiceParticipants : []).map((state) => (
                                <button className="voice-member-row" key={`${state.serverId}-${state.userId}`} type="button" onClick={() => setProfileCardUser(getVoiceProfileCard(state))}>
                                  <span
                                    className={[
                                      "voice-member-avatar-wrap",
                                      state.muted ? "muted" : "",
                                      state.speaking && !state.muted ? "speaking" : ""
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                  >
                                    <AvatarBadge user={{ displayName: state.displayName, avatarUrl: state.avatarUrl }} className="voice-member-avatar" />
                                    {state.muted ? <MicOff className="voice-muted-icon" size={13} /> : null}
                                  </span>
                                  <span>{state.displayName}</span>
                                </button>
                              ))}
                              {onlineMode && isJoinedVoice && !voiceParticipants.some((state) => state.userId === user.id) ? (
                                <button className="voice-member-row" type="button" onClick={() => setProfileCardUser(getOwnProfileCard())}>
                                  <span className={["voice-member-avatar-wrap", micMuted ? "muted" : "", voiceSpeaking ? "speaking" : ""].filter(Boolean).join(" ")}>
                                    <AvatarBadge user={user} className="voice-member-avatar" />
                                    {micMuted ? <MicOff className="voice-muted-icon" size={13} /> : null}
                                  </span>
                                  <span>{user.displayName}</span>
                                </button>
                              ) : null}
                              {!onlineMode && isJoinedVoice ? (
                                <button className="voice-member-row" type="button" onClick={() => setProfileCardUser(getOwnProfileCard())}>
                                  <span className={["voice-member-avatar-wrap", micMuted ? "muted" : "", voiceSpeaking ? "speaking" : ""].filter(Boolean).join(" ")}>
                                    <AvatarBadge user={user} className="voice-member-avatar" />
                                    {micMuted ? <MicOff className="voice-muted-icon" size={13} /> : null}
                                  </span>
                                  <span>{user.displayName}</span>
                                </button>
                              ) : null}
                              <button
                                className="voice-invite-row"
                                type="button"
                                onClick={createServerInvite}
                                disabled={!canCreateInvite}
                              >
                                <UserPlus size={15} />
                                <span>Convidar para voz</span>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <p
                      className="empty-category"
                      onDragOver={(event) => {
                        if (canReorderServer && draggedChannel) {
                          event.preventDefault();
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        reorderActiveChannel(group.name, null);
                      }}
                    >
                      Sem canais ainda
                    </p>
                  )}
                </section>
              ))}
            </div>
          </>
        ) : (
          <>
            <header className="server-header">
              <div>
                <strong>Servidores</strong>
                <span>Nenhum servidor criado</span>
              </div>
            </header>
            <div className="empty-sidebar">
              <button type="button" onClick={openCreateServerDialog}>
                <Plus size={18} />
                Adicionar servidor
              </button>
              <button type="button" onClick={() => setActiveView("discover")}>
                <Compass size={18} />
                Descubra
              </button>
            </div>
          </>
        )}

        <footer className="user-dock">
          <button className="avatar-button" title="Ver perfil" type="button" onClick={() => setProfileCardUser(getOwnProfileCard())}>
            <AvatarBadge user={user} className="avatar" />
          </button>
          <div className="user-copy">
            <strong>{user.displayName}</strong>
            <span>@{user.username}</span>
            {currentActivity ? (
              <small className="user-activity-line">
                <Gamepad2 size={12} />
                {currentActivity.gameName}
              </small>
            ) : null}
          </div>
          <button
            className={micMuted ? "icon-button active-danger" : "icon-button"}
            title={micMuted ? "Microfone mutado" : "Microfone ligado"}
            type="button"
            onClick={() => setMicMuted((current) => !current)}
          >
            {micMuted ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
          <button
            className={voiceDeafened ? "icon-button active-danger" : "icon-button"}
            title={voiceDeafened ? "Audio ensurdecido" : "Audio ligado"}
            type="button"
            onClick={() => setVoiceDeafened((current) => !current)}
          >
            {voiceDeafened ? <VolumeX size={17} /> : <Headphones size={17} />}
          </button>
          {voiceChannel ? (
            <>
              <button
                className={voiceShareMenuOpen || onlineVoiceCall.screenSharing ? "icon-button active-accent" : "icon-button"}
                title="Transmitir tela ou jogo"
                type="button"
                disabled={!canShareVideo}
                onClick={(event) => {
                  event.stopPropagation();
                  setVoiceSoundboardOpen(false);
                  setVoiceShareMenuOpen((current) => !current);
                }}
              >
                <Monitor size={17} />
              </button>
              <button className="icon-button voice-leave-button" title="Sair da call" type="button" onClick={() => void leaveVoiceChannel()}>
                <PhoneOff size={17} />
              </button>
            </>
          ) : null}
          <button className="icon-button notification-dock-button" title="Mencoes" type="button" onClick={() => setMentionInboxOpen(true)}>
            <Bell size={17} />
            {unreadMentionCount ? <span className="notification-count">{Math.min(unreadMentionCount, 99)}</span> : null}
          </button>
          {voiceChannel ? (
            <button
              className={voiceSoundboardOpen ? "icon-button active-accent" : "icon-button"}
              title={canUseVoiceSoundEffects ? "Efeitos sonoros da call" : "Sem efeitos sonoros disponiveis"}
              type="button"
              disabled={!canUseVoiceSoundEffects}
              onClick={() => {
                setVoiceShareMenuOpen(false);
                setVoiceSoundboardOpen((current) => !current);
              }}
            >
              <FileAudio size={17} />
            </button>
          ) : null}
          <button className="icon-button" title="Configuracoes do usuario" type="button" onClick={() => setProfileOpen(true)}>
            <Settings size={17} />
          </button>
          {voiceChannel && voiceSoundboardOpen ? (
            <div className="voice-soundboard-popover">
              <strong>Efeitos sonoros</strong>
              {activeVoiceSoundEffects.map((effect) => (
                <button key={effect.id} type="button" onClick={() => void playVoiceSoundEffect(effect)}>
                  <span>{effect.emoji}</span>
                  <span>{effect.name}</span>
                </button>
              ))}
            </div>
          ) : null}
          {voiceChannel && voiceShareMenuOpen ? (
            <div className="voice-share-popover" role="menu" onClick={(event) => event.stopPropagation()}>
              <header className="voice-share-popover-header">
                <PhoneCall size={17} />
                <div>
                  <strong>{voiceChannel}</strong>
                  <span>{voiceElapsedLabel ?? "Conectando..."}</span>
                </div>
              </header>
              <button className={voiceChatOpen ? "voice-share-chat-toggle active" : "voice-share-chat-toggle"} type="button" onClick={() => setVoiceChatOpen((current) => !current)}>
                <MessageCircle size={15} />
                Chat
                {activeVoiceChatChannelName && hasUnreadServerChannel(activeServer?.id ?? "", activeVoiceChatChannelName) ? (
                  <span className="unread-dot" aria-label="Mensagens nao lidas" />
                ) : null}
              </button>
              <div className="voice-share-control-grid">
                <label>
                  Qualidade
                  <select value={screenShareQuality} onChange={(event) => setScreenShareQuality(event.target.value as ScreenShareQualityId)}>
                    {screenShareQualities.map((quality) => (
                      <option key={quality.id} value={quality.id}>
                        {quality.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  FPS
                  <select value={screenShareFps} onChange={(event) => setScreenShareFps(Number(event.target.value) === 60 ? 60 : 30)}>
                    <option value={30}>30 FPS</option>
                    <option value={60}>60 FPS</option>
                  </select>
                </label>
              </div>
              {window.tempestLightDesktop?.getDisplaySources ? (
                <div className="voice-source-picker">
                  <div className="voice-source-tabs" role="group" aria-label="Tipo de captura">
                    <button className={voiceCaptureMode === "screen" ? "active" : ""} type="button" onClick={() => void loadVoiceCaptureSources("screen")}>
                      <Monitor size={14} />
                      Telas
                    </button>
                    <button className={voiceCaptureMode === "game" ? "active" : ""} type="button" onClick={() => void loadVoiceCaptureSources("game")}>
                      <Gamepad2 size={14} />
                      Janelas
                    </button>
                  </div>
                  {voiceCaptureSourcesLoading ? (
                    <p>Carregando fontes...</p>
                  ) : voiceCaptureSources.length ? (
                    <label>
                      Fonte
                      <select value={selectedVoiceCaptureSourceId} onChange={(event) => setSelectedVoiceCaptureSourceId(event.target.value)}>
                        {voiceCaptureSources.map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p>Nenhuma fonte encontrada.</p>
                  )}
                </div>
              ) : null}
              <div className="voice-share-actions">
                <button type="button" disabled={!canShareVideo} onClick={() => void startVoiceScreenShare("screen")}>
                  <Monitor size={15} />
                  Tela
                </button>
                <button type="button" disabled={!canShareVideo} onClick={() => void startVoiceScreenShare("game")}>
                  <Gamepad2 size={15} />
                  Jogo
                </button>
                {onlineVoiceCall.screenSharing ? (
                  <button type="button" className="danger" onClick={() => onlineVoiceCall.stopScreenShare()}>
                    <PhoneOff size={15} />
                    Parar
                  </button>
                ) : null}
              </div>
              {voiceChatOpen ? (
                <div className="voice-chat-panel">
                  <div className="voice-chat-messages">
                    {activeVoiceChatMessages.length ? (
                      activeVoiceChatMessages.slice(-8).map((message, index) => {
                        const playback = parseVoiceSoundEffectEvent(message.text);
                        const text = playback ? `tocou ${playback.emoji} ${playback.name}` : stripVoiceSoundEffectMarkers(message.text);
                        return (
                          <article key={`${message.author}-${message.time}-${index}`}>
                            <strong>{message.author}</strong>
                            <span>{text}</span>
                          </article>
                        );
                      })
                    ) : (
                      <p>Nenhuma mensagem na call.</p>
                    )}
                  </div>
                  <form className="voice-chat-composer" onSubmit={(event) => event.preventDefault()}>
                    <input
                      value={voiceChatDraft}
                      onChange={(event) => setVoiceChatDraft(event.target.value)}
                      onKeyDown={preventEnterSubmit}
                      placeholder="Chat da call"
                    />
                    <button type="button" title="Enviar no chat da call" disabled={!voiceChatDraft.trim()} onClick={() => void sendVoiceChatMessage()}>
                      <Send size={15} />
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          ) : null}
        </footer>
      </aside>

      <section className={activeView === "server" ? "chat-pane server-chat-pane" : "chat-pane"}>
        {activeView === "direct" ? (
          <>
            <header className="chat-header">
              <div className="direct-profile">
                {activeDirect ? (
                  <button
                    className="avatar-button"
                    title="Ver perfil"
                    type="button"
                    onClick={() => setProfileCardUser(getDirectProfileCard(activeDirect))}
                  >
                    <AvatarBadge user={activeDirect} className="avatar" />
                  </button>
                ) : (
                  <span className="avatar">
                    <MessageCircle size={18} />
                  </span>
                )}
                <div>
                  <h1>{activeDirect?.displayName ?? "Mensagens diretas"}</h1>
                  <p>
                    {activeDirect ? `@${activeDirect.username} - ${activeDirectStatus}` : "Abra uma DM pelo nick para conversar"}
                  </p>
                </div>
              </div>
              <div className="toolbar">
                {activeDirect && !activeDirect.isFriend ? (
                  <button
                    className="friend-button"
                    type="button"
                    onClick={() => requestFriendship(activeDirect.id)}
                    disabled={activeDirect.friendRequestSent}
                    title={activeDirect.friendRequestSent ? "Solicitacao enviada" : "Solicitar amizade"}
                  >
                    {activeDirect.friendRequestSent ? <UserCheck size={16} /> : <UserPlus size={16} />}
                    <span>{activeDirect.friendRequestSent ? "Solicitada" : "Solicitar amizade"}</span>
                  </button>
                ) : null}
                <ThemeSwitch theme={theme} setTheme={setTheme} />
                <button className="icon-button" title="Perfil" type="button" onClick={() => setProfileOpen(true)}>
                  <Settings size={18} />
                </button>
                <button className="icon-button notification-dock-button" title="Mencoes" type="button" onClick={() => setMentionInboxOpen(true)}>
                  <Bell size={18} />
                  {unreadMentionCount ? <span className="notification-count">{Math.min(unreadMentionCount, 99)}</span> : null}
                </button>
                <button className="icon-button" title="Sair" type="button" onClick={onLogout}>
                  <LogOut size={18} />
                </button>
              </div>
            </header>

            <div className="message-list">
              {activeDirect ? (
                activeDirectMessages.map((message, index) => {
                  const authorProfile = getMessageAuthorProfile(message, activeDirect);
                  return (
                    <article className="message" key={`${activeDirect.id}-${message.author}-${message.time}-${index}`}>
                      <AvatarBadge user={authorProfile} className="message-avatar" />
                      <div>
                        <header>
                          <strong>
                            {authorProfile.displayName}
                            {message.authorIsBot ? <span className="bot-badge">APP</span> : null}
                          </strong>
                          <time>{message.time}</time>
                        </header>
                        <ChatMessageBody message={message} renderText={renderDirectMessageText} onOpenExternalLink={requestOpenExternalLink} />
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="empty-state">
                  <MessageCircle size={34} />
                  <h2>Nenhuma conversa direta</h2>
                  <p>Digite um nick no campo lateral para abrir uma DM.</p>
                </div>
              )}
              {directNotice ? <p className="direct-notice">{directNotice}</p> : null}
              {activeDirect && !canMessageActiveDirect ? (
                <p className="direct-notice warning">
                  Essa pessoa bloqueia mensagens de quem nao e amigo. Solicite amizade para liberar a conversa.
                </p>
              ) : null}
            </div>

            <DraftAttachmentTray attachments={directDraftAttachments} onRemove={(id) => removeDraftAttachment(id, "direct")} />
            <form className="composer" onSubmit={(event) => event.preventDefault()}>
              <input
                ref={directFileInputRef}
                type="file"
                multiple
                hidden
                onChange={(event) => handleChatFileChange(event, "direct")}
              />
              <button
                className="icon-button"
                title="Anexar arquivo"
                type="button"
                disabled={!activeDirect || !canMessageActiveDirect}
                onClick={() => directFileInputRef.current?.click()}
              >
                <Paperclip size={18} />
              </button>
              <input
                value={directDraft}
                onChange={(event) => setDirectDraft(event.target.value)}
                onPaste={(event) => handleChatPaste(event, "direct")}
                onContextMenu={(event) => handleComposerContextMenu(event, "direct")}
                onKeyDown={preventEnterSubmit}
                disabled={!activeDirect || !canMessageActiveDirect}
                placeholder={!activeDirect ? "Abra uma DM pelo nick" : !canMessageActiveDirect ? "DM bloqueada para nao amigos" : `Mensagem para @${activeDirect.username}`}
              />
              <button
                className="send-button"
                title="Enviar mensagem direta"
                type="button"
                disabled={!activeDirect || !canMessageActiveDirect || (!directDraft.trim() && !directDraftAttachments.length)}
                onClick={() => void sendDirectMessage()}
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : activeView === "discover" ? (
          <>
            <header className="chat-header">
              <div>
                <h1>Descubra servidores</h1>
                <p>Pesquise comunidades publicas e entre voluntariamente, sem precisar de convite.</p>
              </div>
              <div className="toolbar">
                <ThemeSwitch theme={theme} setTheme={setTheme} />
                <button className="icon-button" title="Sair" type="button" onClick={onLogout}>
                  <LogOut size={18} />
                </button>
              </div>
            </header>

            <div className="discover-pane">
              <form className="invite-join-panel" onSubmit={joinServerByInvite}>
                <label>
                  Entrar por convite
                  <input
                    value={inviteCodeDraft}
                    onChange={(event) => setInviteCodeDraft(event.target.value)}
                    placeholder="Cole codigo ou link de convite"
                  />
                </label>
                <button type="submit" disabled={!onlineMode || !inviteCodeDraft.trim()}>
                  Entrar
                  <ChevronRight size={17} />
                </button>
              </form>
              {renderServerNotice()}
              {discoverResults.map((server) => (
                <article className="discover-card" key={server.id}>
                  <div className="server-card-icon">{getInitials(server.name) || "SV"}</div>
                  <div>
                    <strong>{server.name}</strong>
                    <p>{server.description}</p>
                    <span>{server.members} membros - {server.tags.join(", ")}</span>
                  </div>
                  <button type="button" onClick={() => joinDiscoveredServer(server)}>
                    Entrar
                    <ChevronRight size={17} />
                  </button>
                </article>
              ))}
              {!discoverResults.length ? (
                <div className="empty-state">
                  <Compass size={32} />
                  <h2>Nenhum servidor encontrado</h2>
                  <p>Tente pesquisar por outro nome ou tipo de conteudo.</p>
                </div>
              ) : null}
            </div>
          </>
        ) : activeServer && serverGuideOpen && canUseActiveServerGuide ? (
          renderServerGuide()
        ) : activeServer ? (
          <>
            <div className="message-list server-message-list">
              {renderServerNotice()}
              {voiceChannel && hasActiveVoiceStreams ? (
                <section className="voice-stream-stage" aria-label="Transmissoes da call">
                  {onlineVoiceCall.screenStream ? (
                    <div className="voice-stream-card own-stream">
                      <MediaStreamVideo stream={onlineVoiceCall.screenStream} />
                      <span>Sua transmissao</span>
                    </div>
                  ) : null}
                  {remoteScreenStreams.map(([remoteUserId, stream]) => {
                    const remoteState = activeServerVoiceStates.find((state) => state.userId === remoteUserId);
                    return (
                      <div className="voice-stream-card" key={remoteUserId}>
                        <MediaStreamVideo stream={stream} />
                        <span>{remoteState?.displayName ?? "Transmissao"}</span>
                      </div>
                    );
                  })}
                </section>
              ) : null}
              {activeServerBoostLevel >= 5 && activeServer.boostPerks.welcomeCardUrl ? (
                <section className="server-welcome-card" style={{ backgroundImage: toCssImageUrl(activeServer.boostPerks.welcomeCardUrl) }}>
                  <div>
                    <strong>{activeServer.name}</strong>
                    <span>Bem-vindo(a) ao servidor</span>
                  </div>
                </section>
              ) : null}
              {activeServerMessages.map((message, index) => {
                const authorProfile = getMessageAuthorProfile(message);
                return (
                  <article
                    className={["message", messageMentionsUser(message, user) ? "mentioned" : ""].filter(Boolean).join(" ")}
                    key={`${activeServer.id}-${message.author}-${message.time}-${index}`}
                  >
                    <AvatarBadge user={authorProfile} className="message-avatar" />
                    <div>
                      <header>
                        <strong>
                          {authorProfile.displayName}
                          {message.authorIsBot ? <span className="bot-badge">APP</span> : null}
                        </strong>
                          <time>{message.time}</time>
                        </header>
                      <ChatMessageBody message={message} renderText={(text) => renderServerMessageText(message, text)} onOpenExternalLink={requestOpenExternalLink} />
                    </div>
                  </article>
                );
              })}
            </div>

            <DraftAttachmentTray attachments={draftAttachments} onRemove={(id) => removeDraftAttachment(id, "server")} />
            <form className="composer" onSubmit={(event) => event.preventDefault()}>
              <input
                ref={serverFileInputRef}
                type="file"
                multiple
                hidden
                onChange={(event) => handleChatFileChange(event, "server")}
              />
              <button
                className="icon-button"
                title={canAttachFiles ? "Anexar arquivo" : "Seu cargo nao permite anexar arquivos"}
                type="button"
                disabled={!canAttachFiles}
                onClick={() => serverFileInputRef.current?.click()}
              >
                <Paperclip size={18} />
              </button>
              <div className="composer-input-wrap">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onPaste={(event) => handleChatPaste(event, "server")}
                  onContextMenu={(event) => handleComposerContextMenu(event, "server")}
                  onKeyDown={preventEnterSubmit}
                  disabled={channelIsPrivate || !canSendServerMessages || Boolean(activeMemberTimeoutNotice)}
                  placeholder={
                    channelIsPrivate
                      ? "Canal privado"
                      : activeMemberTimeoutNotice
                      ? activeMemberTimeoutNotice
                      : !canSendServerMessages
                      ? "Seu cargo nao permite enviar mensagens"
                      : `Conversar em #${activeChannel}`
                  }
                />
                {serverMentionOptions.length ? (
                  <div className="mention-autocomplete" role="listbox" aria-label="Sugestoes de mencao">
                    {serverMentionOptions.map((member) => (
                      <button
                        key={`mention-option-${member.id}`}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setDraft((current) => replaceActiveMention(current, member.username))}
                      >
                        <AvatarBadge user={member} className="mention-autocomplete-avatar" />
                        <span>
                          <strong>{member.displayName}</strong>
                          <small>@{member.username}</small>
                        </span>
                        {member.isBot ? <span className="bot-badge">APP</span> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                className="send-button"
                title="Enviar mensagem"
                type="button"
                disabled={channelIsPrivate || !canSendServerMessages || Boolean(activeMemberTimeoutNotice) || (!draft.trim() && !draftAttachments.length)}
                onClick={() => void sendMessage()}
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="empty-state server-empty">
            <MessagesSquare size={36} />
            <h1>Crie seu primeiro servidor</h1>
            <p>Use o botao de mais na lateral para criar um servidor particular com chat geral e voz.</p>
            <div className="empty-actions">
              <button type="button" onClick={openCreateServerDialog}>
                <Plus size={18} />
                Adicionar servidor
              </button>
              <button type="button" onClick={() => setActiveView("discover")}>
                <Compass size={18} />
                Descubra
              </button>
            </div>
          </div>
        )}
      </section>

      <aside className="member-sidebar">
        {activeView === "direct" ? (
          <>
            <header>
              <MessageCircle size={18} />
              <strong>Detalhes</strong>
            </header>
            {activeDirect ? (
              <>
                <div className="direct-detail">
                  <button
                    className="avatar-button"
                    title="Ver perfil"
                    type="button"
                    onClick={() => setProfileCardUser(getDirectProfileCard(activeDirect))}
                  >
                    <AvatarBadge user={activeDirect} className="profile-avatar" />
                  </button>
                  <strong>{activeDirect.displayName}</strong>
                  <span>@{activeDirect.username}</span>
                </div>
                <div className="direct-state">
                  <span>Relacao</span>
                  <strong>{activeDirect.isFriend ? "Amigo" : "Nao amigo"}</strong>
                </div>
                <div className="direct-state">
                  <span>Privacidade</span>
                  <strong>{activeDirect.blocksNonFriendMessages ? "Bloqueia nao amigos" : "DMs abertas"}</strong>
                </div>
                {!activeDirect.isFriend ? (
                  <button
                    className="friend-button wide"
                    type="button"
                    onClick={() => requestFriendship(activeDirect.id)}
                    disabled={activeDirect.friendRequestSent}
                  >
                    {activeDirect.friendRequestSent ? <UserCheck size={16} /> : <UserPlus size={16} />}
                    <span>{activeDirect.friendRequestSent ? "Solicitacao enviada" : "Solicitar amizade"}</span>
                  </button>
                ) : null}
              </>
            ) : (
              <div className="empty-state compact-empty">
                <MessageCircle size={28} />
                <p>Abra uma conversa pelo nick.</p>
              </div>
            )}
          </>
        ) : activeView === "discover" ? (
          <>
            <header>
              <Compass size={18} />
              <strong>Descubra</strong>
            </header>
            <div className="direct-state">
              <span>Resultados</span>
              <strong>{discoverResults.length}</strong>
            </div>
            <div className="direct-state">
              <span>Busca</span>
              <strong>{discoverQuery.trim() || "Todos"}</strong>
            </div>
            <button className="friend-button wide" type="button" onClick={openCreateServerDialog}>
              <Plus size={16} />
              <span>Criar meu servidor</span>
            </button>
          </>
        ) : activeServer ? (
          <>
            <section className="activity-panel">
              <header className="activity-panel-header">
                <strong>Atividade - {activeServerActivityCards.length}</strong>
                <button
                  className="mini-action"
                  title={activityCardsVisible ? "Ocultar cartoes de atividade" : "Mostrar cartoes de atividade"}
                  type="button"
                  onClick={() => setActivityCardsVisible((current) => !current)}
                >
                  <Settings size={14} />
                </button>
              </header>
              {activityCardsVisible
                ? activeServerActivityCards.map((activity) => (
                    <article className="activity-card" key={activity.id}>
                      <AvatarBadge user={activity} className="activity-avatar" />
                      <div>
                        <strong>{activity.displayName}</strong>
                        <span>{activity.gameName}</span>
                        <small>{formatActivityAge(activity.startedAt, nowTick)}</small>
                      </div>
                      {activity.imageUrl ? <SafePreviewImage src={activity.imageUrl} alt="" /> : <Gamepad2 size={32} />}
                    </article>
                  ))
                : null}
            </section>
            {activeServer.memberListVisible ? (
              serverMemberGroups.map((group) => (
                <section className="member-role-group" key={group.id}>
                  <h2 className="member-role-title" style={group.color ? { color: group.color } : undefined}>
                    {group.label}
                  </h2>
                  {group.members.map((member) => {
                    const memberPresence = getPublicPresence(member.presence);
                    return (
                      <button className="member-row rich-member-row" key={member.id} type="button" onClick={() => setProfileCardUser(getMemberProfileCard(member))}>
                        <span className="member-avatar-wrap">
                          <AvatarBadge user={member} className="member-avatar" />
                          <span className={`member-presence presence ${memberPresence.toLowerCase()}`} />
                        </span>
                        <div>
                          <strong className="member-name-line" style={group.color ? { color: group.color } : undefined}>
                            {member.displayName}
                            {member.isBot ? <span className="bot-badge">APP</span> : null}
                          </strong>
                          {member.id === user.id && currentActivity ? (
                            <small className="member-game-line">
                              <Gamepad2 size={12} />
                              {currentActivity.gameName}
                            </small>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </section>
              ))
            ) : (
              <div className="empty-state compact-empty">
                <Users size={28} />
                <p>Lista de membros oculta nas configuracoes.</p>
              </div>
            )}
          </>
        ) : (
          <>
            <header>
              <MessagesSquare size={18} />
              <strong>Servidores</strong>
            </header>
            <div className="direct-state">
              <span>Criados</span>
              <strong>{servers.length}</strong>
            </div>
            <button className="friend-button wide" type="button" onClick={openCreateServerDialog}>
              <Plus size={16} />
              <span>Adicionar servidor</span>
            </button>
          </>
        )}
      </aside>

      {liveProfileCardUser ? (
        <ProfileCardDialog
          profile={liveProfileCardUser}
          onClose={() => setProfileCardUser(null)}
          onEdit={() => {
            setProfileCardUser(null);
            setProfileOpen(true);
          }}
          onMessage={() => {
            if (!liveProfileCardUser.isOwnProfile) {
              const existing = directContacts.find((contact) => contact.username === liveProfileCardUser.username);
              if (existing) {
                setActiveDirectId(existing.id);
                setActiveView("direct");
              }
            }
            setProfileCardUser(null);
          }}
          linkedAccounts={linkedAccounts}
          canUseAccountSwitcher={canUseAccountSwitcher}
          onSwitchAccount={onSwitchLinkedAccount}
          onRemoveLinkedAccount={onRemoveLinkedAccount}
        />
      ) : null}
      {profileOpen ? (
        <ProfileDialog
          user={user}
          steamActivity={steamActivity}
          onClose={() => setProfileOpen(false)}
          onSave={onProfileSave}
          onSecurityUserUpdate={onUserChange}
          onAccountDeleted={onLogout}
          onSteamActivitySave={setSteamActivity}
          linkedAccounts={linkedAccounts}
          canUseAccountSwitcher={canUseAccountSwitcher}
          onConnectLinkedAccount={onConnectLinkedAccount}
          onSwitchLinkedAccount={onSwitchLinkedAccount}
          onRemoveLinkedAccount={onRemoveLinkedAccount}
          api={api}
        />
      ) : null}
      {channelDialogOpen ? <CreateChannelDialog onClose={() => setChannelDialogOpen(false)} onCreate={createChannel} /> : null}
      {voiceSettingsTarget && voiceSettingsChannel ? (
        <VoiceChannelSettingsDialog
          channel={voiceSettingsChannel}
          onClose={() => setVoiceSettingsTarget(null)}
          onSave={(userLimit) => updateVoiceChannelLimit(voiceSettingsTarget.groupName, voiceSettingsTarget.channelName, userLimit)}
        />
      ) : null}
      {categoryDialogOpen ? <CreateCategoryDialog onClose={() => setCategoryDialogOpen(false)} onCreate={createCategory} /> : null}
      {createServerStep ? (
        <CreateServerDialog
          step={createServerStep}
          defaultName={`Servidor de ${user.displayName}`}
          purpose={pendingServerPurpose}
          templateId={pendingServerTemplateId}
          onBack={() =>
            setCreateServerStep(
              createServerStep === "start"
                ? null
                : createServerStep === "discord"
                  ? "start"
                  : createServerStep === "purpose"
                    ? "start"
                    : pendingServerTemplateId === "blank"
                      ? "purpose"
                      : "start"
            )
          }
          onClose={() => setCreateServerStep(null)}
          onPickPurpose={(purpose) => {
            setPendingServerPurpose(purpose);
            setPendingServerTemplateId("blank");
            setCreateServerStep("personalize");
          }}
          onPickTemplate={(templateId) => {
            const template = getServerTemplate(templateId);
            setPendingServerTemplateId(template.id);
            setPendingServerPurpose(template.purpose);
            setCreateServerStep("personalize");
          }}
          onStartPersonalize={() => {
            setPendingServerTemplateId("blank");
            setCreateServerStep("purpose");
          }}
          onOpenDiscover={() => {
            setCreateServerStep(null);
            setActiveView("discover");
          }}
          onOpenDiscordImport={() => setCreateServerStep("discord")}
          onCreate={createServer}
          onImportDiscordTemplate={importDiscordTemplate}
        />
      ) : null}
      {privacyDialogOpen && activeServer ? (
        <ServerPrivacyDialog
          server={activeServer}
          onClose={() => setPrivacyDialogOpen(false)}
          onSave={(isDiscoverable) => {
            updateActiveServer(
              { isDiscoverable },
              {
                action: "privacy_updated",
                target: activeServer.name,
                details: isDiscoverable ? "Servidor ficou visivel no Descubra." : "Servidor foi ocultado do Descubra."
              }
            );
            setPrivacyDialogOpen(false);
          }}
        />
      ) : null}
      {notificationDialogOpen && activeServer ? (
        <ServerNotificationDialog
          server={activeServer}
          onClose={() => setNotificationDialogOpen(false)}
          onSave={(notificationsEnabled) => {
            updateActiveServer(
              { notificationsEnabled },
              {
                action: "notifications_updated",
                target: activeServer.name,
                details: notificationsEnabled ? "Notificacoes do servidor ativadas." : "Notificacoes do servidor desativadas."
              }
            );
            setNotificationDialogOpen(false);
          }}
        />
      ) : null}
      {mentionInboxOpen ? (
        <MentionInboxDialog
          notifications={mentionNotifications}
          onClose={() => setMentionInboxOpen(false)}
          onOpen={openMentionNotification}
          onMarkAllRead={() => markMentionNotificationsRead(() => true)}
          onClear={clearMentionNotifications}
        />
      ) : null}
      {serverSettingsOpen && activeServer && (canAdministerActiveServer || serverSettingsInitialView === "boosts") ? (
        <ServerSettingsDialog
          server={activeServer}
          currentUser={user}
          initialView={serverSettingsInitialView}
          onClose={() => setServerSettingsOpen(false)}
          onUpdateServer={updateActiveServer}
          onAppendMessage={(message) => setMessages((current) => [...current, message])}
          onCreateRole={createRole}
          onUpdateRole={updateRole}
          onSetMemberRole={setMemberRole}
          onCreateInvite={onlineMode ? createInviteFromApi : undefined}
          onSetInviteActive={onlineMode ? setInviteActiveInApi : undefined}
          onDeleteInvite={onlineMode ? deleteInviteInApi : undefined}
          onBanMember={onlineMode ? banMemberInApi : undefined}
          onUnbanMember={onlineMode ? unbanMemberInApi : undefined}
          onTimeoutMember={onlineMode ? timeoutMemberInApi : undefined}
          onRemoveTimeout={onlineMode ? removeMemberTimeoutInApi : undefined}
          onDeleteServer={deleteActiveServer}
          onOpenInviteLink={(inviteLink) => void joinInviteCode(inviteLink)}
          onPublishUpdate={onlineMode ? publishDesktopUpdate : undefined}
        />
      ) : null}
      {composerPasteMenu ? (
        <div
          className="composer-context-menu"
          role="menu"
          style={{ left: composerPasteMenu.x, top: composerPasteMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={() => void pasteFromClipboard(composerPasteMenu.target)}>
            <Clipboard size={15} />
            Colar
          </button>
        </div>
      ) : null}
      {externalLinkPrompt ? (
        <ExternalLinkWarningDialog
          link={externalLinkPrompt.link}
          risky={externalLinkPrompt.risky}
          onClose={() => setExternalLinkPrompt(null)}
          onContinue={confirmExternalLinkOpen}
        />
      ) : null}
    </main>
  );
}

function AvatarBadge({
  user,
  className
}: {
  user: { displayName: string; avatarUrl: string | null };
  className: string;
}) {
  const source = sanitizeImageSource(user.avatarUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [source]);

  if (source && !failed) {
    return <img className={className} src={source} alt="" onError={() => setFailed(true)} />;
  }

  return <span className={className}>{getInitials(user.displayName)}</span>;
}

function SafePreviewImage({ src, alt = "" }: { src: string; alt?: string }) {
  const source = sanitizeImageSource(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [source]);

  if (!source || failed) {
    return (
      <span className="image-fallback">
        <ImageIcon size={18} />
      </span>
    );
  }

  return <img src={source} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

function ExternalLinkPreview({ link, onOpen }: { link: string; onOpen: (link: string) => void }) {
  const youtubeVideoId = getYoutubeVideoId(link);
  const risky = isPotentiallyDangerousExternalLink(link);
  const hostname = (() => {
    try {
      return new URL(link).hostname.replace(/^www\./, "");
    } catch {
      return "link externo";
    }
  })();

  if (youtubeVideoId) {
    return (
      <button className={["message-link-preview", "youtube", risky ? "risky" : ""].filter(Boolean).join(" ")} type="button" onClick={() => onOpen(link)}>
        <span className="youtube-provider">YouTube</span>
        <strong>{getYoutubePreviewTitle(link)}</strong>
        <small>{link}</small>
        <span className="youtube-thumbnail">
          <SafePreviewImage src={`https://img.youtube.com/vi/${encodeURIComponent(youtubeVideoId)}/hqdefault.jpg`} alt="" />
          <span className="youtube-play">
            <Play size={22} />
          </span>
        </span>
      </button>
    );
  }

  if (looksLikeImageLink(link) || !risky) {
    return (
      <button className={["message-link-preview", "image", risky ? "risky" : ""].filter(Boolean).join(" ")} type="button" onClick={() => onOpen(link)}>
        <SafePreviewImage src={link} alt="" />
        <span>
          <strong>{hostname}</strong>
          <small>{link}</small>
        </span>
      </button>
    );
  }

  return (
    <button className="message-link-preview risky" type="button" onClick={() => onOpen(link)}>
      <Shield size={18} />
      <span>
        <strong>{hostname} - arquivo externo</strong>
        <small>{link}</small>
      </span>
    </button>
  );
}

function ChatMessageBody({
  message,
  renderText,
  onOpenExternalLink
}: {
  message: LocalMessage;
  renderText: (text: string) => ReactNode;
  onOpenExternalLink: (link: string) => void;
}) {
  const parsed = parseMessageContent(message.text, message.attachments);
  const externalLinks = extractExternalLinks(parsed.text).filter((link) => !isTempestInviteLink(link));

  return (
    <div className="message-content">
      {parsed.text ? <p>{renderText(parsed.text)}</p> : null}
      {parsed.attachments.length ? (
        <div className="message-attachments">
          {parsed.attachments.map((attachment) =>
            attachment.kind === "image" ? (
              <button className="message-image-attachment" type="button" onClick={() => onOpenExternalLink(attachment.url)} key={attachment.id}>
                <SafePreviewImage src={attachment.url} alt={attachment.name} />
              </button>
            ) : (
              <a className="message-file-attachment" href={attachment.url} download={attachment.name} key={attachment.id}>
                <Paperclip size={18} />
                <span>
                  <strong>{attachment.name}</strong>
                  <small>{formatBytes(attachment.sizeBytes)}</small>
                </span>
                <Download size={17} />
              </a>
            )
          )}
        </div>
      ) : null}
      {externalLinks.length ? (
        <div className="message-link-list">
          {externalLinks.map((link) => (
            <ExternalLinkPreview link={link} onOpen={onOpenExternalLink} key={link} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ExternalLinkWarningDialog({
  link,
  risky,
  onClose,
  onContinue
}: {
  link: string;
  risky: boolean;
  onClose: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel compact external-link-dialog" aria-label="Aviso de link externo">
        <header className="modal-header">
          <div>
            <h2>Link externo</h2>
            <p>{risky ? "Este link parece apontar para arquivo externo. Tenha cuidado antes de baixar ou executar qualquer coisa." : "Voce esta saindo do Tempest Light."}</p>
          </div>
          <button className="icon-button" title="Fechar" type="button" onClick={onClose}>
            <X size={17} />
          </button>
        </header>
        <p className="external-link-copy">
          Links fora do programa podem conter conteudo suspeito. O Tempest Light nao se responsabiliza por acoes, downloads ou paginas externas.
        </p>
        <code>{link}</code>
        <div className="modal-actions">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant={risky ? "danger" : "primary"} type="button" onClick={onContinue}>
            Continuar
          </Button>
        </div>
      </section>
    </div>
  );
}

function DraftAttachmentTray({
  attachments,
  onRemove
}: {
  attachments: ChatAttachment[];
  onRemove: (id: string) => void;
}) {
  if (!attachments.length) {
    return null;
  }

  return (
    <div className="draft-attachments">
      {attachments.map((attachment) => (
        <div className="draft-attachment" key={attachment.id}>
          {attachment.kind === "image" ? <SafePreviewImage src={attachment.url} alt={attachment.name} /> : <span className="draft-file-icon"><Paperclip size={17} /></span>}
          <span>{attachment.name}</span>
          <button className="mini-action danger-mini-action" type="button" title="Remover anexo" onClick={() => onRemove(attachment.id)}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

function EmojiLibrary({
  title,
  emojis,
  onRemove
}: {
  title: string;
  emojis: ServerEmojiDefinition[];
  onRemove: (emojiId: string) => void;
}) {
  return (
    <section className="emoji-library">
      <h3>{title}</h3>
      {emojis.length ? (
        emojis.map((emoji) => (
          <article className="emoji-row" key={emoji.id}>
            <SafePreviewImage src={emoji.imageUrl} alt={emoji.name} />
            <div>
              <strong>:{emoji.name}:</strong>
              <span>{emoji.animated ? "GIF animado" : "Imagem estatica"}</span>
            </div>
            <button className="mini-action danger-mini-action" type="button" title="Remover emoji" onClick={() => onRemove(emoji.id)}>
              <X size={13} />
            </button>
          </article>
        ))
      ) : (
        <p>Nenhum emoji nesta lista.</p>
      )}
    </section>
  );
}

function VoiceRemoteMedia({ stream, deafened }: { stream: MediaStream; deafened: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  return <audio ref={audioRef} className="voice-remote-audio" autoPlay muted={deafened} />;
}

function MediaStreamVideo({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline muted />;
}

function ServerTemplateIcon({ templateId }: { templateId: ServerTemplateId }) {
  if (templateId === "games") {
    return <Gamepad2 size={20} />;
  }

  if (templateId === "friends") {
    return <Heart size={20} />;
  }

  if (templateId === "study") {
    return <GraduationCap size={20} />;
  }

  if (templateId === "school") {
    return <BookOpen size={20} />;
  }

  return <MessagesSquare size={20} />;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function textChannel(name: string, isPrivate = false): ChannelDefinition {
  return isPrivate ? { name, type: "text", isPrivate } : { name, type: "text" };
}

function voiceChannel(name: string, isPrivate = false, userLimit: number | null = null): ChannelDefinition {
  return isPrivate ? { name, type: "voice", isPrivate, userLimit } : { name, type: "voice", userLimit };
}

function createRolePermissionSet(enabledPermissions: PermissionKey[], includeDefault = true) {
  const permissions = Object.fromEntries(
    (Object.keys(defaultEveryonePermissions) as PermissionKey[]).map((key) => [key, includeDefault ? defaultEveryonePermissions[key] : false])
  ) as Record<PermissionKey, boolean>;

  enabledPermissions.forEach((key) => {
    permissions[key] = true;
  });

  return permissions;
}

function createTemplateRole(id: string, name: string, color: string, enabledPermissions: PermissionKey[], includeDefault = true): ServerRole {
  return {
    id,
    name,
    color,
    style: "solid",
    iconUrl: null,
    separateMembers: false,
    permissions: createRolePermissionSet(enabledPermissions, includeDefault)
  };
}

function createServerFromDiscordTemplate(template: DiscordTemplatePayload, user: AuthUser): ServerDefinition {
  const guild = template.serialized_source_guild ?? {};
  const serverName = String(guild.name || template.name || "Servidor importado do Discord").trim().slice(0, 48) || "Servidor importado do Discord";
  const channelImport = convertDiscordChannels(guild.channels ?? [], guild);
  const roleImport = convertDiscordRoles(guild.roles ?? [], guild);
  const ownerRoleId = getOwnerRoleId(roleImport.importedRoles);
  const communityEnabled = Boolean(
    (guild.features ?? []).includes("COMMUNITY") || channelImport.rulesChannelName || channelImport.updatesChannelName || channelImport.safetyChannelName
  );

  return {
    id: `discord-template-${Date.now()}`,
    name: serverName,
    initials: getInitials(serverName) || "DT",
    iconUrl: null,
    ownerId: user.id,
    purpose: communityEnabled ? "community" : "friends",
    templateId: "blank",
    ...createDefaultServerExtras(),
    description: String(guild.description || template.description || "Servidor importado de um modelo publico do Discord.").slice(0, 240),
    bannerColor: pickDiscordBannerColor(guild),
    memberListVisible: true,
    isDiscoverable: false,
    notificationsEnabled: true,
    communityEnabled,
    rulesChannelName: channelImport.rulesChannelName,
    updatesChannelName: channelImport.updatesChannelName,
    safetyChannelName: channelImport.safetyChannelName,
    language: normalizeDiscordLocale(guild.preferred_locale),
    explicitMediaFilter: Number(guild.explicit_content_filter ?? 0) > 0,
    emailVerificationRequired: Number(guild.verification_level ?? 0) > 0,
    riskyPermissionsDisabled: communityEnabled,
    boostProgressVisible: Boolean(guild.premium_progress_bar_enabled),
    auditLogs: [
      createAuditLog(
        user,
        "server_created",
        serverName,
        `Servidor importado do template Discord ${template.code ?? "informado"} com ${channelImport.channelCount} canais e ${
          roleImport.importedRoles.length + 1
        } cargos.`
      )
    ],
    categories: channelImport.categories,
    roles: [roleImport.everyoneRole, ...roleImport.importedRoles],
    members: [createServerMember(user, ownerRoleId ? [ownerRoleId] : [])]
  };
}

function convertDiscordChannels(channels: DiscordChannel[], guild: DiscordSerializedGuild) {
  const usedTextNames = new Set<string>();
  const usedVoiceNames = new Set<string>();
  const sortedChannels = [...channels].sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
  const categoryGroups = sortedChannels
    .filter((channel) => channel.type === 4)
    .map((channel, index) => ({
      id: channel.id ?? `category-${index}`,
      group: {
        name: normalizeDiscordCategoryName(channel.name || `Categoria ${index + 1}`),
        channels: [] as ChannelDefinition[]
      }
    }));
  const categoryById = new Map(categoryGroups.map((category) => [category.id, category.group]));
  const looseTextChannels: ChannelDefinition[] = [];
  const looseVoiceChannels: ChannelDefinition[] = [];
  let rulesChannelName: string | null = null;
  let updatesChannelName: string | null = null;
  let safetyChannelName: string | null = null;

  sortedChannels.forEach((channel) => {
    if (channel.type === 4) {
      return;
    }

    const channelKind = getDiscordChannelKind(channel.type);
    if (!channelKind) {
      return;
    }

    const channelName =
      channelKind === "text"
        ? uniqueImportedName(normalizeDiscordTextChannelName(channel.name || "canal"), usedTextNames)
        : uniqueImportedName(normalizeVoiceChannelName(channel.name || "Canal de voz"), usedVoiceNames);
    const special = channelKind === "text" ? getDiscordSpecialChannel(channel, guild, channelName) : undefined;
    const importedChannel: ChannelDefinition = {
      name: channelName,
      type: channelKind,
      userLimit: channelKind === "voice" && typeof channel.user_limit === "number" && channel.user_limit > 0 ? channel.user_limit : null,
      ...(special ? { special, isNew: true } : {})
    };
    const parentGroup = channel.parent_id ? categoryById.get(channel.parent_id) : null;

    if (special === "rules") {
      rulesChannelName = channelName;
    } else if (special === "updates") {
      updatesChannelName = channelName;
    } else if (special === "safety") {
      safetyChannelName = channelName;
    }

    if (parentGroup) {
      parentGroup.channels.push(importedChannel);
    } else if (channelKind === "text") {
      looseTextChannels.push(importedChannel);
    } else {
      looseVoiceChannels.push(importedChannel);
    }
  });

  const categories: ChannelGroupDefinition[] = [];
  if (looseTextChannels.length > 0) {
    categories.push({ name: "CANAIS DE TEXTO", channels: looseTextChannels });
  }

  categoryGroups.forEach(({ group }) => {
    categories.push(group);
  });

  if (looseVoiceChannels.length > 0) {
    categories.push({ name: "CANAIS DE VOZ", channels: looseVoiceChannels });
  }

  const hasTextChannel = categories.some((group) => group.channels.some((channel) => channel.type === "text"));
  const hasVoiceChannel = categories.some((group) => group.channels.some((channel) => channel.type === "voice"));

  if (!hasTextChannel) {
    categories.unshift({ name: "CANAIS DE TEXTO", channels: [textChannel("geral")] });
  }

  if (!hasVoiceChannel) {
    categories.push({ name: "CANAIS DE VOZ", channels: [voiceChannel("Geral")] });
  }

  if (categories.length === 0) {
    categories.push(...cloneServerCategories(defaultServerCategories));
  }

  return {
    categories,
    rulesChannelName,
    updatesChannelName,
    safetyChannelName,
    channelCount: categories.reduce((total, group) => total + group.channels.length, 0)
  };
}

function convertDiscordRoles(roles: DiscordRole[], guild: DiscordSerializedGuild) {
  const usedRoleIds = new Set(["everyone"]);
  const everyoneSource = roles.find((role) => role.name === "@everyone" || Boolean(guild.id && role.id === guild.id));
  const everyoneRole = createEveryoneRole(
    typeof everyoneSource?.permissions === "string" ? mapDiscordPermissions(everyoneSource.permissions, false) : undefined
  );
  const importedRoles = [...roles]
    .filter((role) => role.name && role.name !== "@everyone" && !role.managed)
    .sort((left, right) => (right.position ?? 0) - (left.position ?? 0))
    .map((role, index) => ({
      id: uniqueRoleId(role.name || `cargo-${index + 1}`, usedRoleIds),
      name: normalizeDiscordRoleName(role.name || `cargo ${index + 1}`),
      color: discordColorToHex(role.color, index + 1),
      style: "solid" as const,
      iconUrl: null,
      separateMembers: false,
      permissions: mapDiscordPermissions(role.permissions ?? "0", false)
    }));

  return {
    everyoneRole,
    importedRoles
  };
}

function getDiscordChannelKind(type: number | undefined): ChannelKind | null {
  if ([0, 5, 10, 11, 12, 15, 16].includes(Number(type))) {
    return "text";
  }

  if ([2, 13].includes(Number(type))) {
    return "voice";
  }

  return null;
}

function getDiscordSpecialChannel(channel: DiscordChannel, guild: DiscordSerializedGuild, channelName: string): CommunityChannelKind | undefined {
  if (channel.id && channel.id === guild.rules_channel_id) {
    return "rules";
  }

  if (channel.id && channel.id === guild.public_updates_channel_id) {
    return "updates";
  }

  if (channel.id && channel.id === guild.safety_alerts_channel_id) {
    return "safety";
  }

  const specialNameKey = getDiscordSpecialNameKey(channelName);

  if (["rules", "regras", "diretrizes"].includes(specialNameKey)) {
    return "rules";
  }

  if (["announcements", "anuncios", "avisos", "moderator-only", "mod-only"].includes(specialNameKey)) {
    return "updates";
  }

  if (["safety", "seguranca", "alertas-de-seguranca"].includes(specialNameKey)) {
    return "safety";
  }

  return undefined;
}

function mapDiscordPermissions(permissionValue: string, includeDefault = false) {
  const permissions = createRolePermissionSet([], includeDefault);
  let bits = 0n;

  try {
    bits = BigInt(permissionValue || "0");
  } catch {
    return permissions;
  }

  const discordPermissionMap: Array<[number, PermissionKey]> = [
    [0, "create_invite"],
    [1, "kick_members"],
    [2, "ban_members"],
    [3, "administrator"],
    [4, "manage_channels"],
    [5, "manage_server"],
    [6, "add_reactions"],
    [8, "priority_speaker"],
    [9, "video"],
    [11, "send_messages"],
    [12, "send_tts_messages"],
    [13, "manage_messages"],
    [14, "embed_links"],
    [15, "attach_files"],
    [16, "read_message_history"],
    [17, "mention_everyone"],
    [18, "use_external_emojis"],
    [20, "connect"],
    [21, "speak"],
    [22, "mute_members"],
    [23, "deafen_members"],
    [24, "move_members"],
    [25, "use_voice_activation"],
    [26, "change_nickname"],
    [27, "manage_nicknames"],
    [28, "manage_roles"],
    [31, "use_application_commands"],
    [33, "manage_events"],
    [34, "manage_threads"],
    [35, "create_public_threads"],
    [36, "create_private_threads"],
    [37, "use_external_stickers"],
    [38, "send_messages_in_threads"],
    [39, "use_activities"],
    [40, "moderate_members"],
    [42, "use_soundboard"],
    [44, "create_events"],
    [45, "use_external_sounds"],
    [46, "send_voice_messages"],
    [48, "set_voice_channel_status"],
    [49, "create_polls"],
    [50, "use_external_apps"],
    [51, "pin_messages"]
  ];

  discordPermissionMap.forEach(([bit, key]) => {
    if ((bits & (1n << BigInt(bit))) !== 0n) {
      permissions[key] = true;
    }
  });

  return permissions;
}

const serverStructureNameMaxLength = 100;

function limitServerStructureName(name: string, maxLength = serverStructureNameMaxLength) {
  return Array.from(name).slice(0, maxLength).join("");
}

function normalizeServerStructureName(name: string, fallback: string) {
  const normalized = String(name ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  return limitServerStructureName(normalized || fallback).trim() || fallback;
}

function getServerStructureNameKey(name: string) {
  return name.normalize("NFC").toLocaleLowerCase("pt-BR");
}

function getDiscordSpecialNameKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function uniqueImportedName(name: string, usedNames: Set<string>) {
  const baseName = normalizeServerStructureName(name, "canal");
  let candidate = baseName;
  let suffix = 2;

  while (usedNames.has(getServerStructureNameKey(candidate))) {
    const suffixText = ` ${suffix}`;
    const baseMaxLength = Math.max(serverStructureNameMaxLength - Array.from(suffixText).length, 1);
    candidate = `${limitServerStructureName(baseName, baseMaxLength).trimEnd()}${suffixText}`;
    suffix += 1;
  }

  usedNames.add(getServerStructureNameKey(candidate));
  return candidate;
}

function uniqueRoleId(name: string, usedRoleIds: Set<string>) {
  const baseId = (normalizeTextChannelName(name).replace(/[^a-z0-9-]/g, "-") || "cargo").replace(/^-+|-+$/g, "") || "cargo";
  const safeBaseId = baseId === "everyone" ? "cargo-everyone" : baseId;
  let candidate = safeBaseId;
  let suffix = 2;

  while (usedRoleIds.has(candidate)) {
    candidate = `${safeBaseId}-${suffix}`;
    suffix += 1;
  }

  usedRoleIds.add(candidate);
  return candidate;
}

function normalizeDiscordCategoryName(name: string) {
  return normalizeServerStructureName(name, "CATEGORIA");
}

function normalizeDiscordTextChannelName(name: string) {
  return normalizeServerStructureName(name, "canal");
}

function normalizeVoiceChannelName(name: string) {
  return normalizeServerStructureName(name, "Canal de voz");
}

function normalizeDiscordRoleName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 36) || "cargo importado";
}

function discordColorToHex(color: number | undefined, fallbackIndex: number) {
  if (typeof color === "number" && color > 0) {
    return `#${Math.min(color, 0xffffff).toString(16).padStart(6, "0")}`;
  }

  return roleColors[fallbackIndex % roleColors.length];
}

function pickDiscordBannerColor(guild: DiscordSerializedGuild) {
  const coloredRole = (guild.roles ?? []).find((role) => typeof role.color === "number" && role.color > 0);
  if (coloredRole) {
    return discordColorToHex(coloredRole.color, 0);
  }

  const hash = String(guild.name ?? "discord-template")
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  return bannerColors[hash % bannerColors.length];
}

function normalizeDiscordLocale(locale: string | null | undefined) {
  return (locale || "pt-BR").replace("_", "-");
}

function getServerTemplate(templateId: ServerTemplateId) {
  return serverTemplates.find((template) => template.id === templateId) ?? serverTemplates[0];
}

function cloneServerCategories(categories: ChannelGroupDefinition[]) {
  return categories.map((group) => ({
    ...group,
    channels: group.channels.map((channel) => ({ ...channel }))
  }));
}

function cloneServerRoles(roles: ServerRole[]) {
  return roles.map((role) => ({
    ...role,
    style: normalizeRoleStyle(role.style),
    iconUrl: role.iconUrl ?? null,
    separateMembers: Boolean(role.separateMembers),
    permissions: { ...role.permissions }
  }));
}

function getOwnerRoleId(roles: ServerRole[]) {
  return roles.find((role) => role.permissions.administrator)?.id ?? roles.find((role) => role.permissions.manage_server)?.id ?? null;
}

function getFirstTextChannelName(server: { categories: ChannelGroupDefinition[] }) {
  const textChannels = server.categories.flatMap((group) => group.channels).filter((channel) => channel.type === "text");
  return textChannels.find((channel) => !channel.isPrivate)?.name ?? textChannels[0]?.name ?? null;
}

function getTemplateCounts(template: ServerTemplate) {
  const channels = template.categories.flatMap((group) => group.channels);
  return {
    text: channels.filter((channel) => channel.type === "text").length,
    voice: channels.filter((channel) => channel.type === "voice").length,
    roles: template.roles.length + 1
  };
}

function plural(count: number, singular: string, pluralText: string) {
  return count === 1 ? singular : pluralText;
}

function getTemplateSummary(template: ServerTemplate) {
  const counts = getTemplateCounts(template);
  return `${counts.text} ${plural(counts.text, "canal de texto", "canais de texto")}, ${counts.voice} ${plural(
    counts.voice,
    "canal de voz",
    "canais de voz"
  )} e ${counts.roles} ${plural(counts.roles, "cargo", "cargos")}`;
}

function getAllServerChannels(server: ServerDefinition) {
  return server.categories.flatMap((group) => group.channels);
}

function getTextChannels(server: ServerDefinition) {
  return getAllServerChannels(server).filter((channel) => channel.type === "text");
}

function getServerGuideAvailableChannels(server: ServerDefinition) {
  return getAllServerChannels(server).filter((channel) => !channel.isPrivate);
}

function getServerGuideChannels(server: ServerDefinition) {
  const availableChannels = getServerGuideAvailableChannels(server);
  const channelsByName = new Map(availableChannels.map((channel) => [channel.name, channel]));
  const selectedChannels = server.boostPerks.serverGuideChannelNames
    .map((channelName) => channelsByName.get(channelName))
    .filter((channel): channel is ChannelDefinition => Boolean(channel))
    .slice(0, 10);

  return selectedChannels.length ? selectedChannels : availableChannels.slice(0, 4);
}

function getMentionNameAliases(name: string) {
  const cleanName = name.trim().replace(/^@+/, "");
  if (!cleanName) {
    return [];
  }

  const words = cleanName.match(/[\p{L}\p{N}_.-]+/gu) ?? [];
  return Array.from(
    new Set(
      [
        cleanName,
        normalizeAccountUsername(cleanName),
        words.join(" "),
        words.join("-"),
        words.join("_"),
        words[words.length - 1] ?? ""
      ]
        .map((alias) => alias.trim())
        .filter(Boolean)
    )
  );
}

function textMentionsName(text: string, name: string) {
  const loweredText = text.toLowerCase();
  const mention = `@${name.trim().replace(/^@+/, "").toLowerCase()}`;
  if (mention.length <= 1) {
    return false;
  }

  let index = loweredText.indexOf(mention);
  while (index >= 0) {
    const before = index > 0 ? loweredText[index - 1] : "";
    const after = loweredText[index + mention.length] ?? "";
    const hasStartBoundary = !before || /[\s([{:]/.test(before);
    const hasEndBoundary = !after || /[\s,.;:!?)}\]]/.test(after);

    if (hasStartBoundary && hasEndBoundary) {
      return true;
    }

    index = loweredText.indexOf(mention, index + mention.length);
  }

  return false;
}

function findMentionLabel(text: string, names: string[]) {
  const aliases = names.flatMap((name) => getMentionNameAliases(name)).sort((first, second) => second.length - first.length);
  const matchedAlias = aliases.find((alias) => textMentionsName(text, alias));
  return matchedAlias ? `@${matchedAlias}` : null;
}

function getMessageMentionResolution(server: ServerDefinition, text: string) {
  const mentions: MessageMention[] = [];
  const roleMentions: ServerRole[] = [];
  const recipientMap = new Map<string, { member: ServerMemberDefinition; mentionLabel: string }>();

  server.members.forEach((member) => {
    const mentionLabel = findMentionLabel(text, [member.username, member.displayName]);
    if (!mentionLabel) {
      return;
    }

    mentions.push({
      kind: member.isBot ? "bot" : "member",
      id: member.id,
      name: member.displayName,
      username: member.username,
      label: mentionLabel
    });

    if (!member.isBot) {
      recipientMap.set(member.id, { member, mentionLabel });
    }
  });

  server.roles
    .filter((role) => !role.isDefault)
    .forEach((role) => {
      const mentionLabel = findMentionLabel(text, [role.name]);
      if (!mentionLabel) {
        return;
      }

      roleMentions.push(role);
      mentions.push({
        kind: "role",
        id: role.id,
        name: role.name,
        label: mentionLabel
      });

      server.members
        .filter((member) => member.roleIds.includes(role.id) && !member.isBot)
        .forEach((member) => recipientMap.set(member.id, { member, mentionLabel }));
    });

  const recipientMentions = Array.from(recipientMap.values());
  return {
    mentions,
    roleMentions,
    recipientMentions,
    mentionedUserIds: recipientMentions.map(({ member }) => member.id),
    mentionedUsernames: recipientMentions.map(({ member }) => member.username.toLowerCase())
  };
}

function canMentionServerRoles(server: ServerDefinition, member: ServerMemberDefinition | null, userId: string) {
  if (server.ownerId === userId) {
    return true;
  }

  return (["administrator", "manage_messages", "moderate_members", "kick_members", "ban_members"] as PermissionKey[]).some((permission) =>
    memberHasPermission(server, member, permission, userId)
  );
}

function createMentionNotifications(
  server: ServerDefinition,
  channelName: string,
  author: Pick<AuthUser, "id" | "username" | "displayName"> | { id: string; username: string; displayName: string },
  text: string,
  recipientMentions: Array<{ member: ServerMemberDefinition; mentionLabel: string }>
) {
  if (!server.notificationsEnabled || !recipientMentions.length) {
    return [];
  }

  const createdAt = new Date().toISOString();
  return recipientMentions.map(({ member, mentionLabel }) => ({
    id: `mention-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${member.id}`,
    recipientUserId: getMentionNotificationKey(member),
    recipientUsername: member.username,
    serverId: server.id,
    serverName: server.name,
    channelName,
    authorId: author.id,
    authorUsername: author.username,
    authorName: author.displayName,
    messageText: text,
    mentionLabel,
    createdAt,
    read: false
  }));
}

function messageMentionsUser(message: LocalMessage, user: Pick<AuthUser, "id" | "username">) {
  return Boolean(
    message.mentionedUserIds?.includes(user.id) ||
      message.mentionedUsernames?.some((username) => username.toLowerCase() === user.username.toLowerCase())
  );
}

function getMentionTargetByToken(server: ServerDefinition, rawToken: string) {
  const token = rawToken.replace(/^@+/, "").toLowerCase();
  const member = server.members.find((item) =>
    [item.username, item.displayName].flatMap((name) => getMentionNameAliases(name)).some((alias) => alias.toLowerCase() === token)
  );
  if (member) {
    return { kind: member.isBot ? "bot" : "member", member } as const;
  }

  const role = server.roles.find((item) =>
    !item.isDefault && getMentionNameAliases(item.name).some((alias) => alias.toLowerCase() === token)
  );
  return role ? ({ kind: "role", role } as const) : null;
}

function getBotCommandFromText(bot: ServerBotIntegration, text: string) {
  const normalizedText = text.trim();
  if (normalizedText.startsWith(bot.prefix)) {
    const withoutPrefix = normalizedText.slice(bot.prefix.length).trim();
    const [commandName = "", ...argsParts] = withoutPrefix.split(/\s+/);
    return { commandName, args: argsParts.join(" ") };
  }

  const loweredText = normalizedText.toLowerCase();
  const aliases = [bot.username, bot.displayName]
    .flatMap((name) => getMentionNameAliases(name))
    .sort((first, second) => second.length - first.length);

  for (const alias of aliases) {
    const mention = `@${alias.toLowerCase()}`;
    if (loweredText === mention || loweredText.startsWith(`${mention} `)) {
      const withoutMention = normalizedText.slice(mention.length).trim();
      if (!withoutMention) {
        return { commandName: "help", args: "" };
      }

      const [commandName = "", ...argsParts] = withoutMention.split(/\s+/);
      return { commandName, args: argsParts.join(" ") };
    }
  }

  return null;
}

function getActiveMentionQuery(text: string) {
  const match = text.match(/(^|\s)@([\p{L}\p{N}_.-]{1,64})$/u);
  return match ? match[2].toLowerCase() : null;
}

function getMentionAutocompleteOptions(server: ServerDefinition, text: string) {
  const query = getActiveMentionQuery(text);
  if (!query) {
    return [];
  }

  return server.members
    .filter((member) => {
      const username = member.username.toLowerCase();
      const displayName = member.displayName.toLowerCase();
      return username.startsWith(query) || displayName.startsWith(query) || username.includes(query) || displayName.includes(query);
    })
    .sort((first, second) => compareServerMembersByPresence(first, second))
    .slice(0, 8);
}

function replaceActiveMention(text: string, username: string) {
  return text.replace(/(^|\s)@[\p{L}\p{N}_.-]{1,64}$/u, (_match, prefix: string) => `${prefix}@${username} `);
}

function botAllowsChannel(bot: ServerBotIntegration, channelName: string) {
  return !bot.commandChannelNames.length || bot.commandChannelNames.includes(channelName);
}

function isBotRuntimeOnline(_bot: ServerBotIntegration) {
  return false;
}

function botCanRespondInTempest(bot: ServerBotIntegration) {
  return bot.runtimeEnabled;
}

function botHasModule(bot: ServerBotIntegration, module: BotCommandModule) {
  return bot.commandModules.includes(module);
}

function getBotCommandText(bot: ServerBotIntegration, commandName: string, args: string, server: ServerDefinition) {
  const loweredCommand = commandName.toLowerCase();
  if (loweredCommand === bot.commandName.toLowerCase()) {
    return bot.replyText;
  }

  if (botHasModule(bot, "utility") && ["help", "ajuda", "comandos"].includes(loweredCommand)) {
    const modules = bot.commandModules.map((module) => botCommandModuleLabels[module]).join(", ");
    return `Comandos ativos: ${bot.prefix}${bot.commandName}, ${bot.prefix}help. Modulos liberados: ${modules}.`;
  }

  if (botHasModule(bot, "utility") && ["ping", "status"].includes(loweredCommand)) {
    return `Online em ${server.name}. Ponte de comandos ativa.`;
  }

  if (botHasModule(bot, "utility") && ["registrar", "log", "acao"].includes(loweredCommand)) {
    return args
      ? `${args} executou ${bot.prefix}${loweredCommand} em ${new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        })}.`
      : `Use ${bot.prefix}${loweredCommand} @usuario para registrar uma acao mencionando alguem.`;
  }

  if (botHasModule(bot, "music") && ["play", "tocar", "join", "entrar", "skip", "pause", "stop"].includes(loweredCommand)) {
    if (["skip", "pause", "stop"].includes(loweredCommand)) {
      return "Controle de musica recebido. A ponte de voz esta preparada para esse bot.";
    }

    return args ? `Preparando musica: ${args}.` : "Entre em um canal de voz e envie o nome ou link da musica.";
  }

  if (botHasModule(bot, "moderation") && ["ban", "kick", "expulsar", "limpar", "clear"].includes(loweredCommand)) {
    return "Comando de moderacao recebido. Use permissoes do servidor para permitir a acao real do bot.";
  }

  if (botHasModule(bot, "fun") && ["dado", "dice", "moeda", "coin"].includes(loweredCommand)) {
    if (["moeda", "coin"].includes(loweredCommand)) {
      return Math.random() > 0.5 ? "Deu cara." : "Deu coroa.";
    }

    return `Dado: ${Math.floor(Math.random() * 6) + 1}`;
  }

  if (botHasModule(bot, "economy") && ["saldo", "daily", "coins"].includes(loweredCommand)) {
    return "Economia ativa. Saldo de teste: 250 estrelas.";
  }

  return null;
}

function getTempestBotResponses(server: ServerDefinition, channelName: string, text: string): LocalMessage[] {
  const normalizedText = text.trim();
  if (!normalizedText) {
    return [];
  }

  return server.bots
    .filter((bot) => botCanRespondInTempest(bot) && botAllowsChannel(bot, channelName))
    .flatMap((bot) => {
      const command = getBotCommandFromText(bot, normalizedText);
      if (!command) {
        return [];
      }

      const responseText = getBotCommandText(bot, command.commandName, command.args, server);
      if (!responseText) {
        return [];
      }

      const responseMentions = getMessageMentionResolution(server, responseText);

      return [
        {
          authorId: bot.id,
          authorUsername: bot.username,
          author: bot.displayName,
          authorAvatarUrl: bot.avatarUrl,
          authorIsBot: true,
          time: new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
          }),
          createdAt: new Date().toISOString(),
          text: responseText,
          serverId: server.id,
          channelName,
          mentions: responseMentions.mentions,
          mentionedUserIds: responseMentions.mentionedUserIds,
          mentionedUsernames: responseMentions.mentionedUsernames
        }
      ];
    });
}

function reorderItems<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  nextItems.splice(insertIndex, 0, movedItem);
  return nextItems;
}

function compareServerMembersByPresence(first: ServerMemberDefinition, second: ServerMemberDefinition) {
  const firstOffline = getPublicPresence(first.presence) === "OFFLINE";
  const secondOffline = getPublicPresence(second.presence) === "OFFLINE";
  if (firstOffline !== secondOffline) {
    return firstOffline ? 1 : -1;
  }

  return first.displayName.localeCompare(second.displayName, "pt-BR", { sensitivity: "base" });
}

function sortServerMembersForList(members: ServerMemberDefinition[]) {
  return [...members].sort(compareServerMembersByPresence);
}

function getServerMemberGroups(server: ServerDefinition) {
  const assignedMemberIds = new Set<string>();
  const groups: Array<{ id: string; label: string; color: string | null; members: ServerMemberDefinition[] }> = [];

  server.roles
    .filter((role) => role.separateMembers && !role.isDefault)
    .forEach((role) => {
      const members = sortServerMembersForList(server.members.filter((member) => member.roleIds.includes(role.id) && !assignedMemberIds.has(member.id)));
      if (!members.length) {
        return;
      }

      members.forEach((member) => assignedMemberIds.add(member.id));
      groups.push({
        id: role.id,
        label: `${role.name} - ${members.length}`,
        color: role.color,
        members
      });
    });

  const remainingMembers = sortServerMembersForList(server.members.filter((member) => !assignedMemberIds.has(member.id)));
  if (remainingMembers.length || groups.length === 0) {
    groups.push({
      id: "available",
      label: `Disponivel - ${remainingMembers.length || server.members.length}`,
      color: null,
      members: remainingMembers.length ? remainingMembers : sortServerMembersForList(server.members)
    });
  }

  return groups;
}

function normalizeTextChannelName(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_.-]/g, "") || "canal"
  );
}

function createAuditLog(
  actor: Pick<AuthUser, "id" | "displayName">,
  action: AuditAction,
  target: string,
  details: string
): ServerAuditLog {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    actorId: actor.id,
    actorName: actor.displayName,
    target,
    details,
    createdAt: new Date().toISOString()
  };
}

function createEveryoneRole(permissionsOverride?: Record<PermissionKey, boolean>): ServerRole {
  return {
    id: "everyone",
    name: "@everyone",
    color: "#99aab5",
    style: "solid",
    iconUrl: null,
    permissions: permissionsOverride ? { ...permissionsOverride } : { ...defaultEveryonePermissions },
    separateMembers: false,
    isDefault: true
  };
}

function createServerMember(user: AuthUser, extraRoleIds: string[] = []): ServerMemberDefinition {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    presence: user.presence,
    accountCreatedAt: user.createdAt,
    joinedAt: new Date().toISOString(),
    roleIds: Array.from(new Set(["everyone", ...extraRoleIds]))
  };
}

function getRolePermissions(server: ServerDefinition, member: ServerMemberDefinition | null) {
  const permissions = { ...defaultEveryonePermissions };
  const assignedRoleIds = new Set(["everyone", ...(member?.roleIds ?? [])]);

  server.roles
    .filter((role) => assignedRoleIds.has(role.id))
    .forEach((role) => {
      (Object.keys(role.permissions) as PermissionKey[]).forEach((key) => {
        permissions[key] = permissions[key] || role.permissions[key];
      });
    });

  return permissions;
}

function memberHasPermission(server: ServerDefinition | null, member: ServerMemberDefinition | null, permission: PermissionKey, userId: string) {
  if (!server || !member) {
    return false;
  }

  if (server.ownerId === userId) {
    return true;
  }

  const permissions = getRolePermissions(server, member);
  return Boolean(permissions.administrator || permissions[permission]);
}

function getPresenceLabel(status: PresenceStatus) {
  const labels: Record<PresenceStatus, string> = {
    ONLINE: "Online",
    IDLE: "Ausente",
    DND: "Nao perturbar",
    INVISIBLE: "Invisivel",
    OFFLINE: "Offline"
  };

  return labels[status];
}

function getPublicPresence(status: PresenceStatus) {
  return status === "INVISIBLE" ? "OFFLINE" : status;
}

function formatPublicDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("pt-BR");
}

function formatPublicAge(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const elapsedMs = Math.max(0, Date.now() - date.getTime());
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  if (elapsedDays <= 0) {
    return "hoje";
  }
  if (elapsedDays < 30) {
    return `ha ${elapsedDays} ${elapsedDays === 1 ? "dia" : "dias"}`;
  }

  const elapsedMonths = Math.floor(elapsedDays / 30);
  if (elapsedMonths < 12) {
    return `ha ${elapsedMonths} ${elapsedMonths === 1 ? "mes" : "meses"}`;
  }

  const elapsedYears = Math.floor(elapsedMonths / 12);
  return `ha ${elapsedYears} ${elapsedYears === 1 ? "ano" : "anos"}`;
}

function ProfileCardDialog({
  profile,
  onClose,
  onEdit,
  onMessage,
  linkedAccounts = [],
  canUseAccountSwitcher = false,
  onSwitchAccount,
  onRemoveLinkedAccount
}: {
  profile: ProfileCardUser;
  onClose: () => void;
  onEdit: () => void;
  onMessage: () => void;
  linkedAccounts?: AuthUser[];
  canUseAccountSwitcher?: boolean;
  onSwitchAccount?: (accountId: string) => void;
  onRemoveLinkedAccount?: (accountId: string) => void;
}) {
  const accountCreatedDate = formatPublicDate(profile.accountCreatedAt);
  const accountCreatedAge = formatPublicAge(profile.accountCreatedAt);
  const serverJoinedDate = formatPublicDate(profile.serverJoinedAt);
  const serverJoinedAge = formatPublicAge(profile.serverJoinedAt);
  const [accountMenuId, setAccountMenuId] = useState<string | null>(null);
  const [accountSwitcherNotice, setAccountSwitcherNotice] = useState<string | null>(null);
  const availableAccounts = linkedAccounts.length
    ? linkedAccounts
    : profile.isOwnProfile
    ? [
        {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          email: "",
          avatarUrl: profile.avatarUrl,
          bannerUrl: profile.bannerUrl ?? null,
          bio: profile.bio ?? null,
          customStatus: profile.customStatus ?? null,
          presence: profile.presence,
          emailVerifiedAt: null,
          blockNonFriendDirectMessages: false,
          twoFactorEnabled: false,
          createdAt: profile.accountCreatedAt ?? new Date().toISOString()
        }
      ]
    : [];

  function switchToAccount(accountId: string) {
    if (accountId === profile.id || !onSwitchAccount) {
      return;
    }

    try {
      onSwitchAccount(accountId);
      onClose();
    } catch (caught) {
      setAccountSwitcherNotice(caught instanceof Error ? caught.message : "Nao foi possivel trocar de conta.");
    }
  }

  function removeLinkedAccount(accountId: string) {
    if (!onRemoveLinkedAccount) {
      return;
    }

    try {
      onRemoveLinkedAccount(accountId);
      setAccountMenuId(null);
      setAccountSwitcherNotice("Conta removida da troca rapida.");
    } catch (caught) {
      setAccountSwitcherNotice(caught instanceof Error ? caught.message : "Nao foi possivel remover essa conta.");
    }
  }

  function copyLinkedAccountId(accountId: string) {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(accountId);
    }
    setAccountMenuId(null);
    setAccountSwitcherNotice(`ID da conta: ${accountId}`);
  }

  return (
    <div className="modal-backdrop profile-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="profile-card-panel" aria-label={`Perfil de ${profile.displayName}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="profile-card-banner" style={profile.bannerUrl ? { backgroundImage: toCssImageUrl(profile.bannerUrl) } : undefined}>
          <div className="profile-card-actions">
            {profile.isOwnProfile ? (
              <button className="icon-button" title="Editar perfil" type="button" onClick={onEdit}>
                <Edit3 size={17} />
              </button>
            ) : (
              <button className="icon-button" title="Solicitar amizade" type="button">
                <UserPlus size={17} />
              </button>
            )}
            <button className="icon-button" title="Fechar" type="button" onClick={onClose}>
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="profile-card-body">
          <div className="profile-card-avatar-wrap">
            <AvatarBadge user={profile} className="profile-card-avatar" />
            <span className={`profile-presence ${profile.presence.toLowerCase()}`} title={getPresenceLabel(profile.presence)}>
              {profile.presence === "IDLE" ? <Moon size={13} /> : null}
            </span>
          </div>

          <div className="profile-card-names">
            <strong>{profile.displayName}</strong>
            <span>@{profile.username}</span>
          </div>

          <div className="profile-card-status">
            <span className={`presence ${profile.presence.toLowerCase()}`} />
            <span>{getPresenceLabel(profile.presence)}</span>
            {profile.customStatus ? <span>{profile.customStatus}</span> : null}
          </div>

          {profile.bio ? <p className="profile-card-bio">{profile.bio}</p> : null}

          {accountCreatedDate || serverJoinedDate ? (
            <div className="profile-card-public-dates">
              {accountCreatedDate ? (
                <span>
                  Conta criada em {accountCreatedDate}
                  {accountCreatedAge ? ` - ${accountCreatedAge}` : ""}
                </span>
              ) : null}
              {serverJoinedDate ? (
                <span>
                  Entrou neste servidor em {serverJoinedDate}
                  {serverJoinedAge ? ` - ${serverJoinedAge}` : ""}
                </span>
              ) : null}
            </div>
          ) : null}

          {profile.steamActivity ? (
            <div className="profile-activity-state">
              <Gamepad2 size={16} />
              <div>
                <strong>{profile.steamActivity.gameName}</strong>
                <span>Jogando pela Steam</span>
              </div>
              {profile.steamActivity.imageUrl ? <SafePreviewImage src={profile.steamActivity.imageUrl} alt="" /> : null}
            </div>
          ) : null}

          {profile.voiceStatus ? (
            <div className="profile-voice-state">
              <PhoneCall size={16} />
              <div>
                <strong>{profile.voiceStatus.channelName}</strong>
                <span>Na call ha {profile.voiceStatus.elapsedLabel}</span>
              </div>
              {profile.voiceStatus.muted ? <MicOff size={16} /> : null}
            </div>
          ) : null}

          <div className="profile-card-mutuals">
            <span>{profile.mutualFriends ?? 0} amigo mutuo</span>
            <span>{profile.mutualServers ?? 0} servidores mutuos</span>
          </div>

          {profile.isOwnProfile && canUseAccountSwitcher && availableAccounts.length > 1 ? (
            <div className="profile-account-switcher">
              <strong>Trocar conta</strong>
              {availableAccounts.map((account) => (
                <div className="profile-account-row" key={account.id}>
                  <button
                    className={account.id === profile.id ? "profile-account-main active" : "profile-account-main"}
                    type="button"
                    onClick={() => switchToAccount(account.id)}
                    disabled={account.id === profile.id}
                  >
                    <AvatarBadge user={account} className="profile-account-avatar" />
                    <span>
                      <strong>{account.displayName}</strong>
                      <small>@{account.username}</small>
                    </span>
                    <em>{account.id === profile.id ? "Atual" : "Usar"}</em>
                  </button>
                  <div className="profile-account-actions">
                    <button className="icon-button" type="button" title="Opcoes da conta" onClick={() => setAccountMenuId(accountMenuId === account.id ? null : account.id)}>
                      <MoreHorizontal size={16} />
                    </button>
                    {accountMenuId === account.id ? (
                      <div className="account-menu-popover">
                        <button type="button" onClick={() => copyLinkedAccountId(account.id)}>
                          ID da conta
                        </button>
                        <button type="button" onClick={() => removeLinkedAccount(account.id)} disabled={account.id === profile.id}>
                          Remover conta conectada
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {accountSwitcherNotice ? <span className="account-switcher-note">{accountSwitcherNotice}</span> : null}
            </div>
          ) : null}

          {profile.isOwnProfile ? (
            <Button variant="primary" type="button" onClick={onEdit}>
              <Edit3 size={17} />
              Editar perfil
            </Button>
          ) : (
            <button className="profile-message-box" type="button" onClick={onMessage} disabled={profile.canMessage === false}>
              <span>{profile.canMessage === false ? "Mensagem bloqueada" : `Conversar com @${profile.username}`}</span>
              <Send size={16} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function ProfileDialog({
  user,
  onClose,
  onSave,
  steamActivity,
  onSteamActivitySave,
  onSecurityUserUpdate,
  onAccountDeleted,
  linkedAccounts = [],
  canUseAccountSwitcher = false,
  onConnectLinkedAccount,
  onSwitchLinkedAccount,
  onRemoveLinkedAccount,
  api
}: {
  user: AuthUser;
  onClose: () => void;
  onSave: (input: UpdateProfileInput) => Promise<AuthUser>;
  steamActivity: SteamActivitySettings;
  onSteamActivitySave: (settings: SteamActivitySettings) => void;
  onSecurityUserUpdate?: (user: AuthUser) => void;
  onAccountDeleted?: () => void;
  linkedAccounts?: AuthUser[];
  canUseAccountSwitcher?: boolean;
  onConnectLinkedAccount?: (input: LinkedAccountLoginInput) => Promise<AuthUser>;
  onSwitchLinkedAccount?: (accountId: string) => void;
  onRemoveLinkedAccount?: (accountId: string) => void;
  api?: ReturnType<typeof createApiClient> | null;
}) {
  const [profileTab, setProfileTab] = useState<"profile" | "security" | "steam" | "accounts">("profile");
  const [displayName, setDisplayName] = useState(user.displayName);
  const [accountUsername, setAccountUsername] = useState(user.username);
  const [currentPassword, setCurrentPassword] = useState("");
  const [emailDraft, setEmailDraft] = useState(user.email);
  const [emailPassword, setEmailPassword] = useState("");
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [disableTwoFactorPassword, setDisableTwoFactorPassword] = useState("");
  const [disableTwoFactorCode, setDisableTwoFactorCode] = useState("");
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState("");
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(user.bannerUrl ?? "");
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [profileImageLoading, setProfileImageLoading] = useState<"avatar" | "banner" | null>(null);
  const [bio, setBio] = useState(user.bio ?? "");
  const [customStatus, setCustomStatus] = useState(user.customStatus ?? "");
  const [presence, setPresence] = useState<EditablePresenceStatus>(user.presence === "OFFLINE" ? "INVISIBLE" : user.presence);
  const [blockNonFriendDirectMessages, setBlockNonFriendDirectMessages] = useState(user.blockNonFriendDirectMessages);
  const [steamLinked, setSteamLinked] = useState(steamActivity.linked);
  const [steamName, setSteamName] = useState(steamActivity.steamName);
  const [steamGame, setSteamGame] = useState(steamActivity.currentGame);
  const [steamGameImageUrl, setSteamGameImageUrl] = useState(steamActivity.gameImageUrl ?? "");
  const [steamNotice, setSteamNotice] = useState<string | null>(null);
  const [linkedAccountIdentifier, setLinkedAccountIdentifier] = useState("");
  const [linkedAccountPassword, setLinkedAccountPassword] = useState("");
  const [linkedAccountNotice, setLinkedAccountNotice] = useState<string | null>(null);
  const [accountMenuId, setAccountMenuId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [linkingAccount, setLinkingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedAccountUsername = normalizeAccountUsername(accountUsername);
  const previewDisplayName = displayName.trim() || normalizedAccountUsername;
  const usernameChanged = normalizedAccountUsername.toLowerCase() !== user.username.toLowerCase();
  const visibleLinkedAccounts = linkedAccounts.some((account) => account.id === user.id) ? linkedAccounts : [user, ...linkedAccounts];

  useEffect(() => {
    setEmailDraft(user.email);
  }, [user.email]);

  async function loadProfileImage(
    event: ChangeEvent<HTMLInputElement>,
    applyImage: (imageDataUrl: string) => void,
    resize?: { width: number; height: number; maxBytes?: number },
    loadingTarget?: "avatar" | "banner"
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!isImageFile(file)) {
      setError("Escolha um arquivo de imagem ou GIF.");
      return;
    }

    if (loadingTarget) {
      setProfileImageLoading(loadingTarget);
    }

    try {
      const imageDataUrl = await readImageFileAsDataUrl(file, resize);
      if (isDataImageSource(imageDataUrl) && getDataUrlByteLength(imageDataUrl) > profileImageDataUrlMaxBytes) {
        throw new Error("Imagem muito grande para salvar no perfil.");
      }
      applyImage(imageDataUrl);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel carregar essa imagem.");
    } finally {
      if (loadingTarget) {
        setProfileImageLoading((current) => (current === loadingTarget ? null : current));
      }
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (usernameChanged && !currentPassword) {
        throw new Error("Digite a senha atual para mudar o nick da conta.");
      }

      const cleanAvatarUrl = avatarUrl.trim() ? sanitizeImageSource(avatarUrl) : null;
      const cleanBannerUrl = bannerUrl.trim() ? sanitizeImageSource(bannerUrl) : null;
      if (avatarUrl.trim() && !cleanAvatarUrl) {
        throw new Error("Use uma imagem valida para a foto de perfil.");
      }

      if (bannerUrl.trim() && !cleanBannerUrl) {
        throw new Error("Use uma imagem valida para a capa do perfil.");
      }

      await onSave({
        username: normalizedAccountUsername,
        currentPassword: usernameChanged ? currentPassword : undefined,
        displayName: previewDisplayName,
        avatarUrl: cleanAvatarUrl,
        bannerUrl: cleanBannerUrl,
        bio: bio.trim() || null,
        customStatus: customStatus.trim() || null,
        presence,
        blockNonFriendDirectMessages
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel salvar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function submitEmailChange(event: FormEvent) {
    event.preventDefault();
    if (!api) {
      setError("API online obrigatoria para mudar e-mail.");
      return;
    }

    setSecuritySaving(true);
    setError(null);
    setSecurityNotice(null);

    try {
      const updatedUser = await api.changeEmail({
        email: emailDraft,
        currentPassword: emailPassword
      });
      onSecurityUserUpdate?.(updatedUser);
      setEmailPassword("");
      setSecurityNotice("E-mail alterado com seguranca.");
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel mudar o e-mail.");
    } finally {
      setSecuritySaving(false);
    }
  }

  async function submitPasswordChange(event: FormEvent) {
    event.preventDefault();
    if (!api) {
      setError("API online obrigatoria para mudar senha.");
      return;
    }

    if (passwordNew !== passwordConfirm) {
      setError("A confirmacao precisa ser igual a nova senha.");
      return;
    }

    setSecuritySaving(true);
    setError(null);
    setSecurityNotice(null);

    try {
      await api.changePassword({
        currentPassword: passwordCurrent,
        newPassword: passwordNew,
        confirmPassword: passwordConfirm
      });
      setPasswordCurrent("");
      setPasswordNew("");
      setPasswordConfirm("");
      setSecurityNotice("Senha alterada. A senha antiga ficou invalida.");
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel mudar a senha.");
    } finally {
      setSecuritySaving(false);
    }
  }

  async function startTwoFactorSetup() {
    if (!api) {
      setError("API online obrigatoria para configurar 2FA.");
      return;
    }

    setSecuritySaving(true);
    setError(null);
    setSecurityNotice(null);

    try {
      const setup = await api.setupTwoFactor({ currentPassword: twoFactorPassword });
      setTwoFactorSetup(setup);
      setSecurityNotice("Chave gerada. Adicione no autenticador e digite o codigo de 6 digitos.");
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel iniciar o 2FA.");
    } finally {
      setSecuritySaving(false);
    }
  }

  async function enableTwoFactor() {
    if (!api) {
      setError("API online obrigatoria para ativar 2FA.");
      return;
    }

    setSecuritySaving(true);
    setError(null);
    setSecurityNotice(null);

    try {
      const updatedUser = await api.enableTwoFactor({
        code: twoFactorCode.replace(/\D/g, "").slice(0, 6)
      });
      onSecurityUserUpdate?.(updatedUser);
      setTwoFactorPassword("");
      setTwoFactorCode("");
      setTwoFactorSetup(null);
      setSecurityNotice("Autenticador de dois fatores ativado.");
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : "Codigo do autenticador invalido.");
    } finally {
      setSecuritySaving(false);
    }
  }

  async function submitDisableTwoFactor(event: FormEvent) {
    event.preventDefault();
    if (!api) {
      setError("API online obrigatoria para desativar 2FA.");
      return;
    }

    setSecuritySaving(true);
    setError(null);
    setSecurityNotice(null);

    try {
      const updatedUser = await api.disableTwoFactor({
        currentPassword: disableTwoFactorPassword,
        ...(disableTwoFactorCode ? { code: disableTwoFactorCode.replace(/\D/g, "").slice(0, 6) } : {})
      });
      onSecurityUserUpdate?.(updatedUser);
      setDisableTwoFactorPassword("");
      setDisableTwoFactorCode("");
      setSecurityNotice("Autenticador de dois fatores desativado.");
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel desativar o 2FA.");
    } finally {
      setSecuritySaving(false);
    }
  }

  async function submitAccountDeletion(event: FormEvent) {
    event.preventDefault();
    if (!api) {
      setError("API online obrigatoria para excluir a conta.");
      return;
    }

    if (deleteAccountConfirmation.trim().toLowerCase() !== user.username.toLowerCase()) {
      setError("Digite seu nick exatamente para confirmar a exclusao.");
      return;
    }

    setSecuritySaving(true);
    setError(null);
    setSecurityNotice(null);

    try {
      await api.deleteAccount({ currentPassword: deleteAccountPassword });
      onClose();
      onAccountDeleted?.();
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel excluir a conta.");
    } finally {
      setSecuritySaving(false);
    }
  }

  function submitSteam(event: FormEvent) {
    event.preventDefault();
    const nextGame = steamGame.trim();
    const nextSteamName = steamName.trim();
    const cleanGameImageUrl = steamGameImageUrl.trim() ? sanitizeImageSource(steamGameImageUrl) : null;
    if (steamLinked && steamGameImageUrl.trim() && !cleanGameImageUrl) {
      setSteamNotice("Use uma URL de imagem valida para o jogo.");
      return;
    }

    const sameGame = nextGame.toLowerCase() === steamActivity.currentGame.trim().toLowerCase();
    onSteamActivitySave({
      linked: steamLinked,
      steamName: nextSteamName,
      currentGame: steamLinked ? nextGame : "",
      gameImageUrl: steamLinked ? cleanGameImageUrl : null,
      startedAt: steamLinked && nextGame ? (sameGame && steamActivity.startedAt ? steamActivity.startedAt : new Date().toISOString()) : null
    });
    setSteamNotice(steamLinked ? "Steam vinculada ao perfil." : "Steam desconectada do perfil.");
  }

  async function submitLinkedAccount(event: FormEvent) {
    event.preventDefault();
    if (!onConnectLinkedAccount) {
      return;
    }

    setLinkingAccount(true);
    setLinkedAccountNotice(null);
    setError(null);
    try {
      const account = await onConnectLinkedAccount({
        identifier: linkedAccountIdentifier,
        password: linkedAccountPassword
      });
      setLinkedAccountIdentifier("");
      setLinkedAccountPassword("");
      setLinkedAccountNotice(`Conta @${account.username} conectada para troca rapida.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel conectar essa conta.");
    } finally {
      setLinkingAccount(false);
    }
  }

  function switchLinkedAccount(accountId: string) {
    if (accountId === user.id || !onSwitchLinkedAccount) {
      return;
    }

    try {
      onSwitchLinkedAccount(accountId);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel trocar de conta.");
    }
  }

  function removeLinkedAccount(accountId: string) {
    if (!onRemoveLinkedAccount) {
      return;
    }

    try {
      onRemoveLinkedAccount(accountId);
      setAccountMenuId(null);
      setLinkedAccountNotice("Conta removida da troca rapida.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel remover essa conta.");
    }
  }

  function showLinkedAccountId(accountId: string) {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(accountId);
    }
    setAccountMenuId(null);
    setLinkedAccountNotice(`ID da conta: ${accountId}`);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" aria-label="Editar perfil">
        <header className="modal-header">
          <div>
            <h2>Perfil</h2>
            <p>@{normalizedAccountUsername}</p>
          </div>
          <button className="icon-button" title="Fechar" type="button" onClick={onClose}>
            <X size={17} />
          </button>
        </header>

        <div className="settings-tabs profile-tabs">
          <button className={profileTab === "profile" ? "active" : ""} type="button" onClick={() => setProfileTab("profile")}>
            Perfil
          </button>
          <button className={profileTab === "security" ? "active" : ""} type="button" onClick={() => setProfileTab("security")}>
            Seguranca
          </button>
          <button className={profileTab === "steam" ? "active" : ""} type="button" onClick={() => setProfileTab("steam")}>
            Steam
          </button>
          {canUseAccountSwitcher ? (
            <button className={profileTab === "accounts" ? "active" : ""} type="button" onClick={() => setProfileTab("accounts")}>
              Contas
            </button>
          ) : null}
        </div>

        {profileTab === "profile" ? (
        <form className="profile-form" onSubmit={submit}>
          <div className="profile-edit-preview">
            <div className="profile-edit-banner" style={bannerUrl.trim() ? { backgroundImage: toCssImageUrl(bannerUrl) } : undefined} />
            <div className="profile-edit-main">
              <div className="profile-card-avatar-wrap">
                <AvatarBadge
                  user={{ ...user, displayName: previewDisplayName, avatarUrl: sanitizeImageSource(avatarUrl) }}
                  className="profile-card-avatar"
                />
                <span className={`profile-presence ${presence.toLowerCase()}`} title={getPresenceLabel(presence)}>
                  {presence === "IDLE" ? <Moon size={13} /> : null}
                </span>
              </div>
              <div>
                <strong>{previewDisplayName}</strong>
                <span>@{normalizedAccountUsername} - {getPresenceLabel(presence)}</span>
              </div>
            </div>
          </div>

          <label>
            Apelido do perfil
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={40}
              placeholder="Se ficar vazio, aparece o nick da conta"
            />
          </label>
          <label>
            Nick da conta
            <span className="input-with-icon">
              <AtSign size={17} />
              <input
                value={accountUsername}
                onChange={(event) => setAccountUsername(event.target.value)}
                maxLength={32}
                minLength={3}
                spellCheck={false}
                required
              />
            </span>
          </label>
          {usernameChanged ? (
            <label>
              Senha atual para mudar o nick
              <input
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                minLength={10}
                maxLength={128}
                required
              />
            </label>
          ) : null}
          <div className="profile-upload-field">
            <div>
              <strong>Foto de perfil</strong>
              <span>Escolha uma imagem ou GIF do computador.</span>
            </div>
            <div className="profile-upload-row">
              <div className="profile-upload-preview avatar">
                {avatarUrl.trim() ? <SafePreviewImage src={avatarUrl} alt="" /> : <ImageIcon size={20} />}
              </div>
              <div className="profile-upload-actions">
                <button
                  className="upload-button"
                  type="button"
                  disabled={profileImageLoading === "avatar"}
                  onClick={() => avatarFileInputRef.current?.click()}
                >
                  <Upload size={16} />
                  {profileImageLoading === "avatar" ? "Carregando..." : "Escolher foto"}
                </button>
                <input
                  ref={avatarFileInputRef}
                  className="file-input-hidden"
                  accept="image/*,.png,.jpg,.jpeg,.gif,.webp,.avif"
                  type="file"
                  onChange={(event) => void loadProfileImage(event, setAvatarUrl, { width: 256, height: 256, maxBytes: profileImageDataUrlMaxBytes }, "avatar")}
                />
                {avatarUrl.trim() ? (
                  <button className="ghost-button" type="button" onClick={() => setAvatarUrl("")}>
                    Remover
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="profile-upload-field">
            <div>
              <strong>Capa do perfil</strong>
              <span>Escolha uma imagem larga ou GIF para o topo do perfil.</span>
            </div>
            <div className="profile-upload-row">
              <div className="profile-upload-preview banner">
                {bannerUrl.trim() ? <SafePreviewImage src={bannerUrl} alt="" /> : <ImageIcon size={22} />}
              </div>
              <div className="profile-upload-actions">
                <button
                  className="upload-button"
                  type="button"
                  disabled={profileImageLoading === "banner"}
                  onClick={() => bannerFileInputRef.current?.click()}
                >
                  <Upload size={16} />
                  {profileImageLoading === "banner" ? "Carregando..." : "Escolher capa"}
                </button>
                <input
                  ref={bannerFileInputRef}
                  className="file-input-hidden"
                  accept="image/*,.png,.jpg,.jpeg,.gif,.webp,.avif"
                  type="file"
                  onChange={(event) => void loadProfileImage(event, setBannerUrl, { width: 960, height: 320, maxBytes: profileImageDataUrlMaxBytes }, "banner")}
                />
                {bannerUrl.trim() ? (
                  <button className="ghost-button" type="button" onClick={() => setBannerUrl("")}>
                    Remover
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <label>
            Recado
            <input value={customStatus} onChange={(event) => setCustomStatus(event.target.value)} maxLength={80} />
          </label>
          <div className="presence-picker" role="radiogroup" aria-label="Presenca">
            {(
              [
                ["ONLINE", "Online"],
                ["IDLE", "Ausente"],
                ["DND", "Nao perturbar"],
                ["INVISIBLE", "Invisivel"]
              ] as Array<[EditablePresenceStatus, string]>
            ).map(([value, label]) => (
              <button className={presence === value ? "active" : ""} type="button" key={value} onClick={() => setPresence(value)}>
                <span className={`presence ${value.toLowerCase()}`} />
                {label}
              </button>
            ))}
          </div>
          <label>
            Bio
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} />
          </label>
          <label className="checkbox-row">
            <input
              checked={blockNonFriendDirectMessages}
              onChange={(event) => setBlockNonFriendDirectMessages(event.target.checked)}
              type="checkbox"
            />
            Bloquear mensagens de pessoas que nao sao amigas
          </label>

          {error ? <p className="form-error">{error}</p> : null}
          <Button variant="primary" type="submit" disabled={saving}>
            <Edit3 size={18} />
            {saving ? "Salvando..." : "Salvar perfil"}
          </Button>
        </form>
        ) : profileTab === "security" ? (
          <div className="profile-form">
            <section className="security-card">
              <header>
                <AtSign size={18} />
                <div>
                  <strong>E-mail da conta</strong>
                  <span>Para salvar um e-mail novo, confirme sua senha atual.</span>
                </div>
              </header>
              <form className="profile-form" onSubmit={submitEmailChange}>
                <label>
                  Novo e-mail
                  <input value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} type="email" autoComplete="email" required />
                </label>
                <label>
                  Senha atual
                  <input
                    value={emailPassword}
                    onChange={(event) => setEmailPassword(event.target.value)}
                    type="password"
                    autoComplete="current-password"
                    minLength={10}
                    required
                  />
                </label>
                <Button variant="primary" type="submit" disabled={securitySaving}>
                  {securitySaving ? "Salvando..." : "Salvar e-mail"}
                </Button>
              </form>
            </section>

            <section className="security-card">
              <header>
                <Lock size={18} />
                <div>
                  <strong>Senha</strong>
                  <span>Digite a senha atual, a nova senha e confirme a nova senha.</span>
                </div>
              </header>
              <form className="profile-form" onSubmit={submitPasswordChange}>
                <label>
                  Senha atual
                  <input value={passwordCurrent} onChange={(event) => setPasswordCurrent(event.target.value)} type="password" autoComplete="current-password" minLength={10} required />
                </label>
                <label>
                  Nova senha
                  <input value={passwordNew} onChange={(event) => setPasswordNew(event.target.value)} type="password" autoComplete="new-password" minLength={10} required />
                </label>
                <label>
                  Confirmar nova senha
                  <input value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} type="password" autoComplete="new-password" minLength={10} required />
                </label>
                <Button variant="primary" type="submit" disabled={securitySaving}>
                  {securitySaving ? "Salvando..." : "Concluido"}
                </Button>
              </form>
            </section>

            <PasswordResetBox api={api} defaultIdentifier={user.email} compact />

            <section className="security-card">
              <header>
                <ShieldCheck size={18} />
                <div>
                  <strong>Autenticador de dois fatores</strong>
                  <span>{user.twoFactorEnabled ? "Ativo nesta conta." : "Opcional, mas deixa a conta mais segura."}</span>
                </div>
              </header>
              {user.twoFactorEnabled ? (
                <form className="profile-form" onSubmit={submitDisableTwoFactor}>
                  <label>
                    Senha atual
                    <input
                      value={disableTwoFactorPassword}
                      onChange={(event) => setDisableTwoFactorPassword(event.target.value)}
                      type="password"
                      autoComplete="current-password"
                      minLength={10}
                      required
                    />
                  </label>
                  <label>
                    Codigo do autenticador
                    <input
                      value={disableTwoFactorCode}
                      onChange={(event) => setDisableTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="one-time-code"
                      required
                    />
                  </label>
                  <Button variant="danger" type="submit" disabled={securitySaving}>
                    Desativar 2FA
                  </Button>
                </form>
              ) : (
                <div className="profile-form">
                  <label>
                    Senha atual
                    <input
                      value={twoFactorPassword}
                      onChange={(event) => setTwoFactorPassword(event.target.value)}
                      type="password"
                      autoComplete="current-password"
                      minLength={10}
                      required
                    />
                  </label>
                  <Button variant="secondary" type="button" onClick={startTwoFactorSetup} disabled={securitySaving || !twoFactorPassword}>
                    Gerar chave do autenticador
                  </Button>
                  {twoFactorSetup ? (
                    <div className="two-factor-setup-box">
                      <span>Chave secreta</span>
                      <code>{twoFactorSetup.secret}</code>
                      <small>Adicione essa chave no seu app autenticador e digite o codigo gerado.</small>
                      <label>
                        Codigo de 6 digitos
                        <input
                          value={twoFactorCode}
                          onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                          inputMode="numeric"
                          maxLength={6}
                          autoComplete="one-time-code"
                          required
                        />
                      </label>
                      <Button variant="primary" type="button" onClick={enableTwoFactor} disabled={securitySaving || twoFactorCode.length !== 6}>
                        Habilitar 2FA
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <section className="security-card danger-card">
              <header>
                <Trash2 size={18} />
                <div>
                  <strong>Excluir conta</strong>
                  <span>Apaga sua conta, sessoes e todos os servidores que voce possui.</span>
                </div>
              </header>
              <form className="profile-form" onSubmit={submitAccountDeletion}>
                <label>
                  Senha atual
                  <input
                    value={deleteAccountPassword}
                    onChange={(event) => setDeleteAccountPassword(event.target.value)}
                    type="password"
                    autoComplete="current-password"
                    minLength={10}
                    required
                  />
                </label>
                <label>
                  Digite seu nick para confirmar
                  <input
                    value={deleteAccountConfirmation}
                    onChange={(event) => setDeleteAccountConfirmation(event.target.value)}
                    placeholder={user.username}
                    autoComplete="off"
                    required
                  />
                </label>
                <Button
                  variant="danger"
                  type="submit"
                  disabled={securitySaving || deleteAccountConfirmation.trim().toLowerCase() !== user.username.toLowerCase()}
                >
                  <Trash2 size={18} />
                  {securitySaving ? "Excluindo..." : "Excluir conta"}
                </Button>
              </form>
            </section>

            {securityNotice ? <p className="form-success">{securityNotice}</p> : null}
            {error ? <p className="form-error">{error}</p> : null}
          </div>
        ) : profileTab === "steam" ? (
          <form className="profile-form" onSubmit={submitSteam}>
            <div className="steam-preview-card">
              <div>
                <Gamepad2 size={20} />
                <strong>{steamGame.trim() || "Nenhum jogo ativo"}</strong>
                <span>{steamLinked ? steamName.trim() || "Steam vinculada" : "Steam desconectada"}</span>
              </div>
              {steamGameImageUrl.trim() ? <SafePreviewImage src={steamGameImageUrl} alt="" /> : null}
            </div>
            <label className="checkbox-row">
              <input checked={steamLinked} onChange={(event) => setSteamLinked(event.target.checked)} type="checkbox" />
              Vincular Steam neste perfil
            </label>
            <label>
              Nome ou perfil Steam
              <input
                value={steamName}
                onChange={(event) => setSteamName(event.target.value)}
                placeholder="Seu nome na Steam"
                disabled={!steamLinked}
              />
            </label>
            <label>
              Jogo atual
              <input
                value={steamGame}
                onChange={(event) => setSteamGame(event.target.value)}
                placeholder="Wallpaper Engine"
                disabled={!steamLinked}
              />
            </label>
            <label>
              Imagem do jogo por URL
              <span className="input-with-icon">
                <ImageIcon size={17} />
                <input
                  value={steamGameImageUrl}
                  onChange={(event) => setSteamGameImageUrl(event.target.value)}
                  placeholder="https://..."
                  disabled={!steamLinked}
                />
              </span>
            </label>
            {steamNotice ? <p className="form-success">{steamNotice}</p> : null}
            <Button variant="primary" type="submit">
              <CheckCircle2 size={18} />
              Salvar Steam
            </Button>
          </form>
        ) : (
          <div className="profile-form">
            <form className="linked-account-connect" onSubmit={submitLinkedAccount}>
              <div className="linked-account-intro">
                <UserRoundCog size={20} />
                <div>
                  <strong>Contas conectadas</strong>
                  <span>Entre uma vez na outra conta para liberar troca rapida no seu perfil.</span>
                </div>
              </div>
              <label>
                Nick ou e-mail da conta
                <input
                  value={linkedAccountIdentifier}
                  onChange={(event) => setLinkedAccountIdentifier(event.target.value)}
                  autoComplete="username"
                  placeholder="nick ou email@exemplo.com"
                  required
                />
              </label>
              <label>
                Senha da conta
                <input
                  value={linkedAccountPassword}
                  onChange={(event) => setLinkedAccountPassword(event.target.value)}
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <Button variant="primary" type="submit" disabled={linkingAccount}>
                <UserPlus size={18} />
                {linkingAccount ? "Conectando..." : "Adicionar conta"}
              </Button>
            </form>

            <div className="linked-account-list">
              {visibleLinkedAccounts.map((account) => (
                <div className={account.id === user.id ? "linked-account-card active" : "linked-account-card"} key={account.id}>
                  <button type="button" onClick={() => switchLinkedAccount(account.id)} disabled={account.id === user.id}>
                    <AvatarBadge user={account} className="profile-account-avatar" />
                    <span>
                      <strong>{account.displayName}</strong>
                      <small>@{account.username}</small>
                    </span>
                    <b>{account.id === user.id ? "Atual" : "Usar"}</b>
                  </button>
                  <div className="profile-account-actions">
                    <button
                      className="icon-button"
                      type="button"
                      title="Opcoes da conta"
                      onClick={() => setAccountMenuId(accountMenuId === account.id ? null : account.id)}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {accountMenuId === account.id ? (
                      <div className="account-menu-popover">
                        <button type="button" onClick={() => showLinkedAccountId(account.id)}>
                          ID da conta
                        </button>
                        <button type="button" onClick={() => removeLinkedAccount(account.id)} disabled={account.id === user.id}>
                          Remover conta conectada
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            {linkedAccountNotice ? <p className="form-success">{linkedAccountNotice}</p> : null}
            {error ? <p className="form-error">{error}</p> : null}
          </div>
        )}
      </section>
    </div>
  );
}

function ServerSettingsDialog({
  server,
  currentUser,
  initialView = "profile",
  onClose,
  onUpdateServer,
  onAppendMessage,
  onCreateRole,
  onUpdateRole,
  onSetMemberRole,
  onCreateInvite,
  onSetInviteActive,
  onDeleteInvite,
  onBanMember,
  onUnbanMember,
  onTimeoutMember,
  onRemoveTimeout,
  onDeleteServer,
  onOpenInviteLink,
  onPublishUpdate
}: {
  server: ServerDefinition;
  currentUser: AuthUser;
  initialView?: ServerSettingsView;
  onClose: () => void;
  onUpdateServer: (input: Partial<ServerDefinition>, audit?: { action: AuditAction; target: string; details: string }) => void;
  onAppendMessage: (message: LocalMessage) => void;
  onCreateRole: (serverId: string) => string | null;
  onUpdateRole: (serverId: string, roleId: string, patch: Partial<ServerRole> | ((role: ServerRole) => Partial<ServerRole>)) => void;
  onSetMemberRole: (serverId: string, memberId: string, roleId: string, enabled: boolean) => void;
  onCreateInvite?: (options: { duration?: InviteDurationId; maxUses?: number | null }) => Promise<ServerInvite | null>;
  onSetInviteActive?: (inviteId: string, active: boolean) => Promise<boolean>;
  onDeleteInvite?: (inviteId: string) => Promise<boolean>;
  onBanMember?: (username: string, reason: string | null) => Promise<boolean>;
  onUnbanMember?: (userId: string) => Promise<boolean>;
  onTimeoutMember?: (username: string, durationMinutes: TimeoutServerMemberInput["durationMinutes"], reason: string | null) => Promise<boolean>;
  onRemoveTimeout?: (userId: string) => Promise<boolean>;
  onDeleteServer?: (input: DeleteServerInput) => Promise<boolean>;
  onOpenInviteLink?: (inviteLink: string) => void;
  onPublishUpdate?: (input: PublishDesktopUpdateInput) => Promise<PublishDesktopUpdateResponse>;
}) {
  const createOption = "__create__";
  const [view, setView] = useState<ServerSettingsView>(initialView);
  const [serverName, setServerName] = useState(server.name);
  const [description, setDescription] = useState(server.description);
  const [bannerColor, setBannerColor] = useState(server.bannerColor);
  const [serverIconDraft, setServerIconDraft] = useState(server.iconUrl ?? "");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(server.roles.find((role) => !role.isDefault)?.id ?? "everyone");
  const [roleTab, setRoleTab] = useState<RoleEditorTab>("display");
  const [roleNameDraft, setRoleNameDraft] = useState("");
  const [roleColorDraft, setRoleColorDraft] = useState(roleColors[0]);
  const [roleStyleDraft, setRoleStyleDraft] = useState<RoleStyle>("solid");
  const [roleIconDraft, setRoleIconDraft] = useState("");
  const [roleSeparateDraft, setRoleSeparateDraft] = useState(false);
  const [draggedRoleId, setDraggedRoleId] = useState<string | null>(null);
  const [communityStep, setCommunityStep] = useState<0 | 1 | 2 | 3>(0);
  const [emailRequired, setEmailRequired] = useState(server.emailVerificationRequired);
  const [mediaFilter, setMediaFilter] = useState(server.explicitMediaFilter);
  const [rulesSelection, setRulesSelection] = useState(server.rulesChannelName ?? createOption);
  const [updatesSelection, setUpdatesSelection] = useState(server.updatesChannelName ?? createOption);
  const [agreeCommunity, setAgreeCommunity] = useState(false);
  const [serverTagDraft, setServerTagDraft] = useState(server.serverTag ?? "");
  const [banUsernameDraft, setBanUsernameDraft] = useState("");
  const [banReasonDraft, setBanReasonDraft] = useState("");
  const [timeoutUsernameDraft, setTimeoutUsernameDraft] = useState("");
  const [timeoutReasonDraft, setTimeoutReasonDraft] = useState("");
  const [timeoutDurationDraft, setTimeoutDurationDraft] = useState<TimeoutDurationId>("2h");
  const [blockedWordsDraft, setBlockedWordsDraft] = useState(server.automod.blockedWords.join(", "));
  const [channelBannerDraft, setChannelBannerDraft] = useState(server.boostPerks.channelBannerUrl ?? "");
  const [animatedBannerDraft, setAnimatedBannerDraft] = useState(server.boostPerks.animatedBannerUrl ?? "");
  const [inviteBackgroundDraft, setInviteBackgroundDraft] = useState(server.boostPerks.inviteBackgroundUrl ?? "");
  const [customInviteDraft, setCustomInviteDraft] = useState(server.boostPerks.customInviteSlug ?? "");
  const [serverAccentDraft, setServerAccentDraft] = useState(server.boostPerks.serverAccentColor ?? "#39c6a3");
  const [welcomeCardDraft, setWelcomeCardDraft] = useState(server.boostPerks.welcomeCardUrl ?? "");
  const [serverBadgeDraft, setServerBadgeDraft] = useState(server.boostPerks.serverBadgeText ?? "");
  const [starProgressPaletteDraft, setStarProgressPaletteDraft] = useState(server.boostPerks.starProgressPalette ?? "default");
  const [legendaryThemeDraft, setLegendaryThemeDraft] = useState(server.boostPerks.legendaryThemeEnabled);
  const [serverGuideBannerDraft, setServerGuideBannerDraft] = useState(server.boostPerks.serverGuideBannerUrl ?? "");
  const [serverGuideChannelDraft, setServerGuideChannelDraft] = useState<string[]>(server.boostPerks.serverGuideChannelNames ?? []);
  const [inviteDurationDraft, setInviteDurationDraft] = useState<InviteDurationId>("never");
  const [inviteMaxUsesDraft, setInviteMaxUsesDraft] = useState(25);
  const [botTokenDraft, setBotTokenDraft] = useState("");
  const [botNameDraft, setBotNameDraft] = useState("");
  const [botPrefixDraft, setBotPrefixDraft] = useState("!");
  const [botCommandDraft, setBotCommandDraft] = useState("ping");
  const [botReplyDraft, setBotReplyDraft] = useState("Pong! Bot funcionando dentro do Tempest Light.");
  const [botModuleDraft, setBotModuleDraft] = useState<BotCommandModule[]>(defaultBotCommandModules);
  const [botChannelDraft, setBotChannelDraft] = useState<string[]>([]);
  const [botCaptchaChecked, setBotCaptchaChecked] = useState(false);
  const [botConnecting, setBotConnecting] = useState(false);
  const [soundUploadOpen, setSoundUploadOpen] = useState(false);
  const [soundNameDraft, setSoundNameDraft] = useState("");
  const [soundEmojiDraft, setSoundEmojiDraft] = useState(defaultSoundEmoji);
  const [soundVolumeDraft, setSoundVolumeDraft] = useState(80);
  const [soundFileNameDraft, setSoundFileNameDraft] = useState("");
  const [soundAudioDraft, setSoundAudioDraft] = useState("");
  const [emojiNameDraft, setEmojiNameDraft] = useState("");
  const [emojiFileNameDraft, setEmojiFileNameDraft] = useState("");
  const [emojiImageDraft, setEmojiImageDraft] = useState("");
  const [emojiAnimatedDraft, setEmojiAnimatedDraft] = useState(false);
  const [serverRuleDraft, setServerRuleDraft] = useState("");
  const [updateVersionDraft, setUpdateVersionDraft] = useState("");
  const [updateNotesDraft, setUpdateNotesDraft] = useState("Atualizacao automatica do Tempest Light.");
  const [publishingUpdate, setPublishingUpdate] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [deleteServerConfirmOpen, setDeleteServerConfirmOpen] = useState(false);
  const [deleteServerConfirmStep, setDeleteServerConfirmStep] = useState<1 | 2>(1);
  const [deleteServerPassword, setDeleteServerPassword] = useState("");
  const [deleteServerSaving, setDeleteServerSaving] = useState(false);

  const selectedRole = server.roles.find((role) => role.id === selectedRoleId) ?? server.roles[0];
  const textChannels = getTextChannels(server);
  const availableGuideChannels = getServerGuideAvailableChannels(server);
  const activeBoosts = getActiveBoosts(server.boosts);
  const boostLevel = getBoostLevel(activeBoosts.length);
  const nextBoostTarget = getNextBoostTarget(activeBoosts.length);
  const developerUser = isDeveloperUser(currentUser);
  const currentMember = server.members.find((member) => member.id === currentUser.id) ?? null;
  const canAdministerServerSettings =
    server.ownerId === currentUser.id || developerUser || memberHasPermission(server, currentMember, "administrator", currentUser.id);
  const canManageServerSettings = memberHasPermission(server, currentMember, "manage_server", currentUser.id);
  const canViewServerSettings = canAdministerServerSettings || initialView === "boosts";
  const canConfigureBoostPerks = canManageServerSettings || developerUser;
  const canManageInvites = memberHasPermission(server, currentMember, "create_invite", currentUser.id);
  const canBanMembers = developerUser || memberHasPermission(server, currentMember, "ban_members", currentUser.id);
  const canModerateMembers = developerUser || memberHasPermission(server, currentMember, "moderate_members", currentUser.id);
  const canDeleteServer = server.ownerId === currentUser.id;
  const canReorderRoles = server.ownerId === currentUser.id;
  const soundEffects = server.expressions.soundEffects ?? [];
  const soundSlotsAvailable = Math.max(0, soundboardMaxSounds - soundEffects.length);
  const filteredMembers = server.members.filter((member) =>
    [member.displayName, member.username].some((value) => value.toLowerCase().includes(memberQuery.trim().toLowerCase()))
  );

  function renderSettingsNotice() {
    if (!settingsNotice) {
      return null;
    }

    return (
      <p className="settings-notice">
        {renderInviteLinksInText(settingsNotice, (inviteLink, key) =>
          onOpenInviteLink ? (
            <button className="notice-invite-link" key={key} type="button" onClick={() => onOpenInviteLink(inviteLink)}>
              {inviteLink}
            </button>
          ) : (
            <a className="notice-invite-link" href={inviteLink} key={key}>
              {inviteLink}
            </a>
          )
        )}
      </p>
    );
  }

  useEffect(() => {
    if (!selectedRole) {
      setSelectedRoleId(server.roles[0]?.id ?? "everyone");
      return;
    }

    setRoleNameDraft(selectedRole.name);
    setRoleColorDraft(selectedRole.color);
    setRoleStyleDraft(normalizeRoleStyle(selectedRole.style));
    setRoleIconDraft(selectedRole.iconUrl ?? "");
    setRoleSeparateDraft(Boolean(selectedRole.separateMembers));
  }, [selectedRole, server.roles]);

  useEffect(() => {
    setSettingsNotice(null);
  }, [view]);

  useEffect(() => {
    setView(initialView);
  }, [initialView, server.id]);

  if (!canViewServerSettings) {
    return (
      <div className="modal-backdrop settings-backdrop" role="presentation">
        <section className="modal-panel compact" aria-label="Sem acesso as configuracoes do servidor">
          <header className="modal-header">
            <div>
              <h2>Sem acesso</h2>
              <p>Somente o dono ou administradores podem abrir estas configuracoes.</p>
            </div>
            <button className="icon-button" title="Fechar" type="button" onClick={onClose}>
              <X size={17} />
            </button>
          </header>
          <Button variant="primary" type="button" onClick={onClose}>
            Entendi
          </Button>
        </section>
      </div>
    );
  }

  function saveServerProfile() {
    const nextName = serverName.trim() || server.name;
    onUpdateServer(
      {
        name: nextName,
        initials: getInitials(nextName) || server.initials,
        description: description.trim() || "Servidor novo em folha no Tempest Light.",
        bannerColor
      },
      { action: "server_updated", target: nextName, details: "Perfil do servidor atualizado." }
    );
  }

  function saveServerTag() {
    const nextTag = normalizeServerTag(serverTagDraft);
    setServerTagDraft(nextTag);
    onUpdateServer(
      { serverTag: nextTag || null },
      { action: "tag_updated", target: server.name, details: nextTag ? `Tag do servidor definida como ${nextTag}.` : "Tag do servidor removida." }
    );
    setSettingsNotice("Tag salva.");
  }

  function updateEngagement(patch: Partial<ServerEngagementSettings>) {
    onUpdateServer(
      { engagement: { ...server.engagement, ...patch } },
      { action: "engagement_updated", target: server.name, details: "Configuracao de engajamento atualizada." }
    );
  }

  function updateExpressions(patch: Partial<ServerExpressionSettings>, details = "Configuracao de expressoes atualizada.") {
    onUpdateServer(
      { expressions: { ...server.expressions, ...patch } },
      { action: "expressions_updated", target: server.name, details }
    );
  }

  async function loadCustomEmoji(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const imageUrl = await readCustomEmojiFile(file);
      setEmojiImageDraft(imageUrl);
      setEmojiFileNameDraft(file.name || "emoji");
      setEmojiAnimatedDraft(file.type === "image/gif" || /\.gif$/i.test(file.name));
      if (!emojiNameDraft.trim()) {
        setEmojiNameDraft(normalizeEmojiName(file.name) || "emoji");
      }
      setSettingsNotice(null);
    } catch (caught) {
      setSettingsNotice(caught instanceof Error ? caught.message : "Nao foi possivel carregar esse emoji.");
    }
  }

  function saveCustomEmoji() {
    if (!canManageServerSettings) {
      setSettingsNotice("Seu cargo nao permite enviar emojis.");
      return;
    }

    const name = normalizeEmojiName(emojiNameDraft);
    if (name.length < 2) {
      setSettingsNotice("Digite um nome de emoji com pelo menos 2 caracteres.");
      return;
    }

    if (!emojiImageDraft) {
      setSettingsNotice("Escolha um arquivo de emoji antes de salvar.");
      return;
    }

    const emoji = normalizeServerEmoji({
      id: `emoji-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      imageUrl: emojiImageDraft,
      animated: emojiAnimatedDraft,
      uploadedBy: currentUser.displayName,
      uploadedAt: new Date().toISOString()
    });
    if (!emoji) {
      setSettingsNotice("Emoji invalido.");
      return;
    }

    const existing = server.expressions.customEmojis ?? [];
    if (existing.some((item) => item.name.toLowerCase() === emoji.name.toLowerCase())) {
      setSettingsNotice("Ja existe um emoji com esse nome.");
      return;
    }

    updateExpressions(
      { customEmojis: [emoji, ...existing].slice(0, 100), emojiEnabled: true },
      emoji.animated ? "Emoji animado enviado." : "Emoji estatico enviado."
    );
    setEmojiNameDraft("");
    setEmojiFileNameDraft("");
    setEmojiImageDraft("");
    setEmojiAnimatedDraft(false);
    setSettingsNotice("Emoji salvo.");
  }

  function removeCustomEmoji(emojiId: string) {
    updateExpressions(
      { customEmojis: (server.expressions.customEmojis ?? []).filter((emoji) => emoji.id !== emojiId) },
      "Emoji removido."
    );
    setSettingsNotice("Emoji removido.");
  }

  function updateAccess(patch: Partial<ServerAccessSettings>, details = "Configuracao de acesso atualizada.") {
    const nextAccess = {
      ...server.access,
      ...patch,
      minAccountAgeDays:
        typeof patch.minAccountAgeDays === "number"
          ? Math.min(Math.max(Math.floor(patch.minAccountAgeDays), 0), 90)
          : server.access.minAccountAgeDays
    };
    onUpdateServer(
      {
        access: nextAccess,
        ...(typeof patch.requireVerifiedEmail === "boolean" ? { emailVerificationRequired: patch.requireVerifiedEmail } : {})
      },
      { action: "access_updated", target: server.name, details }
    );
  }

  function updateApps(patch: Partial<ServerAppsSettings>, details = "Configuracao de apps atualizada.") {
    onUpdateServer(
      { apps: { ...server.apps, ...patch } },
      { action: "apps_updated", target: server.name, details }
    );
  }

  function updateAnalytics(patch: Partial<ServerAnalyticsSettings>, details = "Configuracao de analises atualizada.") {
    onUpdateServer(
      { analytics: { ...server.analytics, ...patch } },
      { action: "analytics_updated", target: server.name, details }
    );
  }

  function saveServerIcon() {
    if (boostLevel < SERVER_ICON_UNLOCK_LEVEL) {
      setSettingsNotice(`Foto do servidor desbloqueia no nivel ${SERVER_ICON_UNLOCK_LEVEL} de estrelas.`);
      return;
    }

    onUpdateServer(
      { iconUrl: serverIconDraft.trim() || null },
      { action: "boost_perk_updated", target: server.name, details: "Foto do servidor configurada por estrelas." }
    );
    setSettingsNotice("Foto do servidor salva.");
  }

  function updateSecurity(patch: Partial<ServerSecuritySettings>, extra?: Partial<ServerDefinition>) {
    onUpdateServer(
      { security: { ...server.security, ...patch }, ...extra },
      { action: "security_updated", target: server.name, details: "Configuracao de seguranca atualizada." }
    );
  }

  function closeDeleteServerConfirm() {
    setDeleteServerConfirmOpen(false);
    setDeleteServerConfirmStep(1);
    setDeleteServerPassword("");
  }

  async function confirmDeleteServer() {
    if (!canDeleteServer) {
      setSettingsNotice("Somente o dono pode excluir este servidor.");
      return;
    }

    if (!onDeleteServer) {
      setSettingsNotice("Nao foi possivel excluir este servidor agora.");
      return;
    }

    if (deleteServerPassword.length < 10) {
      setSettingsNotice("Digite a senha atual da sua conta para confirmar a exclusao.");
      return;
    }

    setDeleteServerSaving(true);
    setSettingsNotice(null);
    try {
      const deleted = await onDeleteServer({ currentPassword: deleteServerPassword });
      if (!deleted) {
        setDeleteServerSaving(false);
        setSettingsNotice("Nao foi possivel excluir este servidor agora.");
      }
    } catch (caught) {
      setDeleteServerSaving(false);
      setSettingsNotice(caught instanceof Error ? caught.message : "Nao foi possivel excluir este servidor agora.");
    }
  }

  function updateAutomod(patch: Partial<ServerAutomodSettings>) {
    onUpdateServer(
      { automod: { ...server.automod, ...patch } },
      { action: "automod_updated", target: server.name, details: "Regra de AutoMod atualizada." }
    );
  }

  async function createInviteFromSettings() {
    if (!canManageInvites) {
      setSettingsNotice("Seu cargo nao permite gerenciar convites.");
      return;
    }

    if (onCreateInvite) {
      try {
        const invite = await onCreateInvite({
          duration: inviteDurationDraft,
          maxUses: inviteMaxUsesDraft
        });
        if (!invite) {
          setSettingsNotice("Nao foi possivel criar o convite online.");
          return;
        }

        const inviteLink = getServerInviteLink({ ...server, invites: [invite, ...server.invites] }, invite.code);
        try {
          await navigator.clipboard.writeText(inviteLink);
          setSettingsNotice(`Convite criado e copiado: ${inviteLink}`);
        } catch {
          setSettingsNotice(`Convite criado: ${inviteLink}`);
        }
      } catch {
        setSettingsNotice("Nao foi possivel criar o convite pela API online.");
      }
      return;
    }

    setSettingsNotice("A API online precisa estar conectada para criar convites.");
  }

  async function copyInvite(code: string) {
    const inviteLink = getServerInviteLink(server, code);
    try {
      await navigator.clipboard.writeText(inviteLink);
      setSettingsNotice("Convite copiado.");
    } catch {
      setSettingsNotice(inviteLink);
    }
  }

  async function setInviteActive(inviteId: string, active: boolean) {
    if (!canManageInvites) {
      setSettingsNotice("Seu cargo nao permite gerenciar convites.");
      return;
    }

    if (onSetInviteActive) {
      try {
        const ok = await onSetInviteActive(inviteId, active);
        setSettingsNotice(ok ? (active ? "Convite reativado." : "Convite desativado.") : "Nao foi possivel atualizar o convite online.");
      } catch {
        setSettingsNotice("Nao foi possivel atualizar o convite pela API online.");
      }
      return;
    }

    const invite = server.invites.find((item) => item.id === inviteId);
    onUpdateServer(
      { invites: server.invites.map((item) => (item.id === inviteId ? { ...item, active } : item)) },
      {
        action: active ? "invite_created" : "invite_disabled",
        target: invite?.code ?? "convite",
        details: active ? "Convite reativado." : "Convite desativado."
      }
    );
  }

  async function deleteInvite(inviteId: string) {
    if (!canManageInvites) {
      setSettingsNotice("Seu cargo nao permite gerenciar convites.");
      return;
    }

    if (onDeleteInvite) {
      try {
        const ok = await onDeleteInvite(inviteId);
        setSettingsNotice(ok ? "Convite excluido." : "Nao foi possivel excluir o convite online.");
      } catch {
        setSettingsNotice("Nao foi possivel excluir o convite pela API online.");
      }
      return;
    }

    const invite = server.invites.find((item) => item.id === inviteId);
    onUpdateServer(
      { invites: server.invites.filter((item) => item.id !== inviteId) },
      {
        action: "invite_disabled",
        target: invite?.code ?? "convite",
        details: "Convite excluido das configuracoes do servidor."
      }
    );
    setSettingsNotice("Convite excluido.");
  }

  function findModerationTarget(usernameInput: string) {
    const username = usernameInput.trim().replace(/^@+/, "").toLowerCase();
    if (!username) {
      return null;
    }

    return (
      server.members.find((item) =>
        [item.username, item.displayName, item.id].some((value) => value.toLowerCase() === username)
      ) ?? null
    );
  }

  async function banUserByDraft() {
    if (!canBanMembers) {
      setSettingsNotice("Seu cargo nao permite banir membros.");
      return;
    }

    const username = banUsernameDraft.trim().replace(/^@/, "");
    if (!username) {
      setSettingsNotice("Digite o nick para banir.");
      return;
    }

    const member = findModerationTarget(username);
    if (!member || member.isBot) {
      setSettingsNotice("Esse usuario nao esta neste servidor.");
      return;
    }

    if (member.id === currentUser.id) {
      setSettingsNotice("Voce nao pode banir a propria conta.");
      return;
    }

    if (member.id === server.ownerId) {
      setSettingsNotice("Nao e possivel banir o dono do servidor.");
      return;
    }

    const reason = banReasonDraft.trim() || "Sem motivo informado.";
    if (onBanMember) {
      try {
        const ok = await onBanMember(member.username, reason);
        if (!ok) {
          setSettingsNotice("Nao foi possivel banir pela API online.");
          return;
        }

        setBanUsernameDraft("");
        setBanReasonDraft("");
        setSettingsNotice(`${member.displayName} foi banido.`);
      } catch (caught) {
        setSettingsNotice(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel banir esse membro.");
      }
      return;
    }

    const bannedUser: ServerBan = {
      id: `ban-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: member.id,
      username: member.username,
      displayName: member.displayName,
      reason,
      bannedBy: currentUser.displayName,
      bannedAt: new Date().toISOString()
    };

    onUpdateServer(
      {
        bans: [bannedUser, ...server.bans.filter((ban) => ban.userId !== member.id)],
        members: server.members.filter((item) => item.id !== member.id)
      },
      { action: "member_banned", target: bannedUser.displayName, details: bannedUser.reason }
    );
    setBanUsernameDraft("");
    setBanReasonDraft("");
    setSettingsNotice(`${bannedUser.displayName} foi banido.`);
  }

  async function unbanUser(banId: string) {
    if (!canBanMembers) {
      setSettingsNotice("Seu cargo nao permite remover banimentos.");
      return;
    }

    const ban = server.bans.find((item) => item.id === banId);
    if (!ban) {
      setSettingsNotice("Banimento nao encontrado.");
      return;
    }

    if (onUnbanMember) {
      try {
        const ok = await onUnbanMember(ban.userId);
        setSettingsNotice(ok ? "Usuario desbanido." : "Nao foi possivel remover o banimento online.");
      } catch (caught) {
        setSettingsNotice(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel remover esse banimento.");
      }
      return;
    }

    onUpdateServer(
      { bans: server.bans.filter((item) => item.id !== banId) },
      { action: "member_unbanned", target: ban?.displayName ?? "usuario", details: "Banimento removido." }
    );
    setSettingsNotice("Usuario desbanido.");
  }

  async function timeoutUserByDraft() {
    if (!canModerateMembers) {
      setSettingsNotice("Seu cargo nao permite colocar membros de castigo.");
      return;
    }

    const username = timeoutUsernameDraft.trim().replace(/^@+/, "");
    if (!username) {
      setSettingsNotice("Digite o nick para colocar de castigo.");
      return;
    }

    const member = findModerationTarget(username);
    if (!member || member.isBot) {
      setSettingsNotice("Esse usuario nao esta neste servidor.");
      return;
    }

    if (member.id === currentUser.id) {
      setSettingsNotice("Voce nao pode colocar a propria conta de castigo.");
      return;
    }

    if (member.id === server.ownerId) {
      setSettingsNotice("Nao e possivel colocar o dono do servidor de castigo.");
      return;
    }

    const durationMinutes = getTimeoutDurationMinutes(timeoutDurationDraft) as TimeoutServerMemberInput["durationMinutes"];
    const timeoutUntil = new Date(Date.now() + durationMinutes * 60_000).toISOString();
    const reason = timeoutReasonDraft.trim() || "Sem motivo informado.";

    if (onTimeoutMember) {
      try {
        const ok = await onTimeoutMember(member.username, durationMinutes, reason);
        if (!ok) {
          setSettingsNotice("Nao foi possivel aplicar o castigo pela API online.");
          return;
        }

        setTimeoutUsernameDraft("");
        setTimeoutReasonDraft("");
        setSettingsNotice(`${member.displayName} ficou de castigo ate ${formatTimeoutUntil(timeoutUntil)}.`);
      } catch (caught) {
        setSettingsNotice(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel aplicar esse castigo.");
      }
      return;
    }

    const timeout: ServerTimeout = {
      id: `timeout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: member.id,
      username: member.username,
      displayName: member.displayName,
      reason,
      timeoutBy: currentUser.displayName,
      timeoutUntil,
      createdAt: new Date().toISOString()
    };

    onUpdateServer(
      {
        timeouts: [timeout, ...server.timeouts.filter((item) => item.userId !== member.id)],
        members: server.members.map((item) => (item.id === member.id ? { ...item, timeoutUntil } : item))
      },
      { action: "member_timed_out", target: member.displayName, details: `${reason} Ate ${formatTimeoutUntil(timeoutUntil)}.` }
    );
    setTimeoutUsernameDraft("");
    setTimeoutReasonDraft("");
    setSettingsNotice(`${member.displayName} ficou de castigo ate ${formatTimeoutUntil(timeoutUntil)}.`);
  }

  async function removeTimeout(userId: string) {
    if (!canModerateMembers) {
      setSettingsNotice("Seu cargo nao permite remover castigos.");
      return;
    }

    const timeout = server.timeouts.find((item) => item.userId === userId);
    if (onRemoveTimeout) {
      try {
        const ok = await onRemoveTimeout(userId);
        setSettingsNotice(ok ? "Castigo removido." : "Nao foi possivel remover o castigo online.");
      } catch (caught) {
        setSettingsNotice(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel remover esse castigo.");
      }
      return;
    }

    onUpdateServer(
      {
        timeouts: server.timeouts.filter((item) => item.userId !== userId),
        members: server.members.map((item) => (item.id === userId ? { ...item, timeoutUntil: null } : item))
      },
      { action: "member_timeout_removed", target: timeout?.displayName ?? "usuario", details: "Castigo removido." }
    );
    setSettingsNotice("Castigo removido.");
  }

  function saveBlockedWords() {
    const blockedWords = blockedWordsDraft
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean)
      .slice(0, 40);
    setBlockedWordsDraft(blockedWords.join(", "));
    updateAutomod({ blockedWords });
    setSettingsNotice("Lista de palavras bloqueadas salva.");
  }

  function addDeveloperBoost() {
    if (!developerUser) {
      return;
    }

    const boost = createDeveloperBoost(currentUser);
    const boostMessageChannel = server.boostMessageEnabled ? server.boostMessageChannelName ?? textChannels[0]?.name ?? null : null;
    onUpdateServer(
      {
        boosts: [boost, ...activeBoosts],
        boostProgressVisible: true,
        boostMessageChannelName: boostMessageChannel ?? server.boostMessageChannelName
      },
      { action: "boost_added", target: server.name, details: "Estrela de developer adicionada por 30 dias." }
    );

    if (boostMessageChannel) {
      onAppendMessage({
        author: "Tempest Light",
        time: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        }),
        text: `${currentUser.displayName} adicionou uma estrela em ${server.name}. O servidor agora tem ${activeBoosts.length + 1} estrelas ativas.`,
        serverId: server.id,
        channelName: boostMessageChannel,
        system: true
      });
    }

    setSettingsNotice("Estrela de developer adicionada por 30 dias.");
  }

  async function publishProgramUpdate() {
    if (!developerUser || publishingUpdate) {
      return;
    }

    if (!onPublishUpdate) {
      setSettingsNotice("A API online precisa estar conectada para enviar atualizacoes.");
      return;
    }

    const version = updateVersionDraft.trim();
    if (version && !/^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
      setSettingsNotice("Use uma versao valida, por exemplo 0.1.32.");
      return;
    }

    setPublishingUpdate(true);
    setSettingsNotice("Enviando atualizacao para o GitHub Actions...");

    try {
      const result = await onPublishUpdate({
        version: version || undefined,
        releaseNotes: updateNotesDraft.trim() || undefined
      });
      const versionText = result.version ? ` v${result.version}` : "";
      setSettingsNotice(`${result.message} Release${versionText}.`);

      if (window.tempestLightDesktop?.openExternal) {
        void window.tempestLightDesktop.openExternal(result.actionsUrl);
      }
    } catch (caught) {
      setSettingsNotice(caught instanceof ApiError || caught instanceof Error ? caught.message : "Nao foi possivel enviar a atualizacao.");
    } finally {
      setPublishingUpdate(false);
    }
  }

  async function loadBoostImage(
    event: ChangeEvent<HTMLInputElement>,
    applyImage: (imageDataUrl: string) => void,
    resize?: { width: number; height: number }
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSettingsNotice("Escolha um arquivo de imagem.");
      return;
    }

    try {
      const imageDataUrl = await readImageFileAsDataUrl(file, resize);
      applyImage(imageDataUrl);
      setSettingsNotice("Imagem carregada. Clique em Salvar para aplicar no servidor.");
    } catch {
      setSettingsNotice("Nao foi possivel carregar essa imagem.");
    }
  }

  function resetSoundUploadDraft() {
    setSoundNameDraft("");
    setSoundEmojiDraft(defaultSoundEmoji);
    setSoundVolumeDraft(80);
    setSoundFileNameDraft("");
    setSoundAudioDraft("");
  }

  function closeSoundUploadDialog() {
    setSoundUploadOpen(false);
    resetSoundUploadDraft();
  }

  async function loadSoundAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!file.type.startsWith("audio/")) {
      setSettingsNotice("Escolha um arquivo de audio.");
      return;
    }

    if (file.size > soundboardAudioMaxBytes) {
      setSettingsNotice("Esse audio e grande demais. Use um arquivo de ate 50 MB.");
      return;
    }

    try {
      const audioUrl = await readFileAsDataUrl(file);
      const nameFromFile = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 40);
      setSoundAudioDraft(audioUrl);
      setSoundFileNameDraft(file.name);
      if (!soundNameDraft.trim()) {
        setSoundNameDraft(nameFromFile || "Som");
      }
      setSettingsNotice("Audio carregado. Complete os dados e envie o som.");
    } catch {
      setSettingsNotice("Nao foi possivel carregar esse audio.");
    }
  }

  function saveSoundEffect() {
    if (soundEffects.length >= soundboardMaxSounds) {
      setSettingsNotice("O painel ja esta com todos os espacos ocupados.");
      return;
    }

    const soundName = soundNameDraft.trim().slice(0, 40);
    if (!soundAudioDraft || !soundName) {
      setSettingsNotice("Escolha um arquivo de audio e informe o nome do som.");
      return;
    }

    const effect: ServerSoundEffect = {
      id: `sound-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: soundName,
      emoji: soundEmojiDraft.trim().slice(0, 8) || defaultSoundEmoji,
      fileName: soundFileNameDraft || `${soundName}.audio`,
      audioUrl: soundAudioDraft,
      volume: clampSoundVolume(soundVolumeDraft),
      uploadedBy: currentUser.displayName,
      uploadedByAvatarUrl: currentUser.avatarUrl,
      uploadedAt: new Date().toISOString()
    };

    updateExpressions(
      { soundEffects: [effect, ...soundEffects].slice(0, soundboardMaxSounds) },
      `Som ${soundName} enviado para o painel.`
    );
    setSettingsNotice(`Som "${soundName}" enviado.`);
    closeSoundUploadDialog();
  }

  function removeSoundEffect(effectId: string) {
    const effect = soundEffects.find((item) => item.id === effectId);
    updateExpressions(
      { soundEffects: soundEffects.filter((item) => item.id !== effectId) },
      effect ? `Som ${effect.name} removido do painel.` : "Som removido do painel."
    );
    setSettingsNotice("Som removido.");
  }

  function playSoundEffect(effect: ServerSoundEffect) {
    const audio = new Audio(effect.audioUrl);
    audio.volume = clampSoundVolume(effect.volume) / 100;
    void audio.play().catch(() => {
      setSettingsNotice("Nao foi possivel tocar esse som neste dispositivo.");
    });
  }

  function updateAccessMode(entryMode: ServerAccessMode) {
    onUpdateServer(
      {
        isDiscoverable: entryMode === "discoverable",
        access: {
          ...server.access,
          entryMode,
          approvalRequired: entryMode === "request",
          hideInviteLinksFromMembers: entryMode === "invite" ? server.access.hideInviteLinksFromMembers : false
        }
      },
      {
        action: "access_updated",
        target: server.name,
        details:
          entryMode === "discoverable"
            ? "Entrada do servidor definida como descobrivel."
            : entryMode === "request"
            ? "Entrada do servidor definida mediante solicitacao."
            : "Entrada do servidor definida apenas por convite."
      }
    );
  }

  function addServerRule(ruleText = serverRuleDraft) {
    const rule = ruleText.trim().slice(0, 120);
    if (!rule) {
      setSettingsNotice("Escreva a regra antes de adicionar.");
      return;
    }

    const existingRules = server.access.rules ?? [];
    if (existingRules.some((item) => item.toLowerCase() === rule.toLowerCase())) {
      setSettingsNotice("Essa regra ja esta na lista.");
      return;
    }

    updateAccess(
      { rulesEnabled: true, rules: [...existingRules, rule].slice(0, 12) },
      "Regra de entrada adicionada."
    );
    setServerRuleDraft("");
    setSettingsNotice("Regra adicionada.");
  }

  function removeServerRule(rule: string) {
    updateAccess(
      { rules: (server.access.rules ?? []).filter((item) => item !== rule) },
      "Regra de entrada removida."
    );
    setSettingsNotice("Regra removida.");
  }

  function updateBoostMessageEnabled(enabled: boolean) {
    const fallbackChannel = server.boostMessageChannelName ?? textChannels[0]?.name ?? null;
    onUpdateServer(
      {
        boostMessageEnabled: enabled,
        boostMessageChannelName: enabled ? fallbackChannel : server.boostMessageChannelName
      },
      {
        action: "server_updated",
        target: server.name,
        details: enabled ? "Mensagem de estrela ativada." : "Mensagem de estrela desativada."
      }
    );
  }

  function updateBoostMessageChannel(channelName: string) {
    onUpdateServer(
      { boostMessageChannelName: channelName || null },
      { action: "server_updated", target: server.name, details: "Canal da mensagem de estrela atualizado." }
    );
  }

  function toggleBotModuleDraft(module: BotCommandModule, enabled: boolean) {
    setBotModuleDraft((current) => {
      if (enabled) {
        return current.includes(module) ? current : [...current, module];
      }

      return current.filter((item) => item !== module);
    });
  }

  function toggleBotChannelDraft(channelName: string, enabled: boolean) {
    setBotChannelDraft((current) => {
      const baseChannels = current.length ? current : textChannels.map((channel) => channel.name);
      if (enabled) {
        return baseChannels.includes(channelName) ? baseChannels : [...baseChannels, channelName];
      }

      return baseChannels.filter((item) => item !== channelName);
    });
  }

  function toggleSavedBotModule(bot: ServerBotIntegration, module: BotCommandModule, enabled: boolean) {
    const nextModules = enabled
      ? Array.from(new Set([...bot.commandModules, module]))
      : bot.commandModules.filter((item) => item !== module);
    updateBot(bot.id, { commandModules: nextModules.length ? nextModules : ["utility"] });
  }

  function toggleSavedBotChannel(bot: ServerBotIntegration, channelName: string, enabled: boolean) {
    const baseChannels = bot.commandChannelNames.length ? bot.commandChannelNames : textChannels.map((channel) => channel.name);
    const nextChannels = enabled
      ? Array.from(new Set([...baseChannels, channelName]))
      : baseChannels.filter((item) => item !== channelName);
    updateBot(bot.id, { commandChannelNames: nextChannels });
  }

  async function addBotFromToken() {
    const token = botTokenDraft.trim();
    if (!canManageServerSettings) {
      setSettingsNotice("Seu cargo nao permite adicionar bots.");
      return;
    }

    if (token.length < 20) {
      setSettingsNotice("Cole um token de bot valido para continuar.");
      return;
    }

    if (!botCaptchaChecked) {
      setSettingsNotice("Confirme o captcha antes de adicionar o bot.");
      return;
    }

    let discordBotInfo: TempestLightDiscordBotInfoResult | null = null;
    if (window.tempestLightDesktop?.getDiscordBotInfo) {
      setBotConnecting(true);
      try {
        const result = await window.tempestLightDesktop.getDiscordBotInfo(token);
        if (!result.ok) {
          setSettingsNotice(result.message ?? "Nao foi possivel validar esse token no Discord Developer Portal.");
          return;
        }
        discordBotInfo = result;
      } finally {
        setBotConnecting(false);
      }
    }

    const { bot, member } = createServerBotFromToken(token, currentUser, {
      discordApplicationId: discordBotInfo?.id ?? null,
      username: discordBotInfo?.username,
      displayName: botNameDraft || discordBotInfo?.displayName,
      avatarUrl: discordBotInfo?.avatarUrl ?? null,
      bannerUrl: discordBotInfo?.bannerUrl ?? null,
      description: discordBotInfo?.description ?? null,
      bridgeStatus: "pending",
      prefix: botPrefixDraft,
      commandName: botCommandDraft,
      replyText: botReplyDraft,
      commandChannelNames: botChannelDraft,
      commandModules: botModuleDraft
    });
    if (server.bots.some((savedBot) => savedBot.tokenPreview === bot.tokenPreview || (bot.discordApplicationId && savedBot.discordApplicationId === bot.discordApplicationId))) {
      setSettingsNotice("Esse bot ja foi adicionado neste servidor.");
      return;
    }

    onUpdateServer(
      {
        bots: [bot, ...server.bots],
        members: [member, ...server.members]
      },
      { action: "bot_added", target: bot.displayName, details: "Bot adicionado por token mascarado." }
    );
    setBotTokenDraft("");
    setBotNameDraft("");
    setBotPrefixDraft("!");
    setBotCommandDraft("ping");
    setBotReplyDraft("Pong! Bot funcionando dentro do Tempest Light.");
    setBotModuleDraft(defaultBotCommandModules);
    setBotChannelDraft([]);
    setBotCaptchaChecked(false);
    setSettingsNotice(
      discordBotInfo
        ? `${bot.displayName} foi validado, mas fica pendente ate a ponte confirmar presenca online.`
        : `${bot.displayName} foi salvo como ponte pendente. Abra pelo app instalado para validar no Developer Portal.`
    );
  }

  function updateBot(botId: string, patch: Partial<ServerBotIntegration>) {
    const currentBot = server.bots.find((bot) => bot.id === botId);
    if (!currentBot) {
      return;
    }

    const nextBot = normalizeServerBot({ ...currentBot, ...patch });
    const unchanged =
      currentBot.displayName === nextBot.displayName &&
      currentBot.avatarUrl === nextBot.avatarUrl &&
      currentBot.bannerUrl === nextBot.bannerUrl &&
      currentBot.description === nextBot.description &&
      currentBot.runtimeEnabled === nextBot.runtimeEnabled &&
      currentBot.prefix === nextBot.prefix &&
      currentBot.commandName === nextBot.commandName &&
      currentBot.replyText === nextBot.replyText &&
      currentBot.commandChannelNames.join("|") === nextBot.commandChannelNames.join("|") &&
      currentBot.commandModules.join("|") === nextBot.commandModules.join("|");
    if (unchanged) {
      return;
    }

    onUpdateServer(
      {
        bots: server.bots.map((bot) => (bot.id === botId ? nextBot : bot)),
        members: server.members.map((member) =>
          member.id === botId
            ? {
                ...member,
                displayName: nextBot.displayName,
                avatarUrl: nextBot.avatarUrl,
                bannerUrl: nextBot.bannerUrl,
                bio: nextBot.description,
                presence: isBotRuntimeOnline(nextBot) ? "ONLINE" : "OFFLINE"
              }
            : member
        )
      },
      { action: "bot_updated", target: server.name, details: "Configuracao de bot atualizada." }
    );
  }

  function saveBoostPerks(patch: Partial<ServerBoostPerks>) {
    const nextPerks = {
      ...server.boostPerks,
      ...patch
    };

    onUpdateServer(
      { boostPerks: nextPerks },
      { action: "boost_perk_updated", target: server.name, details: "Vantagem de estrela configurada." }
    );
    setSettingsNotice("Vantagem de estrela salva.");
  }

  function toggleServerGuideChannel(channelName: string, enabled: boolean) {
    if (enabled && !serverGuideChannelDraft.includes(channelName) && serverGuideChannelDraft.length >= 10) {
      setSettingsNotice("A Guia permite no maximo 10 canais principais.");
      return;
    }

    setServerGuideChannelDraft((current) =>
      enabled ? Array.from(new Set([...current, channelName])).slice(0, 10) : current.filter((item) => item !== channelName)
    );
  }

  function saveServerGuidePerks() {
    if (!server.communityEnabled) {
      setSettingsNotice("Ative a comunidade antes de configurar a Guia do servidor.");
      return;
    }

    const validChannelNames = new Set(availableGuideChannels.map((channel) => channel.name));
    saveBoostPerks({
      serverGuideBannerUrl:
        boostLevel >= SERVER_GUIDE_BANNER_UNLOCK_LEVEL
          ? serverGuideBannerDraft.trim() || null
          : server.boostPerks.serverGuideBannerUrl,
      serverGuideChannelNames: serverGuideChannelDraft.filter((channelName) => validChannelNames.has(channelName)).slice(0, 10)
    });
  }

  function markSpecialChannel(
    categories: ChannelGroupDefinition[],
    channelName: string,
    special: CommunityChannelKind,
    isPrivate: boolean
  ) {
    let found = false;
    const nextCategories = categories.map((group) => ({
      ...group,
      channels: group.channels.map((channel) => {
        const clearsSameSlot = channel.special === special;
        if (channel.name === channelName && channel.type === "text") {
          found = true;
          return { ...channel, special, isPrivate: isPrivate || channel.isPrivate, isNew: true };
        }

        if (!clearsSameSlot) {
          return channel;
        }

        const { special: _special, isNew: _isNew, ...plainChannel } = channel;
        return plainChannel;
      })
    }));

    return { categories: nextCategories, found };
  }

  function ensureSpecialChannel(
    categories: ChannelGroupDefinition[],
    selectedName: string,
    fallbackName: string,
    special: CommunityChannelKind,
    isPrivate: boolean
  ) {
    const channelName = normalizeTextChannelName(selectedName === createOption ? fallbackName : selectedName);
    const marked = markSpecialChannel(categories, channelName, special, isPrivate);
    if (marked.found) {
      return { categories: marked.categories, channelName };
    }

    const channel: ChannelDefinition = { name: channelName, type: "text", isPrivate, special, isNew: true };
    const textGroupIndex = marked.categories.findIndex((group) => group.name === "CANAIS DE TEXTO");
    if (textGroupIndex === -1) {
      return { categories: [{ name: "CANAIS DE TEXTO", channels: [channel] }, ...marked.categories], channelName };
    }

    return {
      categories: marked.categories.map((group, index) =>
        index === textGroupIndex ? { ...group, channels: [channel, ...group.channels] } : group
      ),
      channelName
    };
  }

  function finishCommunitySetup() {
    let nextCategories = server.categories;
    const rules = ensureSpecialChannel(nextCategories, rulesSelection, "rules", "rules", false);
    nextCategories = rules.categories;
    const updates = ensureSpecialChannel(nextCategories, updatesSelection, "moderator-only", "updates", true);
    nextCategories = updates.categories;

    const roles = server.roles.map((role) => {
      if (role.id !== "everyone") {
        return role;
      }

      const permissions = { ...role.permissions };
      communityRiskyPermissions.forEach((permission) => {
        permissions[permission] = false;
      });
      return { ...role, permissions };
    });

    onUpdateServer(
      {
        communityEnabled: true,
        emailVerificationRequired: true,
        explicitMediaFilter: true,
        riskyPermissionsDisabled: true,
        rulesChannelName: rules.channelName,
        updatesChannelName: updates.channelName,
        categories: nextCategories,
        roles
      },
      { action: "community_enabled", target: server.name, details: "Servidor convertido para comunidade." }
    );
    setCommunityStep(0);
  }

  function disableCommunity() {
    const categories = server.categories.map((group) => ({
      ...group,
      channels: group.channels.map((channel) => {
        if (!channel.special) {
          return channel;
        }

        const { special: _special, isNew: _isNew, ...plainChannel } = channel;
        return plainChannel;
      })
    }));

    onUpdateServer(
      {
        communityEnabled: false,
        rulesChannelName: null,
        updatesChannelName: null,
        safetyChannelName: null,
        categories
      },
      { action: "community_disabled", target: server.name, details: "Recursos de comunidade desabilitados." }
    );
  }

  function updateCommunitySelection(kind: CommunityChannelKind, channelName: string | null) {
    if (!channelName) {
      onUpdateServer(
        { [`${kind === "rules" ? "rules" : kind === "updates" ? "updates" : "safety"}ChannelName`]: null } as Partial<ServerDefinition>,
        { action: "server_updated", target: server.name, details: "Canal de comunidade atualizado." }
      );
      return;
    }

    const marked = markSpecialChannel(server.categories, channelName, kind, kind !== "rules");
    onUpdateServer(
      {
        categories: marked.categories,
        [`${kind === "rules" ? "rules" : kind === "updates" ? "updates" : "safety"}ChannelName`]: channelName
      } as Partial<ServerDefinition>,
      { action: "server_updated", target: channelName, details: "Canal de comunidade atualizado." }
    );
  }

  async function loadRoleIcon(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSettingsNotice("Escolha um arquivo de imagem para o icone do cargo.");
      return;
    }

    try {
      const imageDataUrl = await readImageFileAsDataUrl(file, { width: 64, height: 64 });
      setRoleIconDraft(imageDataUrl);
      setSettingsNotice("Icone carregado. Clique em Salvar exibicao para aplicar.");
    } catch {
      setSettingsNotice("Nao foi possivel carregar esse icone.");
    }
  }

  function saveRoleDisplay() {
    if (!selectedRole) {
      return;
    }

    const canUseMagicRoleStyle = boostLevel >= 4;
    const canUseRoleIcon = boostLevel >= 6;

    onUpdateRole(server.id, selectedRole.id, {
      name: roleNameDraft.trim() || selectedRole.name,
      color: roleColorDraft,
      style: selectedRole.isDefault || !canUseMagicRoleStyle ? "solid" : roleStyleDraft,
      iconUrl: selectedRole.isDefault || !canUseRoleIcon ? null : roleIconDraft.trim() || null,
      separateMembers: selectedRole.isDefault ? false : roleSeparateDraft
    });
    setSettingsNotice("Exibicao do cargo salva.");
  }

  function reorderRole(targetRoleId: string) {
    if (!draggedRoleId || draggedRoleId === targetRoleId || !canReorderRoles) {
      return;
    }

    const movableRoles = server.roles.filter((role) => !role.isDefault);
    const defaultRoles = server.roles.filter((role) => role.isDefault);
    const fromIndex = movableRoles.findIndex((role) => role.id === draggedRoleId);
    const toIndex = movableRoles.findIndex((role) => role.id === targetRoleId);

    if (fromIndex < 0 || toIndex < 0) {
      setDraggedRoleId(null);
      return;
    }

    onUpdateServer(
      { roles: [...reorderItems(movableRoles, fromIndex, toIndex), ...defaultRoles] },
      { action: "role_updated", target: server.name, details: "Ordem dos cargos atualizada." }
    );
    setDraggedRoleId(null);
  }

  function renderTagView() {
    return (
      <section className="settings-main-column">
        <h2>Tag do servidor</h2>
        <p>Crie uma tag curta para identificar seu servidor em convites, busca e cartoes do Descubra.</p>
        <label>
          Tag
          <input
            value={serverTagDraft}
            onChange={(event) => setServerTagDraft(normalizeServerTag(event.target.value))}
            placeholder="TL"
            maxLength={5}
          />
        </label>
        <div className="server-tag-preview">
          <span>{serverTagDraft || server.serverTag || "TAG"}</span>
          <div>
            <strong>{server.name}</strong>
            <small>{server.serverTag ? `Tag atual: ${server.serverTag}` : "Sem tag publicada"}</small>
          </div>
        </div>
        <Button variant="primary" type="button" onClick={saveServerTag}>
          <CheckCircle2 size={18} />
          Salvar tag
        </Button>
      </section>
    );
  }

  function renderEngagementView() {
    return (
      <section className="settings-main-column">
        <h2>Engajamento</h2>
        <p>Controle recursos que ajudam membros novos a entender o servidor e manter a comunidade ativa.</p>
        {[
          ["welcomeScreenEnabled", "Tela de boas-vindas", "Mostra uma recepcao com canais importantes para novos membros."],
          ["onboardingEnabled", "Preparacao de membros", "Ajuda membros novos a escolher interesses e canais iniciais."],
          ["eventHighlightsEnabled", "Destaques de eventos", "Destaca eventos ativos e proximos encontros no servidor."],
          ["weeklySummaryEnabled", "Resumo semanal", "Prepara um resumo de movimentacao da comunidade."]
        ].map(([key, title, copy]) => (
          <div className="settings-row" key={key}>
            <div>
              <strong>{title}</strong>
              <p>{copy}</p>
            </div>
            <ToggleSwitch
              checked={Boolean(server.engagement[key as keyof ServerEngagementSettings])}
              onChange={(checked) => updateEngagement({ [key]: checked } as Partial<ServerEngagementSettings>)}
            />
          </div>
        ))}
        <div className="engagement-grid">
          <div>
            <strong>{server.members.length}</strong>
            <span>membros</span>
          </div>
          <div>
            <strong>{server.invites.filter((invite) => isInviteUsable(invite)).length}</strong>
            <span>convites ativos</span>
          </div>
          <div>
            <strong>{activeBoosts.length}</strong>
            <span>estrelas ativas</span>
          </div>
        </div>
      </section>
    );
  }

  function renderEmojiView() {
    const customEmojis = server.expressions.customEmojis ?? [];
    const staticEmojis = customEmojis.filter((emoji) => !emoji.animated);
    const animatedEmojis = customEmojis.filter((emoji) => emoji.animated);

    return (
      <section className="settings-main-column">
        <h2>Emoji</h2>
        <p>Envie emojis do servidor e separe automaticamente imagens estaticas e GIFs animados.</p>
        <div className="settings-row">
          <div>
            <strong>Permitir emojis do servidor</strong>
            <p>Libera reacoes e emojis personalizados nos canais de texto.</p>
          </div>
          <ToggleSwitch checked={server.expressions.emojiEnabled} onChange={(checked) => updateExpressions({ emojiEnabled: checked }, checked ? "Emojis ativados." : "Emojis desativados.")} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Permitir emojis externos</strong>
            <p>Membros com permissao podem usar emojis de outros servidores.</p>
          </div>
          <ToggleSwitch checked={server.expressions.externalEmojiEnabled} onChange={(checked) => updateExpressions({ externalEmojiEnabled: checked }, checked ? "Emojis externos ativados." : "Emojis externos desativados.")} />
        </div>
        <div className="emoji-upload-panel">
          <div className="emoji-upload-preview">
            {emojiImageDraft ? <SafePreviewImage src={emojiImageDraft} alt="" /> : <ImageIcon size={22} />}
          </div>
          <label>
            Nome do emoji
            <input value={emojiNameDraft} onChange={(event) => setEmojiNameDraft(normalizeEmojiName(event.target.value))} placeholder="meu_emoji" />
          </label>
          <label className="upload-button">
            <Upload size={16} />
            Enviar arquivo
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => void loadCustomEmoji(event)} />
          </label>
          <Button variant="primary" type="button" onClick={saveCustomEmoji}>
            Salvar emoji
          </Button>
          {emojiFileNameDraft ? <small>{emojiFileNameDraft} - {emojiAnimatedDraft ? "animado" : "estatico"}</small> : null}
        </div>
        {renderSettingsNotice()}
        <div className="settings-metric-grid">
          <div>
            <strong>{server.expressions.emojiEnabled ? "Ativo" : "Bloqueado"}</strong>
            <span>emoji do servidor</span>
          </div>
          <div>
            <strong>{server.expressions.externalEmojiEnabled ? "Ativo" : "Bloqueado"}</strong>
            <span>emoji externo</span>
          </div>
          <div>
            <strong>{customEmojis.length}</strong>
            <span>emojis enviados</span>
          </div>
        </div>
        <div className="emoji-library-grid">
          <EmojiLibrary title="Emoji estatico" emojis={staticEmojis} onRemove={removeCustomEmoji} />
          <EmojiLibrary title="Emoji animado" emojis={animatedEmojis} onRemove={removeCustomEmoji} />
        </div>
      </section>
    );
  }

  function renderStickersView() {
    return (
      <section className="settings-main-column">
        <h2>Figurinhas</h2>
        <p>Defina se membros podem enviar figurinhas do servidor e figurinhas externas.</p>
        <div className="settings-row">
          <div>
            <strong>Permitir figurinhas</strong>
            <p>Mostra figurinhas nos chats quando o recurso estiver ativo.</p>
          </div>
          <ToggleSwitch checked={server.expressions.stickersEnabled} onChange={(checked) => updateExpressions({ stickersEnabled: checked }, checked ? "Figurinhas ativadas." : "Figurinhas desativadas.")} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Permitir figurinhas externas</strong>
            <p>Controla o uso de figurinhas vindas de outras comunidades.</p>
          </div>
          <ToggleSwitch checked={server.expressions.externalStickersEnabled} onChange={(checked) => updateExpressions({ externalStickersEnabled: checked }, checked ? "Figurinhas externas ativadas." : "Figurinhas externas desativadas.")} />
        </div>
      </section>
    );
  }

  function renderSoundUploadDialog() {
    if (!soundUploadOpen) {
      return null;
    }

    const canSendSound = Boolean(soundAudioDraft && soundNameDraft.trim()) && soundEffects.length < soundboardMaxSounds;

    return (
      <div className="modal-backdrop sound-upload-backdrop" role="presentation">
        <section className="modal-panel compact sound-upload-modal" aria-label="Enviar um som">
          <header className="modal-header">
            <div>
              <h2>Enviar um som</h2>
            </div>
            <button className="icon-button" title="Fechar" type="button" onClick={closeSoundUploadDialog}>
              <X size={17} />
            </button>
          </header>

          <div className="sound-upload-form">
            <div className="sound-form-field">
              <strong>Arquivo *</strong>
              <label className="sound-file-picker">
                <FileAudio size={18} />
                <span>{soundFileNameDraft || "Escolha um arquivo"}</span>
                <b>Navegar</b>
                <input accept="audio/*" type="file" onChange={(event) => void loadSoundAudio(event)} />
              </label>
            </div>

            <div className="sound-form-grid">
              <label>
                Nome do som *
                <input value={soundNameDraft} maxLength={40} placeholder="Nome do som" onChange={(event) => setSoundNameDraft(event.target.value)} />
              </label>
              <div className="sound-form-field">
                <strong>Emoji relacionado</strong>
                <div className="sound-emoji-picker">
                  {soundEmojiOptions.map((emoji) => (
                    <button
                      className={soundEmojiDraft === emoji ? "active" : ""}
                      key={emoji}
                      type="button"
                      onClick={() => setSoundEmojiDraft(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="sound-volume-field">
              Volume do som
              <input
                min={0}
                max={100}
                type="range"
                value={soundVolumeDraft}
                onChange={(event) => setSoundVolumeDraft(clampSoundVolume(Number(event.target.value)))}
              />
            </label>

            <div className="sound-upload-actions">
              <button type="button" onClick={closeSoundUploadDialog}>
                Deixa pra la
              </button>
              <Button variant="primary" type="button" disabled={!canSendSound} onClick={saveSoundEffect}>
                Enviar
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderSoundboardView() {
    return (
      <section className="settings-main-column soundboard-settings">
        <h2>Painel de efeitos sonoros</h2>
        <p>Envie reacoes sonoras personalizadas que membros deste servidor podem usar em canais de voz.</p>
        <div>
          <Button
            variant="primary"
            type="button"
            disabled={!canManageServerSettings || soundEffects.length >= soundboardMaxSounds}
            onClick={() => setSoundUploadOpen(true)}
          >
            <Upload size={18} />
            Enviar som
          </Button>
        </div>
        <div className="settings-row">
          <div>
            <strong>Painel de sons</strong>
            <p>Exibe efeitos sonoros para quem estiver conectado em call.</p>
          </div>
          <ToggleSwitch checked={server.expressions.soundboardEnabled} onChange={(checked) => updateExpressions({ soundboardEnabled: checked }, checked ? "Painel de sons ativado." : "Painel de sons desativado.")} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Efeitos sonoros em chamada</strong>
            <p>Permite tocar efeitos rapidos durante conversas de voz.</p>
          </div>
          <ToggleSwitch checked={server.expressions.soundEffectsEnabled} onChange={(checked) => updateExpressions({ soundEffectsEnabled: checked }, checked ? "Efeitos sonoros ativados." : "Efeitos sonoros desativados.")} />
        </div>
        {renderSettingsNotice()}
        <div className="soundboard-list-heading">
          <Sparkles size={18} />
          <strong>Nivel 1 - {soundSlotsAvailable} espacos de {soundboardMaxSounds} disponiveis</strong>
        </div>
        <div className="soundboard-table">
          <div className="soundboard-table-head">
            <span>Emoji</span>
            <span>Nome</span>
            <span>Enviado por</span>
            <span>Acoes</span>
          </div>
          {soundEffects.length ? (
            soundEffects.map((effect) => (
              <article className="soundboard-row" key={effect.id}>
                <button className="soundboard-play" title={`Tocar ${effect.name}`} type="button" onClick={() => playSoundEffect(effect)}>
                  <span>{effect.emoji}</span>
                  <Play size={13} />
                </button>
                <strong>{effect.name}</strong>
                <div className="soundboard-uploader">
                  <AvatarBadge user={{ displayName: effect.uploadedBy, avatarUrl: effect.uploadedByAvatarUrl }} className="soundboard-uploader-avatar" />
                  <span>{effect.uploadedBy}</span>
                </div>
                <button className="danger-action soundboard-remove" title="Excluir som" type="button" onClick={() => removeSoundEffect(effect.id)}>
                  <Trash2 size={16} />
                </button>
              </article>
            ))
          ) : (
            <div className="empty-state compact-empty">
              <FileAudio size={28} />
              <p>Nenhum som enviado ainda.</p>
            </div>
          )}
        </div>
        {renderSoundUploadDialog()}
      </section>
    );
  }

  function renderAccessView() {
    const accessModes: Array<{ id: ServerAccessMode; title: string; copy: string; icon: ReactNode }> = [
      {
        id: "invite",
        title: "Apenas por convite",
        copy: "As pessoas entram diretamente com um convite ativo.",
        icon: <Lock size={22} />
      },
      {
        id: "request",
        title: "Mediante solicitacao",
        copy: "As pessoas precisam ter a solicitacao aprovada para entrar.",
        icon: <UserCheck size={22} />
      },
      {
        id: "discoverable",
        title: "Descobrivel",
        copy: "Qualquer um pode encontrar o servidor no Descubra.",
        icon: <Compass size={22} />
      }
    ];

    return (
      <section className="settings-main-column">
        <h2>Acesso</h2>
        <div className="access-mode-section">
          <div>
            <strong>Como as pessoas podem entrar no seu servidor?</strong>
            <p>Mantenha seu servidor privado, aprove entradas manualmente ou libere no Descubra.</p>
          </div>
          <div className="access-mode-grid">
            {accessModes.map((mode) => (
              <button
                className={server.access.entryMode === mode.id ? "access-mode-card active" : "access-mode-card"}
                key={mode.id}
                type="button"
                aria-pressed={server.access.entryMode === mode.id}
                onClick={() => updateAccessMode(mode.id)}
              >
                {mode.icon}
                <strong>{mode.title}</strong>
                <span>{mode.copy}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>Servidor com restricao de idade</strong>
            <p>Os usuarios deverao confirmar que tem a idade legal para visualizar o conteudo deste servidor.</p>
          </div>
          <ToggleSwitch checked={server.access.ageRestricted} onChange={(checked) => updateAccess({ ageRestricted: checked }, checked ? "Restricao de idade ativada." : "Restricao de idade desativada.")} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Regras do servidor</strong>
            <p>Os membros devem concordar com as regras antes de conversar ou interagir no servidor.</p>
          </div>
          <ToggleSwitch checked={server.access.rulesEnabled} onChange={(checked) => updateAccess({ rulesEnabled: checked }, checked ? "Regras de entrada ativadas." : "Regras de entrada desativadas.")} />
        </div>
        {server.access.rulesEnabled ? (
          <div className="server-rules-panel">
            {(server.access.rules ?? []).length ? (
              <div className="server-rule-list">
                {(server.access.rules ?? []).map((rule) => (
                  <article className="server-rule-row" key={rule}>
                    <span>{rule}</span>
                    <button title="Remover regra" type="button" onClick={() => removeServerRule(rule)}>
                      <Trash2 size={15} />
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
            <form className="server-rule-add" onSubmit={(event) => {
              event.preventDefault();
              addServerRule();
            }}>
              <input value={serverRuleDraft} maxLength={120} placeholder="Escreva uma regra do servidor" onChange={(event) => setServerRuleDraft(event.target.value)} />
              <button type="submit">
                <Plus size={17} />
                Adicionar regra
              </button>
            </form>
            <div className="server-rule-examples">
              <strong>Regras de exemplo</strong>
              <div>
                {serverRuleExamples.map((rule) => (
                  <button key={rule} type="button" onClick={() => addServerRule(rule)}>
                    {rule}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        <div className="settings-row">
          <div>
            <strong>Exigir e-mail verificado</strong>
            <p>Sincroniza com as configuracoes de seguranca do servidor.</p>
          </div>
          <ToggleSwitch checked={server.access.requireVerifiedEmail || server.emailVerificationRequired} onChange={(checked) => updateAccess({ requireVerifiedEmail: checked }, checked ? "E-mail verificado exigido." : "E-mail verificado deixou de ser exigido.")} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Ocultar links de convite de membros</strong>
            <p>Apenas cargos com permissao conseguem copiar links ativos.</p>
          </div>
          <ToggleSwitch checked={server.access.hideInviteLinksFromMembers} onChange={(checked) => updateAccess({ hideInviteLinksFromMembers: checked }, checked ? "Links de convite ocultados." : "Links de convite liberados.")} />
        </div>
        <label>
          Idade minima da conta em dias
          <input
            type="number"
            min={0}
            max={90}
            value={server.access.minAccountAgeDays}
            onChange={(event) => updateAccess({ minAccountAgeDays: Number(event.target.value) || 0 }, "Idade minima de conta atualizada.")}
          />
        </label>
      </section>
    );
  }

  function renderIntegrationsView() {
    return (
      <section className="settings-main-column">
        <h2>Integracoes</h2>
        <p>Controle bots, webhooks e conexoes externas permitidas neste servidor.</p>
        <div className="settings-row">
          <div>
            <strong>Permitir integracoes</strong>
            <p>Habilita bots e servicos conectados ao servidor.</p>
          </div>
          <ToggleSwitch checked={server.apps.integrationsEnabled} onChange={(checked) => updateApps({ integrationsEnabled: checked }, checked ? "Integracoes ativadas." : "Integracoes desativadas.")} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Revisar bots antes de liberar</strong>
            <p>Novos bots ficam pendentes ate alguem com permissao aprovar.</p>
          </div>
          <ToggleSwitch checked={server.apps.botReviewRequired} onChange={(checked) => updateApps({ botReviewRequired: checked }, checked ? "Revisao de bots ativada." : "Revisao de bots desativada.")} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Webhooks</strong>
            <p>Permite receber eventos externos em canais do servidor.</p>
          </div>
          <ToggleSwitch checked={server.apps.webhooksEnabled} onChange={(checked) => updateApps({ webhooksEnabled: checked }, checked ? "Webhooks ativados." : "Webhooks desativados.")} />
        </div>
        <Button variant="secondary" type="button" onClick={() => setView("bots")}>
          <Bot size={18} />
          Gerenciar bots
        </Button>
      </section>
    );
  }

  function renderAppDirectoryView() {
    return (
      <section className="settings-main-column">
        <h2>Diretorio de Apps</h2>
        <p>Escolha se o servidor pode descobrir apps oficiais e recomendados.</p>
        <div className="settings-row">
          <div>
            <strong>Diretorio habilitado</strong>
            <p>Mostra apps disponiveis para instalar quando a loja estiver publicada.</p>
          </div>
          <ToggleSwitch checked={server.apps.appDirectoryEnabled} onChange={(checked) => updateApps({ appDirectoryEnabled: checked }, checked ? "Diretorio de apps ativado." : "Diretorio de apps desativado.")} />
        </div>
        <div className="settings-metric-grid">
          <div>
            <strong>{server.bots.length}</strong>
            <span>apps no servidor</span>
          </div>
          <div>
            <strong>{server.apps.integrationsEnabled ? "Permitido" : "Bloqueado"}</strong>
            <span>instalacao</span>
          </div>
        </div>
      </section>
    );
  }

  function renderOnboardingView() {
    return (
      <section className="settings-main-column">
        <h2>Onboarding</h2>
        <p>Configure a entrada de novos membros na comunidade.</p>
        <div className="settings-row">
          <div>
            <strong>Onboarding ligado</strong>
            <p>Mostra passos iniciais, interesses e canais recomendados.</p>
          </div>
          <ToggleSwitch checked={server.engagement.onboardingEnabled} onChange={(checked) => updateEngagement({ onboardingEnabled: checked })} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Tela de boas-vindas</strong>
            <p>Exibe uma recepcao antes do membro entrar nos canais.</p>
          </div>
          <ToggleSwitch checked={server.engagement.welcomeScreenEnabled} onChange={(checked) => updateEngagement({ welcomeScreenEnabled: checked })} />
        </div>
      </section>
    );
  }

  function renderAnalyticsView() {
    const activeInvites = server.invites.filter((invite) => isInviteUsable(invite)).length;
    const channelCount = getAllServerChannels(server).length;

    return (
      <section className="settings-main-column">
        <h2>Analises do servidor</h2>
        <p>Acompanhe sinais basicos de atividade e crescimento da comunidade.</p>
        <div className="settings-metric-grid">
          <div>
            <strong>{server.members.length}</strong>
            <span>membros</span>
          </div>
          <div>
            <strong>{activeInvites}</strong>
            <span>convites ativos</span>
          </div>
          <div>
            <strong>{channelCount}</strong>
            <span>canais</span>
          </div>
          <div>
            <strong>{activeBoosts.length}</strong>
            <span>estrelas</span>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>Analises ligadas</strong>
            <p>Permite salvar indicadores de crescimento do servidor.</p>
          </div>
          <ToggleSwitch checked={server.analytics.serverAnalyticsEnabled} onChange={(checked) => updateAnalytics({ serverAnalyticsEnabled: checked }, checked ? "Analises ativadas." : "Analises desativadas.")} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Resumo semanal</strong>
            <p>Prepara um resumo de movimentacao quando houver dados suficientes.</p>
          </div>
          <ToggleSwitch checked={server.analytics.weeklyDigestEnabled && server.engagement.weeklySummaryEnabled} onChange={(checked) => {
            updateAnalytics({ weeklyDigestEnabled: checked }, checked ? "Resumo semanal ativado." : "Resumo semanal desativado.");
            updateEngagement({ weeklySummaryEnabled: checked });
          }} />
        </div>
      </section>
    );
  }

  function renderInvitesView() {
    return (
      <section className="settings-main-column">
        <h2>Convites</h2>
        <p>Crie links de convite para outras pessoas entrarem no servidor quando o sistema online estiver publicado.</p>
        {boostLevel >= 1 && server.boostPerks.inviteBackgroundUrl ? (
          <div className="invite-background-preview" style={{ backgroundImage: toCssImageUrl(server.boostPerks.inviteBackgroundUrl) }}>
            <strong>{server.name}</strong>
            <span>Preview do convite</span>
          </div>
        ) : null}
        <div className="invite-create-panel">
          <label>
            Duracao do convite
            <select value={inviteDurationDraft} onChange={(event) => setInviteDurationDraft(event.target.value as InviteDurationId)} disabled={!canManageInvites}>
              {inviteDurationOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Limite de membros
            <input
              value={inviteMaxUsesDraft}
              min={1}
              max={200}
              type="number"
              disabled={!canManageInvites}
              onChange={(event) => setInviteMaxUsesDraft(Math.min(Math.max(Number(event.target.value) || 1, 1), 200))}
            />
          </label>
          <Button variant="primary" type="button" onClick={createInviteFromSettings} disabled={!canManageInvites}>
            <UserPlus size={18} />
            Criar convite
          </Button>
        </div>
        {!canManageInvites ? <p className="settings-notice">Seu cargo nao permite gerenciar convites deste servidor.</p> : null}
        {renderSettingsNotice()}
        <div className="invite-list">
          {server.invites.length ? (
            server.invites.map((invite) => {
              const inviteLink = getServerInviteLink(server, invite.code);

              return (
                <article className={isInviteUsable(invite) ? "invite-row" : "invite-row disabled"} key={invite.id}>
                  <div>
                    {onOpenInviteLink ? (
                      <button className="invite-link" type="button" onClick={() => onOpenInviteLink(inviteLink)}>
                        {inviteLink}
                      </button>
                    ) : (
                      <a className="invite-link" href={inviteLink}>
                        {inviteLink}
                      </a>
                    )}
                    <span>
                      {getInviteStatusLabel(invite)} - {formatInviteUses(invite)} - vence em {formatInviteExpiration(invite)}
                    </span>
                    <small>
                      Criado por {invite.createdBy} em {new Date(invite.createdAt).toLocaleDateString("pt-BR")}
                    </small>
                  </div>
                  <button type="button" onClick={() => copyInvite(invite.code)}>
                    Copiar
                  </button>
                  <button type="button" onClick={() => setInviteActive(invite.id, !invite.active)} disabled={!canManageInvites}>
                    {invite.active ? "Desativar" : "Reativar"}
                  </button>
                  <button className="danger-action" type="button" onClick={() => deleteInvite(invite.id)} disabled={!canManageInvites}>
                    Excluir
                  </button>
                </article>
              );
            })
          ) : (
            <div className="empty-state compact-empty">
              <UserPlus size={28} />
              <p>Nenhum convite criado ainda.</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderSecurityView() {
    return (
      <section className="settings-main-column">
        <h2>Configuracoes de Seguranca</h2>
        <p>Defina protecoes padrao do servidor e reduza permissoes perigosas para novos membros.</p>
        <div className="settings-row">
          <div>
            <strong>E-mail verificado necessario</strong>
            <p>Membros precisam confirmar o e-mail antes de participar.</p>
          </div>
          <ToggleSwitch checked={server.emailVerificationRequired} onChange={(checked) => updateSecurity({}, { emailVerificationRequired: checked })} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Filtro de midia explicita</strong>
            <p>Marca o servidor para analisar midia enviada quando a API online estiver ativa.</p>
          </div>
          <ToggleSwitch checked={server.explicitMediaFilter} onChange={(checked) => updateSecurity({}, { explicitMediaFilter: checked })} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Protecao contra raids</strong>
            <p>Ativa regras locais para detectar excesso de entradas e mensagens repetidas.</p>
          </div>
          <ToggleSwitch checked={server.security.raidProtection} onChange={(checked) => updateSecurity({ raidProtection: checked })} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Exigir 2FA para moderacao</strong>
            <p>Reserva acoes sensiveis para contas protegidas quando a autenticacao online estiver pronta.</p>
          </div>
          <ToggleSwitch checked={server.security.require2FaForModeration} onChange={(checked) => updateSecurity({ require2FaForModeration: checked })} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Desativar permissoes arriscadas do @everyone</strong>
            <p>Remove administracao, banimentos, expulsao e mencoes gerais do cargo padrao.</p>
          </div>
          <ToggleSwitch
            checked={server.riskyPermissionsDisabled}
            onChange={(checked) =>
              updateSecurity({}, { riskyPermissionsDisabled: checked, roles: updateEveryoneRiskyPermissions(server.roles, checked) })
            }
          />
        </div>
        <div className="settings-row danger-row server-delete-row">
          <div>
            <strong>Excluir servidor</strong>
            <p>Apaga este servidor, canais, convites, mensagens salvas, chamadas e configuracoes. Essa acao e permanente.</p>
          </div>
          <Button
            variant="danger"
            type="button"
            disabled={!canDeleteServer || deleteServerSaving}
            onClick={() => {
              setDeleteServerConfirmOpen(true);
              setDeleteServerConfirmStep(1);
              setDeleteServerPassword("");
            }}
          >
            <Trash2 size={17} />
            Excluir servidor
          </Button>
        </div>
        {!canDeleteServer ? <p className="settings-muted">Somente o dono original do servidor pode excluir permanentemente.</p> : null}
        {deleteServerConfirmOpen ? (
          <div className="server-delete-confirm" role="alertdialog" aria-label="Confirmar exclusao do servidor">
            <div>
              <strong>{deleteServerConfirmStep === 1 ? "Tem certeza que deseja excluir o servidor?" : "Confirme com a senha da conta"}</strong>
              <p>
                {deleteServerConfirmStep === 1
                  ? "Isso nao podera ser revertido. A exclusao e permanente e remove o servidor automaticamente para todos."
                  : `Digite sua senha atual para excluir ${server.name} permanentemente.`}
              </p>
            </div>
            {deleteServerConfirmStep === 2 ? (
              <label>
                Senha atual
                <input
                  value={deleteServerPassword}
                  onChange={(event) => setDeleteServerPassword(event.target.value)}
                  type="password"
                  autoComplete="current-password"
                  minLength={10}
                  maxLength={128}
                />
              </label>
            ) : null}
            <div className="security-actions">
              <Button variant="secondary" type="button" disabled={deleteServerSaving} onClick={closeDeleteServerConfirm}>
                Cancelar
              </Button>
              {deleteServerConfirmStep === 1 ? (
                <Button variant="danger" type="button" disabled={deleteServerSaving} onClick={() => setDeleteServerConfirmStep(2)}>
                  Sim, continuar
                </Button>
              ) : (
                <Button variant="danger" type="button" disabled={deleteServerSaving || deleteServerPassword.length < 10} onClick={() => void confirmDeleteServer()}>
                  {deleteServerSaving ? "Excluindo..." : "Excluir permanentemente"}
                </Button>
              )}
            </div>
          </div>
        ) : null}
        {renderSettingsNotice()}
      </section>
    );
  }

  function renderBansView() {
    const activeTimeouts = server.timeouts.filter((timeout) => isFutureIsoDate(timeout.timeoutUntil));

    return (
      <section className="settings-main-column">
        <h2>Moderacao</h2>
        <p>Banimentos removem membros reais do servidor. Castigo bloqueia mensagens por tempo limitado.</p>
        <div className="ban-form">
          <label>
            Nick
            <input value={banUsernameDraft} onChange={(event) => setBanUsernameDraft(event.target.value)} placeholder="@usuario" />
          </label>
          <label>
            Motivo
            <input value={banReasonDraft} onChange={(event) => setBanReasonDraft(event.target.value)} placeholder="Motivo do banimento" />
          </label>
          <Button variant="danger" type="button" disabled={!canBanMembers} onClick={() => void banUserByDraft()}>
            Banir usuario
          </Button>
        </div>
        <div className="ban-form timeout-form">
          <label>
            Nick
            <input value={timeoutUsernameDraft} onChange={(event) => setTimeoutUsernameDraft(event.target.value)} placeholder="@usuario" />
          </label>
          <label>
            Tempo
            <select value={timeoutDurationDraft} onChange={(event) => setTimeoutDurationDraft(event.target.value as TimeoutDurationId)}>
              {timeoutDurationOptions.map((option) => (
                <option value={option.id} key={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Motivo
            <input value={timeoutReasonDraft} onChange={(event) => setTimeoutReasonDraft(event.target.value)} placeholder="Motivo do castigo" />
          </label>
          <Button variant="secondary" type="button" disabled={!canModerateMembers} onClick={() => void timeoutUserByDraft()}>
            Colocar de castigo
          </Button>
        </div>
        {renderSettingsNotice()}
        <h3>Castigos ativos</h3>
        <div className="ban-list">
          {activeTimeouts.length ? (
            activeTimeouts.map((timeout) => (
              <article className="ban-row" key={timeout.id}>
                <div>
                  <strong>{timeout.displayName}</strong>
                  <span>@{timeout.username} - {timeout.reason}</span>
                  <small>Ate {formatTimeoutUntil(timeout.timeoutUntil)}</small>
                </div>
                <button type="button" disabled={!canModerateMembers} onClick={() => void removeTimeout(timeout.userId)}>
                  Remover castigo
                </button>
              </article>
            ))
          ) : (
            <div className="empty-state compact-empty">
              <Shield size={28} />
              <p>Nenhum castigo ativo.</p>
            </div>
          )}
        </div>
        <h3>Banimentos</h3>
        <div className="ban-list">
          {server.bans.length ? (
            server.bans.map((ban) => (
              <article className="ban-row" key={ban.id}>
                <div>
                  <strong>{ban.displayName}</strong>
                  <span>@{ban.username} - {ban.reason}</span>
                  <small>Banido por {ban.bannedBy} em {new Date(ban.bannedAt).toLocaleString("pt-BR")}</small>
                </div>
                <button type="button" disabled={!canBanMembers} onClick={() => void unbanUser(ban.id)}>
                  Desbanir
                </button>
              </article>
            ))
          ) : (
            <div className="empty-state compact-empty">
              <Shield size={28} />
              <p>Nenhum usuario banido.</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderAutomodView() {
    return (
      <section className="settings-main-column">
        <h2>AutoMod</h2>
        <p>Estas regras ja bloqueiam mensagens locais no chat do servidor.</p>
        {[
          ["blockSpam", "Bloquear spam", "Bloqueia texto repetido ou mensagens inteiras em caixa alta."],
          ["blockMassMentions", "Bloquear muitas mencoes", "Bloqueia @everyone, @here e excesso de mencoes."],
          ["blockInvites", "Bloquear convites externos", "Bloqueia links discord.gg, discord.new e discord.com/invite."],
          ["blockLinks", "Bloquear links", "Bloqueia qualquer link http ou https."]
        ].map(([key, title, copy]) => (
          <div className="settings-row" key={key}>
            <div>
              <strong>{title}</strong>
              <p>{copy}</p>
            </div>
            <ToggleSwitch
              checked={Boolean(server.automod[key as keyof Pick<ServerAutomodSettings, "blockSpam" | "blockMassMentions" | "blockInvites" | "blockLinks">])}
              onChange={(checked) => updateAutomod({ [key]: checked } as Partial<ServerAutomodSettings>)}
            />
          </div>
        ))}
        <label>
          Maximo de mencoes por mensagem
          <input
            type="number"
            min={1}
            max={25}
            value={server.automod.maxMentions}
            onChange={(event) => updateAutomod({ maxMentions: Number(event.target.value) || 1 })}
          />
        </label>
        <label>
          Modo lento em segundos
          <input
            type="number"
            min={0}
            max={21600}
            value={server.automod.slowModeSeconds}
            onChange={(event) => updateAutomod({ slowModeSeconds: Number(event.target.value) || 0 })}
          />
        </label>
        <label>
          Palavras bloqueadas
          <textarea
            value={blockedWordsDraft}
            onChange={(event) => setBlockedWordsDraft(event.target.value)}
            placeholder="Separe por virgula"
          />
        </label>
        <Button variant="primary" type="button" onClick={saveBlockedWords}>
          Salvar palavras bloqueadas
        </Button>
        {renderSettingsNotice()}
      </section>
    );
  }

  function renderProfileView() {
    const profileIconPreview = boostLevel >= SERVER_ICON_UNLOCK_LEVEL ? serverIconDraft.trim() || server.iconUrl : null;

    return (
      <div className="settings-content-grid">
        <section className="settings-main-column">
          <h2>Perfil do servidor</h2>
          <p>Personalize como seu servidor aparece em convites, Descubra e canais de anuncio.</p>
          <label>
            Nome
            <input value={serverName} onChange={(event) => setServerName(event.target.value)} maxLength={48} />
          </label>
          <label>
            Descricao
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} />
          </label>
          <div className="settings-row">
            <div>
              <strong>Foto do servidor</strong>
              <p>Imagem quadrada exibida na lateral, na Guia e nos convites do servidor.</p>
            </div>
            {boostLevel >= SERVER_ICON_UNLOCK_LEVEL ? (
              <label className="upload-button">
                <Upload size={16} />
                Enviar foto
                <input type="file" accept="image/*" onChange={(event) => void loadBoostImage(event, setServerIconDraft, { width: 512, height: 512 })} />
              </label>
            ) : (
              <button type="button" disabled>
                <Shield size={16} />
                Precisa de nivel {SERVER_ICON_UNLOCK_LEVEL}
              </button>
            )}
          </div>
          <div className="color-grid" role="radiogroup" aria-label="Faixa">
            {bannerColors.map((color) => (
              <button
                className={bannerColor === color ? "active" : ""}
                key={color}
                style={{ background: color }}
                title={color}
                type="button"
                onClick={() => setBannerColor(color)}
              />
            ))}
          </div>
          <Button variant="primary" type="button" onClick={saveServerProfile}>
            <CheckCircle2 size={18} />
            Salvar perfil
          </Button>
        </section>
        <aside className="server-preview-card">
          <div className="server-preview-banner" style={{ background: bannerColor }} />
          <div className={profileIconPreview ? "server-preview-icon has-image" : "server-preview-icon"}>
            {profileIconPreview ? <img src={profileIconPreview} alt="" /> : server.initials}
          </div>
          <strong>{serverName || server.name}</strong>
          <span>{server.members.length} membro - Desde ago. de 2026</span>
          {boostLevel >= SERVER_ICON_UNLOCK_LEVEL ? (
            <button type="button" onClick={saveServerIcon}>
              Salvar foto
            </button>
          ) : null}
        </aside>
      </div>
    );
  }

  function renderMembersView() {
    return (
      <section className="settings-main-column">
        <h2>Membros do servidor</h2>
        <div className="settings-row">
          <div>
            <strong>Mostrar membros na lista de canais</strong>
            <p>Exibe quem entrou recentemente e quem esta disponivel no servidor.</p>
          </div>
          <ToggleSwitch checked={server.memberListVisible} onChange={(checked) => onUpdateServer({ memberListVisible: checked }, {
            action: "server_updated",
            target: server.name,
            details: checked ? "Lista de membros exibida." : "Lista de membros ocultada."
          })} />
        </div>
        <label>
          Pesquisar membro
          <input value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="Nome ou nick" />
        </label>
        <div className="member-table">
          {sortServerMembersForList(filteredMembers).map((member) => {
            const roles = server.roles.filter((role) => member.roleIds.includes(role.id)).map((role) => role.name);
            const memberPresence = getPublicPresence(member.presence);
            return (
              <div className="member-table-row" key={member.id}>
                <span className={`presence ${memberPresence.toLowerCase()}`} />
                <strong>{member.displayName}</strong>
                <span>@{member.username}</span>
                <span>{new Date(member.joinedAt).toLocaleDateString("pt-BR")}</span>
                <span>{roles.join(", ")}</span>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  function renderRolesView() {
    if (!selectedRole) {
      return null;
    }

    const roleStyleOptions: Array<{ id: RoleStyle; label: string; locked: boolean }> = [
      { id: "solid", label: "Solido", locked: false },
      { id: "gradient", label: "Gradiente", locked: boostLevel < 4 },
      { id: "holographic", label: "Holografico", locked: boostLevel < 4 }
    ];
    const roleIconPreview = roleIconDraft.trim();
    const roleIconUnlocked = boostLevel >= 6;

    return (
      <div className="role-settings">
        <aside className="role-list">
          <button
            className="role-create-button"
            type="button"
            onClick={() => {
              const roleId = onCreateRole(server.id);
              if (roleId) {
                setSelectedRoleId(roleId);
                setRoleTab("display");
              }
            }}
          >
            <Plus size={16} />
            Criar cargo
          </button>
          {server.roles.map((role) => (
            <button
              className={selectedRole.id === role.id ? "active" : ""}
              key={role.id}
              type="button"
              draggable={canReorderRoles && !role.isDefault}
              onContextMenu={(event) => {
                if (canReorderRoles && !role.isDefault) {
                  event.preventDefault();
                }
              }}
              onMouseDown={(event) => {
                if (canReorderRoles && !role.isDefault && event.button === 2) {
                  setDraggedRoleId(role.id);
                }
              }}
              onMouseEnter={() => {
                if (canReorderRoles && draggedRoleId && draggedRoleId !== role.id && !role.isDefault) {
                  reorderRole(role.id);
                }
              }}
              onMouseUp={() => setDraggedRoleId(null)}
              onDragStart={(event) => {
                if (!canReorderRoles || role.isDefault) {
                  return;
                }

                setDraggedRoleId(role.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                if (canReorderRoles && draggedRoleId && !role.isDefault) {
                  event.preventDefault();
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!role.isDefault) {
                  reorderRole(role.id);
                }
              }}
              onDragEnd={() => setDraggedRoleId(null)}
              onClick={() => setSelectedRoleId(role.id)}
            >
              {canReorderRoles && !role.isDefault ? <GripVertical className="drag-handle" size={14} /> : <span className="role-drag-spacer" />}
              <span className="role-color-dot" style={{ background: role.color }} />
              <span className="role-name">{role.name}</span>
            </button>
          ))}
        </aside>
        <section className="settings-main-column">
          <h2>{selectedRole.isDefault ? "Permissoes padrao" : `Editar cargo - ${selectedRole.name}`}</h2>
          <div className="settings-tabs">
            {[
              ["display", "Exibicao"],
              ["permissions", "Permissoes"],
              ["links", "Links"],
              ["members", `Gerenciar membros (${server.members.length})`]
            ].map(([key, label]) => (
              <button className={roleTab === key ? "active" : ""} key={key} type="button" onClick={() => setRoleTab(key as RoleEditorTab)}>
                {label}
              </button>
            ))}
          </div>
          {roleTab === "display" ? (
            <div className="role-editor-section">
              <label>
                Nome do cargo *
                <input value={roleNameDraft} onChange={(event) => setRoleNameDraft(event.target.value)} disabled={selectedRole.isDefault} />
              </label>

              <section className="role-style-section">
                <h3>Estilo do cargo</h3>
                <div className="role-style-grid">
                  {roleStyleOptions.map((option) => (
                    <button
                      className={[
                        "role-style-card",
                        roleStyleDraft === option.id ? "active" : "",
                        option.locked ? "locked" : ""
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      disabled={selectedRole.isDefault || option.locked}
                      key={option.id}
                      type="button"
                      onClick={() => setRoleStyleDraft(option.id)}
                    >
                      <div className={`role-style-preview ${option.id}`}>
                        <AvatarBadge user={currentUser} className="role-style-avatar" />
                        <span style={{ color: option.locked ? undefined : roleColorDraft }}>Wumpus</span>
                        <small>as pedras sao muito antigas</small>
                      </div>
                      <strong>{option.label}</strong>
                    </button>
                  ))}
                </div>
                <div className="role-magic-card">
                  <div>
                    <strong>Deixe alguns cargos magicos</strong>
                    <span>Estilos gradiente e holografico desbloqueiam no nivel 4 de estrelas.</span>
                  </div>
                  <button type="button" disabled>
                    <Shield size={16} />
                    Nivel 4 de estrelas
                  </button>
                </div>
              </section>

              <section className="role-style-section">
                <h3>Cor do cargo *</h3>
                <p>Os membros usam a cor do cargo mais alto que possuem na lista de cargos.</p>
                <div className="color-grid role-colors">
                  {roleColors.map((color) => (
                    <button
                      className={roleColorDraft === color ? "active" : ""}
                      key={color}
                      style={{ background: color }}
                      title={color}
                      type="button"
                      onClick={() => setRoleColorDraft(color)}
                    >
                      {roleColorDraft === color ? <CheckCircle2 size={14} /> : null}
                    </button>
                  ))}
                </div>
              </section>

              <section className="role-icon-section">
                <h3>
                  Icone de cargo <span className="role-level-pill">NV. 6</span>
                </h3>
                <p>
                  Envie uma imagem com pelo menos 64x64 pixels. Membros verao apenas o icone do cargo mais alto se tiverem mais de um.
                </p>
                <div className={!roleIconUnlocked ? "role-icon-upload-row locked" : "role-icon-upload-row"}>
                  <div className="role-icon-preview">{roleIconPreview ? <img src={roleIconPreview} alt="" /> : <ImageIcon size={22} />}</div>
                  <label className={roleIconUnlocked && !selectedRole.isDefault ? "upload-button" : "upload-button disabled"}>
                    <Upload size={16} />
                    {roleIconUnlocked ? "Escolha uma imagem" : "Precisa de nivel 6"}
                    <input accept="image/*" disabled={!roleIconUnlocked || selectedRole.isDefault} type="file" onChange={(event) => void loadRoleIcon(event)} />
                  </label>
                  {roleIconPreview && roleIconUnlocked ? (
                    <button className="ghost-button" type="button" onClick={() => setRoleIconDraft("")}>
                      Remover
                    </button>
                  ) : null}
                </div>
              </section>

              <div className="role-message-preview">
                <AvatarBadge user={currentUser} className="avatar" />
                <div>
                  <strong style={{ color: roleColorDraft }}>
                    {currentUser.displayName}
                    {roleIconPreview ? <img className="role-preview-icon" src={roleIconPreview} alt="" /> : null}
                  </strong>
                  <p>as pedras sao muito antigas</p>
                </div>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Mostrar membros separado deste cargo</strong>
                  <p>Quando ativado, membros com este cargo aparecem em um grupo proprio na lateral do servidor.</p>
                </div>
                <ToggleSwitch checked={!selectedRole.isDefault && roleSeparateDraft} onChange={setRoleSeparateDraft} disabled={selectedRole.isDefault} />
              </div>
              <Button variant="primary" type="button" onClick={saveRoleDisplay}>
                Salvar exibicao
              </Button>
            </div>
          ) : roleTab === "links" ? (
            <div className="role-editor-section">
              <div className="role-links-panel">
                <Paperclip size={22} />
                <div>
                  <strong>Links do cargo</strong>
                  <p>Area reservada para integrar paginas, convites ou atalhos ligados a este cargo.</p>
                </div>
              </div>
            </div>
          ) : roleTab === "permissions" ? (
            <div className="permission-list">
              {permissionSections.map((section) => (
                <section key={section.title}>
                  <h3>{section.title}</h3>
                  {section.permissions.map((permission) => (
                    <div className="permission-row" key={permission.key}>
                      <div>
                        <strong>{permission.label}</strong>
                        <p>{permission.description}</p>
                      </div>
                      <ToggleSwitch
                        checked={Boolean(selectedRole.permissions[permission.key])}
                        onChange={(checked) =>
                          onUpdateRole(server.id, selectedRole.id, (role) => ({
                            permissions: { ...role.permissions, [permission.key]: checked }
                          }))
                        }
                      />
                    </div>
                  ))}
                </section>
              ))}
            </div>
          ) : (
            <div className="role-member-list">
              {server.members.map((member) => (
                <label className="checkbox-row" key={member.id}>
                  <input
                    checked={member.roleIds.includes(selectedRole.id)}
                    disabled={selectedRole.isDefault}
                    type="checkbox"
                    onChange={(event) => onSetMemberRole(server.id, member.id, selectedRole.id, event.target.checked)}
                  />
                  {member.displayName} <span>@{member.username}</span>
                </label>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  function renderBoostsView() {
    const channelBannerPreview = channelBannerDraft.trim() || server.boostPerks.channelBannerUrl;
    const inviteBackgroundPreview = inviteBackgroundDraft.trim() || server.boostPerks.inviteBackgroundUrl;
    const animatedBannerPreview = animatedBannerDraft.trim() || server.boostPerks.animatedBannerUrl;
    const welcomeCardPreview = welcomeCardDraft.trim() || server.boostPerks.welcomeCardUrl;
    const serverIconPreview = serverIconDraft.trim() || server.iconUrl;
    const serverGuideBannerPreview =
      boostLevel >= SERVER_GUIDE_BANNER_UNLOCK_LEVEL
        ? serverGuideBannerDraft.trim() || server.boostPerks.serverGuideBannerUrl
        : "";
    const boostOverflow = getBoostOverflowCount(activeBoosts.length);

    return (
      <section className="settings-main-column">
        <h2>Vantagens de Estrelas</h2>
        <div className="boost-summary">
          <div>
            <strong>{activeBoosts.length}</strong>
            <span>estrelas ativas</span>
          </div>
          <div>
            <strong>NV. {boostLevel}</strong>
            <span>
              {boostLevel >= BOOST_MAX_LEVEL
                ? boostOverflow
                  ? `+${boostOverflow} acima do nivel maximo`
                  : "nivel maximo"
                : `${activeBoosts.length}/${nextBoostTarget} para o proximo nivel`}
            </span>
          </div>
          <div>
            <strong>30 dias</strong>
            <span>validade por estrela</span>
          </div>
        </div>
        {!canConfigureBoostPerks ? (
          <p className="settings-notice">Visualizacao das recompensas liberadas. Apenas dono, administradores ou developer podem alterar vantagens.</p>
        ) : developerUser ? (
          <>
            <Button variant="primary" type="button" onClick={addDeveloperBoost}>
              <Sparkles size={18} />
              Adicionar estrela de developer
            </Button>
            <section className="developer-update-panel" aria-label="Enviar atualizacao do programa">
              <div>
                <h3>Atualizacao do programa</h3>
                <p>Dispara a criacao do instalador e dos JSONs pelo GitHub Actions.</p>
                <small className="developer-update-help">
                  Requer TEMPEST_LIGHT_GITHUB_TOKEN com acesso ao repositorio e permissao Actions read/write.
                </small>
              </div>
              <div className="developer-update-grid">
                <label>
                  Versao
                  <input
                    value={updateVersionDraft}
                    onChange={(event) => setUpdateVersionDraft(event.target.value)}
                    placeholder="0.1.32"
                    spellCheck={false}
                  />
                </label>
                <label>
                  Notas
                  <textarea value={updateNotesDraft} onChange={(event) => setUpdateNotesDraft(event.target.value)} />
                </label>
              </div>
              <Button variant="primary" type="button" disabled={publishingUpdate} onClick={() => void publishProgramUpdate()}>
                <Upload size={18} />
                {publishingUpdate ? "Enviando..." : "Enviar atualizacao"}
              </Button>
            </section>
          </>
        ) : (
          <p className="settings-notice">Estrelas sao recurso pago. A opcao gratuita aparece apenas para conta autorizada de developer.</p>
        )}
        {renderSettingsNotice()}
        <fieldset className="boost-perk-editor" disabled={!canConfigureBoostPerks}>
        <div className="settings-row">
          <div>
            <strong>Mostrar barra de progresso das estrelas</strong>
            <p>Mostra a meta de estrelas acima da lista de canais.</p>
          </div>
          <ToggleSwitch checked={server.boostProgressVisible} onChange={(checked) => onUpdateServer({ boostProgressVisible: checked }, {
            action: "server_updated",
            target: server.name,
            details: checked ? "Barra de estrelas exibida." : "Barra de estrelas ocultada."
          })} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Mensagem quando alguem enviar uma estrela</strong>
            <p>Envia uma mensagem automatica no canal escolhido sempre que uma estrela entrar.</p>
          </div>
          <ToggleSwitch checked={server.boostMessageEnabled} onChange={updateBoostMessageEnabled} />
        </div>
        {server.boostMessageEnabled ? (
          <label>
            Canal da mensagem de estrela
            <select
              value={server.boostMessageChannelName ?? textChannels[0]?.name ?? ""}
              onChange={(event) => updateBoostMessageChannel(event.target.value)}
            >
              {textChannels.length ? (
                textChannels.map((channel) => (
                  <option key={`boost-message-${channel.name}`} value={channel.name}>
                    #{channel.name}
                  </option>
                ))
              ) : (
                <option value="">Nenhum canal de texto</option>
              )}
            </select>
          </label>
        ) : null}
        <div className="boost-locked-row">
          <div>
            <h3>Plano de fundo do convite do servidor <span>NV. 1</span></h3>
            <p>Esta imagem sera exibida quando o convite for visualizado em navegador.</p>
            {boostLevel >= 1 ? (
              <div className="boost-perk-form boost-upload-form">
                <label className="upload-button">
                  <Upload size={16} />
                  Enviar imagem do convite
                  <input type="file" accept="image/*" onChange={(event) => void loadBoostImage(event, setInviteBackgroundDraft, { width: 1920, height: 1080 })} />
                </label>
                <button type="button" onClick={() => saveBoostPerks({ inviteBackgroundUrl: inviteBackgroundDraft.trim() || null })}>
                  Salvar
                </button>
              </div>
            ) : (
              <button type="button" disabled>
                <Shield size={16} />
                Precisa de nivel 1
              </button>
            )}
          </div>
          <div
            className={inviteBackgroundPreview ? "boost-placeholder has-image" : "boost-placeholder"}
            style={inviteBackgroundPreview ? { backgroundImage: toCssImageUrl(inviteBackgroundPreview) } : undefined}
          >
            {inviteBackgroundPreview ? null : <ImageIcon size={24} />}
          </div>
        </div>
        <div className="boost-locked-row">
          <div>
            <h3>Fundo do banner de servidor <span>NV. 2</span></h3>
            <p>Esta imagem aparecera no topo da sua lista de canais.</p>
            {boostLevel >= 2 ? (
              <div className="boost-perk-form boost-upload-form">
                <label className="upload-button">
                  <Upload size={16} />
                  Enviar imagem como banner
                  <input type="file" accept="image/*" onChange={(event) => void loadBoostImage(event, setChannelBannerDraft, { width: 960, height: 540 })} />
                </label>
                <button type="button" onClick={() => saveBoostPerks({ channelBannerUrl: channelBannerDraft.trim() || null })}>
                  Salvar
                </button>
              </div>
            ) : (
              <button type="button" disabled>
                <Shield size={16} />
                Precisa de nivel 2
              </button>
            )}
          </div>
          <div
            className={channelBannerPreview ? "boost-placeholder has-image" : "boost-placeholder"}
            style={channelBannerPreview ? { backgroundImage: toCssImageUrl(channelBannerPreview) } : undefined}
          >
            {channelBannerPreview ? null : <ImageIcon size={24} />}
          </div>
        </div>
        <div className="boost-level-group">
          <div className="boost-level-group-heading">
            <span>NV. 3</span>
            <strong>Beneficios do nivel 3</strong>
          </div>
          <div className="boost-locked-row">
            <div>
              <h3>Link de convite personalizado <span>NV. 3</span></h3>
              <p>Traga outros para o seu servidor com um link personalizado.</p>
              {boostLevel >= 3 ? (
                <div className="boost-perk-form">
                  <input
                    value={customInviteDraft}
                    onChange={(event) => setCustomInviteDraft(normalizeTextChannelName(event.target.value).slice(0, 32))}
                    placeholder="minha-comunidade"
                  />
                  <button type="button" onClick={() => saveBoostPerks({ customInviteSlug: customInviteDraft.trim() || null })}>
                    Salvar
                  </button>
                </div>
              ) : (
                <button type="button" disabled>
                  <Shield size={16} />
                  Precisa de nivel 3
                </button>
              )}
            </div>
            <div className="custom-invite-preview">
              <span>tempest.gg/{server.boostPerks.customInviteSlug || customInviteDraft || "seu-servidor"}</span>
            </div>
          </div>
          <div className="boost-locked-row">
            <div>
              <h3>Banner animado do servidor <span>NV. 3</span></h3>
              <p>Use um GIF para animar o mesmo banner do topo da lista de canais.</p>
              {boostLevel >= 3 ? (
                <div className="boost-perk-form boost-upload-form">
                  <label className="upload-button">
                    <Upload size={16} />
                    Enviar GIF animado
                    <input type="file" accept="image/gif,image/webp,image/png,image/jpeg" onChange={(event) => void loadBoostImage(event, setAnimatedBannerDraft, { width: 960, height: 540 })} />
                  </label>
                  <button type="button" onClick={() => saveBoostPerks({ animatedBannerUrl: animatedBannerDraft.trim() || null })}>
                    Salvar
                  </button>
                </div>
              ) : (
                <button type="button" disabled>
                  <Shield size={16} />
                  Precisa de nivel 3
                </button>
              )}
            </div>
            <div
              className={animatedBannerPreview ? "boost-placeholder has-image" : "boost-placeholder"}
              style={animatedBannerPreview ? { backgroundImage: toCssImageUrl(animatedBannerPreview) } : undefined}
            >
              {animatedBannerPreview ? null : <ImageIcon size={24} />}
            </div>
          </div>
        </div>
        <div className="boost-locked-row">
          <div>
            <h3>Cor de destaque do servidor <span>NV. 4</span></h3>
            <p>Troca a cor principal de botoes, foco e barras deste servidor.</p>
            {boostLevel >= 4 ? (
              <div className="boost-perk-form">
                <input value={serverAccentDraft} onChange={(event) => setServerAccentDraft(event.target.value)} type="color" />
                <button type="button" onClick={() => saveBoostPerks({ serverAccentColor: serverAccentDraft })}>
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServerAccentDraft("#39c6a3");
                    saveBoostPerks({ serverAccentColor: null });
                  }}
                >
                  Resetar
                </button>
              </div>
            ) : (
              <button type="button" disabled>
                <Shield size={16} />
                Precisa de nivel 4
              </button>
            )}
          </div>
          <div className="boost-color-preview" style={{ background: serverAccentDraft }}>
            <Sparkles size={26} />
          </div>
        </div>
        <div className="boost-locked-row">
          <div>
            <h3>Cartao de boas-vindas visual <span>NV. 5</span></h3>
            <p>Mostra uma imagem destacada no topo do chat para receber membros.</p>
            {boostLevel >= 5 ? (
              <div className="boost-perk-form boost-upload-form">
                <label className="upload-button">
                  <Upload size={16} />
                  Enviar cartao
                  <input type="file" accept="image/*" onChange={(event) => void loadBoostImage(event, setWelcomeCardDraft, { width: 1280, height: 420 })} />
                </label>
                <button type="button" onClick={() => saveBoostPerks({ welcomeCardUrl: welcomeCardDraft.trim() || null })}>
                  Salvar
                </button>
              </div>
            ) : (
              <button type="button" disabled>
                <Shield size={16} />
                Precisa de nivel 5
              </button>
            )}
          </div>
          <div
            className={welcomeCardPreview ? "boost-placeholder has-image" : "boost-placeholder"}
            style={welcomeCardPreview ? { backgroundImage: toCssImageUrl(welcomeCardPreview) } : undefined}
          >
            {welcomeCardPreview ? null : <ImageIcon size={24} />}
          </div>
        </div>
        <div className="boost-locked-row">
          <div>
            <h3>Foto de perfil do servidor <span>NV. {SERVER_ICON_UNLOCK_LEVEL}</span></h3>
            <p>Mostra uma imagem propria na lateral, na Guia do servidor e no cartao publico.</p>
            {boostLevel >= SERVER_ICON_UNLOCK_LEVEL ? (
              <div className="boost-perk-form boost-upload-form">
                <label className="upload-button">
                  <Upload size={16} />
                  Enviar foto
                  <input type="file" accept="image/*" onChange={(event) => void loadBoostImage(event, setServerIconDraft, { width: 512, height: 512 })} />
                </label>
                <button type="button" onClick={saveServerIcon}>
                  Salvar
                </button>
              </div>
            ) : (
              <button type="button" disabled>
                <Shield size={16} />
                Precisa de nivel {SERVER_ICON_UNLOCK_LEVEL}
              </button>
            )}
          </div>
          <div
            className={serverIconPreview && boostLevel >= SERVER_ICON_UNLOCK_LEVEL ? "boost-placeholder server-icon-placeholder has-image" : "boost-placeholder server-icon-placeholder"}
            style={serverIconPreview && boostLevel >= SERVER_ICON_UNLOCK_LEVEL ? { backgroundImage: toCssImageUrl(serverIconPreview) } : undefined}
          >
            {serverIconPreview && boostLevel >= SERVER_ICON_UNLOCK_LEVEL ? null : <ImageIcon size={24} />}
          </div>
        </div>
        <div className="boost-locked-row">
          <div>
            <h3>Selo do servidor <span>NV. {SERVER_BADGE_UNLOCK_LEVEL}</span></h3>
            <p>Adiciona um selo curto ao lado do nome do servidor e libera paleta da barra de estrelas.</p>
            {boostLevel >= SERVER_BADGE_UNLOCK_LEVEL ? (
              <div className="boost-perk-form boost-palette-form">
                <div className="boost-palette-grid" role="radiogroup" aria-label="Tonalidade da barra de estrelas">
                  {starProgressPalettes.map((palette) => (
                    <button
                      className={starProgressPaletteDraft === palette.id ? "active" : ""}
                      key={palette.id}
                      style={{ background: getStarProgressGradient(palette.id) }}
                      title={palette.label}
                      type="button"
                      onClick={() => setStarProgressPaletteDraft(palette.id)}
                    >
                      <span>{palette.label}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => saveBoostPerks({ starProgressPalette: starProgressPaletteDraft })}>
                  Salvar barra
                </button>
              </div>
            ) : null}
            <div
              className="boost-progress-preview"
              style={{ "--star-progress-gradient": getStarProgressGradient(starProgressPaletteDraft) } as CSSProperties}
            >
              <span />
            </div>
            {boostLevel >= SERVER_BADGE_UNLOCK_LEVEL ? (
              <div className="boost-perk-form">
                <input
                  value={serverBadgeDraft}
                  onChange={(event) => setServerBadgeDraft(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  placeholder="ELITE"
                />
                <button type="button" onClick={() => saveBoostPerks({ serverBadgeText: serverBadgeDraft.trim() || null })}>
                  Salvar
                </button>
              </div>
            ) : (
              <button type="button" disabled>
                <Shield size={16} />
                Precisa de nivel {SERVER_BADGE_UNLOCK_LEVEL}
              </button>
            )}
          </div>
          <div className="custom-invite-preview">
            <span>{server.name} {serverBadgeDraft || server.boostPerks.serverBadgeText || "ELITE"}</span>
          </div>
        </div>
        <div className="boost-locked-row">
          <div>
            <h3>Tema lendario completo <span>NV. {SERVER_LEGENDARY_THEME_UNLOCK_LEVEL}</span></h3>
            <p>Ativa acabamento especial na interface do servidor para comunidades com alto nivel de estrelas.</p>
            {boostLevel >= SERVER_LEGENDARY_THEME_UNLOCK_LEVEL ? (
              <div className="boost-perk-form">
                <label className="checkbox-row">
                  <input checked={legendaryThemeDraft} onChange={(event) => setLegendaryThemeDraft(event.target.checked)} type="checkbox" />
                  Ativar tema lendario
                </label>
                <button type="button" onClick={() => saveBoostPerks({ legendaryThemeEnabled: legendaryThemeDraft })}>
                  Salvar
                </button>
              </div>
            ) : (
              <button type="button" disabled>
                <Shield size={16} />
                Precisa de nivel {SERVER_LEGENDARY_THEME_UNLOCK_LEVEL}
              </button>
            )}
          </div>
          <div className="boost-legendary-preview">
            <Sparkles size={28} />
            <strong>NV. {SERVER_LEGENDARY_THEME_UNLOCK_LEVEL}</strong>
          </div>
        </div>
        <div className="boost-locked-row">
          <div>
            <h3>Guia do servidor <span>NV. {SERVER_GUIDE_UNLOCK_LEVEL}</span></h3>
            <p>Libera a pagina inicial da comunidade com banner, convite e ate 10 canais principais.</p>
            {boostLevel >= SERVER_GUIDE_UNLOCK_LEVEL && server.communityEnabled ? (
              <div className="boost-perk-form server-guide-config">
                {boostLevel >= SERVER_GUIDE_BANNER_UNLOCK_LEVEL ? (
                  <label className="upload-button">
                    <Upload size={16} />
                    Enviar banner da Guia
                    <input type="file" accept="image/*" onChange={(event) => void loadBoostImage(event, setServerGuideBannerDraft, { width: 1920, height: 480 })} />
                  </label>
                ) : (
                  <button type="button" disabled>
                    <Shield size={16} />
                    Banner no nivel {SERVER_GUIDE_BANNER_UNLOCK_LEVEL}
                  </button>
                )}
                <div className="server-guide-channel-picker">
                  <strong>Canais principais ({serverGuideChannelDraft.length}/10)</strong>
                  {availableGuideChannels.length ? (
                    availableGuideChannels.map((channel) => {
                      const checked = serverGuideChannelDraft.includes(channel.name);
                      return (
                        <label className="checkbox-row" key={`server-guide-${channel.type}-${channel.name}`}>
                          <input
                            checked={checked}
                            disabled={!checked && serverGuideChannelDraft.length >= 10}
                            type="checkbox"
                            onChange={(event) => toggleServerGuideChannel(channel.name, event.target.checked)}
                          />
                          <span>
                            {channel.type === "voice" ? "Voz" : "Chat"} | {channel.name}
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <span>Nenhum canal publico disponivel.</span>
                  )}
                </div>
                <button type="button" onClick={saveServerGuidePerks}>
                  Salvar Guia
                </button>
              </div>
            ) : (
              <button type="button" disabled>
                <Shield size={16} />
                {server.communityEnabled ? `Precisa de nivel ${SERVER_GUIDE_UNLOCK_LEVEL}` : "Ative comunidade"}
              </button>
            )}
          </div>
          <div
            className={serverGuideBannerPreview ? "boost-placeholder has-image" : "boost-placeholder"}
            style={serverGuideBannerPreview ? { backgroundImage: toCssImageUrl(serverGuideBannerPreview) } : undefined}
          >
            {serverGuideBannerPreview ? null : <ImageIcon size={24} />}
          </div>
        </div>
        </fieldset>
        <div className="boost-reward-grid" aria-label="Trinta niveis de recompensas">
          {boostLevelTargets.map((target, index) => {
            const level = index + 1;
            const unlocked = boostLevel >= level;
            return (
              <article className={unlocked ? "boost-reward-card unlocked" : "boost-reward-card"} key={`boost-reward-${level}`}>
                <span>NV. {level}</span>
                <strong>{boostRewardLabels[index] ?? `Recompensa ${level}`}</strong>
                <small>{unlocked ? "Liberado" : `${activeBoosts.length}/${target} estrelas`}</small>
              </article>
            );
          })}
        </div>
        <div className="boost-list">
          {activeBoosts.length ? (
            activeBoosts.map((boost) => (
              <article className="boost-row" key={boost.id}>
                <Sparkles size={18} />
                <div>
                  <strong>Estrela ativa</strong>
                  <span>
                    {boost.appliedByName} - vence em {new Date(boost.expiresAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state compact-empty">
              <Sparkles size={28} />
              <p>Nenhuma estrela ativa neste servidor.</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderBotsView() {
    return (
      <section className="settings-main-column">
        <h2>Ponte Discord Developer Portal</h2>
        <p>Conecte os bots do seu Developer Portal pelo token. O app instalado valida o bot real no Discord e prepara a ponte para o Tempest.</p>
        <div className="bot-add-panel">
          <label>
            Token do bot no Discord Developer Portal
            <input
              value={botTokenDraft}
              onChange={(event) => setBotTokenDraft(event.target.value)}
              type="password"
              placeholder="Cole o token do bot"
              spellCheck={false}
            />
          </label>
          <label>
            Nome exibido no Tempest
            <input
              value={botNameDraft}
              onChange={(event) => setBotNameDraft(event.target.value)}
              maxLength={48}
              placeholder="Vazio usa o nome real do Developer Portal"
            />
          </label>
          <div className="bot-command-grid">
            <label>
              Prefixo de teste
              <input value={botPrefixDraft} onChange={(event) => setBotPrefixDraft(event.target.value.slice(0, 4))} maxLength={4} />
            </label>
            <label>
              Comando de teste
              <input
                value={botCommandDraft}
                onChange={(event) => setBotCommandDraft(event.target.value.replace(/\s+/g, "").slice(0, 24))}
                maxLength={24}
              />
            </label>
          </div>
          <label>
            Resposta de teste da ponte
            <input value={botReplyDraft} onChange={(event) => setBotReplyDraft(event.target.value)} maxLength={240} />
          </label>
          <div className="bot-config-section">
            <strong>Modulos de comandos</strong>
            <div className="bot-chip-grid">
              {defaultBotCommandModules.map((module) => (
                <label className="checkbox-row" key={`new-bot-module-${module}`}>
                  <input
                    checked={botModuleDraft.includes(module)}
                    onChange={(event) => toggleBotModuleDraft(module, event.target.checked)}
                    type="checkbox"
                  />
                  {botCommandModuleLabels[module]}
                </label>
              ))}
            </div>
          </div>
          <div className="bot-config-section">
            <strong>Canais onde comandos podem funcionar</strong>
            <label className="checkbox-row">
              <input checked={!botChannelDraft.length} onChange={() => setBotChannelDraft([])} type="checkbox" />
              Todos os canais de texto
            </label>
            {textChannels.length ? (
              <div className="bot-chip-grid">
                {textChannels.map((channel) => (
                  <label className="checkbox-row" key={`new-bot-channel-${channel.name}`}>
                    <input
                      checked={!botChannelDraft.length || botChannelDraft.includes(channel.name)}
                      onChange={(event) => toggleBotChannelDraft(channel.name, event.target.checked)}
                      type="checkbox"
                    />
                    #{channel.name}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
          <label className="checkbox-row bot-captcha-row">
            <input checked={botCaptchaChecked} onChange={(event) => setBotCaptchaChecked(event.target.checked)} type="checkbox" />
            Nao sou um robo
          </label>
          <Button variant="primary" type="button" onClick={() => void addBotFromToken()} disabled={!canManageServerSettings || botConnecting}>
            <Bot size={18} />
            {botConnecting ? "Conectando..." : "Conectar bot"}
          </Button>
        </div>
        {renderSettingsNotice()}
        <div className="bot-list">
          {server.bots.length ? (
            server.bots.map((bot) => (
              <article className="bot-row" key={bot.id}>
                {bot.bannerUrl ? <div className="bot-banner-preview" style={{ backgroundImage: toCssImageUrl(bot.bannerUrl) }} /> : null}
                <AvatarBadge user={bot} className="bot-avatar" />
                <div>
                  <strong>
                    {bot.displayName}
                    <span className="bot-badge">APP</span>
                  </strong>
                  <span>@{bot.username} - token {bot.tokenPreview}</span>
                  {bot.description ? <p>{bot.description}</p> : null}
                  <span>
                    Ponte: {bot.bridgeStatus === "connected" ? "Developer Portal conectado" : bot.bridgeStatus === "error" ? "erro de conexao" : "validacao pendente"}
                  </span>
                  <span>Status no Tempest: offline ate a ponte real do bot estar rodando.</span>
                  <span>Comandos: {bot.prefix}{bot.commandName}, {bot.prefix}help, {bot.prefix}play, {bot.prefix}ban, {bot.prefix}dado, {bot.prefix}saldo</span>
                  <span>Canais: {bot.commandChannelNames.length ? bot.commandChannelNames.map((channel) => `#${channel}`).join(", ") : "todos os canais de texto"}</span>
                  <small>Adicionado em {new Date(bot.addedAt).toLocaleString("pt-BR")}</small>
                </div>
                <ToggleSwitch checked={bot.runtimeEnabled} onChange={(checked) => updateBot(bot.id, { runtimeEnabled: checked })} />
                <div className="bot-inline-editor">
                  <input
                    defaultValue={bot.displayName}
                    onBlur={(event) => updateBot(bot.id, { displayName: event.target.value.slice(0, 48) })}
                    aria-label="Nome do bot"
                  />
                  <input
                    defaultValue={bot.prefix}
                    onBlur={(event) => updateBot(bot.id, { prefix: event.target.value.slice(0, 4) })}
                    aria-label="Prefixo do bot"
                  />
                  <input
                    defaultValue={bot.commandName}
                    onBlur={(event) => updateBot(bot.id, { commandName: event.target.value.replace(/\s+/g, "").slice(0, 24) })}
                    aria-label="Comando do bot"
                  />
                  <input
                    defaultValue={bot.replyText}
                    onBlur={(event) => updateBot(bot.id, { replyText: event.target.value.slice(0, 240) })}
                    aria-label="Resposta do bot"
                  />
                </div>
                <div className="bot-module-editor">
                  <strong>Modulos liberados</strong>
                  <div className="bot-chip-grid">
                    {defaultBotCommandModules.map((module) => (
                      <label className="checkbox-row" key={`${bot.id}-module-${module}`}>
                        <input
                          checked={bot.commandModules.includes(module)}
                          onChange={(event) => toggleSavedBotModule(bot, module, event.target.checked)}
                          type="checkbox"
                        />
                        {botCommandModuleLabels[module]}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="bot-channel-editor">
                  <strong>Canais de comandos</strong>
                  <label className="checkbox-row">
                    <input checked={!bot.commandChannelNames.length} onChange={() => updateBot(bot.id, { commandChannelNames: [] })} type="checkbox" />
                    Todos os canais de texto
                  </label>
                  {textChannels.length ? (
                    <div className="bot-chip-grid">
                      {textChannels.map((channel) => (
                        <label className="checkbox-row" key={`${bot.id}-channel-${channel.name}`}>
                          <input
                            checked={!bot.commandChannelNames.length || bot.commandChannelNames.includes(channel.name)}
                            onChange={(event) => toggleSavedBotChannel(bot, channel.name, event.target.checked)}
                            type="checkbox"
                          />
                          #{channel.name}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state compact-empty">
              <Bot size={28} />
              <p>Nenhum bot adicionado neste servidor.</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderAuditView() {
    return (
      <section className="settings-main-column">
        <h2>Registro de auditoria</h2>
        <div className="audit-catalog">
          {Object.entries(auditActionLabels).map(([action, label]) => (
            <span key={action}>{label}</span>
          ))}
        </div>
        <div className="audit-list">
          {server.auditLogs.length ? (
            server.auditLogs.map((log) => (
              <article className="audit-row" key={log.id}>
                <div>
                  <strong>{auditActionLabels[log.action]}</strong>
                  <span>{log.details}</span>
                </div>
                <small>{log.actorName} - {log.target} - {new Date(log.createdAt).toLocaleString("pt-BR")}</small>
              </article>
            ))
          ) : (
            <div className="empty-state compact-empty">
              <BookOpen size={30} />
              <p>Nenhum log registrado ainda.</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderCommunityWizard() {
    if (communityStep === 1) {
      return (
        <CommunityWizardFrame step={1}>
          <h2>Mantenha sua comunidade segura</h2>
          <label className="checkbox-row">
            <input checked={emailRequired} onChange={(event) => setEmailRequired(event.target.checked)} type="checkbox" />
            E-mail verificado necessario.
          </label>
          <label className="checkbox-row">
            <input checked={mediaFilter} onChange={(event) => setMediaFilter(event.target.checked)} type="checkbox" />
            Analisar midia de todos os membros.
          </label>
          <div className="wizard-actions">
            <Button variant="primary" type="button" disabled={!emailRequired || !mediaFilter} onClick={() => setCommunityStep(2)}>
              Proximo
            </Button>
          </div>
        </CommunityWizardFrame>
      );
    }

    if (communityStep === 2) {
      return (
        <CommunityWizardFrame step={2}>
          <h2>Prepare o basico</h2>
          <label>
            Canal de regras ou diretrizes
            <select value={rulesSelection} onChange={(event) => setRulesSelection(event.target.value)}>
              <option value={createOption}>Criar um para mim</option>
              {textChannels.map((channel) => (
                <option key={`rules-${channel.name}`} value={channel.name}>#{channel.name}</option>
              ))}
            </select>
          </label>
          <label>
            Canal de atualizacoes para a comunidade
            <select value={updatesSelection} onChange={(event) => setUpdatesSelection(event.target.value)}>
              <option value={createOption}>Criar um para mim</option>
              {textChannels.map((channel) => (
                <option key={`updates-${channel.name}`} value={channel.name}>#{channel.name}</option>
              ))}
            </select>
          </label>
          <div className="wizard-actions">
            <button className="modal-link-button" type="button" onClick={() => setCommunityStep(1)}>Voltar</button>
            <Button variant="primary" type="button" onClick={() => setCommunityStep(3)}>Proximo</Button>
          </div>
        </CommunityWizardFrame>
      );
    }

    return (
      <CommunityWizardFrame step={3}>
        <h2>So mais uma coisinha</h2>
        <div className="community-check-list">
          <span><CheckCircle2 size={16} /> Defina as configuracoes padrao para Apenas Mencoes</span>
          <span><CheckCircle2 size={16} /> Desativar permissoes arriscadas para @everyone</span>
        </div>
        <label className="checkbox-row">
          <input checked={agreeCommunity} onChange={(event) => setAgreeCommunity(event.target.checked)} type="checkbox" />
          Concordo e entendo
        </label>
        <div className="wizard-actions">
          <button className="modal-link-button" type="button" onClick={() => setCommunityStep(2)}>Voltar</button>
          <Button variant="primary" type="button" disabled={!agreeCommunity} onClick={finishCommunitySetup}>
            Terminar configuracao
          </Button>
        </div>
      </CommunityWizardFrame>
    );
  }

  function renderCommunityView() {
    if (communityStep) {
      return renderCommunityWizard();
    }

    if (!server.communityEnabled) {
      return (
        <section className="community-intro">
          <Globe2 size={44} />
          <h2>Voce esta montando uma comunidade?</h2>
          <p>Converta para um Servidor da Comunidade para acessar ferramentas de moderacao e crescimento.</p>
          <Button variant="primary" type="button" onClick={() => setCommunityStep(1)}>
            Habilitar comunidade
          </Button>
          <div className="community-benefits">
            <div><Sparkles size={20} /><strong>Desenvolva sua comunidade</strong></div>
            <div><ShieldCheck size={20} /><strong>Mantenha membros ativos</strong></div>
            <div><BellRing size={20} /><strong>Fique por dentro</strong></div>
          </div>
        </section>
      );
    }

    return (
      <section className="settings-main-column">
        <h2>Configuracoes da comunidade</h2>
        <div className="community-success">
          <ShieldCheck size={28} />
          <div>
            <strong>Seu servidor agora e um servidor da comunidade!</strong>
            <p>Agora voce tem acesso a ferramentas adicionais para moderar, administrar e desenvolver seu servidor.</p>
          </div>
        </div>
        {[
          ["rules", "Canal de regras ou diretrizes", server.rulesChannelName],
          ["updates", "Canal de atualizacoes para a comunidade", server.updatesChannelName],
          ["safety", "Canal de notificacoes de seguranca", server.safetyChannelName]
        ].map(([kind, label, value]) => (
          <label key={kind}>
            {label}
            <select value={value ?? ""} onChange={(event) => updateCommunitySelection(kind as CommunityChannelKind, event.target.value || null)}>
              <option value="">Selecionar...</option>
              {textChannels.map((channel) => (
                <option key={`${kind}-${channel.name}`} value={channel.name}>#{channel.name}</option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Idioma principal do servidor
          <select value={server.language} onChange={(event) => onUpdateServer({ language: event.target.value }, {
            action: "server_updated",
            target: server.name,
            details: "Idioma principal da comunidade atualizado."
          })}>
            <option value="pt-BR">Portugues do Brasil</option>
            <option value="en">English</option>
            <option value="es">Espanol</option>
          </select>
        </label>
        <label>
          Descricao do Servidor
          <textarea value={server.description} onChange={(event) => onUpdateServer({ description: event.target.value }, {
            action: "server_updated",
            target: server.name,
            details: "Descricao da comunidade atualizada."
          })} />
        </label>
        <div className="settings-row danger-row">
          <div>
            <strong>Desabilitar comunidade</strong>
            <p>Remove recursos especificos para servidores das comunidades.</p>
          </div>
          <Button variant="danger" type="button" onClick={disableCommunity}>
            Desabilitar comunidade
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="modal-backdrop settings-backdrop" role="presentation">
      <section className="server-settings-panel" aria-label="Configuracoes do servidor">
        <aside className="settings-nav">
          <strong>{server.name}</strong>
          {canAdministerServerSettings ? (
            <>
          <button className={view === "profile" ? "active" : ""} type="button" onClick={() => setView("profile")}>Perfil do servidor</button>
          <button className={view === "tag" ? "active" : ""} type="button" onClick={() => setView("tag")}>Tag do servidor</button>
          <button className={view === "engagement" ? "active" : ""} type="button" onClick={() => setView("engagement")}>Engajamento</button>
            </>
          ) : null}
          <button className={view === "boosts" ? "active" : ""} type="button" onClick={() => setView("boosts")}>Vantagens de Estrelas</button>
          {canAdministerServerSettings ? (
            <>
          <span>EXPRESSOES</span>
          <button className={view === "emoji" ? "active" : ""} type="button" onClick={() => setView("emoji")}>Emoji</button>
          <button className={view === "stickers" ? "active" : ""} type="button" onClick={() => setView("stickers")}>Figurinhas</button>
          <button className={view === "soundboard" ? "active" : ""} type="button" onClick={() => setView("soundboard")}>Painel de efeitos sonoros</button>
          <span>PESSOAS</span>
          <button className={view === "members" ? "active" : ""} type="button" onClick={() => setView("members")}>Membros</button>
          <button className={view === "roles" ? "active" : ""} type="button" onClick={() => setView("roles")}>Cargos</button>
          <button className={view === "invites" ? "active" : ""} type="button" onClick={() => setView("invites")}>Convites</button>
          <button className={view === "access" ? "active" : ""} type="button" onClick={() => setView("access")}>Acesso</button>
          <span>APPS</span>
          <button className={view === "integrations" ? "active" : ""} type="button" onClick={() => setView("integrations")}>Integracoes</button>
          <button className={view === "appDirectory" ? "active" : ""} type="button" onClick={() => setView("appDirectory")}>Diretorio de Apps</button>
          <button className={view === "bots" ? "active" : ""} type="button" onClick={() => setView("bots")}>Bots</button>
          <span>MODERACAO</span>
          <button className={view === "security" ? "active" : ""} type="button" onClick={() => setView("security")}>Configuracoes de Seguranca</button>
          <button className={view === "audit" ? "active" : ""} type="button" onClick={() => setView("audit")}>Registro de auditoria</button>
          <button className={view === "bans" ? "active" : ""} type="button" onClick={() => setView("bans")}>Banimentos</button>
          <button className={view === "automod" ? "active" : ""} type="button" onClick={() => setView("automod")}>AutoMod</button>
          <span>COMUNIDADE</span>
          <button className={view === "community" ? "active" : ""} type="button" onClick={() => setView("community")}>
            {server.communityEnabled ? "Visao geral da comunidade" : "Habilitar comunidade"}
          </button>
          <button className={view === "onboarding" ? "active" : ""} type="button" onClick={() => setView("onboarding")}>Onboarding</button>
          <button className={view === "analytics" ? "active" : ""} type="button" onClick={() => setView("analytics")}>Analises do servidor</button>
            </>
          ) : null}
        </aside>
        <main className="settings-body">
          <button className="settings-close" title="Fechar" type="button" onClick={onClose}>
            <X size={22} />
            <span>ESC</span>
          </button>
          {view === "profile"
            ? renderProfileView()
            : view === "tag"
            ? renderTagView()
            : view === "engagement"
            ? renderEngagementView()
            : view === "emoji"
            ? renderEmojiView()
            : view === "stickers"
            ? renderStickersView()
            : view === "soundboard"
            ? renderSoundboardView()
            : view === "members"
            ? renderMembersView()
            : view === "roles"
            ? renderRolesView()
            : view === "invites"
            ? renderInvitesView()
            : view === "access"
            ? renderAccessView()
            : view === "integrations"
            ? renderIntegrationsView()
            : view === "appDirectory"
            ? renderAppDirectoryView()
            : view === "bots"
            ? renderBotsView()
            : view === "security"
            ? renderSecurityView()
            : view === "boosts"
            ? renderBoostsView()
            : view === "audit"
            ? renderAuditView()
            : view === "bans"
            ? renderBansView()
            : view === "automod"
            ? renderAutomodView()
            : view === "onboarding"
            ? renderOnboardingView()
            : view === "analytics"
            ? renderAnalyticsView()
            : renderCommunityView()}
        </main>
      </section>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={checked ? "switch on" : "switch"}
      role="switch"
      aria-checked={checked}
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

function CommunityWizardFrame({ step, children }: { step: 1 | 2 | 3; children: ReactNode }) {
  return (
    <div className="community-wizard">
      <aside>
        <h2>Vamos configurar seu Servidor da Comunidade.</h2>
        {[
          [1, "Verificacoes de seguranca"],
          [2, "Preparacao basica"],
          [3, "Toques finais"]
        ].map(([value, label]) => (
          <span className={step === value ? "active" : ""} key={value}>
            <b>{value}</b>
            {label}
          </span>
        ))}
        <div className="community-house" />
      </aside>
      <section>{children}</section>
    </div>
  );
}

function CreateServerDialog({
  step,
  defaultName,
  purpose,
  templateId,
  onBack,
  onClose,
  onStartPersonalize,
  onOpenDiscover,
  onOpenDiscordImport,
  onPickPurpose,
  onPickTemplate,
  onCreate,
  onImportDiscordTemplate
}: {
  step: CreateServerStep;
  defaultName: string;
  purpose: ServerPurpose;
  templateId: ServerTemplateId;
  onBack: () => void;
  onClose: () => void;
  onStartPersonalize: () => void;
  onOpenDiscover: () => void;
  onOpenDiscordImport: () => void;
  onPickPurpose: (purpose: ServerPurpose) => void;
  onPickTemplate: (templateId: ServerTemplateId) => void;
  onCreate: (name: string, purpose: ServerPurpose, templateId: ServerTemplateId) => void;
  onImportDiscordTemplate: (templateInput: string) => Promise<void>;
}) {
  const [name, setName] = useState(defaultName);
  const [discordTemplateUrl, setDiscordTemplateUrl] = useState("");
  const [importingDiscordTemplate, setImportingDiscordTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedTemplate = getServerTemplate(templateId);
  const templateCounts = getTemplateCounts(selectedTemplate);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Escolha um nome para o servidor.");
      return;
    }

    onCreate(trimmedName, purpose, templateId);
  }

  async function submitDiscordImport(event: FormEvent) {
    event.preventDefault();
    const trimmedInput = discordTemplateUrl.trim();
    if (!trimmedInput) {
      setError("Cole um link discord.new ou codigo de template. Convite discord.gg nao traz a estrutura completa do servidor.");
      return;
    }

    setImportingDiscordTemplate(true);
    setError(null);

    try {
      await onImportDiscordTemplate(trimmedInput);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel importar esse modelo.");
    } finally {
      setImportingDiscordTemplate(false);
    }
  }

  if (step === "start") {
    return (
      <div className="modal-backdrop" role="presentation">
        <section className="modal-panel server-create" aria-label="Criar seu servidor">
          <header className="modal-header">
            <div>
              <h2>Criar seu servidor</h2>
              <p>Seu servidor e onde voce e seus amigos se reunem.</p>
            </div>
            <button className="icon-button" title="Fechar" type="button" onClick={onClose}>
              <X size={17} />
            </button>
          </header>

          <button className="server-option" type="button" onClick={onStartPersonalize}>
            <MessagesSquare size={20} />
            <span>
              <strong>Criar o meu</strong>
              <small>{getTemplateSummary(getServerTemplate("blank"))}</small>
            </span>
            <ChevronRight size={18} />
          </button>

          <button className="server-option" type="button" onClick={onOpenDiscordImport}>
            <Download size={20} />
            <span>
              <strong>Importar modelo do Discord</strong>
              <small>Cole um link discord.new e crie a estrutura aqui</small>
            </span>
            <ChevronRight size={18} />
          </button>

          <h3>COMECAR DE UM MOLDE</h3>
          {serverTemplates
            .filter((template) => template.id !== "blank")
            .map((template) => (
              <button className="server-option" type="button" onClick={() => onPickTemplate(template.id)} key={template.id}>
                <ServerTemplateIcon templateId={template.id} />
                <span>
                  <strong>{template.name}</strong>
                  <small>{getTemplateSummary(template)}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}

          <div className="invite-block">
            <strong>Ja tem um convite?</strong>
            <button type="button" onClick={onOpenDiscover}>
              Entrar em um servidor
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (step === "discord") {
    return (
      <div className="modal-backdrop" role="presentation">
        <section className="modal-panel server-create" aria-label="Importar modelo do Discord">
          <header className="modal-header">
            <div>
              <h2>Importar modelo do Discord</h2>
              <p>Cole o link publico do template para criar um servidor no Tempest Light.</p>
            </div>
            <button className="icon-button" title="Fechar" type="button" onClick={onClose}>
              <X size={17} />
            </button>
          </header>

          <form className="profile-form" onSubmit={submitDiscordImport}>
            <label>
              Link ou codigo do modelo
              <input
                value={discordTemplateUrl}
                onChange={(event) => setDiscordTemplateUrl(event.target.value)}
                placeholder="https://discord.new/5cp3V3RFgaP2"
                spellCheck={false}
                required
              />
            </label>
            <div className="template-preview">
              <div>
                <strong>O que entra na migracao</strong>
                <span>Categorias, canais de texto, canais de voz, cargos e permissoes do template.</span>
              </div>
              <small>Mensagens antigas, membros reais e bots nao fazem parte do link de template publico.</small>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="modal-actions">
              <button className="modal-link-button" type="button" onClick={onBack} disabled={importingDiscordTemplate}>
                Voltar
              </button>
              <Button variant="primary" type="submit" disabled={importingDiscordTemplate}>
                <Download size={18} />
                {importingDiscordTemplate ? "Importando..." : "Importar"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  if (step === "purpose") {
    return (
      <div className="modal-backdrop" role="presentation">
        <section className="modal-panel server-create" aria-label="Tipo de servidor">
          <header className="modal-header">
            <div>
              <h2>Conte-nos mais sobre o seu servidor</h2>
              <p>Seu novo servidor e para alguns amigos ou uma grande comunidade?</p>
            </div>
            <button className="icon-button" title="Fechar" type="button" onClick={onClose}>
              <X size={17} />
            </button>
          </header>

          <button className="server-option" type="button" onClick={() => onPickPurpose("friends")}>
            <Heart size={20} />
            <span>Para meus amigos e eu</span>
            <ChevronRight size={18} />
          </button>
          <button className="server-option" type="button" onClick={() => onPickPurpose("community")}>
            <Globe2 size={20} />
            <span>Para um clube ou comunidade</span>
            <ChevronRight size={18} />
          </button>
          <p className="skip-copy">
            Nao sabe? <button type="button" onClick={() => onPickPurpose("community")}>Voce pode pular essa pergunta</button>.
          </p>
          <button className="modal-link-button" type="button" onClick={onBack}>
            Voltar
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel server-create" aria-label="Personalizar servidor">
        <header className="modal-header">
          <div>
            <h2>Personalize o seu servidor</h2>
            <p>Deixe seu novo servidor com a sua cara. O icone pode ser mudado depois.</p>
          </div>
          <button className="icon-button" title="Fechar" type="button" onClick={onClose}>
            <X size={17} />
          </button>
        </header>

        <form className="profile-form" onSubmit={submit}>
          <div className="server-icon-upload">
            <Camera size={24} />
            <Plus size={18} />
            <span>ENVIAR</span>
          </div>
          <label>
            Nome do servidor
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={48} required />
          </label>
          <div className="template-preview" aria-label="Resumo do modelo escolhido">
            <div>
              <strong>Modelo: {selectedTemplate.name}</strong>
              <span>{selectedTemplate.description}</span>
            </div>
            <div className="template-stats">
              <span>
                <Hash size={14} />
                {templateCounts.text} texto
              </span>
              <span>
                <Volume2 size={14} />
                {templateCounts.voice} voz
              </span>
              <span>
                <ShieldCheck size={14} />
                {templateCounts.roles} cargos
              </span>
            </div>
            <small>{selectedTemplate.isDiscoverable ? "Pode aparecer no Descubra." : "Nasce particular; voce pode liberar no Descubra depois."}</small>
          </div>
          <p className="legal-copy">Ao criar um servidor, voce concorda com as diretrizes da comunidade do Tempest Light.</p>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="modal-actions">
            <button className="modal-link-button" type="button" onClick={onBack}>
              Voltar
            </button>
            <Button variant="primary" type="submit">
              Criar
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CreateCategoryDialog({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedName = name.trim().toUpperCase();
    if (!normalizedName) {
      setError("Escolha um nome para a categoria.");
      return;
    }

    onCreate(normalizedName);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel compact" aria-label="Criar categoria">
        <header className="modal-header">
          <div>
            <h2>Criar categoria</h2>
            <p>Organize chats e canais de voz por assunto.</p>
          </div>
          <button className="icon-button" title="Fechar" type="button" onClick={onClose}>
            <X size={17} />
          </button>
        </header>

        <form className="profile-form" onSubmit={submit}>
          <label>
            Nome
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={36} required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <Button variant="primary" type="submit">
            <FolderPlus size={18} />
            Criar categoria
          </Button>
        </form>
      </section>
    </div>
  );
}

function MentionInboxDialog({
  notifications,
  onClose,
  onOpen,
  onMarkAllRead,
  onClear
}: {
  notifications: MentionNotification[];
  onClose: () => void;
  onOpen: (notification: MentionNotification) => void;
  onMarkAllRead: () => void;
  onClear: () => void;
}) {
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel compact mention-inbox-panel" aria-label="Mencoes">
        <header className="modal-header">
          <div>
            <h2>Mencoes</h2>
            <p>{unreadCount ? `${unreadCount} nao lida${unreadCount === 1 ? "" : "s"}` : "Tudo lido"}</p>
          </div>
          <button className="icon-button" title="Fechar" type="button" onClick={onClose}>
            <X size={17} />
          </button>
        </header>

        <div className="mention-inbox-actions">
          <button type="button" onClick={onMarkAllRead} disabled={!notifications.length}>
            <CheckCircle2 size={16} />
            Marcar lidas
          </button>
          <button type="button" onClick={onClear} disabled={!notifications.length}>
            <X size={16} />
            Limpar
          </button>
        </div>

        <div className="mention-inbox-list">
          {notifications.length ? (
            notifications.map((notification) => (
              <button
                className={notification.read ? "mention-inbox-item" : "mention-inbox-item unread"}
                key={notification.id}
                type="button"
                onClick={() => onOpen(notification)}
              >
                <span className="mention-inbox-icon">
                  <BellRing size={16} />
                </span>
                <span>
                  <strong>{notification.authorName}</strong>
                  <small>
                    #{notification.channelName} em {notification.serverName}
                  </small>
                  <em>{notification.messageText}</em>
                </span>
                <time>
                  {new Date(notification.createdAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </time>
              </button>
            ))
          ) : (
            <div className="empty-state compact-empty">
              <Bell size={28} />
              <p>Nenhuma mencao recebida ainda.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ServerPrivacyDialog({
  server,
  onClose,
  onSave
}: {
  server: ServerDefinition;
  onClose: () => void;
  onSave: (isDiscoverable: boolean) => void;
}) {
  const [isDiscoverable, setIsDiscoverable] = useState(server.isDiscoverable);

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel compact" aria-label="Configuracao de privacidade">
        <header className="modal-header">
          <div>
            <h2>Privacidade</h2>
            <p>{server.name}</p>
          </div>
          <button className="icon-button" title="Fechar" type="button" onClick={onClose}>
            <X size={17} />
          </button>
        </header>
        <div className="profile-form">
          <label className="checkbox-row">
            <input checked={isDiscoverable} onChange={(event) => setIsDiscoverable(event.target.checked)} type="checkbox" />
            Mostrar este servidor no Descubra
          </label>
          <Button variant="primary" type="button" onClick={() => onSave(isDiscoverable)}>
            <ShieldCheck size={18} />
            Salvar privacidade
          </Button>
        </div>
      </section>
    </div>
  );
}

function ServerNotificationDialog({
  server,
  onClose,
  onSave
}: {
  server: ServerDefinition;
  onClose: () => void;
  onSave: (notificationsEnabled: boolean) => void;
}) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(server.notificationsEnabled);

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel compact" aria-label="Configuracao de notificacao">
        <header className="modal-header">
          <div>
            <h2>Notificacao</h2>
            <p>{server.name}</p>
          </div>
          <button className="icon-button" title="Fechar" type="button" onClick={onClose}>
            <X size={17} />
          </button>
        </header>
        <div className="profile-form">
          <label className="checkbox-row">
            <input checked={notificationsEnabled} onChange={(event) => setNotificationsEnabled(event.target.checked)} type="checkbox" />
            Receber notificacoes de mensagens deste servidor
          </label>
          <Button variant="primary" type="button" onClick={() => onSave(notificationsEnabled)}>
            <BellRing size={18} />
            Salvar notificacoes
          </Button>
        </div>
      </section>
    </div>
  );
}

function VoiceChannelSettingsDialog({
  channel,
  onClose,
  onSave
}: {
  channel: ChannelDefinition;
  onClose: () => void;
  onSave: (userLimit: number | null) => void;
}) {
  const [limitEnabled, setLimitEnabled] = useState(Boolean(channel.userLimit));
  const [userLimit, setUserLimit] = useState(channel.userLimit ?? 25);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave(limitEnabled ? Math.min(Math.max(Math.floor(userLimit) || 1, 1), 99) : null);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel compact" aria-label="Configurar canal de voz">
        <header className="modal-header">
          <div>
            <h2>{channel.name}</h2>
            <p>Limite de usuarios da call</p>
          </div>
          <button className="icon-button" title="Fechar" type="button" onClick={onClose}>
            <X size={17} />
          </button>
        </header>

        <form className="profile-form" onSubmit={submit}>
          <label className="checkbox-row">
            <input checked={limitEnabled} onChange={(event) => setLimitEnabled(event.target.checked)} type="checkbox" />
            Definir limite de usuarios
          </label>
          {limitEnabled ? (
            <label>
              Limite
              <input
                type="number"
                min={1}
                max={99}
                value={userLimit}
                onChange={(event) => setUserLimit(Number(event.target.value) || 1)}
              />
            </label>
          ) : null}
          <Button variant="primary" type="submit">
            <CheckCircle2 size={18} />
            Salvar canal de voz
          </Button>
        </form>
      </section>
    </div>
  );
}

function CreateChannelDialog({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: (channel: ChannelDefinition) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ChannelKind>("text");
  const [isPrivate, setIsPrivate] = useState(false);
  const [voiceLimitEnabled, setVoiceLimitEnabled] = useState(false);
  const [voiceUserLimit, setVoiceUserLimit] = useState(25);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedName =
      type === "text"
        ? name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9_.-]/g, "")
        : name.trim();

    if (!normalizedName) {
      setError("Escolha um nome para o canal.");
      return;
    }

    onCreate({
      name: normalizedName,
      type,
      isPrivate,
      userLimit: type === "voice" && voiceLimitEnabled ? Math.min(Math.max(Math.floor(voiceUserLimit) || 1, 1), 99) : null
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel compact" aria-label="Criar canal">
        <header className="modal-header">
          <div>
            <h2>Criar canal</h2>
            <p>Texto ou voz, publico ou privado</p>
          </div>
          <button className="icon-button" title="Fechar" type="button" onClick={onClose}>
            <X size={17} />
          </button>
        </header>

        <form className="profile-form" onSubmit={submit}>
          <label>
            Nome
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required />
          </label>

          <div className="channel-type-picker" role="radiogroup" aria-label="Tipo de canal">
            <button className={type === "text" ? "active" : ""} type="button" onClick={() => setType("text")}>
              <Hash size={17} />
              Texto
            </button>
            <button className={type === "voice" ? "active" : ""} type="button" onClick={() => setType("voice")}>
              <Volume2 size={17} />
              Voz
            </button>
          </div>

          <label className="checkbox-row">
            <input checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} type="checkbox" />
            Canal privado
          </label>

          {type === "voice" ? (
            <>
              <label className="checkbox-row">
                <input checked={voiceLimitEnabled} onChange={(event) => setVoiceLimitEnabled(event.target.checked)} type="checkbox" />
                Limitar quantidade de usuarios
              </label>
              {voiceLimitEnabled ? (
                <label>
                  Limite da call
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={voiceUserLimit}
                    onChange={(event) => setVoiceUserLimit(Number(event.target.value) || 1)}
                  />
                </label>
              ) : null}
            </>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}
          <Button variant="primary" type="submit">
            <Plus size={18} />
            Criar canal
          </Button>
        </form>
      </section>
    </div>
  );
}

function ThemeSwitch({ theme, setTheme }: { theme: ThemeMode; setTheme: (theme: ThemeMode) => void }) {
  const options: Array<{ value: ThemeMode; icon: typeof Monitor; label: string }> = [
    { value: "system", icon: Monitor, label: "Sistema" },
    { value: "dark", icon: Moon, label: "Escuro" },
    { value: "light", icon: Sun, label: "Claro" }
  ];

  return (
    <div className="theme-switch" role="group" aria-label="Tema">
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            className={theme === option.value ? "active" : ""}
            onClick={() => setTheme(option.value)}
            title={option.label}
            type="button"
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
