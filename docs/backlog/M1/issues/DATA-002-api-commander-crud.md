# DATA-002: API — Commander CRUD

> **Issue ID:** DATA-002
> **Priority:** P0
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-01-DATA-FOUNDATION](../epics/EPIC-01-DATA-FOUNDATION.md)
> **Skills:** `domains/api`, `domains/db`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar las API Routes CRUD para la entidad Commander usando Expo Router API Routes + Hono: `GET /api/commanders` (list con filtros), `POST /api/commanders` (crear), `PATCH /api/commanders/:id` (editar), `DELETE /api/commanders/:id` (soft delete). Todas las rutas validan el JWT de Clerk y scopean los datos al usuario autenticado.

## User Story

> Como **P-002** (usuario autenticado), quiero **crear y gestionar mis commanders** para **poder asignarlos a decks y usarlos en matches**.

**Implementa:** US-008, US-009

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DATA_MODEL | E-001 Commander | [06_DATA_MODEL.md#e-001](../../planning/06_DATA_MODEL.md) |
| API_CONTRACTS | /api/commanders | [08_API_CONTRACTS.md#commanders](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-ENTITY-01 (naming) | [05_BUSINESS_RULES.md#br-entity-01](../../planning/05_BUSINESS_RULES.md) |
| USER_STORIES | US-008, US-009 | [04_USER_STORIES.md#us-008](../../planning/04_USER_STORIES.md) |

---

## ✅ Criterios de Aceptación

- [ ] `GET /api/commanders` retorna lista de commanders del usuario (filtrando `deleted_at IS NULL`)
- [ ] `POST /api/commanders` crea commander con validación de campos requeridos (`name`, `colors`)
- [ ] `PATCH /api/commanders/:id` actualiza commander (solo el creador puede editar)
- [ ] `DELETE /api/commanders/:id` hace soft delete (setea `deleted_at`)
- [ ] Validación: `colors` solo acepta valores del set `[W, U, B, R, G, C]`
- [ ] Todas las rutas retornan `401` si no hay JWT Clerk válido
- [ ] Todas las rutas retornan `403` si el usuario intenta modificar un commander que no creó

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Crear commander exitosamente
  Dado que estoy autenticado como usuario P-002
  Cuando hago POST /api/commanders con { name: "Atraxa", colors: ["W","U","B","G"], isPartner: false }
  Entonces retorna 201 con el commander creado y su id UUID
  Y el commander aparece en GET /api/commanders

Escenario: Crear commander con color inválido
  Dado que estoy autenticado
  Cuando hago POST /api/commanders con { name: "Test", colors: ["X"] }
  Entonces retorna 400 con error de validación
  Y el commander no se crea en la base de datos

Escenario: Soft delete no permite recuperar el commander
  Dado que existo un commander con id "abc-123"
  Cuando hago DELETE /api/commanders/abc-123
  Entonces retorna 200
  Y GET /api/commanders no incluye "abc-123" en la lista
  Y el registro sigue en la tabla con deleted_at seteado
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/api/commanders+api.ts` — Handler Hono para `GET` + `POST`
- `app/api/commanders/[id]+api.ts` — Handler Hono para `PATCH` + `DELETE`
- `services/commanders.ts` — Queries Drizzle (list, create, update, softDelete)

**API Contract:**
```typescript
// POST /api/commanders
type CreateCommanderInput = {
  name: string;            // required, unique
  colors: ColorCode[];     // ['W','U','B','R','G','C']
  isPartner: boolean;
};
type CommanderResponse = {
  id: string;
  name: string;
  colors: ColorCode[];
  isPartner: boolean;
  createdAt: string;
};
// Errors: 400 VALIDATION_ERROR, 401 UNAUTHORIZED, 409 CONFLICT (nombre duplicado)
```

**Dependencias de Issues:**
- Bloqueado por: DATA-001 (schema)
- Bloquea a: DATA-004 (Deck API usa commander_id), DATA-005 (UI Commanders)

## ⚠️ Edge Cases

- Nombre de commander case-insensitive único: "Atraxa" y "atraxa" son el mismo → usar `LOWER()` en query de unicidad
- Si el commander tiene decks asociados, el soft delete debe proceder igual (BR-ENTITY-03: soft delete obligatorio con historial)

## 🧪 Tests Requeridos

- [ ] Unit: `services/commanders.ts` — create, list, softDelete con DB mockeada
- [ ] Integration: `POST /api/commanders` retorna 409 para nombre duplicado con Neon real

## 🚫 Out of Scope

- Validación de que el commander existe en Scryfall (Fase 3)
- Importación bulk de commanders
- Estadísticas de win rate del commander → DATA-010 + EPIC-04

---

## SK Leverage

No aplica — funcionalidad nueva (no hay SK en este proyecto).

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
