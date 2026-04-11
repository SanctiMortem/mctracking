# MATCH-003: API — PATCH /api/matches/:id (cerrar match)

> **Issue ID:** MATCH-003
> **Priority:** P0
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-02-MATCH-LIFECYCLE](../epics/EPIC-02-MATCH-LIFECYCLE.md)
> **Skills:** `domains/api`, `domains/db`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar `PATCH /api/matches/:id`: finaliza un match con tres modalidades — victoria (winner + win_condition), draw, o abandon. Actualiza el status del Match a `completed` o `abandoned`, setea `ended_at`, actualiza los `result` de todas las Participations, y crea un MatchResult. El resultado es siempre selección manual del usuario (BR-MATCH-09).

## User Story

> Como **P-002** (usuario autenticado), quiero **cerrar un match seleccionando el ganador o declarando draw/abandon** para **que el resultado quede registrado en el historial y cuente para las stats**.

**Implementa:** US-016, US-017, US-018

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| API_CONTRACTS | PATCH /api/matches/:id | [08_API_CONTRACTS.md#patch-apimatchesid](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-MATCH-06 (abandoned no stats) | [05_BUSINESS_RULES.md#br-match-06](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-MATCH-08 (draw) | [05_BUSINESS_RULES.md#br-match-08](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-MATCH-09 (resultado manual) | [05_BUSINESS_RULES.md#br-match-09](../../planning/05_BUSINESS_RULES.md) |
| USER_STORIES | US-016, US-017, US-018 | [04_USER_STORIES.md#us-016](../../planning/04_USER_STORIES.md) |

---

## ✅ Criterios de Aceptación

- [ ] `PATCH /api/matches/:id` con `{ action: "win", winner_participation_id, win_condition }` → status `completed`, winner `result=win`, resto `result=lose`, crea MatchResult
- [ ] Con `{ action: "draw" }` → status `completed`, todas Participations `result=draw`, MatchResult `is_draw=true`
- [ ] Con `{ action: "abandon" }` → status `abandoned`, todas Participations `result=null`, MatchResult NO creado
- [ ] Retorna `400` si match ya está `completed` o `abandoned`
- [ ] Retorna `400` si `winner_participation_id` no pertenece al match
- [ ] Setea `matches.ended_at = NOW()`
- [ ] Todo en una transacción

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Cerrar match con ganador
  Dado que match "abc" está in_progress con 4 participations
  Cuando hago PATCH /api/matches/abc con { action: "win", winner_participation_id: "p1-id", win_condition: "combo" }
  Entonces match.status = "completed", p1.result = "win", p2/p3/p4.result = "lose"
  Y existe un MatchResult con win_condition="combo"

Escenario: Cerrar match como draw
  Cuando hago PATCH /api/matches/abc con { action: "draw" }
  Entonces match.status = "completed", todas las participations tienen result="draw"
  Y MatchResult.is_draw = true

Escenario: Abandonar match
  Cuando hago PATCH /api/matches/abc con { action: "abandon" }
  Entonces match.status = "abandoned"
  Y NO existe MatchResult para este match
  Y el match NO cuenta en stats (BR-MATCH-06)

Escenario: Cerrar match ya cerrado
  Dado que match.status = "completed"
  Cuando intento hacer PATCH /api/matches/abc de nuevo
  Entonces retorna 400 "Match is already closed"
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `app/api/matches/[id]+api.ts` — PATCH handler
- `services/matches.ts` — closeMatch (transaction: update match + participations + insert match_result)

**Dependencias de Issues:**
- Bloqueado por: MATCH-001
- Bloquea a: MATCH-006 (Close UI), MATCH-007 (Results UI)

## ⚠️ Edge Cases

- `abandon` no crea MatchResult → verificar en API de stats (EPIC-04) que matches abandoned son excluidos
- Validar que `winner_participation_id` es un UUID que pertenece al match (evitar injection de participation de otro match)

## 🧪 Tests Requeridos

- [ ] Unit: closeMatch — win, draw, abandon
- [ ] Integration: PATCH con match ya cerrado retorna 400

## 🚫 Out of Scope

- Validar condición de vida automáticamente (BR sobre alertas, no acción automática)
- Lógica del tracker de life/poison/commander damage → EPIC-03

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
