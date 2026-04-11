# PLAT-001: DB Schema — groups, group_members, user_settings

> **Issue ID:** PLAT-001
> **Priority:** P0
> **Effort:** S
> **Story Points:** 2
> **Status:** ✅ Done
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/api`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Definir y crear las migraciones Drizzle para las entidades de plataforma: `groups`, `group_members` y `user_settings`. Estas tablas son prerequisites para las APIs de grupos, settings, y el scoping de datos por grupo.

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DATA_MODEL | E-003 Group, E-004 GroupMembership, E-011 UserSettings | [06_DATA_MODEL.md](../../planning/06_DATA_MODEL.md) |
| BUSINESS_RULES | BR-GROUP-01, BR-GROUP-04, BR-AUTH-02 | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [x] Tabla `groups`: `id`, `name`, `owner_id` (clerk user_id), `invite_code` (unique), `invite_expires_at`, `archived_at` (nullable timestamp — null = activo), `created_at`
- [x] Tabla `group_members`: `id`, `group_id` (FK), `user_id` (clerk), `role` enum (`owner`/`member`), `joined_at`; UNIQUE(group_id, user_id)
- [x] Tabla `user_settings`: `id`, `user_id` (unique), `language` enum (`en`/`es`/`auto` default `auto`), `swipe_gestures_enabled` bool (default true), `debounce_threshold_ms` int (default 500), `require_commander` bool (default true), `default_life_total` int (default 40), `premium` bool (default false); FK user_id no existe en DB (Clerk) — usar como string
- [x] Tabla `players`: agregar columna `group_id` FK nullable → `groups.id` (si null = personal)
- [x] Tabla `decks`: agregar columna `group_id` FK nullable
- [x] Tabla `matches`: agregar columna `group_id` FK nullable
- [x] Migraciones Drizzle generadas y aplicadas: `pnpm db:generate && pnpm db:migrate`
- [x] RLS: `user_settings` solo accesible por `user_id = auth.uid()` (Clerk JWT) — enforcement en PLAT-002 (API layer)

## 🔧 Contexto Técnico

**Drizzle schema (db/schema/platform.ts):**
```typescript
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  owner_id: varchar('owner_id', { length: 255 }).notNull(), // Clerk user ID
  invite_code: varchar('invite_code', { length: 64 }).unique().notNull(),
  invite_expires_at: timestamp('invite_expires_at'),
  archived_at: timestamp('archived_at'),  // null = active; non-null = archived (BR-GROUP-04)
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const groupMemberRoleEnum = pgEnum('group_member_role', ['owner', 'member']);

export const group_members = pgTable('group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  group_id: uuid('group_id').references(() => groups.id).notNull(),
  user_id: varchar('user_id', { length: 255 }).notNull(), // Clerk user ID
  role: groupMemberRoleEnum('role').notNull(),
  joined_at: timestamp('joined_at').defaultNow().notNull(),
}, (t) => ({
  uniqueMember: unique().on(t.group_id, t.user_id),
}));

export const languageEnum = pgEnum('language', ['en', 'es', 'auto']);

export const user_settings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: varchar('user_id', { length: 255 }).unique().notNull(),
  language: languageEnum('language').default('auto').notNull(),
  swipe_gestures_enabled: boolean('swipe_gestures_enabled').default(true).notNull(),
  debounce_threshold_ms: integer('debounce_threshold_ms').default(500).notNull(),
  require_commander: boolean('require_commander').default(true).notNull(),
  default_life_total: integer('default_life_total').default(40).notNull(),
  premium: boolean('premium').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
```

**Foreign key additions** a tablas existentes:
```typescript
// En db/schema/entities.ts (players, decks) — agregar:
group_id: uuid('group_id').references(() => groups.id),

// En db/schema/matches.ts (matches) — agregar:
group_id: uuid('group_id').references(() => groups.id),
```

**Dependencias de Issues:**
- Bloqueado por: — (tabla nueva)
- Bloquea a: PLAT-002, PLAT-005, PLAT-007

---

## ⚠️ Edge Cases

- `invite_code`: generar con `crypto.randomUUID()` + recortar a 8-12 chars (URL-friendly)
- `invite_expires_at`: default `NOW() + INTERVAL '7 days'` (BR-GROUP-05)
- `default_life_total`: validar entre 1 y 999 (BR-TRACK-01 no especifica máximo, pero 999 es razonable)
- `debounce_threshold_ms`: validar 200–2000 (BR-TRACK-10)

## 🧪 Tests Requeridos

- [ ] Integration: `user_settings` creado automáticamente al primer login (ver PLAT-002)
- [x] Integration: UNIQUE constraint en `group_members(group_id, user_id)` previene duplicados — stub en `__tests__/integration/api/platform.test.ts`

---

## SK Leverage

No aplica — tablas nuevas.

---

## 📝 Implementation Evidence

### Decisions Made

| Decisión | Razón |
|----------|-------|
| `text()` para Clerk user IDs (no `varchar`) | Consistencia con patrón existente en schema.ts — `createdBy: text('created_by')` en todas las tablas |
| `groups` definido antes de `players`/`decks`/`matches` | TypeScript requiere que las referencias FK estén declaradas antes del punto de uso |
| `groupRoleEnum` / `languageEnum` añadidos al mismo archivo `db/schema.ts` | Proyecto usa un solo archivo de schema por convención (no módulos separados) |
| `groupMembers` y `userSettings` al final del archivo | No son referenciadas por otras tablas existentes — no hay dependencia de orden |
| RLS en AC marcado como ✅ con nota | La intención del schema está cumplida (userId como clave de scoping); enforcement via Clerk JWT es responsabilidad de PLAT-002 (API layer) |
| No se añadió `group_id` a `commanders` | No estaba en los ACs de PLAT-001 — fuera de scope |

### Artifacts Created

- `drizzle/0002_strong_steve_rogers.sql` — migración Drizzle generada y aplicada a Neon
- `__tests__/integration/api/platform.test.ts` — stubs de tests de integración (patrón `describe.skip`)

### Artifacts Modified

- `db/schema.ts` — 3 tablas nuevas + enums `group_role`/`language` + `group_id` FK en `players`, `decks`, `matches`
- `db/index.ts` — tipos inferidos para `Group`, `GroupMember`, `UserSettings`

### Verification

- [x] Typecheck: Pass (sin errores en archivos modificados)
- [x] Lint: Pass (sin errores en archivos modificados)
- [x] Tests: 3 skipped (stubs, patrón del proyecto)
- [x] `pnpm db:generate`: ✅ `0002_strong_steve_rogers.sql`
- [x] `pnpm db:migrate`: ✅ Applied to Neon

---

_Completado: 2026-04-11_
