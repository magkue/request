export const OTEL_COLLECTOR_URL = import.meta.env.VITE_OTEL_COLLECTOR_URL ?? "";

export const OTEL_SERVICE_NAME =
  import.meta.env.VITE_OTEL_SERVICE_NAME ?? "aet-request-client";

export const OTEL_ENVIRONMENT =
  import.meta.env.VITE_OTEL_ENVIRONMENT ?? "development";
