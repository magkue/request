import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { getConsent } from "./lib/consent.ts";
import { initSentry } from "./lib/sentry.ts";
import { initTelemetry } from "./lib/telemetry.ts";

// Initialize observability only if user previously granted consent
if (getConsent() === "granted") {
  initSentry();
  initTelemetry();
}

// biome-ignore lint/style/noNonNullAssertion: Null assertion is safe here
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
