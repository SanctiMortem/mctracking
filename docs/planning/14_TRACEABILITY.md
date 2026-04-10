# 🔗 Traceability Matrix — MTG Commander Tracker

> Generado desde 02_FEATURE_MAP, 04_USER_STORIES, 05_BUSINESS_RULES, 08_API_CONTRACTS, 11_TEST_STRATEGY por `/docs`
> **Fuente:** Discovery Brief §3, §4, §5
> **Versión:** 1.0 — 2026-04-09

---

## Propósito

Esta matriz garantiza que cada User Story tiene cobertura completa a través del stack:

```
Feature (FT) → User Story (US) → Business Rule (BR) → API Endpoint → Test
```

Una celda vacía en la columna Test indica una brecha de cobertura que debe resolverse antes del launch.

---

## Índice

1. [Matriz Principal US → BR → API → Test](#1-matriz-principal-us--br--api--test)
2. [Matriz Feature → Entidades](#2-matriz-feature--entidades)
3. [Cobertura de Business Rules](#3-cobertura-de-business-rules)
4. [Cobertura de Endpoints](#4-cobertura-de-endpoints)
5. [Brechas de Cobertura](#5-brechas-de-cobertura)

---

## 1. Matriz Principal US → BR → API → Test

### Epic E1 — Data Foundation

| US | Feature | Business Rules | Endpoint(s) | Unit Test | Integration Test | E2E |
|----|---------|---------------|-------------|-----------|-----------------|-----|
| US-001 | FT-001 Jugadores | BR-ENTITY-02 (soft delete) | `POST /players` | `validators.test.ts` | `POST /players` happy path | E2E-001 |
| US-002 | FT-001 Jugadores | BR-ENTITY-01 (unique name/group) | `PATCH /players/:id` | `validators.test.ts` VAL-001 | `POST /players` duplicado | — |
| US-003 | FT-001 Jugadores | BR-ENTITY-02 (soft delete) | `DELETE /players/:id` | `softDelete.test.ts` | `DELETE /players/:id` | — |
| US-004 | FT-002 Decks | BR-DECK-01, BR-DECK-02 | `POST /decks` | `validators.test.ts` | `POST /decks` happy path | E2E-002 |
| US-005 | FT-002 Decks | BR-DECK-04 (partner check) VAL-005 | `POST /decks` | `validators.test.ts` VAL-005 | `POST /decks` con partners | E2E-002 |
| US-006 | FT-002 Decks | BR-DECK-03 (color_identity derivada) | `POST /decks` | `colorIdentity.test.ts` | `POST /decks` color_identity | E2E-002 |
| US-007 | FT-002 Decks | BR-DECK-05 (WUBRG check) VAL-002 | `POST /decks` | `validators.test.ts` VAL-002 | `POST /decks` colores inválidos | — |
| US-008 | FT-002 Decks | BR-DECK-07 (en partida activa) | `PATCH /decks/:id` | — | `PATCH /decks/:id` en partida activa | — |
| US-009 | FT-002 Decks | BR-ENTITY-02 (soft delete) | `DELETE /decks/:id` | `softDelete.test.ts` | `DELETE /decks/:id` | — |

### Epic E2 — Match Lifecycle

| US | Feature | Business Rules | Endpoint(s) | Unit Test | Integration Test | E2E |
|----|---------|---------------|-------------|-----------|-----------------|-----|
| US-010 | FT-003 Match Setup | BR-MATCH-01, BR-MATCH-02, BR-MATCH-03 | `POST /matches` | `matchStateMachine.test.ts` | `POST /matches` 2-6 jugadores | E2E-003 |
| US-011 | FT-003 Match Setup | BR-MATCH-04 (único deck activo) VAL-004 | `POST /matches` | `validators.test.ts` VAL-004 | `POST /matches` deck duplicado | — |
| US-012 | FT-003 Match Setup | BR-MATCH-05 (vida inicial) | `POST /matches` | — | `POST /matches` vida personalizada | E2E-003 |
| US-013 | FT-004 Match Live | BR-MATCH-01 (in_progress state) | `GET /matches/:id` | — | `GET /matches/:id` | — |
| US-014 | FT-005 Life Tracking | BR-TRACK-01, BR-TRACK-03 (debounce) | `POST /matches/:id/events` | `debounce.test.ts` | `POST /matches/:id/events` life | E2E-003 |
| US-015 | FT-005 Life Tracking | BR-TRACK-01 (tipo life_change) | `POST /matches/:id/events` | `lifeTotal.test.ts` CALC-003 | `POST /matches/:id/events` delta | E2E-003 |
| US-016 | FT-006 Commander Damage | BR-TRACK-02, BR-TRACK-07 | `POST /matches/:id/events` | `commanderDamage.test.ts` | `POST /matches/:id/events` cmd_dmg | E2E-003 |
| US-017 | FT-006 Commander Damage | BR-TRACK-07 (21 alert) | Client-side alert | `commanderDamage.test.ts` | — | E2E-003 |
| US-018 | FT-007 Poison | BR-TRACK-04, BR-TRACK-05 | `POST /matches/:id/events` | `poison.test.ts` | `POST /matches/:id/events` poison | — |
| US-019 | FT-007 Poison | BR-TRACK-05 (10 counters alert) | Client-side alert | `poison.test.ts` | — | — |
| US-020 | FT-008 Tracker UX | BR-TRACK-08 (rotación) | — | — | — | E2E-003 |
| US-021 | FT-008 Tracker UX | — | — | — | — | — |
| US-022 | FT-008 Tracker UX | — | — | — | — | — |
| US-023 | FT-008 Tracker UX | — | — | — | — | — |
| US-024 | FT-009 Close Match | BR-MATCH-06, BR-MATCH-07 | `POST /matches/:id/close` | `matchStateMachine.test.ts` | `POST /matches/:id/close` winner | E2E-003 |
| US-025 | FT-009 Close Match | BR-MATCH-07 (draw) | `POST /matches/:id/close` | `matchStateMachine.test.ts` | `POST /matches/:id/close` draw | E2E-003 |
| US-026 | FT-009 Close Match | BR-MATCH-08 (abandoned) | `POST /matches/:id/close` | `matchStateMachine.test.ts` | `POST /matches/:id/close` abandoned | — |
| US-027 | FT-009 Close Match | BR-MATCH-06 (no re-close) | `POST /matches/:id/close` | `matchStateMachine.test.ts` | `POST /matches/:id/close` ya cerrado | — |
| US-028 | FT-009 Close Match | BR-MATCH-09 (win conditions) | `POST /matches/:id/close` | — | `POST /matches/:id/close` win cond | E2E-003 |
| US-029 | FT-009 Close Match | — | `POST /matches/:id/close` | — | — | — |
| US-030 | FT-010 Commander Alert | BR-TRACK-07 (21 dmg) | Client-side | `commanderDamage.test.ts` | — | E2E-003 |
| US-031 | FT-010 Commander Alert | BR-TRACK-07 (no auto-action) | Client-side | `commanderDamage.test.ts` | — | E2E-003 |
| US-032 | FT-010 Commander Alert | BR-TRACK-05 (poison alert) | Client-side | `poison.test.ts` | — | — |

### Epic E3 — Live Tracking

| US | Feature | Business Rules | Endpoint(s) | Unit Test | Integration Test | E2E |
|----|---------|---------------|-------------|-----------|-----------------|-----|
| US-030 | FT-013 Commander Damage | BR-TRACK-02 (por commander_id), BR-TRACK-04 (21 alert) | `POST /matches/:id/events` | `commanderDamage.test.ts` | `POST /matches/:id/events` cmd_dmg | E2E-003 |
| US-031 | FT-013 Commander Damage | BR-TRACK-03 (partners independientes) | `POST /matches/:id/events` | `commanderDamage.test.ts` | `POST /matches/:id/events` partners | E2E-003 |
| US-032 | FT-014 Poison Counters | BR-TRACK-05 (10 alert), BR-TRACK-06 (floor 0) | `POST /matches/:id/events` | `poison.test.ts` | `POST /matches/:id/events` poison | — |
| US-033 | FT-015 Event Log + Undo | BR-TRACK-11 (unlimited undo) | `POST /matches/:id/events/undo` | `undoStack.test.ts` | `POST /matches/:id/events/undo` | E2E-004 |
| US-034 | FT-015 Event Log + Undo | BR-TRACK-11 (undo sin eventos) | `POST /matches/:id/events/undo` | `undoStack.test.ts` | `POST /matches/:id/events/undo` vacío | E2E-004 |

### Epic E4 — History & Stats

| US | Feature | Business Rules | Endpoint(s) | Unit Test | Integration Test | E2E |
|----|---------|---------------|-------------|-----------|-----------------|-----|
| US-019 | FT-007 Historial | BR-STATS-02, BR-MATCH-07 | `GET /matches` | — | `GET /matches` filtros | E2E-005 |
| US-020 | FT-007 Historial | BR-STATS-08 (filtros historial) | `GET /matches` | — | `GET /matches` con filtros | — |
| US-021 | FT-007 Historial | — | `GET /matches/:id` | — | `GET /matches/:id` detail | — |
| US-022 | FT-008 Stats Jugador | BR-STATS-01, CALC-001 | `GET /stats/players/:id` | `winRate.test.ts` | `GET /stats/players/:id` | E2E-005 |
| US-023 | FT-008 Stats Jugador | BR-STATS-03 (deck stats) | `GET /stats/decks/:id` | — | `GET /stats/decks/:id` | — |
| US-024 | FT-009 Stats Deck | BR-STATS-03, CALC-001 | `GET /stats/decks/:id` | `winRate.test.ts` | `GET /stats/decks/:id` | — |
| US-025 | FT-010 Stats Commander | BR-STATS-04, BR-STATS-05 (partner) | `GET /stats/commanders/:id` | `commanderDamage.test.ts` | `GET /stats/commanders/:id` | — |
| US-026 | FT-011 Matchup Stats | BR-STATS-06 (scope 1v1) | `GET /stats/matchup` | — | `GET /stats/matchup?scope=1v1` | — |
| US-027 | FT-011 Matchup Stats | BR-STATS-06 (scope all) | `GET /stats/matchup` | — | `GET /stats/matchup?scope=all` | — |
| US-028 | FT-012 Stats Dashboard | BR-STATS-07 (tie-breaking) | `GET /stats/global` | `rankings.test.ts` | `GET /stats/global` ties | E2E-005 |
| US-029 | FT-012 Stats Dashboard | BR-STATS-07 | `GET /stats/global` | `rankings.test.ts` | `GET /stats/global` | — |

### Epic E5 — Platform & Auth

| US | Feature | Business Rules | Endpoint(s) | Unit Test | Integration Test | E2E |
|----|---------|---------------|-------------|-----------|-----------------|-----|
| US-035 | FT-016 Auth | BR-AUTH-02 (multi-provider) | `POST /auth/*` (Clerk) | — | Clerk integration | E2E-001 |
| US-036 | FT-016 Auth | BR-AUTH-02 (Google OAuth) | `POST /auth/*` (Clerk) | — | Clerk integration | E2E-001 |
| US-037 | FT-016 Auth | BR-AUTH-01 (guest sin auth) | — (client only) | — | — | E2E-007 |
| US-038 | FT-017 Groups | BR-GROUP-01 (crear grupo) | `POST /groups` | — | `POST /groups` | E2E-006 |
| US-039 | FT-017 Groups | BR-GROUP-05 (invite expiry) | `POST /groups/:id/invite` | — | `POST /groups/:id/invite` | E2E-006 |
| US-040 | FT-017 Groups | BR-GROUP-05 (join invite) | `POST /groups/join` | — | `POST /groups/join` expired | E2E-006 |
| US-041 | FT-018 i18n | BR-I18N-01 (EN/ES) | — | — | — | Manual QA |
| US-042 | FT-019 Settings | BR-TRACK-09, BR-TRACK-10 (debounce config) | `PATCH /settings` | `validators.test.ts` VAL-003 | `PATCH /settings` debounce | — |
| US-043 | FT-019 Settings | BR-TRACK-01, BR-MATCH-05 (life inicial) | `PATCH /settings` | — | `PATCH /settings` life total | — |
| US-044 | FT-020 Home/Nav | — | `GET /matches` (active banner) | — | — | E2E-001 |
| US-045 | FT-020 Home/Nav | — | — (navigation) | — | — | — |

---

## 2. Matriz Feature → Entidades

| Feature | E-001 commanders | E-002 decks | E-003 groups | E-004 group_memberships | E-005 matches | E-006 match_events | E-007 match_results | E-008 participations | E-009 players | E-010 users | E-011 user_settings |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| FT-001 Player Mgmt | | | | | | | | | ✅ W | ✅ R | |
| FT-002 Deck Mgmt | ✅ R | ✅ W | | | | | | | ✅ R | | |
| FT-003 Match Setup | ✅ R | ✅ R | ✅ R | | ✅ W | | | ✅ W | ✅ R | | |
| FT-004 Match View | | | | | ✅ R | ✅ R | | ✅ R | | | |
| FT-005 Life Track | | | | | | ✅ W | | ✅ R | | | |
| FT-006 Cmd Damage | ✅ R | | | | | ✅ W | | ✅ RW | | | |
| FT-007 Poison | | | | | | ✅ W | | ✅ RW | | | |
| FT-008 Tracker UX | | | | | ✅ R | ✅ R | | ✅ R | | | |
| FT-009 Close Match | | | | | ✅ W | ✅ R | ✅ W | ✅ W | | | |
| FT-010 Cmd Alert | ✅ R | | | | | ✅ R | | ✅ R | | | |
| FT-011 Undo | | | | | | ✅ W | | | | | |
| FT-012 History | | ✅ R | | | ✅ R | | ✅ R | ✅ R | ✅ R | | |
| FT-013 Player Stats | ✅ R | ✅ R | | | ✅ R | ✅ R | ✅ R | ✅ R | ✅ R | | |
| FT-014 Deck Stats | ✅ R | ✅ R | | | ✅ R | ✅ R | ✅ R | ✅ R | | | |
| FT-015 Matchup Stats | | ✅ R | | | ✅ R | | ✅ R | ✅ R | ✅ R | | |
| FT-016 Rankings | | | | | ✅ R | | ✅ R | ✅ R | ✅ R | | |
| FT-017 Guest Mode | | | | | | | | | | | |
| FT-018 Premium | | | | | | | | | | ✅ R | ✅ W |
| FT-019 Auth | | | | | | | | | | ✅ W | ✅ W |
| FT-020 Groups | | | ✅ W | ✅ W | | | | | | ✅ R | |

**Leyenda:** R = Read, W = Write (Create/Update/Delete), RW = Read + Write

---

## 3. Cobertura de Business Rules

| Business Rule | User Story(ies) | API Endpoint(s) | Test |
|--------------|----------------|-----------------|------|
| BR-MATCH-01 (state machine) | US-010, US-024 | `POST /matches`, `POST /matches/:id/close` | `matchStateMachine.test.ts` |
| BR-MATCH-02 (min 2 jugadores) | US-010 | `POST /matches` | `validators.test.ts` VAL-004 |
| BR-MATCH-03 (max 6 jugadores) | US-010 | `POST /matches` | `validators.test.ts` VAL-004 |
| BR-MATCH-04 (deck único activo) | US-011 | `POST /matches` | `validators.test.ts` VAL-004 |
| BR-MATCH-05 (vida inicial) | US-012 | `POST /matches` | Integration |
| BR-MATCH-06 (no re-close) | US-027 | `POST /matches/:id/close` | `matchStateMachine.test.ts` |
| BR-MATCH-07 (win/draw) | US-024, US-025 | `POST /matches/:id/close` | `matchStateMachine.test.ts` |
| BR-MATCH-08 (abandoned) | US-026 | `POST /matches/:id/close` | `matchStateMachine.test.ts` |
| BR-MATCH-09 (win_condition 8 valores) | US-028 | `POST /matches/:id/close` | Integration |
| BR-MATCH-10 (stats update on close) | US-024 | `POST /matches/:id/close` | Integration |
| BR-DECK-01 (nombre único por jugador) | US-004 | `POST /decks` | `validators.test.ts` |
| BR-DECK-02 (commander requerido) | US-004 | `POST /decks` | `validators.test.ts` |
| BR-DECK-03 (color_identity derivada) | US-006 | `POST /decks` | `colorIdentity.test.ts` |
| BR-DECK-04 (partner check) | US-005 | `POST /decks` | `validators.test.ts` VAL-005 |
| BR-DECK-05 (WUBRG check) | US-007 | `POST /decks` | `validators.test.ts` VAL-002 |
| BR-DECK-06 (max 1 commander no-partner) | US-005 | `POST /decks` | `validators.test.ts` |
| BR-DECK-07 (deck en partida activa) | US-008 | `PATCH /decks/:id` | Integration |
| BR-DECK-08 (soft delete) | US-009 | `DELETE /decks/:id` | `softDelete.test.ts` |
| BR-TRACK-01 (tipos de evento) | US-014, US-015 | `POST /matches/:id/events` | Unit + Integration |
| BR-TRACK-02 (commander_id requerido) | US-016 | `POST /matches/:id/events` | `validators.test.ts` |
| BR-TRACK-03 (partners damage independientes) | US-031 | `POST /matches/:id/events` | `commanderDamage.test.ts` |
| BR-TRACK-04 (21 cmd dmg alert) | US-030, US-031 | Client-side | `commanderDamage.test.ts` |
| BR-TRACK-05 (10 poison alert) | US-032 | Client-side | `poison.test.ts` |
| BR-TRACK-06 (poison floor 0) | US-032 | `POST /matches/:id/events` | `poison.test.ts` |
| BR-TRACK-09 (debounce: agrupación de taps) | US-014 | Client + `POST /matches/:id/events` | `debounce.test.ts` |
| BR-TRACK-10 (debounce threshold 200-2000ms) | US-042 | `PATCH /settings` | `validators.test.ts` VAL-003 |
| BR-TRACK-11 (unlimited undo) | US-033, US-034 | `POST /matches/:id/events/undo` | `undoStack.test.ts` |
| BR-TRACK-13 (rotación individual) | US-015 | — | E2E-003 |
| BR-STATS-01 (win rate formula) | US-037 | `GET /stats/players/:id` | `winRate.test.ts` |
| BR-STATS-02 (solo completed) | US-035 | `GET /matches` | Integration |
| BR-STATS-03 (stats por deck) | US-038 | `GET /stats/decks/:id` | Integration |
| BR-STATS-04 (stats por commander) | US-039 | `GET /stats/commanders/:id` | Integration |
| BR-STATS-05 (partner stats separadas) | US-041 | `GET /stats/commanders/:id` | `commanderDamage.test.ts` |
| BR-STATS-06 (matchup 1v1 scope) | US-042 | `GET /stats/matchup` | Integration |
| BR-STATS-07 (empatados misma posición) | US-028, US-029 | `GET /stats/global` | `rankings.test.ts` |
| BR-STATS-08 (0 partidas = 0%) | US-037 | `GET /stats/players/:id` | `winRate.test.ts` |
| BR-STATS-09 (solo completed en rate) | US-037 | `GET /stats/players/:id` | `winRate.test.ts` |
| BR-AUTH-01 (guest sin account) | US-037 | — | E2E-007 |
| BR-AUTH-02 (multi-provider) | US-035, US-036 | Clerk SDK | E2E-001 |
| BR-AUTH-03 (free/premium) | US-042 | `PATCH /settings` | E2E-008 |
| BR-AUTH-04 (no auto-merge) | US-035 | Clerk config | — |
| BR-AUTH-05 (Apple Sign In iOS) | US-035 | Clerk SDK | Manual QA |
| BR-GROUP-01 (crear grupo) | US-038 | `POST /groups` | Integration |
| BR-GROUP-02 (historial al salir) | US-040 | `POST /groups/join` | Integration |
| BR-GROUP-03 (conflictos: último gana) | — | ADR-008 | — |
| BR-GROUP-04 (archivar no borrar) | US-038 | `PATCH /groups/:id` | Integration |
| BR-GROUP-05 (invite expiry, owner only) | US-039, US-040 | `POST /groups/:id/invite`, `POST /groups/join` | Integration |
| BR-ENTITY-01 (unique constraints) | US-001, US-004 | Multiple | `validators.test.ts` |
| BR-ENTITY-02 (soft delete) | US-003, US-009 | Multiple | `softDelete.test.ts` |
| BR-ENTITY-03 (WUBRG enum) | US-007 | `POST /decks`, `POST /commanders` | `validators.test.ts` |
| BR-ENTITY-04 (no empty names) | US-001 | `POST /players`, `POST /decks` | `validators.test.ts` VAL-001 |
| BR-ENTITY-05 (timestamps auto) | — | DB default | Schema test |
| BR-I18N-01 (EN/ES) | — | — | Manual QA |
| BR-I18N-02 (MTG terms EN) | — | — | Manual QA |
| BR-I18N-03 (numbers locale) | — | — | Manual QA |

---

## 4. Cobertura de Endpoints

| Endpoint | Feature | User Story(ies) | Unit Test | Integration Test | E2E |
|----------|---------|----------------|-----------|-----------------|-----|
| `GET /players` | FT-001 | US-001 | — | ✅ | — |
| `POST /players` | FT-001 | US-001 | VAL-001 | ✅ | E2E-001 |
| `PATCH /players/:id` | FT-001 | US-002 | — | ✅ | — |
| `DELETE /players/:id` | FT-001 | US-003 | softDelete | ✅ | — |
| `GET /commanders` | FT-002 | US-004 | — | ✅ | — |
| `POST /commanders` | FT-002 | US-004 | VAL-002 | ✅ | — |
| `PATCH /commanders/:id` | FT-002 | US-004 | — | ✅ | — |
| `DELETE /commanders/:id` | FT-002 | US-004 | — | ✅ | — |
| `GET /decks` | FT-002 | US-004 | — | ✅ | — |
| `POST /decks` | FT-002 | US-004, US-005, US-006 | VAL-005 | ✅ | E2E-002 |
| `PATCH /decks/:id` | FT-002 | US-008 | — | ✅ | — |
| `DELETE /decks/:id` | FT-002 | US-009 | softDelete | ✅ | — |
| `POST /matches` | FT-003 | US-010, US-011, US-012 | matchSM | ✅ | E2E-003 |
| `GET /matches/:id` | FT-004 | US-013 | — | ✅ | — |
| `GET /matches` | FT-012 | US-035 | — | ✅ | E2E-005 |
| `POST /matches/:id/close` | FT-009 | US-024→029 | matchSM | ✅ | E2E-003 |
| `POST /matches/:id/events` | FT-005, FT-006, FT-007 | US-014→019 | debounce, lifeTotal | ✅ | E2E-003 |
| `POST /matches/:id/events/undo` | FT-011 | US-033, US-034 | undoStack | ✅ | E2E-004 |
| `GET /stats/players/:id` | FT-013 | US-037 | winRate | ✅ | E2E-005 |
| `GET /stats/decks/:id` | FT-014 | US-040 | — | ✅ | — |
| `GET /stats/commanders/:id` | FT-013, FT-014 | US-039, US-041 | cmdDmg | ✅ | — |
| `GET /stats/matchup` | FT-015 | US-042 | — | ✅ | — |
| `GET /stats/global` | FT-016 | US-043 | rankings | ✅ | E2E-005 |
| `POST /groups` | FT-017 | US-038 | — | ✅ | E2E-006 |
| `POST /groups/:id/invite` | FT-017 | US-039 | — | ✅ | E2E-006 |
| `POST /groups/join` | FT-017 | US-040 | — | ✅ | E2E-006 |
| `GET /settings` | FT-019 | US-042, US-043 | — | ✅ | — |
| `PATCH /settings` | FT-018, FT-019 | US-042, US-043 | — | ✅ | E2E-008 |

**Cobertura total:** 28/28 endpoints tienen al menos integration test planificado ✅

---

## 5. Brechas de Cobertura

Las siguientes áreas requieren atención antes del launch:

### Brechas de Test

| Área | Brecha | Acción |
|------|--------|--------|
| BR-AUTH-04 (no auto-merge) | Sin test automatizado | Agregar test de Clerk que intente merge — configurar en Clerk Dashboard antes de test |
| BR-AUTH-05 (Apple Sign In obligatorio) | Solo manual QA | Documentar en checklist de pre-submit |
| BR-I18N-01/02/03 | Solo manual QA | Agregar screenshot tests de strings EN/ES |
| BR-TRACK-08 (orientación portrait) | E2E solo verifica no-crash | Agregar test que verifica bloqueo de orientación |
| BR-AUTH-04 (no auto-merge providers) | Sin test automatizado | Requiere dos cuentas con mismo email en providers distintos |
| FT-018 Premium IAP | Maestro no puede interactuar con sheets de OS | Mock del receipt validator vía webhook test en CI |

### Pantallas sin E2E Coverage

| Pantalla | Feature | Cobertura actual |
|----------|---------|-----------------|
| P04 Match History (lista) | FT-007 | Integration `GET /matches` |
| P11 Player Detail | FT-008 | Integration `GET /stats/players/:id` |
| P12 Deck Detail | FT-009 | Integration `GET /stats/decks/:id` |
| P13 Commander Detail | FT-010 | Integration `GET /stats/commanders/:id` |
| P14 Matchup Stats | FT-011 | Integration `GET /stats/matchup` |

**Decisión:** Para MVP, las pantallas de stats secundarias se cubren con integration tests solamente. E2E completo post-launch.

---

## Resumen de Cobertura

| Área | Total | Con Test | Sin Test | % |
|------|-------|---------|---------|---|
| User Stories (US-001→US-045) | 45 | 40 | 5 | 89% |
| Business Rules | 58 | 52 | 6 (i18n/manual) | 90% |
| API Endpoints | 28 | 28 | 0 | 100% |
| E2E Flows críticos | 8 | 8 | 0 | 100% |
| Entidades (schema) | 11 | 11 | 0 | 100% |
| Features MVP (FT-001→020) | 20 | 20 | 0 | 100% |

---

*Traceability Matrix generada por `/docs` — actualizar IDs de test files al implementar la estructura de directorios definitiva.*
