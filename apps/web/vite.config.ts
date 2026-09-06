import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: mode === "desktop" ? "./" : "/",
  plugins: [react()],
  server: {
    port: 5173
  }
}));
