export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN ?? "";

export const SENTRY_ENVIRONMENT =
  import.meta.env.VITE_OTEL_ENVIRONMENT ?? "development";
