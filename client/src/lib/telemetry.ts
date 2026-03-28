import {
  OTEL_COLLECTOR_URL,
  OTEL_ENVIRONMENT,
  OTEL_SERVICE_NAME,
} from "@/config/telemetry";

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Initialize OpenTelemetry browser instrumentation.
 * No-op when VITE_OTEL_COLLECTOR_URL is not set.
 * Uses dynamic imports so OTEL packages are code-split and only loaded when needed.
 */
export async function initTelemetry(): Promise<void> {
  if (!OTEL_COLLECTOR_URL) {
    return;
  }

  const [
    { WebTracerProvider, BatchSpanProcessor },
    { OTLPTraceExporter },
    { MeterProvider, PeriodicExportingMetricReader },
    { OTLPMetricExporter },
    { Resource },
    {
      ATTR_SERVICE_NAME,
      ATTR_SERVICE_VERSION,
      ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
    },
    { registerInstrumentations },
    { DocumentLoadInstrumentation },
    { FetchInstrumentation },
    { UserInteractionInstrumentation },
    { W3CTraceContextPropagator },
    otelApi,
  ] = await Promise.all([
    import("@opentelemetry/sdk-trace-web"),
    import("@opentelemetry/exporter-trace-otlp-http"),
    import("@opentelemetry/sdk-metrics"),
    import("@opentelemetry/exporter-metrics-otlp-http"),
    import("@opentelemetry/resources"),
    import("@opentelemetry/semantic-conventions"),
    import("@opentelemetry/instrumentation"),
    import("@opentelemetry/instrumentation-document-load"),
    import("@opentelemetry/instrumentation-fetch"),
    import("@opentelemetry/instrumentation-user-interaction"),
    import("@opentelemetry/core"),
    import("@opentelemetry/api"),
  ]);

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: OTEL_SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: __APP_VERSION__,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: OTEL_ENVIRONMENT,
  });

  // --- Traces ---
  const traceExporter = new OTLPTraceExporter({
    url: `${OTEL_COLLECTOR_URL}/v1/traces`,
  });

  const tracerProvider = new WebTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
  });

  tracerProvider.register({
    propagator: new W3CTraceContextPropagator(),
  });

  // --- Metrics ---
  const metricExporter = new OTLPMetricExporter({
    url: `${OTEL_COLLECTOR_URL}/v1/metrics`,
  });

  const meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 30_000,
      }),
    ],
  });

  otelApi.metrics.setGlobalMeterProvider(meterProvider);

  // --- Web Vitals as Metrics ---
  recordWebVitals(otelApi.metrics.getMeter(OTEL_SERVICE_NAME));

  // --- Propagate trace context to API calls ---
  const propagateUrls: RegExp[] = [
    new RegExp(`^${escapeRegExp(window.location.origin)}`),
  ];

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (
    apiBaseUrl &&
    typeof apiBaseUrl === "string" &&
    apiBaseUrl.startsWith("http")
  ) {
    propagateUrls.push(new RegExp(`^${escapeRegExp(apiBaseUrl)}`));
  }

  // --- Auto-instrumentations ---
  registerInstrumentations({
    tracerProvider,
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: propagateUrls,
        clearTimingResources: true,
      }),
      new UserInteractionInstrumentation({
        eventNames: ["click"],
      }),
    ],
  });
}

/**
 * Records Web Vitals (LCP, CLS, INP) as OTel histogram metrics
 * using the browser PerformanceObserver API directly.
 */
function recordWebVitals(meter: import("@opentelemetry/api").Meter): void {
  const lcpHistogram = meter.createHistogram("web_vital.lcp", {
    description: "Largest Contentful Paint",
    unit: "ms",
  });
  const clsHistogram = meter.createHistogram("web_vital.cls", {
    description: "Cumulative Layout Shift",
    unit: "1",
  });
  const inpHistogram = meter.createHistogram("web_vital.inp", {
    description: "Interaction to Next Paint",
    unit: "ms",
  });

  // LCP
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        lcpHistogram.record(last.startTime);
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // PerformanceObserver not supported or type not available
  }

  // CLS
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value: number;
        };
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        clsHistogram.record(clsValue);
      }
    });
  } catch {
    // Not supported
  }

  // INP
  try {
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        inpHistogram.record(entry.duration);
      }
    });
    inpObserver.observe({ type: "event", buffered: true });
  } catch {
    // Not supported
  }
}
