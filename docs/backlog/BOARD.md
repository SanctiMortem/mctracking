# BOARD.md — MTG Commander Tracker · M1

> **Generated:** 2026-04-11
> **Source:** `docs/backlog/M1/issues/` (72 issue files, authoritative SP from each file)
> **Branch:** develop

---

## Summary

| Epic | Name | Issues | SP | Done | Backlog | Status |
|------|------|--------|----|:----:|:-------:|--------|
| EPIC-SETUP | Project Setup & Scaffolding | 10 | 34 | 10 | 0 | ✅ Done |
| EPIC-01 | Data Foundation | 11 | 49 | 11 | 0 | ✅ Done |
| EPIC-02 | Match Lifecycle | 9 | 42 | 9 | 0 | ✅ Done |
| EPIC-03 | Live Tracking | 11 | 44 | 11 | 0 | ✅ Done |
| EPIC-04 | History & Stats | 13 | 52 | 13 | 0 | ✅ Done |
| EPIC-05 | Platform | 18 | 68 | 4 | 14 | 🔄 In Progress |
| **M1 Total** | — | **72** | **289** | **58** | **14** | — |

**Progress:** 58/72 issues done (81%) · 225/289 SP completed (78%)

---

## EPIC-SETUP — Project Setup & Scaffolding ✅ Done

> 10 issues · 34 SP · 100% complete

| ID | Title | Priority | SP | Status |
|----|-------|----------|----|--------|
| ADR-001 | Decidir estrategia de styling (NativeWind vs StyleSheet nativo) | P0 | 1 | ✅ Done |
| SETUP-001 | Scaffold Expo + TypeScript project | P0 | 2 | ✅ Done |
| SETUP-002 | Configure environment variables and secrets | P0 | 2 | ✅ Done |
| SETUP-003 | Configure Drizzle ORM + Neon connection | P0 | 5 | ✅ Done |
| SETUP-004 | Configure Expo Router navigation shell | P0 | 5 | ✅ Done |
| SETUP-005 | Configure design tokens "The Mystic Archive" | P1 | 5 | ✅ Done |
| SETUP-006 | Configure i18n skeleton (react-i18next) | P1 | 2 | ✅ Done |
| SETUP-007 | Configure Clerk SDK provider | P0 | 5 | ✅ Done |
| SETUP-008 | Configure EAS Build (iOS + Android) | P1 | 5 | ✅ Done |
| SETUP-009 | 🧪 Epic Tests — SETUP | P2 | 2 | ✅ Done |

---

## EPIC-01 — Data Foundation ✅ Done

> 11 issues · 49 SP · 100% complete

| ID | Title | Priority | SP | Status |
|----|-------|----------|----|--------|
| DATA-001 | DB schema — Commander, Player, Deck | P0 | 5 | ✅ Done |
| DATA-002 | API — Commander CRUD | P0 | 5 | ✅ Done |
| DATA-003 | API — Player CRUD | P0 | 5 | ✅ Done |
| DATA-004 | API — Deck CRUD | P0 | 5 | ✅ Done |
| DATA-005 | UI — SCR-016 Commanders (list + CRUD) | P1 | 5 | ✅ Done |
| DATA-006 | UI — SCR-003 Players (list + CRUD) | P1 | 5 | ✅ Done |
| DATA-007 | UI — SCR-004 Decks (library + CRUD) | P1 | 8 | ✅ Done |
| DATA-008 | UI — SCR-012 Player Profile (stub) | P2 | 2 | ✅ Done |
| DATA-009 | UI — SCR-013 Deck Detail (stub) | P2 | 2 | ✅ Done |
| DATA-010 | UI — SCR-014 Commander Detail (stub) | P2 | 2 | ✅ Done |
| DATA-011 | 🧪 Epic Tests — Data Foundation | P1 | 5 | ✅ Done |

---

## EPIC-02 — Match Lifecycle ✅ Done

> 9 issues · 42 SP · 100% complete

| ID | Title | Priority | SP | Status |
|----|-------|----------|----|--------|
| MATCH-001 | DB schema — Match, Participation, MatchResult | P0 | 5 | ✅ Done |
| MATCH-002 | API — POST /api/matches (crear match) | P0 | 5 | ✅ Done |
| MATCH-003 | API — PATCH /api/matches/:id (cerrar match) | P0 | 5 | ✅ Done |
| MATCH-004 | API — GET /api/matches/:id (detalle de match) | P1 | 2 | ✅ Done |
| MATCH-005 | UI — SCR-007 Match Setup | P0 | 8 | ✅ Done |
| MATCH-006 | UI — SCR-009 Cierre de Match (sheet) | P1 | 5 | ✅ Done |
| MATCH-007 | UI — SCR-010 Match Results | P1 | 5 | ✅ Done |
| MATCH-008 | UI — SCR-011 Match Detail (stub) | P2 | 2 | ✅ Done |
| MATCH-009 | 🧪 Epic Tests — Match Lifecycle | P1 | 5 | ✅ Done |

---

## EPIC-03 — Live Tracking ✅ Done

> 11 issues · 44 SP · 100% complete

| ID | Title | Priority | SP | Status |
|----|-------|----------|----|--------|
| ADR-002 | Decidir source of truth de commander_damage | P0 | 1 | ✅ Done |
| ADR-003 | Decidir source of truth de life_total | P0 | 1 | ✅ Done |
| TRACK-001 | DB schema — MatchEvent | P0 | 5 | ✅ Done |
| TRACK-002 | API — match-events (record + undo) | P0 | 5 | ✅ Done |
| TRACK-003 | UI — SCR-008 Match Tracker shell (layout system) | P0 | 8 | ✅ Done |
| TRACK-004 | Component — LifeCounter (CMP-001) | P0 | 5 | ✅ Done |
| TRACK-005 | Component — CommanderDamagePanel (CMP-005) | P1 | 5 | ✅ Done |
| TRACK-006 | Component — PoisonCounter | P1 | 2 | ✅ Done |
| TRACK-007 | Component — EventLog + Undo (CMP-011) | P1 | 5 | ✅ Done |
| TRACK-008 | Spike — iPhone SE 4-player layout legibility | P2 | 2 | ✅ Done |
| TRACK-009 | 🧪 Epic Tests — Live Tracking | P1 | 5 | ✅ Done |

---

## EPIC-04 — History & Stats ✅ Done

> 13 issues · 52 SP · 100% complete
> **Dependency:** EPIC-02 ✅, EPIC-03 ✅ — **Ready to start**

| ID | Title | Priority | SP | Status |
|----|-------|----------|----|--------|
| ADR-008 | Match History Pagination — Cursor vs Offset | P2 | 1 | ✅ Done |
| HIST-001 | API — Match History (GET /matches + filters) | P1 | 5 | ✅ Done |
| HIST-002 | UI — SCR-005 Match History + MatchCard | P1 | 5 | ✅ Done |
| HIST-003 | UI — SCR-011 Match Detail FULL (EventLog post-match) | P1 | 5 | ✅ Done |
| HIST-004 | API — Player Stats (GET /stats/players/:id) | P1 | 5 | ✅ Done |
| HIST-005 | UI — SCR-012 Player Profile FULL | P1 | 5 | ✅ Done |
| HIST-006 | API — Deck Stats (GET /stats/decks/:id) | P1 | 2 | ✅ Done |
| HIST-007 | UI — SCR-013 Deck Detail FULL | P1 | 2 | ✅ Done |
| HIST-008 | API — Commander Stats (GET /stats/commanders/:id) | P1 | 2 | ✅ Done |
| HIST-009 | UI — SCR-014 Commander Detail FULL | P1 | 2 | ✅ Done |
| HIST-010 | API — Matchup Stats + Global Stats | P1 | 5 | ✅ Done |
| HIST-011 | UI — SCR-006 Stats Dashboard + SCR-015 Matchup Stats | P1 | 8 | ✅ Done |
| HIST-012 | 🧪 Epic Tests — History & Stats | P1 | 5 | ✅ Done |

---

## EPIC-05 — Platform 🔄 In Progress

> 18 issues · 68 SP · 22% complete (4/18 done)
> **Dependency:** EPIC-SETUP ✅, EPIC-03 ✅, EPIC-04 ✅

| ID | Title | Priority | SP | Status |
|----|-------|----------|----|--------|
| ADR-004 | Home — Match Activo de Grupo vs Individual | P1 | 1 | ✅ Done |
| ADR-005 | ¿Pantalla de Selección de Grupo Obligatoria? | P1 | 1 | ✅ Done |
| ADR-006 | Guest→User Upgrade Mid-Match | P2 | 1 | ✅ Done |
| ADR-007 | IAP Receipt Validation — Endpoint Separado o en PATCH /settings? | P1 | 1 | ✅ Done |
| PLAT-001 | DB Schema — groups, group_members, user_settings | P0 | 2 | 📋 Backlog |
| PLAT-002 | API — Auth Session + Settings Bootstrap | P0 | 2 | 📋 Backlog |
| PLAT-003 | UI — SCR-001 Auth Screen (todos los providers) | P0 | 8 | 📋 Backlog |
| PLAT-004 | UI — SCR-019 Guest Tracker (full) | P0 | 5 | 📋 Backlog |
| PLAT-005 | API — Groups CRUD (create, invite, join) | P1 | 5 | 📋 Backlog |
| PLAT-006 | UI — SCR-017 Groups Screen | P1 | 5 | 📋 Backlog |
| PLAT-007 | API — Settings PATCH + UserSettings | P1 | 2 | 📋 Backlog |
| PLAT-008 | UI — SCR-018 Settings Screen | P1 | 5 | 📋 Backlog |
| PLAT-009 | i18n — Translation Strings Completas (EN + ES) | P1 | 5 | 📋 Backlog |
| PLAT-010 | UI — SCR-002 Home Screen FULL | P1 | 5 | 📋 Backlog |
| PLAT-011 | Monetización — Ads Integration (AdMob/Unity — free tier) | P2 | 5 | 📋 Backlog |
| PLAT-012 | Monetización — IAP One-Time Premium | P2 | 8 | 📋 Backlog |
| PLAT-013 | Platform — EAS Build Production (iOS + Android) | P1 | 2 | 📋 Backlog |
| PLAT-014 | 🧪 Epic Tests — Platform | P1 | 5 | 📋 Backlog |

---

## Kanban View

### ✅ Done (58 issues · 225 SP)

`ADR-001` `SETUP-001` `SETUP-002` `SETUP-003` `SETUP-004` `SETUP-005` `SETUP-006` `SETUP-007` `SETUP-008` `SETUP-009`
`DATA-001` `DATA-002` `DATA-003` `DATA-004` `DATA-005` `DATA-006` `DATA-007` `DATA-008` `DATA-009` `DATA-010` `DATA-011`
`MATCH-001` `MATCH-002` `MATCH-003` `MATCH-004` `MATCH-005` `MATCH-006` `MATCH-007` `MATCH-008` `MATCH-009`
`ADR-002` `ADR-003` `TRACK-001` `TRACK-002` `TRACK-003` `TRACK-004` `TRACK-005` `TRACK-006` `TRACK-007` `TRACK-008` `TRACK-009`
`ADR-008` `HIST-001` `HIST-002` `HIST-003` `HIST-004` `HIST-005` `HIST-006` `HIST-007` `HIST-008` `HIST-009` `HIST-010` `HIST-011` `HIST-012`
`ADR-004` `ADR-005` `ADR-006` `ADR-007`

### 📋 Backlog (14 issues · 64 SP)

**EPIC-05 — After EPIC-04:**
`PLAT-001` `PLAT-002` `PLAT-003` `PLAT-004` `PLAT-005` `PLAT-006` `PLAT-007` `PLAT-008` `PLAT-009` `PLAT-010` `PLAT-011` `PLAT-012` `PLAT-013` `PLAT-014`

---

_Generated by TimeKast Factory — BOARD.md · 2026-04-11_
