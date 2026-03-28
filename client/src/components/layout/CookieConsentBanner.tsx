import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SENTRY_DSN } from "@/config/sentry";
import { OTEL_COLLECTOR_URL } from "@/config/telemetry";
import { type ConsentState, getConsent, setConsent } from "@/lib/consent";
import { initSentry } from "@/lib/sentry";
import { initTelemetry } from "@/lib/telemetry";

export function CookieConsentBanner() {
  const [consent, setConsentState] = useState<ConsentState>(getConsent);
  const monitoringConfigured =
    Boolean(SENTRY_DSN) || Boolean(OTEL_COLLECTOR_URL);

  if (!monitoringConfigured || consent !== "pending") {
    return null;
  }

  function handleAccept() {
    setConsent("granted");
    setConsentState("granted");
    initSentry();
    initTelemetry();
  }

  function handleDecline() {
    setConsent("denied");
    setConsentState("denied");
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4 shadow-lg">
      <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use cookies for error tracking and performance monitoring to
          improve this application. This includes collecting technical data such
          as browser type, page URLs, and performance metrics. See our{" "}
          <Link to="/privacy" className="text-primary underline">
            privacy policy
          </Link>{" "}
          for details.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={handleDecline}>
            Decline
          </Button>
          <Button size="sm" onClick={handleAccept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
