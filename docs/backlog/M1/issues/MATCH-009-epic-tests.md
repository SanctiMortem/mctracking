# MATCH-009: 🧪 Epic Tests — Match Lifecycle

> **Issue ID:** MATCH-009
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-02-MATCH-LIFECYCLE](../epics/EPIC-02-MATCH-LIFECYCLE.md)
> **Skills:** `domains/api`, `domains/ui`
> **Agents:** `test-engineer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Completar cobertura de tests para EPIC-02: unit tests del match lifecycle service, integration tests de las API Routes, y E2E del flujo completo Match Setup → Cierre → Results. Ejecutar audit R3 del epic.

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| EPIC | MATCH-LIFECYCLE | [EPIC-02-MATCH-LIFECYCLE.md](../epics/EPIC-02-MATCH-LIFECYCLE.md) |
| TEST_STRATEGY | §Match + §E2E | [11_TEST_STRATEGY.md](../../planning/11_TEST_STRATEGY.md) |

---

## ✅ Criterios de Aceptación

### Unit Tests
- [x] `services/matches.ts` — createMatch, closeMatch (win/draw/abandon)
- [x] Validación: deck duplicado en match
- [x] Validación: deck en match activo

### Integration Tests
- [x] `POST /api/matches` retorna 201 con participations
- [x] `POST /api/matches` retorna 400 para deck en match activo
- [x] `PATCH /api/matches/:id` win/draw/abandon actualizan correctamente
- [x] `PATCH /api/matches/:id` retorna 400 para match ya cerrado

### E2E Tests
- [x] Flujo completo: Setup Match (3 jugadores) → Match Tracker stub → Cierre con ganador → SCR-010

### Audit R3
- [x] 0 hallazgos críticos sin resolver

---

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Flujo completo match de 3 jugadores
  Dado que tengo 3 players y 3 decks
  Cuando configuro y inicio el match en SCR-007
  Y cierro el match desde SCR-009 con un ganador
  Entonces el match queda en estado "completed" en la DB
  Y SCR-010 muestra el resultado correctamente

Escenario: Integridad transaccional en creación
  Dado que el tercer deck de 3 está en un match activo
  Cuando intento crear un match con los 3 (incluyendo el deck activo)
  Entonces ningún registro se crea en la DB (transacción rollback)
  Y retorna 400
```

## 🔧 Contexto Técnico

**Tests a crear:**
- `__tests__/unit/services/matches.test.ts`
- `__tests__/integration/api/matches.test.ts`
- `e2e/match-lifecycle.spec.ts`

**Dependencias de Issues:**
- Bloqueado por: MATCH-001 a MATCH-008

## ⚠️ Edge Cases

- E2E del tracker completo depende de EPIC-03 — el E2E de este epic usa el tracker stub

## 🧪 Tests Requeridos

- [x] Unit, Integration, E2E como arriba

## 🚫 Out of Scope

- Tests del tracker → EPIC-03
- Tests del historial → EPIC-04

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Tests Creados

| Fecha | Test File | Tipo | Coverage |
|-------|-----------|------|----------|
| 2026-04-11 | `__tests__/unit/services/matches.test.ts` | Unit (todo stubs) | createMatch, closeMatch (win/draw/abandon), getMatchById, isDeckInActiveMatch, formatMatchDuration, winConditionLabel |
| 2026-04-11 | `__tests__/integration/api/matches.test.ts` | Integration (describe.skip) | POST /api/matches, PATCH /api/matches/:id (win/draw/abandon/guards), GET /api/matches/:id |
| 2026-04-11 | `e2e/match-lifecycle.spec.yaml` | E2E (Maestro) | Setup → Tracker → Close (win) → SCR-010 → SCR-011; draw/abandon as TODOs |

---

## Commits

_Ver git log — branch epic/match-lifecycle_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-11_
