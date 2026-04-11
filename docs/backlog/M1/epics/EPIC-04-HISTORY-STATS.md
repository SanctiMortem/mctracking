# EPIC-04: History & Stats

> **Milestone:** M1
> **Status:** ✅ Done
> **Issues:** 13 total (13 done)
> **Branch:** `develop` (implemented directly on develop)

---

## 🎯 Objetivo

Implementar el motor de estadísticas histórico: historial de matches con filtros completos, perfiles de stats por jugador/deck/commander, matchup head-to-head, y el Stats Dashboard global. Las stats se calculan on-demand (sin pre-cómputo en MVP — BR-STATS-09). Incluye también la pantalla de Match Detail completa (SCR-011), que muestra el EventLog post-match generado en EPIC-03.

**Prerequisitos de decisión:** ADR-008 debe resolverse antes de HIST-001 (define la estrategia de paginación del historial).

---

## User Stories

| ID | Título | Priority | Features |
|----|--------|----------|---------|
| US-019 | Ver historial de matches completados | 🔴 Must | FT-007 |
| US-020 | Filtrar historial | 🔴 Must | FT-007 |
| US-021 | Ver detalle de un match | 🔴 Must | FT-007 |
| US-022 | Ver stats de un jugador | 🔴 Must | FT-008 |
| US-023 | Ver decks y commanders más usados | 🔴 Must | FT-008 |
| US-024 | Ver stats de un deck | 🔴 Must | FT-009 |
| US-025 | Ver stats de un commander | 🔴 Must | FT-010 |
| US-026 | Head-to-head entre jugadores | 🔴 Must | FT-011 |
| US-027 | Matchup deck vs deck | 🔴 Must | FT-011 |
| US-028 | Stats Dashboard global | 🔴 Must | FT-012 |
| US-029 | Empate en ranking — mismo win rate | 🟡 Should | FT-012 |
| US-034 | Ver event log en match detail | 🔴 Must | FT-015 |

---

## 📋 Issues

| ID | Título | Depende de | Priority | Status | Effort | SP |
|----|--------|------------|----------|--------|--------|----|
| [ADR-008](../issues/ADR-008-match-history-pagination.md) | ADR: Match history pagination (cursor vs offset) | HIST-001 | P2 | ✅ | XS | 1 |
| [HIST-001](../issues/HIST-001-api-match-history.md) | API: Match History (GET /matches + filters) | MATCH-001, MATCH-003, ADR-008 | P1 | ✅ | M | 5 |
| [HIST-002](../issues/HIST-002-ui-match-history-screen.md) | UI: SCR-005 Match History + MatchCard | HIST-001 | P1 | ✅ | M | 5 |
| [HIST-003](../issues/HIST-003-ui-match-detail-full.md) | UI: SCR-011 Match Detail FULL (EventLog post-match) | HIST-001, TRACK-007 | P1 | ✅ | M | 5 |
| [HIST-004](../issues/HIST-004-api-player-stats.md) | API: Player Stats (GET /stats/players/:id) | MATCH-001, MATCH-003 | P1 | ✅ | M | 5 |
| [HIST-005](../issues/HIST-005-ui-player-profile-full.md) | UI: SCR-012 Player Profile FULL | HIST-004 | P1 | ✅ | M | 5 |
| [HIST-006](../issues/HIST-006-api-deck-stats.md) | API: Deck Stats (GET /stats/decks/:id) | MATCH-001 | P1 | ✅ | S | 2 |
| [HIST-007](../issues/HIST-007-ui-deck-detail-full.md) | UI: SCR-013 Deck Detail FULL | HIST-006 | P1 | ✅ | S | 2 |
| [HIST-008](../issues/HIST-008-api-commander-stats.md) | API: Commander Stats (GET /stats/commanders/:id) | MATCH-001 | P1 | ✅ | S | 2 |
| [HIST-009](../issues/HIST-009-ui-commander-detail-full.md) | UI: SCR-014 Commander Detail FULL | HIST-008 | P1 | ✅ | S | 2 |
| [HIST-010](../issues/HIST-010-api-matchup-global-stats.md) | API: Matchup + Global Stats | MATCH-001, MATCH-003 | P1 | ✅ | M | 5 |
| [HIST-011](../issues/HIST-011-ui-stats-dashboard.md) | UI: SCR-006 Stats Dashboard + SCR-015 Matchup Stats | HIST-010, HIST-004 | P1 | ✅ | L | 8 |
| [HIST-012](../issues/HIST-012-epic-tests.md) | 🧪 Epic Tests — History & Stats | Todos | P1 | ✅ | M | 5 |

> **Total SP:** 52

---

## 🔗 Dependencias

**Requiere:**
- [EPIC-02](./EPIC-02-MATCH-LIFECYCLE.md) — MATCH-001/003 (schema match, API close)
- [EPIC-03](./EPIC-03-LIVE-TRACKING.md) — TRACK-007 (EventLog component para SCR-011)
- ADR-008 resuelto antes de HIST-001

**Bloquea:**
- Nada (último epic de features de datos)

---

## 📐 Scope

**Incluido:**
- GET /matches con todos los filtros (jugador, deck, commander, fecha, resultado, win_condition)
- SCR-005 Historial: lista paginada + MatchCard component + filter bar
- SCR-011 Match Detail: completo con EventLog (quita el placeholder de MATCH-008)
- Stats on-demand: player, deck, commander (sin Materialized Views en MVP)
- SCR-012 Player Profile: win rate, decks favoritos, commanders más usados
- SCR-013 Deck Detail: stats con players que lo usaron
- SCR-014 Commander Detail: stats con decks y players
- GET /stats/matchup (player vs player, deck vs deck, scope all/1v1)
- SCR-015 Matchup Stats: selector de entidades + resultado
- GET /stats/global + SCR-006 Stats Dashboard: ranking de jugadores, top decks/commanders

**Excluido:**
- Gráficas de win rate → Fase 2
- Filtros avanzados de stats (más allá de group_id) → Fase 2
- Materialized Views / pre-cómputo de stats → no en MVP (BR-STATS-09)
- Export CSV → Non-Goal NG-006

---

## 📚 Referencias

- Feature Map: [02_FEATURE_MAP.md](../../planning/02_FEATURE_MAP.md)
- Business Rules: [05_BUSINESS_RULES.md#br-stats-01](../../planning/05_BUSINESS_RULES.md)
- API Contracts: [08_API_CONTRACTS.md#stats](../../planning/08_API_CONTRACTS.md)
- Design: [15_DESIGN.md#scr-005](../../planning/15_DESIGN.md)

---

## ✅ QC Checklist (Al Completar Epic)

- [x] Historial filtra correctamente por todos los parámetros
- [x] Stats de jugador calculan win rate según CALC-001 (abandoned excluidos)
- [x] Matchup scope 'all' vs '1v1' funciona correctamente
- [x] Stats Dashboard muestra ranking con empate correcto (BR-STATS-07)
- [x] SCR-011 Match Detail muestra EventLog completo con undone events tachados

---

## 📈 Progreso

```
Total:     █████████████ 100% (13 issues)
Done:      █████████████ 100% (13 issues)
```

---

_Creado: 2026-04-10_
_Completado: 2026-04-11_
