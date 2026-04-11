# Backlog Generation Progress

> **Workflow:** `/backlog`
> **Session:** 1 of 2
> **Date:** 2026-04-10
> **Status:** ✅ Session 1 Complete

---

## Session 1 — Completed

### Epics Generated

| Epic | Issues Created | SP | Status |
|------|---------------|-----|--------|
| EPIC-SETUP (Project Setup) | 10 | 24 | ✅ Done |
| EPIC-01 (Data Foundation) | 11 | 44 | ✅ Done |
| EPIC-02 (Match Lifecycle) | 9 | 36 | ✅ Done |
| EPIC-03 (Live Tracking) | 11 | 48 | ✅ Done |
| **Total Session 1** | **41** | **152** | ✅ |

### Issues Created

**EPIC-SETUP (10 issues)**
- [x] ADR-001 — Styling strategy (NativeWind vs StyleSheet)
- [x] SETUP-001 — Scaffold Expo project
- [x] SETUP-002 — Configure env vars
- [x] SETUP-003 — Configure Drizzle + Neon
- [x] SETUP-004 — Configure Expo Router shell
- [x] SETUP-005 — Configure design tokens
- [x] SETUP-006 — Configure i18n skeleton
- [x] SETUP-007 — Configure Clerk SDK
- [x] SETUP-008 — Configure EAS Build
- [x] SETUP-009 — Epic Tests

**EPIC-01 — Data Foundation (11 issues)**
- [x] DATA-001 — DB schema: players, decks, commanders
- [x] DATA-002 — API: Commander CRUD
- [x] DATA-003 — API: Player CRUD
- [x] DATA-004 — API: Deck CRUD
- [x] DATA-005 — UI: Commanders screen (SCR-016)
- [x] DATA-006 — UI: Players screen (SCR-003)
- [x] DATA-007 — UI: Decks screen (SCR-004)
- [x] DATA-008 — UI: Player profile stub (SCR-012)
- [x] DATA-009 — UI: Deck detail stub (SCR-013)
- [x] DATA-010 — UI: Commander detail stub (SCR-014)
- [x] DATA-011 — Epic Tests

**EPIC-02 — Match Lifecycle (9 issues)**
- [x] MATCH-001 — DB schema: matches, participations, match_results
- [x] MATCH-002 — API: Create match
- [x] MATCH-003 — API: Close match
- [x] MATCH-004 — API: Match detail
- [x] MATCH-005 — UI: Match setup (SCR-007)
- [x] MATCH-006 — UI: Close match (SCR-009)
- [x] MATCH-007 — UI: Match results (SCR-010)
- [x] MATCH-008 — UI: Match detail stub (SCR-011)
- [x] MATCH-009 — Epic Tests

**EPIC-03 — Live Tracking (11 issues)**
- [x] ADR-002 — Commander damage source of truth
- [x] ADR-003 — Life total source of truth
- [x] TRACK-001 — DB schema: match_events
- [x] TRACK-002 — API: match-events (record + undo)
- [x] TRACK-003 — UI: Tracker shell / SCR-008 layout
- [x] TRACK-004 — Component: LifeCounter (CMP-001)
- [x] TRACK-005 — Component: CommanderDamagePanel (CMP-005)
- [x] TRACK-006 — Component: PoisonCounter
- [x] TRACK-007 — Component: EventLog + Undo (CMP-011)
- [x] TRACK-008 — Spike: iPhone SE 4-player layout
- [x] TRACK-009 — Epic Tests

---

## Session 2 — Completed

### Epics Generated

| Epic | Issues Created | SP | Status |
|------|---------------|-----|--------|
| EPIC-04 (History & Stats) | 13 | 52 | ✅ Done |
| EPIC-05 (Platform) | 18 | 65 | ✅ Done |
| **Total Session 2** | **31** | **117** | ✅ |

### Issues Created

**EPIC-04 — History & Stats (13 issues)**
- [x] ADR-008 — Match history pagination (cursor vs offset)
- [x] HIST-001 — API: Match History (GET /matches + filters)
- [x] HIST-002 — UI: SCR-005 Match History + MatchCard
- [x] HIST-003 — UI: SCR-011 Match Detail FULL (EventLog post-match)
- [x] HIST-004 — API: Player Stats (GET /stats/players/:id)
- [x] HIST-005 — UI: SCR-012 Player Profile FULL
- [x] HIST-006 — API: Deck Stats (GET /stats/decks/:id)
- [x] HIST-007 — UI: SCR-013 Deck Detail FULL
- [x] HIST-008 — API: Commander Stats (GET /stats/commanders/:id)
- [x] HIST-009 — UI: SCR-014 Commander Detail FULL
- [x] HIST-010 — API: Matchup + Global Stats
- [x] HIST-011 — UI: SCR-006 Stats Dashboard + SCR-015 Matchup Stats
- [x] HIST-012 — Epic Tests

**EPIC-05 — Platform (18 issues)**
- [x] ADR-004 — Home match active context (group vs individual)
- [x] ADR-005 — Group selection screen obligatory?
- [x] ADR-006 — Guest→User upgrade mid-match
- [x] ADR-007 — IAP receipt validation endpoint
- [x] PLAT-001 — DB schema: groups, group_members, user_settings
- [x] PLAT-002 — API: Auth session + Settings bootstrap
- [x] PLAT-003 — UI: SCR-001 Auth screen (all providers)
- [x] PLAT-004 — UI: SCR-019 Guest Tracker FULL
- [x] PLAT-005 — API: Groups CRUD (create, invite, join)
- [x] PLAT-006 — UI: SCR-017 Groups screen
- [x] PLAT-007 — API: Settings PATCH + UserSettings
- [x] PLAT-008 — UI: SCR-018 Settings screen
- [x] PLAT-009 — i18n: Translations EN + ES complete
- [x] PLAT-010 — UI: SCR-002 Home screen FULL
- [x] PLAT-011 — Monetization: Ads (AdMob free tier)
- [x] PLAT-012 — Monetization: IAP one-time premium
- [x] PLAT-013 — Platform: EAS Build production
- [x] PLAT-014 — Epic Tests

---

## M1 Total (Sessions 1 + 2) — COMPLETE

| Metric | Value |
|--------|-------|
| Total Epics | 6 (EPIC-SETUP + EPIC-01 through EPIC-05) |
| Total Issues | 72 |
| Total SP | 269 |
| Features covered | FT-001 to FT-020 (all 20 MVP features) |
| ADRs | 8 (ADR-001 through ADR-008) |
| Screens covered | All 19 (SCR-001 through SCR-019) |

---

_Last updated: 2026-04-10 — Session 2 complete — M1 backlog DONE_
