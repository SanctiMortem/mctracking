# DATA-011: 🧪 Epic Tests — Data Foundation

> **Issue ID:** DATA-011
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-01-DATA-FOUNDATION](../epics/EPIC-01-DATA-FOUNDATION.md)
> **Skills:** `domains/db`, `domains/ui`
> **Agents:** `test-engineer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Completar la cobertura de tests para EPIC-01: unit tests de services, integration tests de API Routes, y E2E de los flujos CRUD principales. Ejecutar audit R3 del epic como cierre formal.

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| EPIC | DATA-FOUNDATION | [EPIC-01-DATA-FOUNDATION.md](../epics/EPIC-01-DATA-FOUNDATION.md) |
| TEST_STRATEGY | §Unit + Integration | [11_TEST_STRATEGY.md](../../planning/11_TEST_STRATEGY.md) |

---

## ✅ Criterios de Aceptación

### Unit Tests
- [ ] `services/commanders.ts` — create, list, softDelete (≥80% coverage)
- [ ] `services/players.ts` — create, list, softDelete, validación match activo
- [ ] `services/decks.ts` — create con partner, softDelete, filtro por commander

### Integration Tests
- [ ] `POST /api/commanders` retorna 201 con datos correctos
- [ ] `POST /api/commanders` retorna 409 para nombre duplicado
- [ ] `DELETE /api/players/:id` retorna 400 si player tiene match activo
- [ ] `POST /api/decks` retorna 400 para partner commander sin commander_id_2

### E2E Tests
- [ ] Happy path: crear Commander → crear Deck → ver en SCR-004
- [ ] Happy path: crear Player → ver en SCR-003 → ver perfil en SCR-012

### Audit R3
- [ ] Ejecutar `/audit R3` con scope EPIC-01
- [ ] 0 hallazgos críticos sin resolver

---

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Flujo completo creación de entidades
  Dado que el proyecto está configurado (EPIC-SETUP completo)
  Cuando creo un Commander, luego un Deck con ese Commander, luego un Player
  Entonces todas las entidades existen en Neon
  Y son accesibles desde sus respectivas pantallas

Escenario: Soft delete preserva integridad referencial
  Dado que un Player y Deck existen con historial
  Cuando hago soft delete de ambos
  Entonces los registros existen con deleted_at seteado
  Y los matches históricos asociados siguen intactos en la DB
```

## 🔧 Contexto Técnico

**Tests a crear:**
- `__tests__/unit/services/commanders.test.ts`
- `__tests__/unit/services/players.test.ts`
- `__tests__/unit/services/decks.test.ts`
- `__tests__/integration/api/commanders.test.ts`
- `__tests__/integration/api/players.test.ts`
- `__tests__/integration/api/decks.test.ts`
- `e2e/data-foundation.spec.ts`

**Dependencias de Issues:**
- Bloqueado por: DATA-001 a DATA-010

## ⚠️ Edge Cases

- Tests de integration necesitan Neon branch para tests (`.env.test`)

## 🧪 Tests Requeridos

- [ ] Unit: services con DB mockeada
- [ ] Integration: API Routes con Neon real
- [ ] E2E: flujos CRUD en simulador

## 🚫 Out of Scope

- Tests de stats → EPIC-04
- Tests de match → EPIC-02

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Tests Creados

| Fecha | Test File | Tipo | Coverage |
|-------|-----------|------|----------|
| — | — | — | — |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
