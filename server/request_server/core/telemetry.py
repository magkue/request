"""Observability setup (OpenTelemetry + Sentry).

Configures tracing, metrics, log correlation, and error tracking.
Prometheus /metrics is always available. OTLP export activates when
OTEL_EXPORTER_OTLP_ENDPOINT is set. Sentry activates when SENTRY_DSN is set.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from opentelemetry import metrics, trace
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.semconv._incubating.attributes.deployment_attributes import (
    DEPLOYMENT_ENVIRONMENT_NAME,
)
from opentelemetry.semconv.attributes.service_attributes import SERVICE_NAME, SERVICE_VERSION
from prometheus_client import make_asgi_app

from request_server.core.config import settings

if TYPE_CHECKING:
    from fastapi import FastAPI
    from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

_prometheus_app: ASGIApp | None = None


def _build_resource() -> Resource:
    return Resource.create(
        {
            SERVICE_NAME: settings.otel_service_name,
            SERVICE_VERSION: settings.app_version,
            DEPLOYMENT_ENVIRONMENT_NAME: settings.otel_environment,
        }
    )


def _otlp_enabled() -> bool:
    return bool(settings.otel_exporter_otlp_endpoint)


def _init_sentry() -> None:
    """Initialize Sentry error tracking. No-op when SENTRY_DSN is not set."""
    if not settings.sentry_dsn:
        return

    import sentry_sdk
    from sentry_sdk.integrations.logging import LoggingIntegration

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.otel_environment,
        release=settings.app_version,
        send_default_pii=False,
        traces_sample_rate=1.0,
        enable_tracing=True,
        enable_logs=True,
        profile_session_sample_rate=1.0,
        profile_lifecycle="trace",
        integrations=[
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
    )
    logger.info("Sentry initialized: env=%s", settings.otel_environment)


def init_telemetry() -> None:
    """Initialize all observability: Sentry, OpenTelemetry providers, and library instrumentation.

    Must be called during application startup, before the FastAPI app is created.
    """
    logging.basicConfig(level=logging.INFO)

    _init_sentry()
    global _prometheus_app

    resource = _build_resource()

    # --- Metrics (Prometheus always, OTLP when endpoint configured) ---
    metric_readers = []
    prometheus_reader = PrometheusMetricReader()
    metric_readers.append(prometheus_reader)

    if _otlp_enabled():
        from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader

        if settings.otel_exporter_otlp_protocol == "grpc":
            from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import (
                OTLPMetricExporter,
            )
        else:
            from opentelemetry.exporter.otlp.proto.http.metric_exporter import (
                OTLPMetricExporter,
            )

        otlp_metric_exporter = OTLPMetricExporter(
            endpoint=settings.otel_exporter_otlp_endpoint,
        )
        metric_readers.append(PeriodicExportingMetricReader(otlp_metric_exporter))

    meter_provider = MeterProvider(resource=resource, metric_readers=metric_readers)
    metrics.set_meter_provider(meter_provider)

    _prometheus_app = make_asgi_app()

    # --- Traces (only when OTLP endpoint configured) ---
    if _otlp_enabled():
        if settings.otel_exporter_otlp_protocol == "grpc":
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
                OTLPSpanExporter,
            )
        else:
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
                OTLPSpanExporter,
            )

        span_exporter = OTLPSpanExporter(
            endpoint=settings.otel_exporter_otlp_endpoint,
        )
        tracer_provider = TracerProvider(resource=resource)
        tracer_provider.add_span_processor(BatchSpanProcessor(span_exporter))
        trace.set_tracer_provider(tracer_provider)

        # Log correlation — inject trace_id/span_id into log records
        LoggingInstrumentor().instrument(set_logging_format=True)

    # --- Library instrumentation ---
    from request_server.db.session import engine

    SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)
    HTTPXClientInstrumentor().instrument()

    logger.info(
        "OpenTelemetry initialized: service=%s, env=%s, otlp=%s",
        settings.otel_service_name,
        settings.otel_environment,
        settings.otel_exporter_otlp_endpoint or "disabled",
    )


def instrument_app(app: FastAPI) -> None:
    """Instrument a specific FastAPI application instance."""
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    FastAPIInstrumentor.instrument_app(app, excluded_urls="health,metrics")


def get_prometheus_app() -> ASGIApp:
    """Return the Prometheus metrics ASGI app."""
    if _prometheus_app is None:
        msg = "init_telemetry() must be called before get_prometheus_app()"
        raise RuntimeError(msg)
    return _prometheus_app


def shutdown_telemetry() -> None:
    """Flush and shut down OTEL providers."""
    tracer_provider = trace.get_tracer_provider()
    if isinstance(tracer_provider, TracerProvider):
        tracer_provider.shutdown()

    meter_provider = metrics.get_meter_provider()
    if isinstance(meter_provider, MeterProvider):
        meter_provider.shutdown()

    logger.info("OpenTelemetry shut down")
