import { API_BASE_URL } from "@/config/api";
import { SENTRY_DSN, SENTRY_ENVIRONMENT } from "@/config/sentry";

/**
 * Initialize Sentry error tracking and performance monitoring.
 * No-op when VITE_SENTRY_DSN is not set.
 * Uses dynamic import so the Sentry SDK is code-split and only loaded when needed.
 */
export async function initSentry(): Promise<void> {
  if (!SENTRY_DSN) {
    return;
  }

  const Sentry = await import("@sentry/react");

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: __APP_VERSION__,
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0,
    tracePropagationTargets: [
      "localhost",
      new RegExp(`^${escapeRegExp(API_BASE_URL)}`),
    ],
  });
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
