interface TempestLightDesktopAppInfo {
  name: string;
  version: string;
  packaged: boolean;
  platform: string;
  arch: string;
  updateFeedUrl: string | null;
  updateFeedConfigured: boolean;
}

interface TempestLightDesktopUpdateResult {
  status: "unsupported" | "not_configured" | "current" | "available" | "error";
  version?: string;
  notes?: string | null;
  message?: string;
}

interface TempestLightDesktopInstallResult {
  ok: boolean;
  message?: string;
}

interface TempestLightDesktopUpdateProgress {
  percent: number;
  transferred: number;
  total: number;
}

interface TempestLightDesktopDeepLinkPayload {
  url: string;
}

interface TempestLightDiscordTemplateResult {
  ok: boolean;
  code?: string;
  template?: unknown;
  message?: string;
}

interface TempestLightDiscordBotInfoResult {
  ok: boolean;
  id?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  bot?: boolean;
  message?: string;
}

interface TempestLightDesktopCaptureSource {
  id: string;
  name: string;
  type: "screen" | "window";
  displayId: string | null;
  thumbnailDataUrl: string | null;
}

interface TempestLightDesktopCaptureSourcesResult {
  ok: boolean;
  sources?: TempestLightDesktopCaptureSource[];
  message?: string;
}

interface Window {
  tempestLightDesktop?: {
    getAppInfo(): Promise<TempestLightDesktopAppInfo>;
    checkForUpdates(): Promise<TempestLightDesktopUpdateResult>;
    installUpdate(): Promise<TempestLightDesktopInstallResult>;
    importDiscordTemplate(templateUrl: string): Promise<TempestLightDiscordTemplateResult>;
    getDiscordBotInfo(token: string): Promise<TempestLightDiscordBotInfoResult>;
    getDisplaySources(options?: { mode?: "screen" | "game" }): Promise<TempestLightDesktopCaptureSourcesResult>;
    getInitialDeepLink(): Promise<string | null>;
    openExternal(url: string): Promise<{ ok: boolean }>;
    onDeepLink(callback: (payload: TempestLightDesktopDeepLinkPayload) => void): () => void;
    onUpdateProgress(callback: (progress: TempestLightDesktopUpdateProgress) => void): () => void;
  };
}
