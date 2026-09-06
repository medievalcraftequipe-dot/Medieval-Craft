const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tempestLightDesktop", {
  getAppInfo: () => ipcRenderer.invoke("launcher:get-app-info"),
  checkForUpdates: () => ipcRenderer.invoke("launcher:check-update"),
  installUpdate: () => ipcRenderer.invoke("launcher:install-update"),
  importDiscordTemplate: (templateUrl) => ipcRenderer.invoke("launcher:import-discord-template", templateUrl),
  getDiscordBotInfo: (token) => ipcRenderer.invoke("launcher:get-discord-bot-info", token),
  getDisplaySources: (options) => ipcRenderer.invoke("launcher:get-display-sources", options),
  getInitialDeepLink: () => ipcRenderer.invoke("launcher:get-initial-deep-link"),
  openExternal: (url) => ipcRenderer.invoke("launcher:open-external", url),
  onDeepLink: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("launcher:deep-link", listener);
    return () => ipcRenderer.removeListener("launcher:deep-link", listener);
  },
  onUpdateProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("launcher:update-progress", listener);
    return () => ipcRenderer.removeListener("launcher:update-progress", listener);
  }
});
