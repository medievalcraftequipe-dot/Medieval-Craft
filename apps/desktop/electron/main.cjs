const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const http = require("node:http");
const https = require("node:https");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { app, BrowserWindow, desktopCapturer, ipcMain, session, shell } = require("electron");

const runtimeConfig = readRuntimeConfig();
const isDev = !app.isPackaged;
const protocolScheme = "tempest-light";

let mainWindow = null;
let latestManifest = null;
let pendingDeepLink = null;
let latestDeepLink = null;
const hasSingleInstanceLock = app.requestSingleInstanceLock();

function readRuntimeConfig() {
  const configPath = path.join(__dirname, "config.json");

  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return {};
  }
}

function isUpdateFeedConfigured() {
  const url = typeof runtimeConfig.updateFeedUrl === "string" ? runtimeConfig.updateFeedUrl.trim() : "";
  return Boolean(url && !/SEU_USUARIO|SEU_REPOSITORIO/i.test(url));
}

function getUpdateDataDir() {
  try {
    return path.join(app.getPath("userData"), "updates");
  } catch {
    return path.join(os.tmpdir(), "Tempest Light", "updates");
  }
}

function getUpdateLogPath() {
  const logDir = path.join(getUpdateDataDir(), "logs");
  fs.mkdirSync(logDir, { recursive: true });
  return path.join(logDir, "updater.log");
}

function getUpdateStatePath() {
  return path.join(getUpdateDataDir(), "last-update-attempt.json");
}

function formatUpdateLogDetails(details) {
  if (details == null) {
    return "";
  }

  if (details instanceof Error) {
    return ` ${details.stack || details.message}`;
  }

  try {
    return ` ${JSON.stringify(details)}`;
  } catch {
    return ` ${String(details)}`;
  }
}

function writeUpdateLog(message, details) {
  try {
    fs.appendFileSync(getUpdateLogPath(), `[${new Date().toISOString()}] ${message}${formatUpdateLogDetails(details)}${os.EOL}`, "utf8");
  } catch {
    // Logging must never block startup or the update flow.
  }
}

function readUpdateState() {
  try {
    return JSON.parse(fs.readFileSync(getUpdateStatePath(), "utf8"));
  } catch {
    return null;
  }
}

function writeUpdateState(state) {
  try {
    const statePath = getUpdateStatePath();
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
  } catch (error) {
    writeUpdateLog("Failed to persist update state.", error);
  }
}

function getRecentFailedUpdate(manifestVersion) {
  const state = readUpdateState();
  if (!state || state.status !== "failed" || state.targetVersion !== manifestVersion) {
    return null;
  }

  const finishedAt = Date.parse(state.finishedAt ?? "");
  if (!Number.isFinite(finishedAt)) {
    return state;
  }

  return Date.now() - finishedAt < 10 * 60 * 1000 ? state : null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "Tempest Light",
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 680,
    icon: path.join(__dirname, "..", "build", "icon.ico"),
    backgroundColor: "#141817",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  const devUrl = process.env.TEMPEST_LIGHT_DESKTOP_DEV_URL;

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) {
      void shell.openExternal(url);
    }

    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowedOrigin = isDev && devUrl ? new URL(devUrl).origin : "file://";

    if (!url.startsWith(allowedOrigin)) {
      event.preventDefault();

      if (/^https:\/\//i.test(url)) {
        void shell.openExternal(url);
      }
    }
  });

  if (isDev && devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "..", "dist-web", "index.html"));
  }

  mainWindow.webContents.once("did-finish-load", () => {
    if (pendingDeepLink) {
      sendDeepLinkToWindow(pendingDeepLink);
      pendingDeepLink = null;
    }
  });
}

function registerDisplayMediaHandler() {
  if (!session.defaultSession?.setDisplayMediaRequestHandler || !desktopCapturer?.getSources) {
    return;
  }

  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer
      .getSources({ types: ["screen", "window"] })
      .then((sources) => {
        const preferredSource = sources.find((source) => source.id.startsWith("screen:")) ?? sources[0];
        if (!preferredSource) {
          callback({});
          return;
        }

        callback({ video: preferredSource, audio: false });
      })
      .catch(() => callback({}));
  }, { useSystemPicker: true });
}

function isTempestDeepLink(value) {
  return typeof value === "string" && value.trim().toLowerCase().startsWith(`${protocolScheme}://`);
}

function handleDeepLink(deepLink) {
  if (!isTempestDeepLink(deepLink)) {
    return;
  }

  latestDeepLink = deepLink;

  if (!mainWindow || mainWindow.isDestroyed()) {
    pendingDeepLink = deepLink;
    if (app.isReady()) {
      createWindow();
    }
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
  sendDeepLinkToWindow(deepLink);
}

function sendDeepLinkToWindow(deepLink) {
  mainWindow?.webContents.send("launcher:deep-link", { url: deepLink });
}

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    const deepLink = commandLine.find((argument) => isTempestDeepLink(argument));
    if (deepLink) {
      handleDeepLink(deepLink);
    }
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });
}

if (process.defaultApp) {
  app.setAsDefaultProtocolClient(protocolScheme, process.execPath, [path.resolve(process.argv[1] ?? "")]);
} else {
  app.setAsDefaultProtocolClient(protocolScheme);
}

if (hasSingleInstanceLock) {
  const initialDeepLink = process.argv.find((argument) => isTempestDeepLink(argument));
  if (initialDeepLink) {
    latestDeepLink = initialDeepLink;
    pendingDeepLink = initialDeepLink;
  }

  app.whenReady().then(() => {
    registerYoutubeEmbedHeaders();
    registerDisplayMediaHandler();
    registerIpc();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function registerYoutubeEmbedHeaders() {
  const filter = {
    urls: [
      "https://*.youtube.com/*",
      "https://youtube.com/*",
      "https://*.youtube-nocookie.com/*",
      "https://youtube-nocookie.com/*",
      "https://*.googlevideo.com/*",
      "https://*.ytimg.com/*"
    ]
  };

  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    const hasReferer = Object.keys(requestHeaders).some((name) => name.toLowerCase() === "referer");
    const hasOrigin = Object.keys(requestHeaders).some((name) => name.toLowerCase() === "origin");

    if (!hasReferer) {
      requestHeaders.Referer = "https://www.youtube.com/";
    }

    if (!hasOrigin && ["subFrame", "script", "xhr"].includes(details.resourceType)) {
      requestHeaders.Origin = "https://www.youtube.com";
    }

    callback({ requestHeaders });
  });
}

function registerIpc() {
  ipcMain.handle("launcher:get-app-info", () => ({
    name: app.getName(),
    version: app.getVersion(),
    packaged: app.isPackaged,
    platform: process.platform,
    arch: process.arch,
    updateFeedUrl: runtimeConfig.updateFeedUrl ?? null,
    updateFeedConfigured: isUpdateFeedConfigured()
  }));

  ipcMain.handle("launcher:open-external", async (_event, url) => {
    if (typeof url !== "string" || !/^https:\/\//i.test(url)) {
      return { ok: false };
    }

    await shell.openExternal(url);
    return { ok: true };
  });

  ipcMain.handle("launcher:get-display-sources", async (_event, options) => {
    const mode = options?.mode === "game" ? "game" : "screen";

    try {
      const sources = await desktopCapturer.getSources({
        types: mode === "game" ? ["window"] : ["screen"],
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: true
      });

      return {
        ok: true,
        sources: sources.map((source) => ({
          id: source.id,
          name: source.name,
          type: source.id.startsWith("window:") ? "window" : "screen",
          displayId: source.display_id || null,
          thumbnailDataUrl: source.thumbnail?.isEmpty?.() ? null : source.thumbnail?.toDataURL() ?? null
        }))
      };
    } catch {
      return {
        ok: false,
        message: "Nao consegui listar as telas e janelas deste computador."
      };
    }
  });

  ipcMain.handle("launcher:get-initial-deep-link", () => latestDeepLink);

  ipcMain.handle("launcher:import-discord-template", async (_event, templateInput) => {
    const templateCode = parseDiscordTemplateCode(templateInput);
    if (!templateCode) {
      return {
        ok: false,
        message: "Cole um link discord.new ou codigo de template valido. Convites discord.gg nao trazem a estrutura completa do servidor."
      };
    }

    try {
      const template = await fetchDiscordGuildTemplate(templateCode);
      return {
        ok: true,
        code: templateCode,
        template
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Nao foi possivel importar o modelo do Discord."
      };
    }
  });

  ipcMain.handle("launcher:get-discord-bot-info", async (_event, tokenInput) => {
    const token = String(tokenInput ?? "").trim();
    if (!token || token.length < 20) {
      return {
        ok: false,
        message: "Cole um token de bot valido do Discord Developer Portal."
      };
    }

    try {
      const bot = await fetchDiscordBotInfo(token);
      return {
        ok: true,
        id: bot.id,
        username: bot.username,
        displayName: bot.global_name || bot.username || "Discord Bot",
        avatarUrl: bot.avatarUrl,
        bannerUrl: bot.bannerUrl,
        description: bot.description,
        bot: Boolean(bot.bot)
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Nao foi possivel validar esse bot no Discord."
      };
    }
  });

  ipcMain.handle("launcher:check-update", async () => {
    if (!app.isPackaged) {
      return {
        status: "unsupported",
        message: "Atualizacoes automaticas rodam apenas no app instalado."
      };
    }

    if (!isUpdateFeedConfigured()) {
      return {
        status: "not_configured",
        message: "Repositorio GitHub de atualizacao ainda nao configurado."
      };
    }

    try {
      writeUpdateLog("Checking for desktop update.", {
        currentVersion: app.getVersion(),
        feedUrl: runtimeConfig.updateFeedUrl
      });
      const manifest = await fetchUpdateManifest();
      writeUpdateLog("Desktop update manifest loaded.", {
        currentVersion: app.getVersion(),
        availableVersion: manifest.version,
        setupUrl: manifest.setupUrl
      });

      if (compareVersions(manifest.version, app.getVersion()) <= 0) {
        latestManifest = null;
        writeUpdateLog("No desktop update available.", {
          currentVersion: app.getVersion(),
          availableVersion: manifest.version
        });
        return { status: "current" };
      }

      const failedAttempt = getRecentFailedUpdate(manifest.version);
      if (failedAttempt) {
        writeUpdateLog("Recent update attempt failed; suppressing immediate update loop.", failedAttempt);
        return {
          status: "error",
          version: manifest.version,
          message: `A tentativa anterior de atualizar para ${manifest.version} nao confirmou a instalacao. Versao atual: ${app.getVersion()}. Log: ${failedAttempt.logPath ?? getUpdateLogPath()}`
        };
      }

      latestManifest = manifest;
      return {
        status: "available",
        version: manifest.version,
        notes: manifest.changelog ?? null
      };
    } catch (error) {
      writeUpdateLog("Failed to check desktop update.", error);
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Falha ao verificar atualizacoes."
      };
    }
  });

  ipcMain.handle("launcher:install-update", async () => {
    if (!app.isPackaged) {
      return {
        ok: false,
        message: "Atualizacoes automaticas rodam apenas no app instalado."
      };
    }

    if (!isUpdateFeedConfigured()) {
      return {
        ok: false,
        message: "Repositorio GitHub de atualizacao ainda nao configurado."
      };
    }

    try {
      const manifest = latestManifest ?? (await fetchUpdateManifest());
      writeUpdateLog("Desktop update installation requested.", {
        currentVersion: app.getVersion(),
        targetVersion: manifest.version,
        setupUrl: manifest.setupUrl
      });
      if (compareVersions(manifest.version, app.getVersion()) <= 0) {
        writeUpdateLog("Desktop update installation skipped because current version is already up to date.", {
          currentVersion: app.getVersion(),
          targetVersion: manifest.version
        });
        return {
          ok: false,
          message: "O programa ja esta na versao mais recente conhecida."
        };
      }

      const installerPath = await downloadJsonInstaller(manifest);
      sendUpdateProgress({ percent: 100, transferred: 1, total: 1 });
      writeUpdateState({
        status: "pending",
        stage: "helper-started",
        currentVersion: app.getVersion(),
        targetVersion: manifest.version,
        installerPath,
        logPath: getUpdateLogPath(),
        startedAt: new Date().toISOString()
      });
      writeUpdateLog("Desktop update helper will start and the app will exit.", {
        currentVersion: app.getVersion(),
        targetVersion: manifest.version,
        installerPath
      });

      startSilentUpdateInstaller(installerPath, manifest.version);
      setTimeout(exitForUpdate, 500);
      return { ok: true };
    } catch (error) {
      writeUpdateLog("Failed before desktop update helper could start.", error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Falha ao instalar atualizacao."
      };
    }
  });
}

function exitForUpdate() {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.destroy();
    }
  }

  app.exit(0);
}

function startSilentUpdateInstaller(installerPath, targetVersion) {
  const launcherPath = process.execPath;

  if (process.platform !== "win32") {
    const child = spawn(installerPath, ["/S"], {
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    return;
  }

  const updateScriptPath = path.join(os.tmpdir(), `tempest-light-update-${process.pid}-${Date.now()}.cmd`);
  const updateLogPath = getUpdateLogPath();
  const updateStatePath = getUpdateStatePath();
  const installDir = path.dirname(launcherPath);
  const launcherProcessName = path.basename(launcherPath, path.extname(launcherPath));
  const fallbackLauncherPath = path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
    "Programs",
    "Tempest Light",
    "Tempest Light.exe"
  );
  const lines = [
    "@echo off",
    "setlocal EnableExtensions EnableDelayedExpansion",
    `set "TEMPEST_UPDATE_LOG=${updateLogPath.replace(/%/g, "%%").replace(/"/g, "")}"`,
    `set "TEMPEST_UPDATE_STATE=${updateStatePath.replace(/%/g, "%%").replace(/"/g, "")}"`,
    `set "TEMPEST_TARGET_VERSION=${String(targetVersion).replace(/%/g, "%%").replace(/"/g, "")}"`,
    `set "TEMPEST_INSTALLER=${installerPath.replace(/%/g, "%%").replace(/"/g, "")}"`,
    `set "TEMPEST_INSTALL_DIR=${installDir.replace(/%/g, "%%").replace(/"/g, "")}"`,
    `set "TEMPEST_LAUNCHER=${launcherPath.replace(/%/g, "%%").replace(/"/g, "")}"`,
    `set "TEMPEST_FALLBACK_LAUNCHER=${fallbackLauncherPath.replace(/%/g, "%%").replace(/"/g, "")}"`,
    `set "TEMPEST_PROCESS_NAME=${launcherProcessName.replace(/%/g, "%%").replace(/"/g, "")}"`,
    `>> "%TEMPEST_UPDATE_LOG%" echo [%date% %time%] Starting Tempest Light update helper from PID ${process.pid}.`,
    `>> "%TEMPEST_UPDATE_LOG%" echo [%date% %time%] Installer: %TEMPEST_INSTALLER%`,
    `>> "%TEMPEST_UPDATE_LOG%" echo [%date% %time%] Target version: %TEMPEST_TARGET_VERSION%`,
    `> "%TEMPEST_UPDATE_STATE%" echo {"status":"running","stage":"waiting-for-main-process-exit","targetVersion":"%TEMPEST_TARGET_VERSION%","logPath":"%TEMPEST_UPDATE_LOG%"}`,
    "set attempts=120",
    ":wait_for_exit",
    `tasklist /fi "PID eq ${process.pid}" 2>nul | findstr /r "\\<${process.pid}\\>" >nul`,
    "if errorlevel 1 goto stop_running_app",
    "if \"%attempts%\"==\"0\" goto stop_running_app",
    "set /a attempts=attempts-1 >nul",
    "timeout /t 1 /nobreak >nul",
    "goto wait_for_exit",
    ":stop_running_app",
    `>> "%TEMPEST_UPDATE_LOG%" echo [%date% %time%] Closing stale Tempest Light processes before install.`,
    "taskkill /IM \"Tempest Light.exe\" /T /F >nul 2>nul",
    "timeout /t 2 /nobreak >nul",
    "set verified_launcher=",
    "set installed_version=",
    "set install_exit=-1",
    "for /L %%I in (1,1,3) do (",
    "  if not defined verified_launcher (",
    `    > "%TEMPEST_UPDATE_STATE%" echo {"status":"running","stage":"installing-attempt-%%I","targetVersion":"%TEMPEST_TARGET_VERSION%","logPath":"%TEMPEST_UPDATE_LOG%"}`,
    `    >> "%TEMPEST_UPDATE_LOG%" echo [%date% %time%] Running installer attempt %%I.`,
    "    start \"\" /wait \"%TEMPEST_INSTALLER%\" /S /currentuser --updated /D=%TEMPEST_INSTALL_DIR%",
    "    set install_exit=!errorlevel!",
    `    >> "%TEMPEST_UPDATE_LOG%" echo [%date% %time%] Installer attempt %%I finished with exit code !install_exit!.`,
    "    timeout /t 2 /nobreak >nul",
    "    call :check_candidate \"%TEMPEST_LAUNCHER%\"",
    "    if not defined verified_launcher call :check_candidate \"%TEMPEST_FALLBACK_LAUNCHER%\"",
    "    if not defined verified_launcher (",
    `      >> "%TEMPEST_UPDATE_LOG%" echo [%date% %time%] Target version was not confirmed after attempt %%I. Found: !installed_version!.`,
    "      taskkill /IM \"Tempest Light.exe\" /T /F >nul 2>nul",
    "      timeout /t 2 /nobreak >nul",
    "    )",
    "  )",
    ")",
    "if defined verified_launcher goto launch_app",
    `> "%TEMPEST_UPDATE_STATE%" echo {"status":"failed","stage":"version-verification-failed","targetVersion":"%TEMPEST_TARGET_VERSION%","installedVersion":"!installed_version!","installerExitCode":!install_exit!,"logPath":"%TEMPEST_UPDATE_LOG%"}`,
    `>> "%TEMPEST_UPDATE_LOG%" echo [%date% %time%] Failed to confirm target version %TEMPEST_TARGET_VERSION%.`,
    "if exist \"%TEMPEST_LAUNCHER%\" start \"\" /d \"%TEMPEST_INSTALL_DIR%\" \"%TEMPEST_LAUNCHER%\" --update-failed",
    "goto cleanup",
    ":launch_app",
    `> "%TEMPEST_UPDATE_STATE%" echo {"status":"success","stage":"version-confirmed","targetVersion":"%TEMPEST_TARGET_VERSION%","installedVersion":"!installed_version!","installerExitCode":!install_exit!,"launcherPath":"!verified_launcher!","logPath":"%TEMPEST_UPDATE_LOG%"}`,
    "set launch_attempts=60",
    ":launch_loop",
    `>> "%TEMPEST_UPDATE_LOG%" echo [%date% %time%] Launching Tempest Light from !verified_launcher!.`,
    "for %%F in (\"!verified_launcher!\") do set \"verified_launcher_dir=%%~dpF\"",
    "start \"\" /d \"!verified_launcher_dir!\" \"!verified_launcher!\" --updated",
    "timeout /t 3 /nobreak >nul",
    "tasklist /fi \"imagename eq Tempest Light.exe\" 2>nul | find /i \"Tempest Light.exe\" >nul",
    "if not errorlevel 1 (",
    `  >> "%TEMPEST_UPDATE_LOG%" echo [%date% %time%] Tempest Light relaunched successfully.`,
    "  del \"%TEMPEST_INSTALLER%\" >nul 2>nul",
    "  goto cleanup",
    ")",
    "if \"%launch_attempts%\"==\"0\" goto cleanup",
    "set /a launch_attempts=launch_attempts-1 >nul",
    "timeout /t 1 /nobreak >nul",
    "goto launch_loop",
    ":check_candidate",
    "set candidate=%~1",
    "if not exist \"%candidate%\" exit /b 0",
    "set candidate_version=",
    "for /f \"usebackq delims=\" %%V in (`powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command \"try { $v=(Get-Item -LiteralPath '%candidate%').VersionInfo; if ($v.ProductVersion) { $v.ProductVersion.Trim() } elseif ($v.FileVersion) { $v.FileVersion.Trim() } } catch {}\"`) do set \"candidate_version=%%V\"",
    "set installed_version=%candidate_version%",
    `>> "%TEMPEST_UPDATE_LOG%" echo [%date% %time%] Version check for %candidate% returned %candidate_version%.`,
    "if \"%candidate_version%\"==\"%TEMPEST_TARGET_VERSION%\" set \"verified_launcher=%candidate%\"",
    "if not defined verified_launcher if \"%candidate_version%\"==\"%TEMPEST_TARGET_VERSION%.0\" set \"verified_launcher=%candidate%\"",
    "exit /b 0",
    ":cleanup",
    `>> "%TEMPEST_UPDATE_LOG%" echo [%date% %time%] Update helper finished.`,
    "del \"%~f0\" >nul 2>nul"
  ];

  fs.writeFileSync(updateScriptPath, lines.join(os.EOL), "utf8");

  const child = spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", updateScriptPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();
}

function parseDiscordTemplateCode(templateInput) {
  const rawInput = String(templateInput ?? "").trim();
  if (!rawInput) {
    return null;
  }

  const directCode = sanitizeDiscordTemplateCode(rawInput);
  if (directCode) {
    return directCode;
  }

  try {
    const templateUrl = new URL(rawInput);
    const host = templateUrl.hostname.toLowerCase().replace(/^www\./, "");
    const pathParts = templateUrl.pathname.split("/").filter(Boolean);

    if (host === "discord.new" && pathParts[0]) {
      return sanitizeDiscordTemplateCode(pathParts[0]);
    }

    if (host.endsWith("discord.com")) {
      if (pathParts.some((part) => part.toLowerCase() === "invite")) {
        return null;
      }

      const markerIndex = pathParts.findIndex((part) => ["template", "templates", "guild-template"].includes(part.toLowerCase()));
      const candidate = markerIndex >= 0 ? pathParts[markerIndex + 1] ?? pathParts[pathParts.length - 1] : pathParts[pathParts.length - 1];
      return sanitizeDiscordTemplateCode(candidate);
    }
  } catch {
    return null;
  }

  return null;
}

function sanitizeDiscordTemplateCode(value) {
  const candidate = String(value ?? "").trim().split(/[/?#]/)[0];
  return /^[a-zA-Z0-9_-]{4,120}$/.test(candidate) ? candidate : null;
}

async function fetchDiscordGuildTemplate(templateCode) {
  const templateUrl = new URL(`https://discord.com/api/v10/guilds/templates/${encodeURIComponent(templateCode)}`);
  const body = await downloadBuffer(templateUrl);
  const template = JSON.parse(body.toString("utf8"));

  if (!template || typeof template !== "object" || !template.serialized_source_guild) {
    throw new Error("O Discord respondeu, mas o modelo nao trouxe os dados do servidor.");
  }

  return template;
}

async function fetchDiscordBotInfo(token) {
  const botUrl = new URL("https://discord.com/api/v10/users/@me");
  const body = await downloadBuffer(botUrl, null, 0, {
    Authorization: `Bot ${token}`,
    Accept: "application/json"
  });
  const bot = JSON.parse(body.toString("utf8"));

  if (!bot || typeof bot !== "object" || !bot.id || !bot.username) {
    throw new Error("O Discord respondeu, mas nao retornou os dados do bot.");
  }

  let application = null;
  try {
    const applicationUrl = new URL("https://discord.com/api/v10/oauth2/applications/@me");
    const applicationBody = await downloadBuffer(applicationUrl, null, 0, {
      Authorization: `Bot ${token}`,
      Accept: "application/json"
    });
    application = JSON.parse(applicationBody.toString("utf8"));
  } catch {
    application = null;
  }

  const avatarUrl = bot.avatar
    ? `https://cdn.discordapp.com/avatars/${bot.id}/${bot.avatar}.${bot.avatar.startsWith("a_") ? "gif" : "png"}?size=256`
    : application?.icon
      ? `https://cdn.discordapp.com/app-icons/${application.id}/${application.icon}.png?size=256`
      : null;
  const bannerUrl = bot.banner
    ? `https://cdn.discordapp.com/banners/${bot.id}/${bot.banner}.${bot.banner.startsWith("a_") ? "gif" : "png"}?size=480`
    : application?.cover_image
      ? `https://cdn.discordapp.com/app-assets/${application.id}/store/${application.cover_image}.png?size=480`
      : null;

  return {
    ...bot,
    avatarUrl,
    bannerUrl,
    description: typeof application?.description === "string" && application.description.trim() ? application.description.trim() : null
  };
}

async function fetchUpdateManifest() {
  if (!isUpdateFeedConfigured()) {
    throw new Error("URL do manifest de atualizacao nao configurada.");
  }

  const manifestUrl = new URL(runtimeConfig.updateFeedUrl);
  writeUpdateLog("Downloading update manifest.", { manifestUrl: manifestUrl.toString() });
  const body = await downloadBuffer(manifestUrl);
  const manifest = JSON.parse(body.toString("utf8"));

  if (!manifest || typeof manifest.version !== "string" || typeof manifest.setupUrl !== "string") {
    throw new Error("Manifest invalido. Campos exigidos: version e setupUrl.");
  }

  writeUpdateLog("Update manifest validated.", {
    version: manifest.version,
    setupUrl: manifest.setupUrl,
    hasSha256: typeof manifest.sha256 === "string"
  });

  return {
    version: manifest.version,
    setupUrl: new URL(manifest.setupUrl, manifestUrl).toString(),
    sha256: typeof manifest.sha256 === "string" ? manifest.sha256 : null,
    publishedAt: typeof manifest.publishedAt === "string" ? manifest.publishedAt : null,
    changelog: typeof manifest.changelog === "string" ? manifest.changelog : null
  };
}

async function downloadJsonInstaller(manifest) {
  sendUpdateProgress({ percent: 1, transferred: 0, total: 1 });
  writeUpdateLog("Starting update package download.", {
    targetVersion: manifest.version,
    setupUrl: manifest.setupUrl
  });

  const packageBuffer = await downloadBuffer(new URL(manifest.setupUrl), (progress) => {
    sendUpdateProgress({
      percent: Math.min(60, Math.round(progress.percent * 0.6)),
      transferred: progress.transferred,
      total: progress.total
    });
  });
  writeUpdateLog("Main update package downloaded.", {
    targetVersion: manifest.version,
    bytes: packageBuffer.length
  });

  if (manifest.sha256) {
    const packageSha256 = assertSha256(packageBuffer, manifest.sha256, "Assinatura SHA-256 diferente do manifest.");
    writeUpdateLog("Main update package SHA-256 validated.", { sha256: packageSha256 });
  }

  sendUpdateProgress({ percent: 65, transferred: 1, total: 1 });

  const updatePackage = JSON.parse(packageBuffer.toString("utf8"));
  if (!updatePackage || typeof updatePackage.base64 !== "string") {
    throw new Error("Pacote JSON de atualizacao invalido.");
  }

  const base64Parts = [updatePackage.base64];
  const chunks = Array.isArray(updatePackage.chunks) ? updatePackage.chunks : [];

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    if (!chunk || typeof chunk !== "object") {
      throw new Error("Parte JSON de atualizacao invalida.");
    }

    const chunkReference = typeof chunk.fileName === "string" ? chunk.fileName : chunk.url;
    if (!chunkReference) {
      throw new Error(`Parte ${index + 2} do pacote JSON sem caminho de download.`);
    }

    const chunkUrl = new URL(chunkReference, manifest.setupUrl);
    const chunkStart = 60 + (index / Math.max(chunks.length, 1)) * 25;
    const chunkEnd = 60 + ((index + 1) / Math.max(chunks.length, 1)) * 25;
    writeUpdateLog("Downloading update package chunk.", {
      targetVersion: manifest.version,
      part: index + 2,
      url: chunkUrl.toString()
    });
    const chunkBuffer = await downloadBuffer(chunkUrl, (progress) => {
      const chunkPercent = progress.percent > 0 ? progress.percent / 100 : 0;
      sendUpdateProgress({
        percent: Math.round(chunkStart + (chunkEnd - chunkStart) * chunkPercent),
        transferred: progress.transferred,
        total: progress.total
      });
    });
    writeUpdateLog("Update package chunk downloaded.", {
      targetVersion: manifest.version,
      part: index + 2,
      bytes: chunkBuffer.length
    });

    if (chunk.sha256) {
      const chunkSha256 = assertSha256(chunkBuffer, chunk.sha256, `Assinatura SHA-256 da parte ${index + 2} diferente do pacote JSON.`);
      writeUpdateLog("Update package chunk SHA-256 validated.", {
        part: index + 2,
        sha256: chunkSha256
      });
    }

    const chunkPackage = JSON.parse(chunkBuffer.toString("utf8"));
    if (!chunkPackage || typeof chunkPackage.base64 !== "string") {
      throw new Error(`Parte ${index + 2} do pacote JSON de atualizacao invalida.`);
    }

    base64Parts.push(chunkPackage.base64);
  }

  const installerBuffer = Buffer.concat(base64Parts.map((part) => Buffer.from(part, "base64")));
  if (updatePackage.sha256) {
    const installerSha256 = assertSha256(installerBuffer, updatePackage.sha256, "Assinatura SHA-256 do instalador diferente do pacote JSON.");
    writeUpdateLog("Rebuilt installer SHA-256 validated.", {
      targetVersion: manifest.version,
      sha256: installerSha256,
      bytes: installerBuffer.length
    });
  }

  const fileName = safeInstallerName(updatePackage.fileName || `Tempest Light Setup ${manifest.version}.exe`);
  const targetDir = getInstallerDownloadDir();
  fs.mkdirSync(targetDir, { recursive: true });

  const targetPath = uniqueFilePath(path.join(targetDir, fileName.endsWith(".exe") ? fileName : `${fileName}.exe`));
  fs.writeFileSync(targetPath, installerBuffer);
  writeUpdateLog("Installer prepared on disk.", {
    targetVersion: manifest.version,
    installerPath: targetPath,
    bytes: installerBuffer.length
  });

  sendUpdateProgress({ percent: 90, transferred: 1, total: 1 });

  return targetPath;
}

function downloadBuffer(url, onProgress, redirectCount = 0, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "http:" ? http : https;
    const request = client.get(
      url,
      {
        headers: {
          Accept: "application/json, application/octet-stream;q=0.9, */*;q=0.8",
          "User-Agent": `TempestLightLauncher/${app.getVersion()}`,
          ...extraHeaders
        }
      },
      (response) => {
        const statusCode = response.statusCode ?? 0;

        if ([301, 302, 303, 307, 308].includes(statusCode) && response.headers.location) {
          response.resume();
          if (redirectCount >= 5) {
            reject(new Error("Redirecionamentos demais ao baixar atualizacao."));
            return;
          }
          resolve(downloadBuffer(new URL(response.headers.location, url), onProgress, redirectCount + 1));
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(new Error(`Falha HTTP ${statusCode} ao baixar arquivo.`));
          return;
        }

        const total = Number(response.headers["content-length"] ?? 0);
        let transferred = 0;
        const chunks = [];

        response.on("data", (chunk) => {
          chunks.push(chunk);
          transferred += chunk.length;

          if (onProgress) {
            onProgress({
              percent: total > 0 ? (transferred / total) * 100 : 0,
              transferred,
              total
            });
          }
        });

        response.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );

    request.setTimeout(60_000, () => {
      request.destroy(new Error("Tempo esgotado ao baixar arquivo."));
    });
    request.on("error", reject);
  });
}

function assertSha256(buffer, expected, message) {
  const actual = crypto.createHash("sha256").update(buffer).digest("hex").toLowerCase();
  if (actual !== expected.trim().toLowerCase()) {
    throw new Error(`${message} Esperado: ${expected.trim().toLowerCase()}. Recebido: ${actual}.`);
  }
  return actual;
}

function compareVersions(left, right) {
  const leftParts = String(left).split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = String(right).split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const size = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < size; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue > rightValue) {
      return 1;
    }
    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
}

function safeInstallerName(fileName) {
  const safeName = String(fileName)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return safeName || `Tempest Light Setup ${app.getVersion()}.exe`;
}

function getInstallerDownloadDir() {
  try {
    return getUpdateDataDir();
  } catch {
    return path.join(os.tmpdir(), "Tempest Light", "updates");
  }
}

function uniqueFilePath(filePath) {
  if (!fs.existsSync(filePath)) {
    return filePath;
  }

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);

  for (let count = 1; count < 100; count += 1) {
    const candidate = path.join(dir, `${name} (${count})${ext}`);
    if (!fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(dir, `${name}-${Date.now()}${ext}`);
}

function sendUpdateProgress(progress) {
  mainWindow?.webContents.send("launcher:update-progress", progress);
}
