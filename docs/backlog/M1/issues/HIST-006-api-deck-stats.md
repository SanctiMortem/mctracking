# HIST-006: API — Deck Stats (GET /stats/decks/:id)

> **Issue ID:** HIST-006
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

Implementar `GET /stats/decks/:id` — stats del deck como entidad independiente del jugador: win rate global, total matches, y breakdown de jugadores que lo usaron (BR-STATS-04).

## User Story

> Como **P-002** (usuario autenticado), quiero **ver las stats de un deck específico** para **saber qué tan exitoso es independientemente de quién lo pilotea**.

**Implementa:** US-024

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| API_CONTRACTS | GET /stats/decks/:id | [08_API_CONTRACTS.md#stats](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-STATS-04 | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [ ] `total_matches`: partidas donde se usó este deck (status=completed)
- [ ] `wins`: victorias con este deck (sin importar quién lo piloteó — BR-STATS-04)
- [ ] `win_rate_pct`: `(wins / total_matches) * 100` — null si total=0
- [ ] `players_used_by`: lista de jugadores que usaron el deck con su `matches` y `win_rate_pct` individual
- [ ] Si el deck tiene commander partner: incluir ambos commanders en la respuesta

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Stats del deck como entidad
  Dado que "Meren Reanimator" fue usado por Ana (2W/4p) y Carlos (1W/3p)
  Cuando llamo GET /stats/decks/meren-id
  Entonces total_matches=7, wins=3, win_rate_pct=42.9
  Y players_used_by muestra Ana (57.1%) y Carlos (33.3%)
```

## 🔧 Contexto Técnico

**Ruta:** `app/api/stats/decks/[id]+api.ts`

**Response:** (per 08_API_CONTRACTS.md)
```typescript
{
  deck: Deck & { commander: Commander, commander2?: Commander },
  total_matches: number,
  wins: number,
  win_rate_pct: number | null,
  players_used_by: Array<{ player: Player, matches: number, win_rate_pct: number }>
}
```

**Dependencias de Issues:**
- Bloqueado por: MATCH-001 (schema)
- Bloquea a: HIST-007

---

## ⚠️ Edge Cases

- Deck con partners: `players_used_by` agrupado por deck_id (mismo deck, independiente del commander)

## 🧪 Tests Requeridos

- [ ] Integration: win rate del deck suma victorias de todos los jugadores que lo usaron

## 🚫 Out of Scope

- Stats por commander dentro del deck → HIST-008

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
