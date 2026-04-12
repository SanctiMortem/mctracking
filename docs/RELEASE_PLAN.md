# Release Plan — MTG Commander Tracker

> **Generated:** 2026-04-12
> **Audit:** R4 — 🔴 NOT READY (4 blockers)
> **Goal:** Fix audit blockers + ship to App Store + Google Play

---

## Current State

| Layer | Status |
|-------|--------|
| M1 code (72 issues) | ✅ 100% done |
| Unit test coverage | ❌ 37.8% (threshold: 80%) |
| Integration tests | ❌ 100% stubs (`describe.skip`) |
| E2E | ❌ Not configured in package.json |
| Build / Stores | ❌ No prod env vars, no submissions |

---

## Track 1 — Test Coverage (BLOCKER)

> Goal: coverage 37.8% → ≥ 80%

### T1.1 — Test Infrastructure (Neon test branch)

Integration tests require a real Neon branch. All `describe.skip` files are blocked on this.

1. Create `test` branch in Neon dashboard (dashboard.neon.tech)
2. Create `.env.test` with `DATABASE_URL` pointing to test branch → add to `.gitignore`
3. Create `jest.setup.ts` that loads `.env.test` via `dotenv/config` before integration tests
4. Configure Jest projects in `jest.config.js` — separate `unit` (mock DB) and `integration` (real DB)
5. Create `__tests__/helpers/seed.ts` — seed data per fixtures in `docs/planning/11_TEST_STRATEGY.md`
6. Add scripts to `package.json`:
   ```json
   "test:unit": "jest --testPathPattern=__tests__/unit",
   "test:integration": "jest --testPathPattern=__tests__/integration",
   "test:e2e": "maestro test e2e/"
   ```

### T1.2 — Integration Tests (7 files, ~60 cases)

All files in `__tests__/integration/api/` have cases described but no bodies.

**`commanders.test.ts`**
- `POST /api/commanders` — happy path, duplicate name (409), invalid color (400), no auth (401)
- `DELETE /api/commanders/:id` — soft delete, forbidden, in use by deck

**`players.test.ts`**
- `POST /api/players` — happy path, duplicate name, no auth
- `GET /api/players` — lists only active, excludes soft-deleted
- `DELETE /api/players/:id` — soft delete, in active match (400), forbidden

**`decks.test.ts`**
- `POST /api/decks` — with partner, without partner, `partnerRequired` when `is_partner=true`, commander not found
- `GET /api/decks` — filter by `commander_id`, excludes deleted
- `DELETE /api/decks/:id` — soft delete, in active match (409), forbidden

**`matches.test.ts`**
- `POST /api/matches` — 2/3/4 players, <2 (400), >4 (400), duplicate deck (400), other user's deck (403), deck in active match (409), rollback on failure
- `PATCH /api/matches/:id` — win path, draw path, abandon, already closed (409), invalid win_condition (400)
- `GET /api/matches/:id` — full detail

**`match-events.test.ts`**
- `POST /match-events` — life_change, poison_change, commander_damage
- Undo: `is_undone=true` on correct event, closed match rejects new events
- Debounce: multiple events within window, outside window

**`stats.test.ts`**
- `GET /api/stats/players/:id` — win_rate with 0 matches (null), 1/1 (100%), abandoned not counted (BR-STATS-03)
- `GET /api/stats/decks/:id`, `GET /api/stats/commanders/:id`
- `GET /api/stats/matchups` — scope=1v1 filters 3+ player matches
- Global stats — ties get same rank position (BR-STATS-07)

**`platform.test.ts`**
- `GET /api/settings` — bootstrap creates row if missing
- `PATCH /api/settings` — language, debounce, rejects `premium` field (ADR-007)
- `POST /api/purchases/verify` — valid receipt activates premium, invalid receipt (400), invalid platform (400)

### T1.3 — Complete Unit Test `.todo` Cases

Priority by coverage impact:

| File | Coverage | Action |
|------|----------|--------|
| `services/commanders.ts` | 10.34% | Add integration or unit tests for `listCommanders`, `createCommander` (duplicate check), `softDeleteCommander` |
| `services/stats.ts` | 0% (not in report) | Add tests for `getPlayerStats`, `getDeckStats` — especially CALC-001 win_rate |
| `hooks/useTracker.ts` | Low | Optimistic state, `recordEvent`, commander damage accumulation, optimistic undo — mock `apiFetch` |
| `hooks/useGuestTracker.ts` | Partial | Fill `.todo` bodies: participations logic, reset, limits without auth |
| `hooks/useSettings.ts` | Low | Optimistic patch, rollback on error |
| `hooks/useGroups.ts` | Low | `ownedGroups` vs `memberGroups` split, `createGroup`, `joinGroup` error codes |
| `hooks/useMatchSetup.ts` | Low | Participant validation (2-4, no duplicates) |
| `hooks/useCloseMatch.ts` | Low | win/draw/abandon paths |
| `hooks/useMatchHistory.ts` | Low | Filters, pagination |

### T1.4 — Coverage Threshold in jest.config.js

```js
coverageThreshold: {
  global: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80,
  },
},
```

This makes `pnpm test:coverage` fail if below threshold — automatic CI gate.

---

## Track 2 — E2E (BLOCKER)

> Files in `e2e/` exist. Maestro not configured in package.json.

### T2.1 — Maestro Setup

1. Install Maestro CLI: `curl -Ls "https://get.maestro.mobile.dev" | bash`
2. Add scripts to `package.json`:
   ```json
   "test:e2e": "maestro test e2e/",
   "test:e2e:ios": "maestro test e2e/ --platform ios",
   "test:e2e:android": "maestro test e2e/ --platform android"
   ```
3. Verify existing `.spec.yaml` files use `testID` props that exist in RN components

### T2.2 — Implement E2E Scenarios (from `docs/planning/12_E2E_SCENARIOS.md`)

| # | Scenario | Release Priority |
|---|----------|-----------------|
| E2E-001 | Onboarding + account creation | 🔴 Must |
| E2E-003 | Full 4-player match | 🔴 Must |
| E2E-004 | Tracking with Undo | 🔴 Must |
| E2E-007 | Guest flow | 🔴 Must |
| E2E-005 | History + Stats | 🟡 Should |
| E2E-002 | Deck with partner commanders | 🟡 Should |
| E2E-006 | Groups + invite player | 🟡 Should |
| E2E-008 | Premium purchase (sandbox) | 🟢 Nice to have |

Steps per scenario are fully described in `12_E2E_SCENARIOS.md`. Task: implement YAML steps using correct `testID` props in RN components.

---

## Track 3 — Audit Warnings (fix before release)

### T3.1 — Dead Code Cleanup (Knip)

| Item | Action |
|------|--------|
| `components/debug/TokenPreview.tsx` | Delete |
| `hono` in `package.json` | `pnpm remove hono` |
| `@babel/core` devDep | Verify if used by `babel.config.js`; if not → `pnpm remove -D @babel/core` |
| `constants/index.ts`, `styles/index.ts` | Add missing re-exports OR delete if truly unused barrel files |
| `services/groups.ts` — `getMembership`, `getGroupById` | Use in hooks or remove exports |
| 48 unused `New*` / `Use*Return` types | Verify runtime use; if unused → remove `export` keyword (keep the type) |

### T3.2 — Minor Bug Fixes

1. **`app/_layout.tsx:42`** — Replace `'#0D0D0F'` with `colors.background.primary` from design system tokens
2. **`services/purchases.ts` — `validateGoogleReceipt`** — Add `signal: AbortSignal.timeout(8000)` to both `fetch()` calls
3. **`services/purchases.ts:73` — Apple secret missing** — When `APPLE_SHARED_SECRET` is not set, return `{ serverError: true }` and map to 503 in handler instead of 400

### T3.3 — Dependency Fixes

- Verify `expo-updates` and `expo-system-ui` (unlisted by Knip in `app.config.ts`) are in `dependencies` in `package.json`
- Add `babel-preset-expo` to devDependencies if missing

### T3.4 — Lighthouse Deferral (mobile app)

Lighthouse is for web apps — N/A for React Native. Formal action:
- Add note to audit checklist: *"Lighthouse N/A — React Native mobile app. Substitute: `npx expo-doctor` + EAS Diagnostics."*
- Add script: `"doctor": "expo-doctor"`

---

## Track 4 — Build & Release Infrastructure

### T4.1 — Add `build` script to package.json

```json
"build": "expo export",
"build:local": "eas build --local --platform all --profile preview"
```

### T4.2 — Generate `docs/reference/INVENTORY.md`

Create snapshot of:
- All API endpoints (from `docs/planning/08_API_CONTRACTS.md`)
- All exported components
- All screens
- All DB tables

### T4.3 — Add `CHANGELOG.md`

```markdown
# Changelog

## [1.0.0] — TBD — First release
### Added
- Full M1 implementation: 72 issues, 289 SP
- EPIC-SETUP through EPIC-05 (Platform)
```

### T4.4 — First git tag

```bash
git tag v1.0.0-rc1
git push origin v1.0.0-rc1
```

---

## Track 5 — Production Environment Variables

| Variable | Where to configure | Notes |
|----------|--------------------|-------|
| `DATABASE_URL` | EAS dashboard → production env | Neon production branch connection string |
| `CLERK_PUBLISHABLE_KEY` | EAS dashboard + `app.config.ts` | Clerk production key (`pk_live_...`) |
| `CLERK_SECRET_KEY` | EAS dashboard (server-only) | `sk_live_...` |
| `GOOGLE_CLIENT_ID` | EAS dashboard | Google OAuth client ID |
| `APPLE_SHARED_SECRET` | EAS dashboard (server-only) | App Store Connect → IAP → "Shared Secret" |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` | EAS dashboard | Base64-encoded service account JSON |
| `ANDROID_PACKAGE_NAME` | `app.json` / `app.config.ts` | e.g. `com.aboutagency.mtgtracker` |
| `ADMOB_APP_ID_IOS` | `app.config.ts` | Google AdMob iOS app ID |
| `ADMOB_APP_ID_ANDROID` | `app.config.ts` | Google AdMob Android app ID |
| `APP_ENV` | `eas.json` (already configured) | `production` |

**Steps:**
1. Create Clerk production instance → get `pk_live_` / `sk_live_` keys
2. Create Neon `production` branch (separate from `main`/`develop`)
3. Run migrations against production: `DATABASE_URL=<neon-prod-url> pnpm db:migrate`
4. Upload all vars to EAS: `eas env:create --environment production`

---

## Track 6 — App Store (iOS)

### T6.1 — App Store Connect Setup

1. Create app in App Store Connect (bundle ID must match `app.json`)
2. Configure metadata: name, description (EN + ES), category (Games)
3. Upload screenshots — minimum 6.7" (iPhone 16 Pro Max) and 5.5" (iPhone 8 Plus)
   - Key screens: Home, Match Tracker (4-player), History, Stats, Settings
4. Set price: Free
5. Configure IAP in App Store Connect: add product `com.mtgtracker.premium` (non-consumable, one-time)
6. Answer privacy questions
7. Fill App Privacy nutrition label

### T6.2 — Build iOS Production

```bash
eas build --platform ios --profile production
```

Prerequisite: Apple certificates configured (EAS handles with auto-managed provisioning).

### T6.3 — Submit iOS

```bash
eas submit --platform ios --latest
```

Then in App Store Connect: move build to Review → Submit for Review.

---

## Track 7 — Google Play (Android)

### T7.1 — Google Play Console Setup

1. Create app in Google Play Console (bundle ID)
2. Complete listing: name, description, category (Utilities or Games), rating (Everyone)
3. Configure privacy policy URL
4. Upload screenshots — Phone (16:9) + 7" Tablet
5. Configure Data Safety section
6. Configure In-App Products: `com.mtgtracker.premium` (managed product, one-time)
7. Create service account with Android Publisher API permissions → download JSON → base64 encode → `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY`

### T7.2 — Build Android Production

```bash
eas build --platform android --profile production
```

Produces `.aab` (Android App Bundle).

### T7.3 — Submit Android

```bash
eas submit --platform android --latest --track internal
```

QA in Internal Testing (minimum 1 week), then promote to Production from Google Play Console.

---

## Track 8 — Production Database

1. **Create Neon `production` branch** — do not use `main` directly
2. **Run migrations** against production:
   ```bash
   DATABASE_URL=<neon-production-url> pnpm db:migrate
   ```
3. **Seed commanders** — app needs a base catalog of commanders. Create `pnpm db:seed:commanders` script with most popular Commander generals (Atraxa, Kenrith, etc.) OR support user-created commanders from day one.
4. **Verify RLS** — Row Level Security policies must be active in Neon production with Clerk JWT configured correctly.
5. **Enable PgBouncer** — Activate connection pooling in Neon to prevent connection exhaustion in production.

---

## Priority Summary

| Priority | Track | Est. Effort | R4 Blocker? |
|----------|-------|-------------|-------------|
| 🔴 P0 | T1.1 — Test infra (Neon test branch + .env.test) | 2h | Yes |
| 🔴 P0 | T1.2 — Integration tests (7 files, ~60 cases) | 2–3 days | Yes |
| 🔴 P0 | T1.3 — Unit tests for hooks/services | 2–3 days | Yes |
| 🔴 P0 | T1.4 — Coverage threshold in jest.config.js | 30min | Yes |
| 🔴 P0 | T2.1 — Maestro setup + scripts | 1h | Yes |
| 🔴 P0 | T2.2 — E2E scenarios (4 must-have) | 1–2 days | Yes |
| 🟡 P1 | T3.1 — Dead code cleanup (Knip) | 1h | No |
| 🟡 P1 | T3.2 — Bug fixes (timeout, hex color, Apple 503) | 2h | No |
| 🟡 P1 | T4.1–T4.4 — Build script, INVENTORY, CHANGELOG, tag | 2h | No |
| 🟡 P1 | T5 — Production env vars | 3–4h | For deploy |
| 🟠 P2 | T6 — App Store setup + submission | 1 day | For launch |
| 🟠 P2 | T7 — Google Play setup + submission | 1 day | For launch |
| 🟠 P2 | T8 — Neon production + RLS + seed | 2–3h | For launch |

---

## Recommended Execution Order

```
Week 1: T1.1 → T1.2 → T1.3 → T1.4  (tests to 80%+)
Week 2: T2.1 → T2.2 (E2E) + T3.x in parallel (cleanup)
Week 3: T4.x + T5 (infra) + T8 (prod DB)
Week 4: T6 + T7 (stores) → submit → review → launch
```

The real bottleneck is test coverage — once integration + hooks/stats unit tests push coverage above 80%, the R4 audit moves from 🔴 NOT READY to ✅ READY.

---

_MTG Commander Tracker — Release Plan generated 2026-04-12_
