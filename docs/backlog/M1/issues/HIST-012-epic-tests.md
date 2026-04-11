# HIST-012: 🧪 Epic Tests — History & Stats (EPIC-04)

> **Issue ID:** HIST-012
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-04-HISTORY-STATS](../epics/EPIC-04-HISTORY-STATS.md)
> **Skills:** `domains/test`
> **Agents:** `test-engineer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Suite de tests de integración para EPIC-04: valida que el historial filtra correctamente, que los cálculos de stats siguen las business rules (CALC-001, BR-STATS-01 a BR-STATS-09), y que el matchup y el ranking funcionan correctamente.

---

## ✅ Criterios de Aceptación

**Tests de Integración (API):**
- [ ] `GET /matches` — excluye in_progress (BR-MATCH-07)
- [ ] `GET /matches?result=win` — retorna solo matches con ganador
- [ ] `GET /matches?player_id=X&date_from=Y` — filtros combinados funcionan
- [ ] `GET /stats/players/:id` — win_rate_pct=null cuando total_matches=0 (no divide por cero)
- [ ] `GET /stats/players/:id` — abandoned excluidos del denominador (BR-STATS-03)
- [ ] `GET /stats/matchup?scope=1v1` — solo cuenta matches de 2 jugadores (BR-STATS-06)
- [ ] `GET /stats/global` — ranking con DENSE_RANK (empate en misma posición — BR-STATS-07)
- [ ] `GET /stats/global` — top_decks excluye decks con < 3 partidas

**Tests de Integración (UI + Hooks):**
- [ ] `useMatchHistory` — paginación offset carga más items al llegar al final
- [ ] FilterBar en SCR-005 — cambiar filtros actualiza la lista

**Tests E2E:**
- [ ] Flujo: crear match → jugar → cerrar → verificar en historial SCR-005
- [ ] Flujo: SCR-005 → tap MatchCard → SCR-011 muestra EventLog

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Stats correctas con matches abandonados
  Dado que Carlos tiene 8 completed (4W) y 3 abandoned
  Cuando llamo GET /stats/players/carlos-id
  Entonces total_matches=8 (no 11), win_rate_pct=50.0

Escenario: Historial filtra in_progress
  Dado que hay 5 matches: 3 completed, 1 abandoned, 1 in_progress
  Cuando llamo GET /matches
  Entonces la respuesta contiene 4 matches (excluye el in_progress)

Escenario: Matchup sin coincidencias
  Dado que Ana y Miguel nunca jugaron juntos
  Cuando llamo GET /stats/matchup?entity_type=player&entity_a_id=ana&entity_b_id=miguel
  Entonces total_matches=0, entity_a.wins=0, entity_b.wins=0
```

## 🔧 Contexto Técnico

**Fixtures necesarios:**
```typescript
// test/fixtures/history.ts
export const completedMatch = { status: 'completed', ended_at: '...' };
export const abandonedMatch = { status: 'abandoned', ended_at: '...' };
export const inProgressMatch = { status: 'in_progress' };
```

**Dependencias de Issues:**
- Bloqueado por: todos los issues de EPIC-04

---

## 🧪 Tests Requeridos

- [ ] 8 tests de integración de API (listados arriba)
- [ ] 2 tests de integración de UI (listados arriba)
- [ ] 2 flujos E2E (listados arriba)

## 🚫 Out of Scope

- Tests de performance de stats on-demand → EPIC-05 perf spike

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| — | — | — |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
