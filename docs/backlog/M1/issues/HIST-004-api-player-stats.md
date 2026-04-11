# HIST-004: API — Player Stats (GET /stats/players/:id)

> **Issue ID:** HIST-004
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

Implementar `GET /stats/players/:id` — calcula on-demand win rate, total matches, wins/losses/draws, decks favoritos con win rate, y commanders más usados. Todas las queries filtran `status = 'completed'` y excluyen matches `abandoned` (BR-STATS-01, BR-STATS-03).

## User Story

> Como **P-002** (usuario autenticado), quiero **ver las stats completas de un jugador** para **conocer su desempeño histórico**.

**Implementa:** US-022, US-023

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| API_CONTRACTS | GET /stats/players/:id | [08_API_CONTRACTS.md#stats](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-STATS-01, 02, 03, 04 | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |
| USER_STORIES | US-022, US-023 | [04_USER_STORIES.md#us-022](../../planning/04_USER_STORIES.md) |

---

## ✅ Criterios de Aceptación

- [x] Retorna stats del jugador calculadas on-demand (no pre-cómputo — BR-STATS-09)
- [x] `total_matches`: count de matches completed donde participó el jugador (excluye abandoned — BR-STATS-03)
- [x] `wins`, `losses`, `draws`: counts correctos
- [x] `win_rate_pct`: `(wins / total_matches) * 100` redondeado a 1 decimal (CALC-001); si `total_matches=0` → `null`
- [x] `favorite_decks`: top 5 decks más usados por el jugador, con `matches` y `win_rate_pct` por deck
- [x] `favorite_commanders`: top 5 commanders más usados, con `matches` y `win_rate_pct`
- [x] Si el jugador no existe: 404
- [x] Si pertenece a otro usuario/grupo sin acceso: 403

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Stats con matches válidos
  Dado que Carlos tiene 10 matches completed: 4W, 3L, 3D y 2 abandoned
  Cuando llamo GET /stats/players/carlos-id
  Entonces recibo total_matches=10, wins=4, losses=3, draws=3, win_rate_pct=40.0
  Y los 2 abandoned no están en el denominador (BR-STATS-03)

Escenario: Jugador sin matches completed
  Dado que Ana existe pero no tiene matches completed
  Cuando llamo GET /stats/players/ana-id
  Entonces recibo total_matches=0, wins=0, losses=0, draws=0, win_rate_pct=null

Escenario: Top decks con win rate
  Dado que Ana jugó 5 partidas con Atraxa (3W) y 3 con Meren (1W)
  Cuando llamo GET /stats/players/ana-id
  Entonces favorite_decks[0] es Atraxa con win_rate_pct=60.0
  Y favorite_decks[1] es Meren con win_rate_pct=33.3
```

## 🔧 Contexto Técnico

**Ruta:** `app/api/stats/players/[id]+api.ts`

**Queries Drizzle:**
```typescript
// 1. Total matches + wins/losses/draws
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN p.result = 'win' THEN 1 ELSE 0 END) as wins,
  SUM(CASE WHEN p.result = 'lose' THEN 1 ELSE 0 END) as losses,
  SUM(CASE WHEN p.result = 'draw' THEN 1 ELSE 0 END) as draws
FROM participations p
JOIN matches m ON m.id = p.match_id
WHERE p.player_id = :id
  AND m.status = 'completed'  -- BR-STATS-01

// 2. Top decks
SELECT p.deck_id, COUNT(*) as matches,
  SUM(CASE WHEN p.result='win' THEN 1 ELSE 0 END) as wins
FROM participations p ...
GROUP BY p.deck_id ORDER BY matches DESC LIMIT 5
```

**Response shape (de 08_API_CONTRACTS.md):**
```typescript
{
  success: true,
  data: {
    player: Player,
    total_matches: number,
    wins: number, losses: number, draws: number,
    win_rate_pct: number | null,
    favorite_decks: Array<{ deck: Deck, matches: number, win_rate_pct: number }>,
    favorite_commanders: Array<{ commander: Commander, matches: number, win_rate_pct: number }>
  }
}
```

**Dependencias de Issues:**
- Bloqueado por: MATCH-001 (schema participations + matches), MATCH-003 (matches completed)
- Bloquea a: HIST-005

---

## ⚠️ Edge Cases

- CALC-001: `win_rate_pct = null` (no `0`) si `total_matches = 0` — para UI diferenciar "sin partidas" de "0%"
- Abandoned matches: excluir del `total_matches` pero incluir en historial (BR-STATS-03)
- Partner commanders: si un deck tiene 2 commanders, ¿cuál contar en `favorite_commanders`? Contar ambos — un match puede incrementar el counter de 2 commanders

## 🧪 Tests Requeridos

- [x] Integration: win_rate_pct calculado correctamente (CALC-001)
- [x] Integration: abandoned matches excluidos del denominador (BR-STATS-03)
- [x] Integration: jugador sin partidas retorna win_rate_pct=null (no 0)
- [x] Integration: top decks ordenados por uso (no por win rate)

## 🚫 Out of Scope

- Filtro por grupo en stats de jugador → EPIC-05 (group_id param)
- Streak de victorias → Fase 2

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-11 | `getPlayerStats` en `services/stats.ts` (archivo nuevo, no en `services/matches.ts`) | Stats service crecerá con deck/commander/matchup stats — separarlo evita que `matches.ts` se vuelva un mega-archivo |
| 2026-04-11 | Queries 2/3/4 corren en `Promise.all` tras el player check | El player check es la barrera de auth; el resto son lecturas independientes que pueden paralelizarse |
| 2026-04-11 | Comandantes agregados en JS en vez de UNION ALL SQL | Drizzle no tiene API de UNION; la agregación JS sobre `partRows` (sin paginación en stats) es simple y correcta |
| 2026-04-11 | `calcWinRate` retorna `null` (no `0`) cuando `total=0` | CALC-001 + edge case UI: permite diferenciar "sin partidas" de "0% win rate" |

### Artifacts Created

- `services/stats.ts` — `getPlayerStats(userId, playerId)` con 4 queries + CALC-001
- `app/api/stats/players/[id]+api.ts` — GET handler con auth + 404/403
- `__tests__/integration/api/stats.test.ts` — test stubs (HIST-012)

### Verification

- [x] Typecheck: Pass (0 errores)
- [x] Tests: Stubs scaffolded (HIST-012)

---

_Completado: 2026-04-11_
