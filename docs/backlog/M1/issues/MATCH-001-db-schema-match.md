# MATCH-001: DB schema — Match, Participation, MatchResult

> **Issue ID:** MATCH-001
> **Priority:** P0
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-02-MATCH-LIFECYCLE](../epics/EPIC-02-MATCH-LIFECYCLE.md)
> **Skills:** `domains/db`
> **Agents:** `database-architect`, `data-modeler-drizzle`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Crear el schema Drizzle para las entidades centrales del match lifecycle: `matches`, `participations`, y `match_results`. Estas tablas almacenan el estado de una partida, quién participó con qué deck, y el resultado final. El diseño debe reflejar las decisiones de ADR-002 y ADR-003 (sources of truth para `life_total` y `commander_damage`).

**Nota:** `match_events` se agrega en TRACK-001 (EPIC-03) ya que depende de las decisiones ADR-002/003.

## User Story

> Como **Gabriel Asse** (desarrollador), quiero **un schema type-safe para Match, Participation y MatchResult** para **poder crear y cerrar partidas con datos tipados desde las API Routes**.

**Implementa:** — (Data infrastructure, §4 E-005, E-007, E-008)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DATA_MODEL | E-005 Match | [06_DATA_MODEL.md#e-005](../../planning/06_DATA_MODEL.md) |
| DATA_MODEL | E-007 MatchResult | [06_DATA_MODEL.md#e-007](../../planning/06_DATA_MODEL.md) |
| DATA_MODEL | E-008 Participation | [06_DATA_MODEL.md#e-008](../../planning/06_DATA_MODEL.md) |
| BUSINESS_RULES | BR-MATCH-01 | [05_BUSINESS_RULES.md#br-match-01](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-MATCH-06 (abandoned) | [05_BUSINESS_RULES.md#br-match-06](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-MATCH-09 (win_condition) | [05_BUSINESS_RULES.md#br-match-09](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [x] Tabla `matches`: `id`, `status` (enum: in_progress/completed/abandoned), `created_by`, `created_at`, `ended_at` (nullable)
- [x] Tabla `participations`: `id`, `match_id` (FK), `player_id` (FK), `deck_id` (FK), `result` (enum: win/lose/draw/null), `life_total` (int, default 40), `poison_counters` (int, default 0), `commander_damage` (JSONB), `created_at`
- [x] Tabla `match_results`: `id`, `match_id` (FK, unique), `winner_participation_id` (FK, nullable — null en draw/abandon), `win_condition` (enum), `is_draw` (bool), `created_at`
- [x] Enum `win_condition`: combat_damage, commander_damage, infect, combo, mill, scoop, concede, other
- [x] Índices en `participations(match_id)`, `participations(player_id)`, `participations(deck_id)`
- [ ] `pnpm db:generate` + `pnpm db:migrate` exitosos — `db:generate` ✅, `db:migrate` pendiente (requiere DATABASE_URL en Neon)

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Schema acepta match con 4 participations
  Dado que el schema está aplicado en Neon
  Cuando inserto un Match con 4 Participations (4 player/deck combos distintos)
  Entonces todos los registros se insertan correctamente con FKs válidas

Escenario: commander_damage almacenado como JSONB
  Dado que una Participation tiene commander_damage
  Cuando inserto { "commander-id-1": 7, "commander-id-2": 14 }
  Entonces el JSONB se almacena y recupera correctamente tipado

Escenario: match_result único por match
  Dado que un match ya tiene un MatchResult registrado
  Cuando intento insertar un segundo MatchResult para el mismo match
  Entonces la DB rechaza con error de unique constraint en match_id
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `db/schema.ts` — Agregar tablas matches, participations, match_results
- `db/enums.ts` — Enums de PostgreSQL (status, result, win_condition)
- `drizzle/` — Nueva migración

**Schema pattern:**
```typescript
export const matchStatusEnum = pgEnum('match_status', ['in_progress', 'completed', 'abandoned']);
export const participationResultEnum = pgEnum('participation_result', ['win', 'lose', 'draw']);
export const winConditionEnum = pgEnum('win_condition', [
  'combat_damage', 'commander_damage', 'infect', 'combo', 'mill', 'scoop', 'concede', 'other'
]);

export const matches = pgTable('matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: matchStatusEnum('status').notNull().default('in_progress'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
});

export const participations = pgTable('participations', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: uuid('match_id').notNull().references(() => matches.id),
  playerId: uuid('player_id').notNull().references(() => players.id),
  deckId: uuid('deck_id').notNull().references(() => decks.id),
  result: participationResultEnum('result'),  // NULL = abandoned/in_progress
  lifeTotal: integer('life_total').notNull().default(40),
  poisonCounters: integer('poison_counters').notNull().default(0),
  commanderDamage: jsonb('commander_damage').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Dependencias de Issues:**
- Bloqueado por: DATA-001 (Commander/Player/Deck schema), SETUP-003
- Bloquea a: MATCH-002, MATCH-003, MATCH-004, TRACK-001 (MatchEvent schema)

## ⚠️ Edge Cases

- `commander_damage` JSONB: estructura `{ [commander_id: string]: number }` — validar en API, no en schema
- `result = NULL` en Participation indica match abandoned (BR-MATCH-06) — nullable intencionalmente
- No se permiten dos participations del mismo `deck_id` en el mismo match (BR-DECK-01) — validar en MATCH-002

## 🧪 Tests Requeridos

- [ ] Unit: insertar match + 4 participations con datos válidos
- [ ] Unit: unique constraint en match_results.match_id
> Tests cubiertos en MATCH-009 (Epic Tests)

## 🚫 Out of Scope

- `match_events` schema → TRACK-001
- Group scoping de matches → EPIC-05
- Índices para stats queries → EPIC-04 (puede requerir índices adicionales)

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-10 | ADR-002 Opción A: `participations.commander_damage` (JSONB) es source of truth — actualizado en cada evento, MatchEvents son log inmutable | O(1) read en tracker en vivo |
| 2026-04-10 | ADR-003 Opción A: `participations.life_total` es source of truth — consistente con ADR-002 | Mismo patrón, simplicidad |
| 2026-04-10 | `participationResultEnum` no incluye `null` como valor explícito — null en DB significa abandoned/in_progress (BR-MATCH-06) | Drizzle no requiere enum value para NULL |

---

## Commits

_Ver branch `epic/match-lifecycle`_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
