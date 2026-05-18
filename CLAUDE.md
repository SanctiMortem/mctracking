# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**MTG Sliver Tracker** (also called "MTG Commander Tracker" in the EAS slug) is a **shipped v1.0.2 product**.

- **iOS:** Build 6 (v1.0.2) live on the App Store, receiving production OTAs.
- **Android:** AAB v1.0.2 in Play Console Internal Testing (needs 12 testers × 14 days closed test before Production unlock).
- **Default working branch:** `develop` (Vercel auto-deploys this to production). `main` is the release branch.

> Detailed release state, current migration status, and any active bugs live in the user's memory at `project_mtg_tracker.md`. This file documents code and workflow; memory documents state.

## Development Commands

```bash
# Dev server
npx expo start
npx expo run:ios
npx expo run:android

# Database (Drizzle ORM)
pnpm db:generate              # Generate migration from schema changes
pnpm db:migrate               # Apply migrations to Neon
                              # NOTE: needs explicit DATABASE_URL export — see memory `reference_drizzle_migrate.md`

# Quality
pnpm lint
pnpm typecheck                # Several pre-existing TS errors are tolerated;
                              # only flag errors you introduce.
pnpm test
pnpm build
```

**Package manager:** `pnpm`

## Ship workflow (OTA-only changes)

For JS-only changes (most feature work):

1. Edit code on `develop` (or a feature branch off `develop`).
2. `git push origin develop` → Vercel auto-deploys (~2-3 min).
3. If backend changed, **wait for Vercel Ready** before shipping OTA so the new UI doesn't hit the old API.
4. `eas update --channel production --environment production --message "..."`
5. End-users kill + relaunch twice to load the new bundle.

For native changes (new native deps, app.json native config, runtime version bump): requires `eas build` + App Store / Play submission, not just OTA.

## Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo (single codebase for iOS + Android) |
| Language | TypeScript |
| Navigation | Expo Router (file-system routes under `app/`) |
| Database | Neon (PostgreSQL serverless, HTTP driver — **no transactions**) |
| ORM | Drizzle ORM |
| Auth | Clerk (`@clerk/clerk-expo`) — Production tier; Apple Sign-In + Google OAuth + email/password. Email signup currently broken on prod (see memory). |
| Backend | Expo Router API Routes (`app/api/**`) on Vercel; `DATABASE_URL` never exposed to client. |
| i18n | react-i18next + expo-localization (EN/ES; MTG card names always in English) |
| OTA | EAS Update, channel `production`, runtime version policy `appVersion` |

### Source layout

```
app/
├── (tabs)/             # Tab navigation: home, decks, history, players, stats
├── api/                # Server API routes (Vercel functions)
├── auth/               # Sign-in flows (Clerk)
├── guest.tsx           # Unauthenticated guest tracker (in-memory)
├── match/
│   ├── setup.tsx       # Account match setup (commander/deck-aware)
│   ├── casual.tsx      # In-account casual match (in-memory, no API)
│   └── [id]/           # tracker, results, close, detail
├── decks/[id].tsx
├── players/[id].tsx
├── commanders/[id].tsx
├── groups/             # Pod CRUD + detail
└── stats/matchup.tsx
components/
├── match/
│   ├── CasualMatch.tsx # Shared in-memory setup+tracker (used by guest + /match/casual)
│   ├── TrackerLayout.tsx
│   └── ...
├── tracker/            # PlayerDashboard, LifeCounter, PoisonCounter, CommanderDamagePanel
└── stats/              # PlayerRankingRow, MatchupCard, etc.
services/               # API client, auth, DB queries (Drizzle)
hooks/                  # Custom React hooks (useDecks, useTracker, usePlayerStats, ...)
db/schema.ts            # Single source of truth for Drizzle schema
drizzle/                # Migrations (numbered, with meta journal). gitignored.
locales/en.json + es.json
styles/                 # Design tokens — "The Mystic Archive" (MTG 5-color theme)
```

### Core data flow

Match lifecycle: **Setup → in_progress → event stream → completed / abandoned**

1. `POST /api/matches` — create match + participations
2. Match screen holds local state (life totals, poison, commander damage)
3. Each state change debounces (200–2000ms) → `POST /api/match-events`
4. `PATCH /api/matches/:id` — finalize winner/condition or draw/abandon
5. Stats computed on-demand via `GET /api/stats/...` (no pre-compute in MVP)

Soft-undo via `match_events.is_undone`. No mutations or events are ever hard-deleted.

### Key domain entities

```
players → decks → participations ↔ matches ← match_events
groups ↔ group_members → players
```

- `players.account_user_id` distinguishes account-linked players (Clerk user) from guests (null).
- Commanders are not unique — same commander can appear on multiple decks. Stats are deck-based.
- `decks.archived_at` (added 2026-05-12) hides a deck from the picker without losing history.

### Auth & permissions

| Role | Scope |
|------|-------|
| Guest (unauthenticated) | In-memory tracker only (no persistence) — `/guest` route |
| User | Own players, decks, matches, stats |
| Pod member | Shared pod players/decks/matches |
| Pod owner | Invite members, manage pod |

**No Postgres RLS.** Auth is enforced at the API route layer via `getAuth(req)` + ownership / pod-membership checks. The `services/stats.ts` file exports the canonical visibility helpers — `userCanViewDeck`, `userCanViewCommander`, `userCanViewPlayer` — which all relax the per-user ownership check when the viewer shares a pod or a match with the entity. Use these instead of writing new ownership checks.

## Things that bite — patterns to follow

These are codified in the user's memory (`feedback_*.md`) — surface them when working in their area:

- **Clerk `getToken` must be ref-held** in any hook that calls it inside `useEffect` (`feedback_clerk_gettoken_ref.md`). Putting `getToken` in a dep array causes the effect to refire every render → loading-state flicker.
- **Neon HTTP has no transactions** (`feedback_neon_no_transactions.md`). Use sequential queries. If you need ACID, the script must be idempotent on rerun.
- **`SafeAreaView` doesn't reliably apply `top` inside `fullScreenModal`** on iOS. Pattern: set `edges={['left','right','bottom']}` and apply `useSafeAreaInsets().top + spacing[2]` as explicit `paddingTop` on the header.
- **`router.back()` is a no-op when nothing's on the stack to pop** (fullScreenModal opened via `replace`, deep link, etc.). Use `router.canDismiss() ? router.dismiss() : router.replace('/(tabs)')`.
- **`eas update` reads EAS dashboard env vars**, not the `eas.json` build profile env (`feedback_eas_update_env.md`). Verify with `eas env:list --environment production` before OTA.
- **Before any prod migration, verify the DATABASE_URL matches Vercel's** (`feedback_verify_migration_target.md`). `.env.local` is NOT prod — Vercel prod points to a different Neon project (`mtg-tracker-prod` / `wandering-sky`). Cross-check via `neonctl projects list`.

## Technical documentation

Background design + ADRs live in `docs/planning/` (largely written pre-launch, still accurate for design intent):

| Doc | Contents |
|-----|----------|
| `07_ARCHITECTURE.md` | Accepted ADRs, security model, performance targets |
| `06_DATA_MODEL.md` | Original Drizzle schema design |
| `08_API_CONTRACTS.md` | REST endpoint contracts |
| `05_BUSINESS_RULES.md` | Game rules, validation constraints |
| `11_TEST_STRATEGY.md` | Unit / integration / E2E test plan |
| `00_DISCOVERY_BRIEF.md` | 20 MVP features, 4 delivery batches, personas |

When code and these docs disagree, the code wins — docs haven't been kept in lock-step since launch.

`docs/RELEASE_PLAN.md` documents the App Store / Play Store rollout plan.

## AI Workflow System (`.agent/`)

The `.agent/` directory contains a TimeKast Factory system for structured AI-driven development. Mostly used for planning / scaffolding phases; less relevant for day-to-day OTA work.

- `/implement` — scaffold or implement a feature using specialist agents
- `/docs` — generate or update technical documentation
- `/design` — produce design specs
- `/backlog` — generate and prioritize user stories

Routing logic and agent assignments are in `.agent/registry/registry.yaml`. Read `.agent/ARCHITECTURE.md` before invoking workflows.

## Environment Variables Required

```
DATABASE_URL                      # Neon prod (set in Vercel — Sensitive, not visible via vercel env pull)
CLERK_PUBLISHABLE_KEY             # Clerk Production
CLERK_SECRET_KEY                  # Clerk Production
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY # Bundled into the EAS update; required in EAS dashboard env (not eas.json)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```
