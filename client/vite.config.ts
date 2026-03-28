import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { viteEnvs } from "vite-envs";
import packageJson from "./package.json";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteEnvs({ declarationFile: ".env.example" }),
    sentryVitePlugin({
      org: "aet",
      project: "aet-request",
      // SENTRY_AUTH_TOKEN env var must be set during build for uploads to work.
      // When not set, the plugin silently skips uploading.
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: { name: packageJson.version },
    }),
  ],
  build: {
    sourcemap: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  server: {
    port: 5174,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
