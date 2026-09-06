import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { build } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2] ?? "web";
const desktop = target === "desktop";

await build({
  root,
  base: desktop ? "./" : "/",
  mode: desktop ? "desktop" : "production",
  configFile: false,
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    outDir: desktop ? resolve(root, "../desktop/dist-web") : resolve(root, "dist"),
    emptyOutDir: true
  }
});
