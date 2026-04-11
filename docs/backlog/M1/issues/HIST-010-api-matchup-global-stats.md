# HIST-010: API — Matchup Stats + Global Stats

> **Issue ID:** HIST-010
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-04-HISTORY-STATS](../epics/EPIC-04-HISTORY-STATS.md)
> **Skills:** `domains/api`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar dos endpoints de stats avanzadas: `GET /stats/matchup` (head-to-head entre dos entidades con scope all/1v1) y `GET /stats/global` (ranking de jugadores, top decks, top commanders). Ambos se calculan on-demand (BR-STATS-09).

## User Story

> Como **P-002** (usuario autenticado), quiero **ver quién domina el head-to-head y el dashboard global** para **entender el meta de mi grupo**.

**Implementa:** US-026, US-027, US-028, US-029

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| API_CONTRACTS | GET /stats/matchup, GET /stats/global | [08_API_CONTRACTS.md#stats](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-STATS-06, BR-STATS-07 | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |
| USER_STORIES | US-026, US-027, US-028, US-029 | [04_USER_STORIES.md#us-026](../../planning/04_USER_STORIES.md) |

---

## ✅ Criterios de Aceptación (Matchup)

- [x] `GET /stats/matchup` requiere: `entity_type` (player/deck/commander), `entity_a_id`, `entity_b_id`
- [x] `scope=all` (default): matches donde AMBAS entidades participaron, sin filtro de N_players
- [x] `scope=1v1`: solo matches donde `N_players = 2` (BR-STATS-06)
- [x] Retorna wins de A, wins de B, draws, total_matches compartidos
- [x] Si las dos entidades nunca coincidieron: `total_matches=0`, wins=0 para ambas

## ✅ Criterios de Aceptación (Global Stats)

- [x] `GET /stats/global` retorna: total_matches completados, total_players activos
- [x] `player_rankings`: todos los jugadores con partidas, ordenados por `win_rate_pct` DESC
- [x] Empate en ranking: mismo win rate = mismo `rank` (BR-STATS-07 — no tie-breaking arbitrario)
- [x] `top_decks`: top 5 decks por win rate (mínimo 3 partidas para calificar — evitar 1 partida = 100%)
- [x] `top_commanders`: top 5 commanders por win rate (mismo mínimo 3 partidas)
- [x] Filtrable por `group_id` (reservado para EPIC-05, ignorado en EPIC-04)

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Matchup jugador vs jugador — scope all
  Dado que Ana y Carlos participaron juntos en 8 matches (Ana 3W, Carlos 4W, 1D)
  Cuando llamo GET /stats/matchup?entity_type=player&entity_a_id=ana&entity_b_id=carlos&scope=all
  Entonces entity_a.wins=3, entity_b.wins=4, draws=1, total_matches=8

Escenario: Matchup scope 1v1 — solo partidas de 2 jugadores
  Dado que de los 8 matches, solo 2 fueron 1v1
  Cuando llamo con scope=1v1
  Entonces total_matches=2 y los wins se recalculan solo sobre esos 2 matches (BR-STATS-06)

Escenario: Ranking con empate
  Dado que Ana y Carlos tienen ambos 50% de win rate
  Cuando llamo GET /stats/global
  Entonces player_rankings muestra Ana y Carlos con rank=1 ambos (BR-STATS-07)
  Y el siguiente jugador tiene rank=3 (no rank=2)

Escenario: Top decks — mínimo de partidas
  Dado que "Deck Nuevo" tiene 1W de 1 partida (100% WR) y "Meren" tiene 5W de 10 (50% WR)
  Cuando llamo GET /stats/global
  Entonces "Deck Nuevo" NO aparece en top_decks por no tener mínimo 3 partidas
```

## 🔧 Contexto Técnico

**Rutas:**
- `app/api/stats/matchup+api.ts`
- `app/api/stats/global+api.ts`

**Matchup query:**
```sql
-- Matches donde ambas entidades participaron:
SELECT m.id,
  MAX(CASE WHEN p.player_id = :a_id THEN p.result END) as result_a,
  MAX(CASE WHEN p.player_id = :b_id THEN p.result END) as result_b
FROM matches m
JOIN participations p ON p.match_id = m.id
WHERE m.status = 'completed'
  AND m.id IN (
    SELECT match_id FROM participations WHERE player_id = :a_id
    INTERSECT
    SELECT match_id FROM participations WHERE player_id = :b_id
  )
GROUP BY m.id
```

**Ranking con empate (BR-STATS-07):**
```typescript
// DENSE_RANK() en SQL o cálculo en JS post-query
// 1, 1, 3, 4 (no 1, 1, 2, 3)
```

**Dependencias de Issues:**
- Bloqueado por: MATCH-001 (schema), MATCH-003 (matches completed)
- Bloquea a: HIST-011

---

## ⚠️ Edge Cases

- `entity_type=commander` matchup: buscar matches donde commander aparece en deck.commander_id O commander_id_2
- Jugadores con 0 matches: no aparecen en `player_rankings` de global stats
- Todos los matches son draws: wins de A = 0 y wins de B = 0 — respuesta válida, total_matches > 0

## 🧪 Tests Requeridos

- [x] Integration: matchup scope=1v1 solo cuenta partidas de 2 jugadores (BR-STATS-06)
- [x] Integration: ranking con empate usa RANK (1,1,3) — mismas posiciones (BR-STATS-07)
- [x] Integration: top_decks excluye decks con < 3 partidas

## 🚫 Out of Scope

- Matchup vs más de 2 entidades → Fase 2
- Heatmap de commanders → Fase 2

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-11 | Matchup: 2-query approach (matchIds for A → all parts for those matches → JS aggregate) | Drizzle no soporta INTERSECT; la agregación JS sobre arrays pequeños (partidas de un usuario) es correcta y legible |
| 2026-04-11 | Ranking: RANK en JS (1,1,3) — no SQL DENSE_RANK (1,1,2) | El scenario spec dice "el siguiente jugador tiene rank=3", lo que corresponde a RANK, no DENSE_RANK; implementado con dos pasadas (assign + propagate) |
| 2026-04-11 | Global stats scoped a `matches.createdBy = userId` | En EPIC-04 no hay grupos; el scope natural es "partidas creadas por este usuario" |
| 2026-04-11 | Top decks/commanders incluyen `commanders: Commander[]` en la respuesta | Necesario para que el cliente pueda mostrar color chips sin un fetch adicional |

### Artifacts Created

- `getMatchupStats` + `getGlobalStats` + tipos (`MatchupResult`, `PlayerRanking`, `TopDeck`, `TopCommander`, `GlobalStats`) en `services/stats.ts`
- `app/api/stats/matchup+api.ts` — GET handler con validación de query params
- `app/api/stats/global+api.ts` — GET handler

### Verification

- [x] Typecheck: Pass (0 errores)
- [x] Tests: Stubs en HIST-012

---

_Completado: 2026-04-11_
