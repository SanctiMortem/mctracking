# MATCH-004: API — GET /api/matches/:id (detalle de match)

> **Issue ID:** MATCH-004
> **Priority:** P1
> **Effort:** S
> **Story Points:** 2
> **Status:** ✅ Done
> **Epic:** [EPIC-02-MATCH-LIFECYCLE](../epics/EPIC-02-MATCH-LIFECYCLE.md)
> **Skills:** `domains/api`, `domains/db`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar `GET /api/matches/:id`: retorna un match con sus participations (player + deck + commander embebidos), el MatchResult (si existe), y el estado actual (para recuperar un match in_progress y continuar el tracker).

## User Story

> Como **P-002** (usuario autenticado), quiero **obtener los datos completos de un match** para **mostrar el detalle y recuperar un match activo en el tracker**.

**Implementa:** US-021 (parcial — UI en MATCH-008)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| API_CONTRACTS | GET /api/matches/:id | [08_API_CONTRACTS.md#get-apimatchesid](../../planning/08_API_CONTRACTS.md) |
| DATA_MODEL | E-005 Match + E-008 Participation | [06_DATA_MODEL.md#e-005](../../planning/06_DATA_MODEL.md) |

---

## ✅ Criterios de Aceptación

- [ ] Retorna match con participations embebidas (player.name, deck.name, commander.name + colors)
- [ ] Retorna MatchResult si el match está completed
- [ ] Retorna `404` si el match no existe o no pertenece al usuario
- [ ] Retorna `401` sin JWT

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Obtener match in_progress
  Dado que match "abc" está in_progress
  Cuando hago GET /api/matches/abc
  Entonces retorna el match con participations, life totals actuales y sin MatchResult

Escenario: Obtener match completado
  Dado que match "abc" está completed con un winner
  Cuando hago GET /api/matches/abc
  Entonces retorna el match con MatchResult embebido incluyendo win_condition
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `app/api/matches/[id]+api.ts` — GET handler (junto con PATCH)
- `services/matches.ts` — getMatchById con JOINs

**Dependencias de Issues:**
- Bloqueado por: MATCH-001
- Bloquea a: MATCH-008 (Match Detail UI)

## ⚠️ Edge Cases

- Si el match tiene MatchEvents (EPIC-03), incluirlos en la respuesta opcionalmente

## 🧪 Tests Requeridos

- [x] Unit: getMatchById retorna notFound para match de otro usuario
- [x] Integration: GET match completado incluye MatchResult

## 🚫 Out of Scope

- Lista paginada de matches → EPIC-04
- Match events en respuesta → EPIC-03

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-11 | `alias` importado de `drizzle-orm/pg-core` (no top-level) | En drizzle-orm 0.45.x la función `alias` para PG vive en `pg-core` |
| 2026-04-11 | `notFound` cuando `created_by ≠ userId` | Evita info leak — el ownership check duplica como guard de 404 |
| 2026-04-11 | `events` omitido de la respuesta | EPIC-03 scope — MatchEvent no existe aún |

### AC Evidence

| AC | Descripción | Cubierto | Evidencia |
|----|-------------|----------|-----------|
| 1 | Retorna match con participations embebidas (player.name, deck.name, commander.name + colors) | ✅ | `services/matches.ts` — `getMatchById` JOIN chain |
| 2 | Retorna MatchResult si el match está completed | ✅ | `services/matches.ts` — query final `matchResults` |
| 3 | Retorna 404 si el match no existe o no pertenece al usuario | ✅ | `app/api/matches/[id]+api.ts:GET` — `notFound` → 404 |
| 4 | Retorna 401 sin JWT | ✅ | `app/api/matches/[id]+api.ts:GET` — `getAuth` guard |

---

## Commits

_Ver git log — branch epic/match-lifecycle_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-11_
