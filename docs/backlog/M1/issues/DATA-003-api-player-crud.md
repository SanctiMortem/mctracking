# DATA-003: API — Player CRUD

> **Issue ID:** DATA-003
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

Implementar las API Routes CRUD para la entidad Player: `GET /api/players` (list), `POST /api/players` (crear), `PATCH /api/players/:id` (editar nombre), `DELETE /api/players/:id` (soft delete). Los jugadores son el recurso central de la app — sin ellos no hay matches ni stats.

## User Story

> Como **P-002** (usuario autenticado), quiero **crear y gestionar jugadores** para **registrarlos en futuras partidas sin tener que escribir sus nombres cada vez**.

**Implementa:** US-001, US-002, US-003

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DATA_MODEL | E-009 Player | [06_DATA_MODEL.md#e-009](../../planning/06_DATA_MODEL.md) |
| API_CONTRACTS | /api/players | [08_API_CONTRACTS.md#players](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-ENTITY-01 | [05_BUSINESS_RULES.md#br-entity-01](../../planning/05_BUSINESS_RULES.md) |
| USER_STORIES | US-001, US-002, US-003 | [04_USER_STORIES.md#us-001](../../planning/04_USER_STORIES.md) |

---

## ✅ Criterios de Aceptación

- [ ] `GET /api/players` retorna jugadores activos del usuario (`deleted_at IS NULL`)
- [ ] `POST /api/players` crea jugador con `name` requerido
- [ ] `PATCH /api/players/:id` actualiza nombre (solo el creador)
- [ ] `DELETE /api/players/:id` hace soft delete — retorna `400` si el jugador tiene matches activos (`in_progress`)
- [ ] Retorna `401` sin JWT, `403` si no es el creador, `404` si no existe
- [ ] `name` es único por usuario (no globally): dos usuarios diferentes pueden tener un jugador "Gabriel"

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Crear jugador exitosamente
  Dado que estoy autenticado
  Cuando hago POST /api/players con { name: "Gabriel" }
  Entonces retorna 201 con el jugador creado
  Y aparece en GET /api/players

Escenario: No puedo eliminar jugador con match activo
  Dado que el jugador tiene una Participation en un match con status "in_progress"
  Cuando hago DELETE /api/players/{id}
  Entonces retorna 400 con mensaje "Player has active match"
  Y el jugador no se elimina

Escenario: Soft delete preserva historial
  Dado que el jugador tiene matches completados en su historial
  Cuando hago DELETE /api/players/{id} (sin match activo)
  Entonces retorna 200
  Y GET /api/players no lo incluye
  Y los matches históricos siguen asociados al jugador en la DB
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/api/players+api.ts` — GET + POST
- `app/api/players/[id]+api.ts` — PATCH + DELETE
- `services/players.ts` — Queries Drizzle

**Dependencias de Issues:**
- Bloqueado por: DATA-001
- Bloquea a: DATA-006 (UI Players), MATCH-001 (Match schema usa player_id)

## ⚠️ Edge Cases

- Verificar match activo antes de soft delete requiere JOIN con `participations` — verificar en la query de service
- Un jugador puede aparecer en matches de grupos distintos — en MVP, los players son personales (scoped por `created_by`)

## 🧪 Tests Requeridos

- [ ] Unit: `services/players.ts` — list, create, softDelete
- [ ] Integration: soft delete rechazado con match activo

## 🚫 Out of Scope

- Stats del jugador → EPIC-04
- Scoping por grupo (Group membership) → EPIC-05

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
