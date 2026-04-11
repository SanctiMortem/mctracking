# DATA-004: API — Deck CRUD

> **Issue ID:** DATA-004
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

Implementar las API Routes CRUD para la entidad Deck: `GET /api/decks` (list con filtro por commander), `POST /api/decks` (crear con commander_id), `PATCH /api/decks/:id` (editar), `DELETE /api/decks/:id` (soft delete). Los decks tienen la lógica especial de partners (dos commanders) y la restricción de no estar en dos matches activos simultáneos.

## User Story

> Como **P-002** (usuario autenticado), quiero **crear y gestionar mis decks con su commander** para **seleccionarlos en el Match Setup y trackear su win rate**.

**Implementa:** US-004, US-005, US-006, US-007

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DATA_MODEL | E-002 Deck | [06_DATA_MODEL.md#e-002](../../planning/06_DATA_MODEL.md) |
| API_CONTRACTS | /api/decks | [08_API_CONTRACTS.md#decks](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-DECK-03 (partner) | [05_BUSINESS_RULES.md#br-deck-03](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-DECK-07 (soft delete) | [05_BUSINESS_RULES.md#br-deck-07](../../planning/05_BUSINESS_RULES.md) |
| USER_STORIES | US-004–US-007 | [04_USER_STORIES.md#us-004](../../planning/04_USER_STORIES.md) |

---

## ✅ Criterios de Aceptación

- [ ] `GET /api/decks` retorna decks activos del usuario, soporta `?commander_id=` filter
- [ ] `POST /api/decks` crea deck con `name`, `commander_id` requeridos; `commander_id_2` opcional para partners
- [ ] Si `commander.is_partner = true` y `commander_id_2` no se provee → retorna `400`
- [ ] `DELETE /api/decks/:id` hace soft delete — retorna `400` si el deck está en un match `in_progress`
- [ ] `GET /api/decks/:id` retorna deck con commander(s) embebido(s)
- [ ] Retorna `401/403/404` según corresponda

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Crear deck con commander partner sin segundo commander
  Dado que el commander_id corresponde a un commander con is_partner=true
  Cuando hago POST /api/decks con { name: "Sibling Rivals", commander_id: "atraxa-id" } sin commander_id_2
  Entonces retorna 400 con "Partner commander requires commander_id_2"

Escenario: Deck no puede eliminarse si está en match activo
  Dado que el deck tiene una Participation en un match in_progress
  Cuando hago DELETE /api/decks/{id}
  Entonces retorna 400 con "Deck has active match"
  Y el deck no se elimina

Escenario: Filtrar decks por commander
  Dado que tengo 5 decks, 2 con commander_id "atraxa-id"
  Cuando hago GET /api/decks?commander_id=atraxa-id
  Entonces retorna solo los 2 decks con ese commander
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/api/decks+api.ts` — GET + POST
- `app/api/decks/[id]+api.ts` — GET + PATCH + DELETE
- `services/decks.ts` — Queries Drizzle con joins a commanders

**Dependencias de Issues:**
- Bloqueado por: DATA-001 (schema), DATA-002 (commander API — para validar commander_id)
- Bloquea a: DATA-007 (UI Decks), MATCH-001 (Match schema usa deck_id)

## ⚠️ Edge Cases

- Verificar `is_partner` del commander al crear deck — la API debe hacer un JOIN con commanders para este check
- Un mismo deck NO puede estar en 2 matches activos simultáneamente (BR-DECK-01) — esta validación se hace en MATCH-002 (POST /api/matches), no aquí

## 🧪 Tests Requeridos

- [ ] Unit: `services/decks.ts` — create con partner, softDelete con match activo
- [ ] Integration: POST rechazado con partner commander sin commander_id_2

## 🚫 Out of Scope

- Stats del deck → EPIC-04
- Validación de deck duplicado en match → MATCH-002

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
