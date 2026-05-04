# AET Request Client

React frontend for the AET Request system.

## Tech Stack

React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui (New York style), Biome

## Setup

```bash
cp .env.example .env    # configure Keycloak + API URL
npm install
npm run dev             # http://localhost:5173
```

## Scripts

| Command | Description |
|--------- | -------------- |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint and format with Biome |
| `npm run typecheck` | TypeScript type checking |

## Project Structure

```
src/
├── components/          # UI components organized by feature
│   ├── admin/           # External links admin (drag-and-drop via @dnd-kit)
│   ├── artemis-request/ # Artemis developer request form
│   ├── layout/          # Header, Footer, PageLayout, ProtectedRoute
│   ├── providers/       # AuthProvider (Keycloak OIDC)
│   ├── shared/          # Shared form components
│   ├── start-page/      # Landing page sections
│   ├── support-request/ # Support request form
│   ├── tum-guest-request/
│   ├── ui/              # shadcn/ui components
│   ├── vm-access-request/
│   └── vm-request/
├── config/              # App configuration
├── content/             # Static content (About, Imprint, Privacy)
├── hooks/               # useAuth, useExternalLinks, useExternalLinksAdmin
├── lib/                 # Utilities, validation
├── pages/               # Page components
├── services/            # API client services
└── types/               # Zod schemas and TypeScript types
```

## Adding UI Components

Use shadcn/ui components before building custom ones:

```bash
npx shadcn@latest add [component-name]
```

### Key Custom Components

- `ui/step-progress.tsx` — Multi-step form progress indicator with responsive design
- `ui/step-header.tsx` — Step header with title and description

Multi-step forms (VM Request, Artemis, TUM Guest) each define their own steps array and use `StepProgress` for navigation.
