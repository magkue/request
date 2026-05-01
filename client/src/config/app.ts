// App configuration constants
// Version is injected at build time via vite.config.ts
export const APP_VERSION = __APP_VERSION__;
export const APP_NAME = "AET Request";
export const APP_DESCRIPTION =
  "Request virtual machines, access permissions, and other resources at the Applied Education Technologies research group.";
export const APP_ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT ?? "production";
export const WHATS_NEW_ENABLED =
  import.meta.env.VITE_WHATS_NEW_ENABLED !== "false";
export const GITHUB_URL: string | undefined = import.meta.env.VITE_GITHUB_URL;
