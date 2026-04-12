# MTG Commander Tracker

Mobile app for tracking Magic: The Gathering Commander matches. Supports 2–4 players on a single device with live life total, poison counter, and commander damage tracking. Persists full match history with win-rate stats per player, deck, and commander.

**Platform:** iOS + Android (React Native + Expo)

---

## Requirements

- Node.js ≥ 22 (via [NVM](https://github.com/nvm-sh/nvm))
- pnpm ≥ 10
- Expo CLI (`npm i -g expo-cli`)
- EAS CLI (`npm i -g eas-cli`) — for device builds

---

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Start the dev server
npx expo start
```

---

## Environment Variables

Copy `.env.example` → `.env` and provide values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key (server-only) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (Clerk dashboard) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ADMOB_APP_ID_IOS` | AdMob app ID for iOS |
| `ADMOB_APP_ID_ANDROID` | AdMob app ID for Android |
| `ADMOB_BANNER_UNIT_ID` | AdMob banner unit ID |
| `ADMOB_INTERSTITIAL_UNIT_ID` | AdMob interstitial unit ID |
| `APPLE_SHARED_SECRET` | App Store shared secret for IAP receipt validation |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` | Base64-encoded Google service account JSON for Play Billing |
| `ANDROID_PACKAGE_NAME` | Android package name (e.g. `com.mtgtracker`) |

---

## Commands

```bash
# Dev
npx expo start          # Start Expo dev server
npx expo run:ios        # Run on iOS simulator
npx expo run:android    # Run on Android emulator

# Quality
pnpm lint               # Lint
pnpm typecheck          # TypeScript check
pnpm test               # Unit + integration tests
pnpm test:coverage      # Tests with coverage report

# Database (Drizzle)
pnpm db:generate        # Generate migration from schema changes
pnpm db:migrate         # Apply migrations to Neon
```

---

## Project Structure

```
app/
├── (tabs)/         # Tab navigation (home, history, stats, settings)
├── api/            # Expo Router API routes (Hono handlers)
└── auth/           # Auth flows (Clerk)
components/         # Reusable UI components
hooks/              # Custom React hooks
services/           # DB queries + external API clients
db/                 # Drizzle schema and inferred types
types/              # Shared TypeScript interfaces
__tests__/          # Unit, integration, and E2E tests
docs/               # Technical documentation and backlog
```

---

## Architecture

| Layer | Technology |
|---|---|
| Framework | React Native + Expo |
| Navigation | Expo Router |
| Database | Neon (PostgreSQL serverless) |
| ORM | Drizzle ORM |
| Auth | Clerk |
| i18n | react-i18next + expo-localization (EN/ES) |
| Ads | AdMob (free tier) |
| IAP | expo-iap (one-time Premium purchase) |

See [docs/planning/07_ARCHITECTURE.md](docs/planning/07_ARCHITECTURE.md) for ADRs and full architecture decisions.
