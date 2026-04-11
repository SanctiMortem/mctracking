# Validation Report — Post-Backlog V2
## MTG Commander Tracker — M1 MVP

> **Workflow:** `validate_docs`
> **Stage:** POST-BACKLOG
> **Tier:** V2 (Pipeline Alignment + Semantic Fidelity)
> **Date:** 2026-04-10
> **Validator:** TimeKast Factory — Claude Sonnet 4.6
> **Scope:** M1 backlog (72 issues / 269 SP) vs 16 planning docs

---

## Executive Summary

| Dimension | Result |
|-----------|--------|
| Feature Coverage (FT-001→020) | ✅ 20/20 |
| Screen Coverage (SCR-001→019) | ✅ 19/19 |
| API Endpoint Coverage | ⚠️ 27/29 (2 gaps) |
| ADR Coverage | ✅ 8/8 |
| Business Rule Traceability | ⚠️ 55/58 BRs mapped (3 minor gaps) |
| US → Issue Mapping | ✅ 45/45 |
| Semantic Fidelity (Discovery → Backlog) | ✅ No distortion |
| **Overall status** | **⚠️ CONDITIONAL PASS — 2 critical gaps, 3 minor** |

**2 critical gaps require resolution before implementation begins.** All other validation dimensions pass. No semantic distortions detected between the Discovery Brief and backlog.

---

## Phase 1 — V1: Pipeline Alignment

### 1.1 Feature → Issue Coverage

| Feature | Description | Issues | Status |
|---------|-------------|--------|--------|
| FT-001 | CRUD Jugadores | DATA-003, DATA-006, DATA-008(stub) | ✅ |
| FT-002 | CRUD Decks | DATA-004, DATA-007, DATA-009(stub) | ✅ |
| FT-003 | CRUD Commanders | DATA-002, DATA-005, DATA-010(stub) | ✅ |
| FT-004 | Match Setup | MATCH-001, MATCH-002, MATCH-005 | ✅ |
| FT-005 | Match Tracker en vivo | TRACK-001 to TRACK-008 | ✅ |
| FT-006 | Cierre de Match + Win Conditions | MATCH-003, MATCH-006, MATCH-007 | ✅ |
| FT-007 | Historial de Matches | HIST-001, HIST-002, HIST-003 | ✅ |
| FT-008 | Stats por Jugador | HIST-004, HIST-005 | ✅ |
| FT-009 | Stats por Deck | HIST-006, HIST-007 | ✅ |
| FT-010 | Stats por Commander | HIST-008, HIST-009 | ✅ |
| FT-011 | Matchup Stats | HIST-010, HIST-011 | ✅ |
| FT-012 | Stats Dashboard Global | HIST-010, HIST-011 | ✅ |
| FT-013 | Commander Damage Tracking | TRACK-002, TRACK-005 | ✅ |
| FT-014 | Poison Counter Tracking | TRACK-002, TRACK-006 | ✅ |
| FT-015 | Match Event Log + Undo | TRACK-002, TRACK-007 | ✅ |
| FT-016 | Auth System (multi-provider) | PLAT-002, PLAT-003 | ✅ |
| FT-017 | Friend Groups (shared DB) | PLAT-005, PLAT-006 | ✅ |
| FT-018 | i18n (EN/ES) | PLAT-009, SETUP-006 | ✅ |
| FT-019 | Settings | PLAT-007, PLAT-008 | ✅ |
| FT-020 | Home / Navigation | PLAT-010 | ✅ |

**Result: 20/20 features covered** ✅

---

### 1.2 Screen → Issue Coverage

| Screen | Description | Issues | Status |
|--------|-------------|--------|--------|
| SCR-001 | Auth screen | PLAT-003 | ✅ |
| SCR-002 | Home | PLAT-010 | ✅ |
| SCR-003 | Players | DATA-006 | ✅ |
| SCR-004 | Decks | DATA-007 | ✅ |
| SCR-005 | Match History | HIST-002 | ✅ |
| SCR-006 | Stats Dashboard | HIST-011 | ✅ |
| SCR-007 | Match Setup | MATCH-005 | ✅ |
| SCR-008 | Match Tracker | TRACK-003 | ✅ |
| SCR-009 | Close Match | MATCH-006 | ✅ |
| SCR-010 | Match Results | MATCH-007 | ✅ |
| SCR-011 | Match Detail (stub → full) | MATCH-008 + HIST-003 | ✅ |
| SCR-012 | Player Profile (stub → full) | DATA-008 + HIST-005 | ✅ |
| SCR-013 | Deck Detail (stub → full) | DATA-009 + HIST-007 | ✅ |
| SCR-014 | Commander Detail (stub → full) | DATA-010 + HIST-009 | ✅ |
| SCR-015 | Matchup Stats | HIST-011 | ✅ |
| SCR-016 | Commanders | DATA-005 | ✅ |
| SCR-017 | Groups | PLAT-006 | ✅ |
| SCR-018 | Settings | PLAT-008 | ✅ |
| SCR-019 | Guest Tracker | PLAT-004 | ✅ |

**Result: 19/19 screens covered** ✅

---

### 1.3 API Endpoint → Issue Coverage

| Endpoint | Method | Defined in | Issue | Status |
|----------|--------|------------|-------|--------|
| `/auth/session` | GET | 08_API_CONTRACTS | PLAT-002 | ✅ |
| `/players` | GET | 08_API_CONTRACTS | DATA-003 | ✅ |
| `/players` | POST | 08_API_CONTRACTS | DATA-003 | ✅ |
| `/players/:id` | PATCH | 08_API_CONTRACTS | DATA-003 | ✅ |
| `/players/:id` | DELETE | 08_API_CONTRACTS | DATA-003 | ✅ |
| `/commanders` | GET | 08_API_CONTRACTS | DATA-002 | ✅ |
| `/commanders` | POST | 08_API_CONTRACTS | DATA-002 | ✅ |
| `/commanders/:id` | PATCH | 08_API_CONTRACTS | DATA-002 | ✅ |
| `/commanders/:id` | DELETE | 08_API_CONTRACTS | DATA-002 | ✅ |
| `/decks` | GET | 08_API_CONTRACTS | DATA-004 | ✅ |
| `/decks` | POST | 08_API_CONTRACTS | DATA-004 | ✅ |
| `/decks/:id` | PATCH | 08_API_CONTRACTS | DATA-004 | ✅ |
| `/decks/:id` | DELETE | 08_API_CONTRACTS | DATA-004 | ✅ |
| `/matches` | POST | 08_API_CONTRACTS | MATCH-002 | ✅ |
| `/matches/:id` | GET | 08_API_CONTRACTS | MATCH-004 | ✅ |
| `/matches` | GET | 08_API_CONTRACTS | HIST-001 | ✅ |
| `/matches/:id/close` | POST | 08_API_CONTRACTS | MATCH-003 | ✅ |
| `/matches/:id/events` | POST | 08_API_CONTRACTS | TRACK-002 | ✅ |
| `/matches/:id/events/undo` | POST | 08_API_CONTRACTS | TRACK-002 | ✅ |
| `/stats/players/:id` | GET | 08_API_CONTRACTS | HIST-004 | ✅ |
| `/stats/decks/:id` | GET | 08_API_CONTRACTS | HIST-006 | ✅ |
| `/stats/commanders/:id` | GET | 08_API_CONTRACTS | HIST-008 | ✅ |
| `/stats/matchup` | GET | 08_API_CONTRACTS | HIST-010 | ✅ |
| `/stats/global` | GET | 08_API_CONTRACTS | HIST-010 | ✅ |
| `/groups` | POST | 08_API_CONTRACTS | PLAT-005 | ✅ |
| `/groups/:id/invite` | POST | 08_API_CONTRACTS | PLAT-005 | ✅ |
| `/groups/join` | POST | 08_API_CONTRACTS | PLAT-005 | ✅ |
| `/settings` | GET | 08_API_CONTRACTS | PLAT-002 | ✅ |
| `/settings` | PATCH | 08_API_CONTRACTS | PLAT-007 | ✅ |
| `/purchases/verify` | POST | ADR-007 | PLAT-012 | ✅ |
| `/groups` | **GET** | **MISSING** | **None** | ❌ **GAP-001** |
| `/matches?status=in_progress` | **GET** | **MISSING** | **None** | ❌ **GAP-002** |

**Result: 30/32 endpoints covered (27 defined in contracts + 1 ADR-007 + 2 implicit requirements)** ⚠️

---

### 1.4 ADR Coverage

| ADR | Question | Resolution | Status |
|-----|----------|------------|--------|
| ADR-001 | NativeWind vs StyleSheet | Decided: StyleSheet + design tokens | ✅ |
| ADR-002 | Commander damage SSOT | Decided: Participation field + event log | ✅ |
| ADR-003 | Life total SSOT | Decided: Participation field + event log | ✅ |
| ADR-004 | Home match active context | Decided: Group dropdown in header | ✅ |
| ADR-005 | Group selection screen obligatory? | Decided: No — dropdown in Home header | ✅ |
| ADR-006 | Guest→User upgrade mid-match | Decided: Deferred to v1.1 | ✅ |
| ADR-007 | IAP receipt validation endpoint | Decided: POST /purchases/verify (separate) | ✅ |
| ADR-008 | Match history pagination | Decided: Offset pagination | ✅ |

**Result: 8/8 ADRs resolved** ✅

---

### 1.5 Epic Batch Ordering

| Batch | Epics | Dependencies | Status |
|-------|-------|-------------|--------|
| Pre-B1 | EPIC-SETUP | None | ✅ |
| Batch 1 | EPIC-01 (Data Foundation), EPIC-02 (Match Lifecycle) | EPIC-SETUP | ✅ |
| Batch 2 | EPIC-03 (Live Tracking) | EPIC-01, EPIC-02 | ✅ |
| Batch 3 | EPIC-04 (History & Stats) | EPIC-02, EPIC-03 | ✅ |
| Batch 4 | EPIC-05 (Platform) | All epics | ✅ |

**Result: Dependency ordering is semantically correct** ✅

---

### 1.6 Business Rule → Issue Traceability

Key BRs verified as present in acceptance criteria:

| Business Rule | Issue(s) | Criterion Present | Status |
|--------------|----------|------------------|--------|
| BR-MATCH-01 (2-4 players) | MATCH-002 | ✅ MATCH_INVALID_PLAYER_COUNT | ✅ |
| BR-MATCH-02 (no dup decks) | MATCH-002 | ✅ MATCH_DECK_DUPLICATE | ✅ |
| BR-MATCH-07 (in_progress not in history) | HIST-001 | ✅ Explicit exclusion | ✅ |
| BR-MATCH-08 (draw structure) | MATCH-003 | ✅ is_draw=true scenario | ✅ |
| BR-MATCH-09 (win condition enum) | MATCH-003 | ✅ 8-value enum | ✅ |
| BR-TRACK-09 (debounce grouping) | TRACK-002 | ✅ debounce_group_id | ✅ |
| BR-TRACK-10 (debounce 200-2000ms) | PLAT-007 | ✅ Zod validation + 400 | ✅ |
| BR-TRACK-11 (unlimited undo) | TRACK-007 | ✅ No undo limit | ✅ |
| BR-TRACK-13 (individual rotation) | TRACK-003 | ✅ RotateButton per section | ✅ |
| BR-STATS-01 (completed matches only) | HIST-004, HIST-006, HIST-008, HIST-010 | ✅ WHERE status='completed' | ✅ |
| BR-STATS-07 (DENSE_RANK for ties) | HIST-010 | ✅ DENSE_RANK SQL | ✅ |
| BR-STATS-09 (on-demand, no cache) | HIST-004, HIST-006, HIST-008 | ✅ On-demand note | ✅ |
| CALC-001 (win_rate null not 0) | HIST-004 | ✅ null when 0 matches | ✅ |
| BR-AUTH-01 (guest without account) | PLAT-004 | ✅ No API calls, in-memory | ✅ |
| BR-AUTH-02 (multi-provider) | PLAT-003 | ✅ All 4 providers | ✅ |
| BR-AUTH-03 (free/premium) | PLAT-011, PLAT-012 | ✅ premium gates ads only | ✅ |
| BR-GROUP-01 (create group) | PLAT-005 | ✅ POST /groups | ✅ |
| BR-GROUP-05 (invite expiry) | PLAT-005 | ✅ invite_expires_at NOW+7d | ✅ |
| BR-I18N-01 (EN/ES auto-detect) | PLAT-009 | ✅ expo-localization | ✅ |
| BR-I18N-02 (MTG terms never translated) | PLAT-009 | ✅ Explicit list of untranslated terms | ✅ |
| BR-GROUP-04 (archive not delete) | PLAT-005 | ❌ No PATCH /groups/:id criterion | ⚠️ **GAP-003** |
| BR-GROUP-03 (conflicts: last write wins) | None | ❌ Not in any issue | ⚠️ **GAP-003** |
| BR-DECK-06 (deck not in 2 active matches) | DATA-004 | ⚠️ Criterion absent (only in MATCH-002) | ⚠️ Minor |

---

## Phase 2 — V2: Semantic Fidelity

### 2.1 Discovery Brief §1 → Backlog

| Discovery Fact | Backlog Representation | Fidelity |
|---------------|----------------------|---------|
| "Un solo dispositivo" — tracker for shared table use | PLAT-004 Guest Tracker designed for one device | ✅ |
| "Zero fricción en el tracker" — tracker is most-used feature | EPIC-03 is Batch 2 (high priority), largest SP allocation (48 SP) | ✅ |
| "Resultado siempre manual" (BR-MATCH-05) | MATCH-003 has no auto-close logic | ✅ |
| "Sin deadline — calidad sobre velocidad" | No time-box in any issue | ✅ |
| Monetización: free + ONE TIME premium remove ads | PLAT-011 (ads) + PLAT-012 (IAP) — no feature gating | ✅ |
| Stack: React Native + Neon | SETUP-001, SETUP-003 ✅ | ✅ |
| Auth: Email + Google + Apple + Magic Link | PLAT-003 criteria cover all 4 | ✅ |

### 2.2 Discovery Brief §2 (Roles) → Backlog

| Role Rule | Backlog Issue | Criterion | Fidelity |
|-----------|--------------|-----------|---------|
| Guest → basic tracker only, no persistence | PLAT-004 | No API calls, in-memory, no AsyncStorage | ✅ |
| Guest → cannot create players/decks/matches | PLAT-004 | Explicit out-of-scope in issue | ✅ |
| Group Owner → only one who can invite | PLAT-005 | 403 if non-owner calls POST /groups/:id/invite | ✅ |
| User can belong to multiple groups | PLAT-001 | group_members table with user_id FK (many rows per user) | ✅ |

### 2.3 API Contracts OQ Resolution → Backlog

| Open Question | Resolution in Backlog | Fidelity |
|--------------|----------------------|---------|
| OQ-01: IAP endpoint separate or PATCH /settings? | ADR-007 → POST /purchases/verify; PLAT-007 rejects `premium:true` from client | ✅ |
| OQ-02: Pagination cursor or offset? | ADR-008 → Offset; HIST-001 uses `limit`+`offset` params | ✅ |
| OQ-03: Undo response — full match or event+participation? | TRACK-002 → returns `{ undone_event, restored_participation }` | ✅ |

### 2.4 Business Rules → Acceptance Criteria Fidelity

| BR | Key Constraint | Backlog Criterion | Fidelity |
|----|----------------|------------------|---------|
| CALC-001 | win_rate_pct = (wins/total) × 100; **null** (not 0) when total=0 | HIST-004: "Devuelve null (no 0%) si total_completed_matches = 0" | ✅ |
| BR-STATS-07 | DENSE_RANK for ties (1,1,3 not 1,1,2) | HIST-010: "DENSE_RANK para empates" | ✅ |
| BR-STATS-09 | No pre-computed cache in MVP | All stats issues note "on-demand" | ✅ |
| BR-MATCH-06 | Abandoned excluded from stats | HIST-004/006/008 all filter `status='completed'` | ✅ |
| BR-TRACK-03 | Partner commanders: damage tracked independently | TRACK-005: Two CommanderDamage entries, one per commander | ✅ |
| BR-STATS-05 | Partner commander stats independent | HIST-008: partner counted in both commander A and B | ✅ |
| BR-GROUP-05 | Invite expiry 7 days, owner-only regen | PLAT-005: `invite_expires_at = NOW() + 7 days`, 403 for non-owners | ✅ |
| BR-I18N-03 | Numbers formatted per locale | PLAT-009 criteria include locale-aware formatters | ✅ |

### 2.5 Design (15_DESIGN.md) → Backlog

| Design Decision | Backlog Issue | Fidelity |
|----------------|--------------|---------|
| SCR-001: Apple Sign In hidden on Android | PLAT-003: `Platform.OS === 'android'` check | ✅ |
| SCR-001: Guest entry via "Continuar sin cuenta" CTA | PLAT-003: button navigates to SCR-019 | ✅ |
| SCR-018: Settings access via gear icon in Home header | PLAT-008 notes gear icon in header per 15_DESIGN.md §0.7 | ✅ |
| SCR-019: Guest→User upgrade deferred | PLAT-004: explicit deferred note, shows info banner only | ✅ |
| SCR-008: No ads in tracker | PLAT-011: BannerAdWrapper not rendered in tracker | ✅ |
| Typography: display-lg 72sp / display-sm 48sp | TRACK-008 spike validates 72sp feasibility on iPhone SE | ✅ |

### 2.6 Data Model (06_DATA_MODEL) → Backlog

| Schema Entity | DB Issue | Schema Complete | Fidelity |
|--------------|----------|-----------------|---------|
| players | DATA-001 | UNIQUE(name, group_id), soft delete | ✅ |
| commanders | DATA-001 | colors TEXT[], is_partner bool | ✅ |
| decks | DATA-001 | commander_id FK nullable, commander_id_2 nullable | ✅ |
| matches | MATCH-001 | status enum, group_id nullable | ✅ |
| match_events | TRACK-001 | event_type enum, is_undone bool, debounce_group_id | ✅ |
| participations | MATCH-001 | commander_damage JSONB, life_total, poison_counters | ✅ |
| groups | PLAT-001 | invite_code, invite_expires_at | ✅ |
| group_members | PLAT-001 | UNIQUE(group_id, user_id), role enum | ✅ |
| user_settings | PLAT-001 | UNIQUE(user_id), premium bool, debounce_threshold_ms | ✅ |
| group_id FK added to players/decks/matches | PLAT-001 | Separate Drizzle migration on top of DATA-001 | ✅ |

### 2.7 Test Strategy (11_TEST_STRATEGY) → Backlog

| Test Type | Coverage | Status |
|-----------|----------|--------|
| Unit tests (validators, calculators) | All business logic BRs have unit test references | ✅ |
| Integration tests (API) | Every API-touching epic has an `*-epic-tests` issue | ✅ |
| E2E flows (Maestro) | E2E scenarios in SETUP-009, DATA-011, MATCH-009, TRACK-009, HIST-012, PLAT-014 | ✅ |
| Manual QA items | Apple Sign In, i18n screenshots, IAP sandbox documented | ✅ |

---

## Identified Gaps

### GAP-001 — CRITICAL: No GET /groups endpoint

**Problem:** `08_API_CONTRACTS.md` only defines `POST /groups`, `POST /groups/:id/invite`, `POST /groups/join`. No `GET /groups` endpoint is defined anywhere. PLAT-005 implements only these three, and PLAT-006 (Groups screen) + PLAT-010 (Home context switcher) both need to list the user's groups.

**Impact:** PLAT-006 (SCR-017) cannot render the group list. PLAT-010 `GroupContext.tsx` cannot populate the group dropdown.

**Affected Issues:** PLAT-005, PLAT-006, PLAT-010

**Recommended Resolution:**
Add the following criterion to **PLAT-005** acceptance criteria:
```
- [ ] GET /groups — lista grupos donde el usuario es owner o member
      Response: { success: true, data: Array<{ group: Group, role: 'owner' | 'member' }> }
      Auth: 🔒 Clerk JWT required
```
No new issue needed. This is an oversight in the API contracts, not a missing feature.

**Effort:** XS (2 criteria additions in PLAT-005 + update 08_API_CONTRACTS.md)

---

### GAP-002 — CRITICAL: No active-match data source for Home banner

**Problem:** US-044 (`GET /matches (active banner)`) maps to a call that must retrieve `in_progress` matches. However:
- `GET /matches` (HIST-001) explicitly **excludes** `in_progress` matches per BR-MATCH-07.
- No dedicated endpoint exists for fetching the active match.
- PLAT-010 relies on `ActiveMatchBanner` which needs `{ id, group_id, started_at }` of the current active match.

**Impact:** `ActiveMatchBanner` on Home screen has no API to call. Cannot show "Partida en curso" indicator.

**Affected Issues:** PLAT-002, PLAT-010, US-044

**Recommended Resolution (Option B — preferred):**
Extend `GET /auth/session` response in **PLAT-002** to include active match context:
```typescript
// Extend GET /auth/session response:
{
  success: true,
  data: {
    user: { id, email },
    user_settings: UserSettings,
    active_match: { id: string, group_id: string | null, started_at: string } | null
    // active_match = first match WHERE status='in_progress' AND owner_user_id = :userId
  }
}
```
This aligns with `GET /auth/session` as a "bootstrap" call and avoids a new endpoint. Home screen reads `active_match` from session context rather than polling `GET /matches`.

Add criterion to **PLAT-002** and document the intent in **PLAT-010**.

**Effort:** XS (2 criteria in PLAT-002, 1 note in PLAT-010)

---

### GAP-003 — MINOR: BR-GROUP-04 (archive group) not implemented

**Problem:** Discovery Brief §2 and BR-GROUP-04 state that groups should be archived rather than deleted. EPIC-05 scope mentions "Eliminar/archivar grupo" as a Group Owner capability. However, no backlog issue defines a `PATCH /groups/:id` endpoint or `archived_at` field.

**Impact:** Group Owner cannot archive a group in MVP.

**Current State:** PLAT-001 does not add `archived_at` to the `groups` table.

**Recommended Resolution:** Add acceptance criterion to PLAT-005:
```
- [ ] PATCH /groups/:id — archive group (owner only); sets archived_at = NOW()
      Archived groups hidden from GET /groups by default (add include_archived param)
```
And add `archived_at TIMESTAMP` to groups table in PLAT-001.

**Effort:** XS–S (small schema addition + 1 endpoint)

---

### GAP-004 — MINOR: GET /auth/session response shape underspecified

**Problem:** PLAT-002 defines that `GET /auth/session` creates `user_settings` on first login but the acceptance criteria do not explicitly define what the endpoint returns beyond "creates user_settings". There is no criterion specifying whether the response includes the user_settings object or only a status acknowledgment.

**Impact:** PLAT-003 (auth screen bootstrap) and PLAT-010 (Home) may make separate `GET /settings` calls unnecessarily, or assume session data that isn't returned.

**Recommended Resolution:** Add to PLAT-002:
```
- [ ] GET /auth/session response includes full user_settings object (not just { success: true })
```

**Effort:** XS (1 criterion addition in PLAT-002)

---

### GAP-005 — MINOR: US numbering collision in 14_TRACEABILITY.md

**Problem:** `14_TRACEABILITY.md` reuses US-019 through US-029 in both Epic E2 and Epic E4 sections. This creates ambiguous references. Example: "US-019" could mean "FT-007 Historial" (E4) or "FT-014 Poison Counter alert" (E2).

**Impact:** Low — affects documentation readability only. Backlog issues map to features correctly. No implementation impact.

**Recommended Resolution:** Update `14_TRACEABILITY.md` to renumber E4 US-IDs to US-046 through US-056. Backlog issues don't need updating — they reference features (FT-xxx), not US IDs.

**Effort:** XS (doc-only fix)

---

## Gap Summary

| ID | Severity | Area | Status |
|----|----------|------|--------|
| GAP-001 | 🔴 Critical | API: GET /groups missing | ✅ Fixed — added to PLAT-005 + 08_API_CONTRACTS |
| GAP-002 | 🔴 Critical | API: Active match for Home banner | ✅ Fixed — active_match in PLAT-002 + note in PLAT-010 |
| GAP-003 | 🟡 Minor | BR-GROUP-04: archive group unimplemented | ✅ Fixed — archived_at in PLAT-001; PATCH /groups/:id in PLAT-005 + 08_API_CONTRACTS |
| GAP-004 | 🟡 Minor | GET /auth/session response shape | ✅ Fixed — explicit response shape in PLAT-002 (resolved with GAP-002) |
| GAP-005 | 🟢 Trivial | US numbering collision in traceability doc | ✅ Fixed — E4 renumbered US-046→056 in 14_TRACEABILITY.md |

---

## Verified Correct — No Changes Required

The following items were explicitly verified and require no changes:

1. **All 20 MVP features** (FT-001→020) have corresponding implementation issues ✅
2. **All 19 screens** (SCR-001→019) have corresponding UI issues ✅
3. **All 8 ADRs** are resolved with documented decisions ✅
4. **Total SP: 269 / Issues: 72** — matches M1 README ✅
5. **CALC-001** semantics (null not 0) correctly preserved in HIST-004 ✅
6. **BR-STATS-09** (on-demand stats) consistently enforced across all stats issues ✅
7. **BR-I18N-02** (MTG terms never translated) correctly captured in PLAT-009 ✅
8. **Guest Tracker** (PLAT-004) correctly modeled as fully in-memory per Discovery Brief §2 ✅
9. **Monetization semantics**: premium removes ads only, no feature gating — preserved in PLAT-011/PLAT-012 ✅
10. **OQ-01, OQ-02, OQ-03** from API Contracts — all three resolved in ADR-007, ADR-008, TRACK-002 ✅
11. **Epic batch ordering** (B1→B2→B3→B4) is semantically correct ✅
12. **Stub-to-full progression** (SCR-011/012/013/014) correctly modeled across two epics ✅
13. **Partner commanders** independently tracked (TRACK-005, HIST-008) per BR-TRACK-03/BR-STATS-05 ✅

---

## Required Actions Before Implementation

### Action 1 (Critical) — Add GET /groups to PLAT-005
File: [docs/backlog/M1/issues/PLAT-005-api-groups.md](../backlog/M1/issues/PLAT-005-api-groups.md)

Add criterion:
```markdown
- [ ] `GET /groups` — devuelve grupos donde el user es owner o member
      Response: `{ success: true, data: Array<{ group: Group, role: 'owner' | 'member' }> }`
```

Also update `08_API_CONTRACTS.md` to add the endpoint to the Groups module.

### Action 2 (Critical) — Add active_match to GET /auth/session in PLAT-002
File: [docs/backlog/M1/issues/PLAT-002-api-auth-settings.md](../backlog/M1/issues/PLAT-002-api-auth-settings.md)

Add criteria:
```markdown
- [ ] `GET /auth/session` response includes `active_match: { id, group_id, started_at } | null`
      Populated from first match WHERE status='in_progress' AND owner = :userId
- [ ] `GET /auth/session` response includes full `user_settings` object
```

Also add note to PLAT-010: "ActiveMatchBanner reads active_match from session context (PLAT-002), not from GET /matches".

### Action 3 (Minor) — Add archive group to PLAT-001 + PLAT-005
Add `archived_at TIMESTAMP` to groups table (PLAT-001) and `PATCH /groups/:id` endpoint (PLAT-005).

### Actions 4-5 (Trivial) — Documentation
- PLAT-002: specify response shape explicitly
- 14_TRACEABILITY.md: renumber E4 US-IDs to avoid collision

---

## Validation Sign-off

| Check | Result |
|-------|--------|
| All MVP features represented | ✅ PASS |
| All screens represented | ✅ PASS |
| API contract alignment | ⚠️ 2 gaps (GAP-001, GAP-002) — fix before PLAT-005/PLAT-010 implementation |
| Business rule traceability | ⚠️ 3 minor gaps — recommended fix, not blocking |
| Discovery → Backlog semantic fidelity | ✅ PASS — no distortions detected |
| ADR decisions preserved | ✅ PASS |
| SP/Issue totals consistent | ✅ PASS (72 issues / 269 SP) |

**VERDICT: PASS ✅**
All 5 gaps resolved. Backlog is production-ready for implementation to begin.

---

*Validate Docs V2 Report — Generated 2026-04-10 — TimeKast Factory*
