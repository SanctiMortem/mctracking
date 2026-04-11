# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**MTG Commander Tracker** is in the **planning phase** — all technical documentation is complete but source code has not yet been scaffolded. The next step is scaffolding the Expo project and beginning Batch 1 implementation.

## Development Commands

> Commands are defined in the technical specs but the project hasn't been scaffolded yet. Once `package.json` exists, these are the intended commands:

```bash
# Setup (macOS)
./setup_mac_dev_env.sh        # Install Homebrew, Node via NVM, pnpm, Vercel CLI, Neon CLI

# Dev server
npx expo start
npx expo run:ios
npx expo run:android

# Database (Drizzle ORM)
pnpm db:generate              # Generate migration from schema changes
pnpm db:migrate               # Apply migrations to Neon

# Quality
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

**Package manager:** `pnpm`

## Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo (single codebase for iOS + Android) |
| Language | TypeScript |
| Navigation | React Navigation + Expo Router |
| Database | Neon (PostgreSQL serverless) |
| ORM | Drizzle ORM |
| Auth | Clerk (`@clerk/clerk-expo`) — Email, Google OAuth, Apple Sign In, Magic Link |
| Backend | Expo Router API Routes + Hono (server functions; `DATABASE_URL` never exposed to client) |
| i18n | react-i18next + expo-localization (EN/ES; MTG card names always in English) |
| Monetization | AdMob/Unity Ads (free tier) + one-time IAP for Premium |

### Planned Source Layout

```
app/
├── (tabs)/           # Tab navigation: home, history, stats, settings
├── api/              # Server API routes (Hono handlers)
└── auth/             # Auth flows (Clerk)
components/           # Reusable UI
screens/              # Match tracker, setup, history, etc.
services/             # API client, auth service, DB queries
hooks/                # Custom React hooks
types/                # Shared TypeScript interfaces
styles/               # Design tokens — "The Mystic Archive" (MTG 5-color theme)
```

### Core Data Flow

Match lifecycle: **Setup → in_progress → event stream → completed**

1. `POST /api/matches` — create match + participations
2. Match screen holds local state (life totals, poison, commander damage)
3. Each state change debounces (200–2000ms) → `POST /api/match-events`
4. `PATCH /api/matches/:id` — finalize winner/condition or draw/abandon
5. Stats computed on-demand via `GET /api/stats/:player_id` (no pre-compute in MVP)

### Key Domain Entities

`players` → `decks` → `participations` ↔ `matches` ← `match_events`
`groups` ↔ `group_members` → `players`

### Auth & Permissions

| Role | Scope |
|------|-------|
| Guest | Basic tracker only (no persistence) |
| User | Own players, decks, matches, stats |
| Group Member | Shared group players/decks/matches |
| Group Owner | Invite members, manage group |

RLS enforced at Neon via Clerk JWT. API routes validate Clerk session before any DB access.

## Technical Documentation

All decisions are documented in `docs/planning/`:

| Doc | Contents |
|-----|----------|
| `07_ARCHITECTURE.md` | 8 accepted ADRs, security model, performance targets |
| `06_DATA_MODEL.md` | Full Drizzle schema with RLS policies |
| `08_API_CONTRACTS.md` | REST endpoints, request/response shapes |
| `05_BUSINESS_RULES.md` | Game rules, validation constraints |
| `11_TEST_STRATEGY.md` | Unit / integration / E2E test plan |
| `00_DISCOVERY_BRIEF.md` | 20 MVP features, 4 delivery batches, personas |

## AI Workflow System (`.agent/`)

The `.agent/` directory contains a **TimeKast Factory** system for structured AI-driven development:

- **`/implement`** — scaffold or implement a feature using the relevant specialist agents
- **`/docs`** — generate or update technical documentation
- **`/design`** — produce design specs
- **`/backlog`** — generate and prioritize user stories

Routing logic and agent/skill assignments are defined in `.agent/registry/registry.yaml`. Read `.agent/ARCHITECTURE.md` before invoking workflows.

## Environment Variables Required

```
DATABASE_URL              # Neon connection string
CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```
