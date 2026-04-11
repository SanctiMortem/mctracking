# TRACK-001: DB schema — MatchEvent

> **Issue ID:** TRACK-001
> **Priority:** P0
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-03-LIVE-TRACKING](../epics/EPIC-03-LIVE-TRACKING.md)
> **Skills:** `domains/db`
> **Agents:** `database-architect`, `data-modeler-drizzle`
> **Owner:** Gabriel Asse
>
> **Blocked By:** ADR-002, ADR-003

---

## 🎯 Objetivo

Crear el schema Drizzle para la tabla `match_events`: el log inmutable de todos los cambios de estado durante un match (cambios de vida, poison, commander damage). El schema debe soportar debounce (eventos agrupados en ventana de tiempo) y undo (marcar evento como anulado sin eliminarlo físicamente).

## User Story

> Como **Gabriel Asse** (desarrollador), quiero **un schema de MatchEvent que soporte debounce e undo** para **implementar el event log y el undo ilimitado del tracker**.

**Implementa:** — (Data infrastructure, §4 E-006)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DATA_MODEL | E-006 MatchEvent | [06_DATA_MODEL.md#e-006](../../planning/06_DATA_MODEL.md) |
| BUSINESS_RULES | BR-TRACK-09 (debounce) | [05_BUSINESS_RULES.md#br-track-09](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-TRACK-10 (debounce threshold) | [05_BUSINESS_RULES.md#br-track-10](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-TRACK-11 (undo) | [05_BUSINESS_RULES.md#br-track-11](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [x] Tabla `match_events`: `id`, `match_id` (FK), `participation_id` (FK), `event_type` (enum), `delta` (int), `commander_id_source` (FK Commander, nullable — para commander_damage events), `is_undone` (bool default false), `created_at`
- [x] Enum `event_type`: `life_change`, `poison_change`, `commander_damage`
- [x] Índice en `match_events(match_id, is_undone)` para queries de undo y event log
- [x] `pnpm db:generate` + `pnpm db:migrate` exitosos

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Registrar evento de cambio de vida
  Dado que el schema está aplicado
  Cuando inserto un MatchEvent con event_type="life_change", delta=-5, participation_id="p1"
  Entonces el evento se guarda correctamente
  Y aparece en el event log del match

Escenario: Marcar evento como undone
  Dado que existe un MatchEvent con is_undone=false
  Cuando el usuario hace Undo
  Entonces is_undone se setea a true
  Y el evento sigue existiendo en la tabla (soft undo)

Escenario: Commander damage event requiere commander_id_source
  Dado que el schema está aplicado
  Cuando inserto un MatchEvent con event_type="commander_damage" sin commander_id_source
  Entonces la validación de la API (TRACK-002) rechaza el evento
  Y no se inserta en la tabla
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `db/schema.ts` — Agregar tabla match_events y enum event_type
- `drizzle/` — Nueva migración

**Schema pattern:**
```typescript
export const eventTypeEnum = pgEnum('event_type', ['life_change', 'poison_change', 'commander_damage']);

export const matchEvents = pgTable('match_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: uuid('match_id').notNull().references(() => matches.id),
  participationId: uuid('participation_id').notNull().references(() => participations.id),
  eventType: eventTypeEnum('event_type').notNull(),
  delta: integer('delta').notNull(),  // positivo = ganó, negativo = perdió
  commanderIdSource: uuid('commander_id_source').references(() => commanders.id),  // solo commander_damage
  isUndone: boolean('is_undone').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('match_events_match_id_is_undone_idx').on(table.matchId, table.isUndone),
]);
```

**Dependencias de Issues:**
- Bloqueado por: ADR-002, ADR-003, MATCH-001
- Bloquea a: TRACK-002

## ⚠️ Edge Cases

- Debounce: múltiples eventos rápidos se agrupan en un solo evento con `delta` acumulado — la tabla solo recibe el evento debounced (no los intermedios)
- `commander_id_source` nullable a nivel schema — la API valida que sea required cuando `event_type = 'commander_damage'`

## 🧪 Tests Requeridos

- [ ] Unit: insertar MatchEvent con event_type=life_change y commander_damage
- [ ] Unit: marcar evento como is_undone=true

## 🚫 Out of Scope

- Lógica de debounce en el schema (eso es en el cliente/API)
- Snapshot del estado actual (eso es en `participations`)

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| — | Pendiente ADR-002 y ADR-003 | Definen si el schema de MatchEvent incluye campos adicionales |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
