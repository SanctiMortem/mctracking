# DATA-001: DB schema — Commander, Player, Deck

> **Issue ID:** DATA-001
> **Priority:** P0
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-01-DATA-FOUNDATION](../epics/EPIC-01-DATA-FOUNDATION.md)
> **Skills:** `domains/db`
> **Agents:** `database-architect`, `data-modeler-drizzle`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Crear el schema Drizzle para las tres entidades base del dominio: `commanders`, `players`, y `decks`. Incluye las relaciones entre ellas (deck → commander), el patrón de soft delete con `deleted_at`, los índices necesarios para las queries más comunes, y las políticas de RLS básicas con Clerk JWT para escopar datos por usuario. Este schema es el prerequisito para toda la lógica de matches y stats.

## User Story

> Como **Gabriel Asse** (desarrollador), quiero **un schema type-safe en Drizzle para Commander, Player y Deck** para **que las API Routes puedan hacer queries con tipos en tiempo de compilación y las migraciones se generen automáticamente**.

**Implementa:** — (Data infrastructure, §4 Data Model E-001, E-002, E-009)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DATA_MODEL | E-001 Commander | [06_DATA_MODEL.md#e-001](../../planning/06_DATA_MODEL.md) |
| DATA_MODEL | E-002 Deck | [06_DATA_MODEL.md#e-002](../../planning/06_DATA_MODEL.md) |
| DATA_MODEL | E-009 Player | [06_DATA_MODEL.md#e-009](../../planning/06_DATA_MODEL.md) |
| BUSINESS_RULES | BR-ENTITY-01 | [05_BUSINESS_RULES.md#br-entity-01](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-ENTITY-03 (soft delete) | [05_BUSINESS_RULES.md#br-entity-03](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-DECK-03 (partner) | [05_BUSINESS_RULES.md#br-deck-03](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [ ] Tabla `commanders`: `id` (UUID PK), `name` (unique), `colors` (text[]), `is_partner` (bool), `created_by` (FK User), `deleted_at` (nullable timestamp)
- [ ] Tabla `players`: `id` (UUID PK), `name` (text), `created_by` (FK User), `deleted_at` (nullable timestamp)
- [ ] Tabla `decks`: `id` (UUID PK), `name` (text), `commander_id` (FK Commander), `commander_id_2` (FK Commander, nullable — partner), `description` (text nullable), `created_by` (FK User), `deleted_at` (nullable timestamp)
- [ ] Índices en: `players(created_by)`, `decks(created_by)`, `decks(commander_id)`, `commanders(created_by)`
- [ ] `pnpm db:generate` genera migración sin errores
- [ ] `pnpm db:migrate` aplica migración a Neon sin errores
- [ ] Schema exportado desde `db/schema.ts` con tipos TypeScript inferidos

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Schema se aplica sin errores a Neon
  Dado que `db/schema.ts` está definido con las 3 tablas
  Cuando ejecuto `pnpm db:generate` y `pnpm db:migrate`
  Entonces las tablas `commanders`, `players`, `decks` existen en Neon
  Y los tipos TypeScript se infieren correctamente desde el schema

Escenario: Soft delete no elimina el registro físicamente
  Dado que un Player tiene registros asociados (historial de matches)
  Cuando se establece `players.deleted_at = NOW()`
  Entonces el registro sigue en la base de datos
  Y las queries de listado filtran `WHERE deleted_at IS NULL`

Escenario: Deck con partner acepta dos commander_id
  Dado que un commander tiene `is_partner = true`
  Cuando creo un deck con `commander_id` y `commander_id_2` apuntando a commanders válidos
  Entonces el registro se inserta correctamente en `decks`
  Y `commander_id_2` puede ser NULL para decks sin partner
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `db/schema.ts` — Definición Drizzle de las 3 tablas
- `db/index.ts` — Re-export del schema + tipos inferidos
- `drizzle/` — Migración generada

**Schema Drizzle (patrón):**
```typescript
import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const commanders = pgTable('commanders', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  colors: text('colors').array().notNull().default([]),
  isPartner: boolean('is_partner').notNull().default(false),
  createdBy: text('created_by').notNull(), // Clerk user ID
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [index('commanders_created_by_idx').on(table.createdBy)]);

export const players = pgTable('players', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdBy: text('created_by').notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [index('players_created_by_idx').on(table.createdBy)]);

export const decks = pgTable('decks', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  commanderId: uuid('commander_id').notNull().references(() => commanders.id),
  commanderId2: uuid('commander_id_2').references(() => commanders.id), // partner
  description: text('description'),
  createdBy: text('created_by').notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('decks_created_by_idx').on(table.createdBy),
  index('decks_commander_id_idx').on(table.commanderId),
]);
```

**Dependencias de Issues:**
- Bloqueado por: SETUP-003 (Drizzle + Neon configurado)
- Bloquea a: DATA-002, DATA-003, DATA-004

## ⚠️ Edge Cases

- `commander_id_2` debe ser nullable a nivel schema pero la lógica de negocio en la API exige que si `is_partner = true` en el commander, el deck pueda tener los dos — validar en la API (DATA-004), no en el schema
- `colors` como `text[]` (array de PostgreSQL): los valores válidos son `W`, `U`, `B`, `R`, `G`, `C` — validar en API (DATA-002)
- `name` unique en `commanders` debe ser case-insensitive — usar `citext` o `lower()` index

## 🧪 Tests Requeridos

- [ ] Unit (drizzle): insertar Commander + Player + Deck con datos válidos
- [ ] Unit: soft delete no elimina físicamente el registro
- [ ] Integration: FK constraint previene deck con commander_id inválido

## 🚫 Out of Scope

- Schema de Match, Participation, MatchEvent → MATCH-001 (EPIC-02)
- Schema de Group, GroupMembership, User, UserSettings → EPIC-05
- RLS con Clerk JWT en Neon (requiere Neon auth integration) → EPIC-05
- Seed data para development

---

## SK Leverage

No aplica — funcionalidad nueva (no hay SK en este proyecto).

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-10 | `commanders.name` unique index como `lower()` conceptual — Drizzle no soporta functional index nativo, se aplica en migración manual o via API validation | Drizzle-kit no genera `CREATE UNIQUE INDEX ON lower(name)` automáticamente |
| 2026-04-10 | `getDb()` factory en lugar de singleton — Neon serverless requiere instancia por request en edge runtime | Patrón documentado por Neon para Expo Router API routes |

---

## Commits

- `cf5e0b7` — feat(data): DATA-001 — Drizzle schema for Commander, Player, Deck

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
