# AET Request

A web application for requesting university chair resources. Provides structured, validated forms for VM provisioning, access requests, Artemis developer accounts, TUM guest accounts, and support requests.

## Tech Stack

### Frontend

- **Framework**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui (New York style), Lucide React icons
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router v7
- **Auth**: OIDC Client TS (Keycloak)
- **Observability**: OpenTelemetry (traces, metrics, Web Vitals), Sentry (error tracking)
- **Code Quality**: Biome

### Backend

- **Framework**: FastAPI, Pydantic, Pydantic Settings
- **Database**: PostgreSQL, SQLAlchemy (async), Alembic migrations, asyncpg
- **Auth**: Keycloak OIDC, role-based access control
- **Ticket Systems**: Jira, Redmine, Debug, NoOp (configurable via `TICKET_SYSTEM`)
- **Observability**: OpenTelemetry (traces, metrics via Prometheus, log correlation)
- **Code Quality**: Ruff (lint + format), ty (type checking)

## Project Structure

```text
request-v2/
├── client/                      # React frontend
│   └── src/
│       ├── components/          # UI components by feature
│       │   ├── admin/           # External links admin (drag-and-drop)
│       │   ├── artemis-request/ # Multi-step form + steps/
│       │   ├── layout/          # Header, Footer, PageLayout, ProtectedRoute
│       │   ├── providers/       # AuthProvider
│       │   ├── shared/          # Shared form components
│       │   ├── start-page/      # Landing page sections
│       │   ├── support-request/ # Single-page form
│       │   ├── tum-guest-request/ # Multi-step form + steps/
│       │   ├── ui/              # shadcn/ui components
│       │   ├── vm-access-request/ # Single-page form
│       │   └── vm-request/      # Multi-step form + steps/
│       ├── config/              # App configuration
│       ├── content/             # Static content (About, Imprint, Privacy)
│       ├── hooks/               # useAuth, useExternalLinks, useExternalLinksAdmin
│       ├── lib/                 # Utilities, validation
│       ├── pages/               # Page components
│       ├── services/            # API client services
│       └── types/               # Zod schemas and TypeScript types
├── server/                      # FastAPI backend
│   └── request_server/
│       ├── api/routes/          # Route handlers
│       ├── core/                # Config, security, telemetry
│       ├── db/                  # Session, base model
│       ├── models/              # SQLAlchemy ORM models
│       ├── schemas/             # Pydantic request/response schemas
│       └── services/
│           ├── descriptions/    # Ticket description builders
│           └── ticket/          # Ticket system implementations
├── e2e/                         # Playwright end-to-end tests
│   ├── tests/                   # Test specs (9 files)
│   ├── fixtures/                # Auth fixtures, test data
│   └── helpers/                 # Form fillers, debug API
└── deploy/
    ├── client/                  # Client Dockerfile (nginx)
    ├── server/                  # Server Dockerfile (uvicorn)
    └── helm/                    # Kubernetes Helm chart
```

## Development Commands

### Client

```bash
cd client
npm install
npm run dev          # dev server on :5173
npm run build        # production build
npm run lint         # Biome lint + format
npm run typecheck    # TypeScript check
```

### Server

```bash
cd server
uv sync
uv run alembic upgrade head
uv run uvicorn request_server.main:app --reload

# Quality
uv run ruff check .          # lint
uv run ruff check . --fix    # lint with auto-fix
uv run ruff format .         # format
uv run ty check .            # type check
uv run pytest                # tests
```

### E2E Tests

```bash
cd e2e
npx playwright install    # first time only
npx playwright test       # run all (auto-starts client + server)
npx playwright test --ui  # interactive UI mode
```

Tests use PostgreSQL on port 5433, `AUTH_BYPASS=true`, and `TICKET_SYSTEM=debug`.

See [TESTING.md](TESTING.md) for detailed instructions on writing e2e tests, patterns, and best practices.

## Forms Reference

| Form | Route | Auth | Type |
| ---- | ----- | ---- | ---- |
| VM Request | `/request/vm` | Required | Multi-step (6 steps) |
| VM Access | `/request/vm-access` | Required | Single-page |
| Artemis Developer | `/request/artemis` | Optional | Multi-step |
| TUM Guest Account | `/request/tum-guest` | Optional | Multi-step |
| Support Request | `/request/support` | Optional | Single-page |
| External Links Admin | `/admin/external-links` | Admin | Admin dashboard |

## UI Component Guidelines

Make sure to always try to reuse existing components. Never use recreate similar components. Check regularly if you can merge similar components.

### shadcn/ui

Always check if a shadcn component exists before creating custom ones (you can should the shadcn MCP server if available):

```bash
npx shadcn@latest add [component-name]
```

- Forms: Form, Field, Input, Textarea, Select, Checkbox, Radio, Switch
- Layout: Card, Separator, Tabs, Accordion, Sheet, Dialog
- Feedback: Alert, Toast, Badge, Progress, Skeleton
- Navigation: Button, Dropdown Menu, Breadcrumb

### Key Custom Components

- `ui/step-progress.tsx` — Responsive multi-step progress indicator (circles, check marks, connector lines)
- `ui/step-header.tsx` — Step title and description header

Each multi-step form defines its own steps array and wraps `StepProgress`.

### Styling

- Use Tailwind CSS utility classes
- Mobile-first responsive design
- CSS variables for theme colors (defined in `index.css`)

## Form Implementation Patterns

### File Structure

```text
src/
├── types/{form-name}-request.ts         # Zod schemas + TypeScript types
├── components/{form-name}-request/
│   ├── {FormName}RequestForm.tsx         # Main form component
│   ├── StepProgress.tsx                  # Step config (multi-step only)
│   └── steps/                           # Step components (multi-step only)
├── pages/{FormName}RequestPage.tsx       # Page wrapper with submit handling
└── services/{form-name}-requests.ts     # API client
```

### Validation (Zod)

- Use `z.discriminatedUnion("isLoggedIn", [...])` for auth-aware forms
- Use `superRefine` for cross-field validation
- Export schema, inferred type, and default values from type files

### Multi-Step Forms

```typescript
const form = useForm<FormRequest>({
  resolver: zodResolver(formSchema),
  defaultValues: getDefaultValues(isAuthenticated),
  mode: "onChange",
});
```

Validate per-step before advancing. Each step component receives the form via `useFormContext`.

### Single-Page Forms

Same pattern without step navigation. Single `Card` with all fields.

### Page Wrapper

Each form page handles: submission state, success/error result display, and API call. Uses `useAuth()` to include user info when authenticated.

### Authentication-Aware Forms

1. `useAuth()` hook for `isAuthenticated` and `user`
2. `z.discriminatedUnion("isLoggedIn", [...])` for conditional schemas
3. Different steps/fields based on auth state
4. User info included in submission payload when authenticated

## Server-Side Patterns

Request flow: **Route → Schema validation → Service → Model → Database**

- **Routes** (`api/routes/`): FastAPI endpoints, auth dependency injection
- **Schemas** (`schemas/`): Pydantic models for request/response validation
- **Models** (`models/`): SQLAlchemy ORM with async sessions
- **Services** (`services/`): Business logic, ticket creation
- **Descriptions** (`services/descriptions/`): Build formatted ticket descriptions from request data
- **Ticket** (`services/ticket/`): Abstract base + implementations (Jira, Redmine, Debug, NoOp)

## Observability

All observability features are config-driven — no explicit enable flags. They activate automatically when the relevant environment variable is set.

### Server (OpenTelemetry)

| Variable | Purpose | Default |
| -------- | ------- | ------- |
| `OTEL_SERVICE_NAME` | Service name in traces/metrics | `aet-request-server` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint (setting this enables OTLP export) | `""` (disabled) |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `grpc` or `http/protobuf` | `grpc` |
| `OTEL_ENVIRONMENT` | Deployment environment tag | `development` |

- **Prometheus `/metrics`** is always exposed on the app (port 8000, cluster-internal only — not routed through ingress)
- **OTLP traces + metrics** activate when `OTEL_EXPORTER_OTLP_ENDPOINT` is non-empty
- Auto-instruments: FastAPI, SQLAlchemy, httpx, Python logging (trace/span ID correlation)
- Health/metrics endpoints excluded from tracing to reduce noise
- Implementation: `core/telemetry.py`

### Client (OpenTelemetry)

| Variable | Purpose | Default |
| -------- | ------- | ------- |
| `VITE_OTEL_COLLECTOR_URL` | OTLP HTTP endpoint (setting this enables OTEL) | `""` (disabled) |
| `VITE_OTEL_SERVICE_NAME` | Service name | `aet-request-client` |
| `VITE_OTEL_ENVIRONMENT` | Deployment environment tag | `development` |

- Dynamically imported — zero bundle impact when disabled
- Traces: document load, fetch/XHR (with W3C `traceparent` propagation to backend), user clicks
- Metrics: Web Vitals (LCP, CLS, INP)
- Implementation: `lib/telemetry.ts`

### Client (Sentry)

| Variable | Purpose | Default |
| -------- | ------- | ------- |
| `VITE_SENTRY_DSN` | Sentry DSN (setting this enables Sentry) | `""` (disabled) |

- Dynamically imported — zero bundle impact when disabled
- Includes browser tracing and session replay integrations
- Reuses `VITE_OTEL_ENVIRONMENT` for the Sentry environment tag
- Implementation: `lib/sentry.ts`

### Helm Configuration

OTEL settings are in the `otel` section of `values.yaml`. Set `otel.collectorEndpoint` to enable server-side OTLP export. Set `client.config.VITE_SENTRY_DSN` to enable Sentry. The `otel.client.nginxProxy.enabled` option proxies browser OTLP through nginx to avoid CORS issues.

## Code Standards

### TypeScript (Client)

- Strict mode, path aliases: `@/components`, `@/lib`, `@/hooks`, `@/ui`
- Biome: 2-space indent, double quotes, auto import organization

### Python (Server)

- Ruff: line length 100, rules E/W/F/I/B/C4/UP/ARG/SIM
- Pydantic for all API schemas, Pydantic Settings for config
- Async throughout (asyncpg, async SQLAlchemy sessions)

## Code Quality Checklist

- [ ] TypeScript types / Pydantic schemas defined
- [ ] Biome lint passes (client), Ruff + ty pass (server)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Error and loading states handled
- [ ] Form validation working
- [ ] shadcn components used where applicable
