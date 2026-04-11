# HIST-008: API — Commander Stats (GET /stats/commanders/:id)

> **Issue ID:** HIST-008
> **Priority:** P1
> **Effort:** S
> **Story Points:** 2
> **Status:** 📋 Backlog
> **Epic:** [EPIC-04-HISTORY-STATS](../epics/EPIC-04-HISTORY-STATS.md)
> **Skills:** `domains/api`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar `GET /stats/commanders/:id` — stats del commander como entidad: win rate, total matches en que apareció, decks que lo usan, y jugadores que lo pilotearon. Para partners, las stats de cada commander son independientes (BR-STATS-05).

## User Story

> Como **P-002** (usuario autenticado), quiero **ver las stats de un commander** para **saber qué tan poderoso es en el meta de mi grupo**.

**Implementa:** US-025

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| API_CONTRACTS | GET /stats/commanders/:id | [08_API_CONTRACTS.md#stats](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-STATS-05 (partner independence) | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [ ] `total_matches`: partidas donde este commander apareció (via deck.commander_id o commander_id_2)
- [ ] `wins`, `win_rate_pct`: victorias con este commander
- [ ] Para partners: stats de Thrasios son independientes de Tymna — se cuentan por commander_id individual (BR-STATS-05)
- [ ] `decks_using`: decks que usan este commander (activos o soft-deleted con historial)
- [ ] `players_using`: jugadores que lo pilotearon con total de matches

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Commander con win rate calculado correctamente
  Dado que "Atraxa" apareció en 8 matches completados con 5 victorias
  Cuando llamo GET /stats/commanders/atraxa-id
  Entonces total_matches=8, wins=5, win_rate_pct=62.5

Escenario: Partner commander — stats independientes
  Dado que "Thrasios" y "Tymna" son partners y cada uno en 6 matches
  Cuando llamo GET /stats/commanders/thrasios-id
  Entonces sus stats NO incluyen los matches de Tymna (BR-STATS-05)
```

## 🔧 Contexto Técnico

**Ruta:** `app/api/stats/commanders/[id]+api.ts`

**Response:**
```typescript
{
  commander: Commander,
  total_matches: number,
  wins: number,
  win_rate_pct: number | null,
  decks_using: Array<{ deck: Deck, matches: number }>,
  players_using: Array<{ player: Player, matches: number }>
}
```

**JOIN logic para contar matches:**
```sql
-- Un match incluye este commander si en CUALQUIER participation de ese match:
-- deck.commander_id = :id OR deck.commander_id_2 = :id
```

**Dependencias de Issues:**
- Bloqueado por: MATCH-001 (schema)
- Bloquea a: HIST-009

---

## ⚠️ Edge Cases

- Commander usado tanto como commander_id Y commander_id_2 en distintos decks: contar una vez por participation

## 🧪 Tests Requeridos

- [ ] Integration: match donde el commander es `commander_id_2` (partner) cuenta en sus stats
- [ ] Integration: stats de cada partner son independientes (BR-STATS-05)

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
