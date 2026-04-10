# 🗄️ Data Model — MTG Commander Tracker

> Generado desde Discovery Brief §4 + 05_BUSINESS_RULES + 07_ARCHITECTURE por `/docs`
> **Fuente:** `docs/planning/00_DISCOVERY_BRIEF.md` §4
> **SSOT:** Este documento → `src/db/schema/*` cuando el código exista.
> **Versión:** 1.0 — 2026-04-09

> ⚠️ **ADR-005:** Soft delete implementado con `deleted_at` en Player y Deck.
> ⚠️ **ADR-004 pending:** La capa de API que accede a estos schemas está pendiente de decisión.

---

## Diagrama ER

```
User ─────────────────────────── owns ──────────────────────► Group
  │                                                               │
  ├── has 1 ──► UserSettings                    ┌────────────────┴───────────────────┐
  │                                             │                                    │
  └── creates ──► Match ◄── scoped by ──────────┘        scopes ──► Player
                   │                                              ──► Deck
                   ├── has 2-4 ──► Participation ◄──────────────── ──► Commander
                   │                   ├── Player (E-009)          ──► Match
                   │                   ├── Deck (E-002)
                   │                   └── Commander (E-001) [1 o 2 si partner]
                   │
                   ├── has 1 ──► MatchResult
                   └── has many ──► MatchEvent

Group ──────────────────────────── has many ──► GroupMembership ◄── User
```

---

## Entidades

### E-001: commanders

**Descripción:** Carta commander con nombre, colores WUBRG y soporte para partners.

| Campo         | Tipo          | Nullable | Default             | Descripción                                          |
| ------------- | ------------- | -------- | ------------------- | ---------------------------------------------------- |
| id            | uuid          | ❌       | `gen_random_uuid()` | PK                                                   |
| name          | varchar(200)  | ❌       | —                   | Nombre del commander (siempre en inglés, BR-I18N-03) |
| colors        | text[]        | ❌       | `'{}'`              | Subset de `['W','U','B','R','G','C']` (BR-ENTITY-05) |
| is_partner    | boolean       | ❌       | `false`             | Si el commander tiene la habilidad Partner           |
| scryfall_id   | varchar(36)   | ✅       | null                | Futuro — para integración Scryfall (Fase 3)          |
| group_id      | uuid          | ✅       | null                | FK → groups. Null = commander personal               |
| created_at    | timestamptz   | ❌       | `now()`             | —                                                    |

**Índices:**
- `commanders_pkey` PRIMARY KEY (id)
- `commanders_group_id_idx` (group_id)
- `commanders_name_idx` (name) — búsqueda por nombre

**Constraints:**
- `commanders_group_id_fkey` FK (group_id) → groups(id)
- `commanders_colors_check` CHECK (colors ⊆ `ARRAY['W','U','B','R','G','C']`)

**Relaciones:**
- belongsTo (optional): Group
- isReferencedBy: Deck (commander_id, commander_id_2), Participation, MatchEvent

**Notas:**
- Sin soft delete: si un commander tiene decks activos, no puede eliminarse (BR-ENTITY-04). Si no tiene referencias, puede eliminarse físicamente.
- `scryfall_id` reservado para Fase 3 (no usar en MVP).

---

### E-002: decks

**Descripción:** Deck registrado: nombre + commander(s) + descripción. Sin lista de cartas en MVP.

| Campo              | Tipo        | Nullable | Default             | Descripción                                           |
| ------------------ | ----------- | -------- | ------------------- | ----------------------------------------------------- |
| id                 | uuid        | ❌       | `gen_random_uuid()` | PK                                                    |
| name               | varchar(100)| ❌       | —                   | Nombre del deck                                       |
| description        | text        | ✅       | null                | Descripción breve (sin lista de cartas)               |
| commander_id       | uuid        | ✅       | null                | FK → commanders. Nullable si require_commander=false  |
| commander_id_2     | uuid        | ✅       | null                | FK → commanders. Solo si is_partner=true (BR-DECK-03) |
| is_partner         | boolean     | ❌       | `false`             | Toggle partner (BR-DECK-03)                           |
| color_identity     | text[]      | ❌       | `'{}'`              | Auto-derivada de los commanders (WUBRG)               |
| owner_player_id    | uuid        | ✅       | null                | FK → players. Opcional (BR-DECK-04)                   |
| group_id           | uuid        | ✅       | null                | FK → groups. Null = deck personal                     |
| deleted_at         | timestamptz | ✅       | null                | Soft delete (ADR-005, BR-DECK-07)                     |
| created_at         | timestamptz | ❌       | `now()`             | —                                                     |
| updated_at         | timestamptz | ❌       | `now()`             | Auto-update on change                                 |

**Índices:**
- `decks_pkey` PRIMARY KEY (id)
- `decks_group_id_idx` (group_id)
- `decks_deleted_at_idx` (deleted_at) — queries filtran `IS NULL`
- `decks_commander_id_idx` (commander_id)

**Constraints:**
- `decks_commander_id_fkey` FK (commander_id) → commanders(id)
- `decks_commander_id_2_fkey` FK (commander_id_2) → commanders(id)
- `decks_owner_player_id_fkey` FK (owner_player_id) → players(id)
- `decks_group_id_fkey` FK (group_id) → groups(id)
- `decks_partner_check` CHECK: `IF is_partner = true THEN commander_id IS NOT NULL AND commander_id_2 IS NOT NULL` (BR-DECK-03)
- `decks_not_partner_check` CHECK: `IF is_partner = false THEN commander_id_2 IS NULL`

**Relaciones:**
- belongsTo (optional): Commander (x2), Player, Group
- hasMany: Participation

---

### E-003: groups

**Descripción:** Grupo de amigos con base de datos compartida.

| Campo       | Tipo         | Nullable | Default             | Descripción                                        |
| ----------- | ------------ | -------- | ------------------- | -------------------------------------------------- |
| id          | uuid         | ❌       | `gen_random_uuid()` | PK                                                 |
| name        | varchar(100) | ❌       | —                   | Nombre del grupo                                   |
| owner_id    | uuid         | ❌       | —                   | FK → users. Group Owner (P-004)                    |
| invite_code | varchar(64)  | ❌       | —                   | Código único de invitación con expiración (BR-GROUP-05) |
| invite_expires_at | timestamptz | ✅  | null                | Expiración del invite_code (BR-GROUP-05)           |
| created_at  | timestamptz  | ❌       | `now()`             | —                                                  |
| archived_at | timestamptz  | ✅       | null                | Archivado (soft "delete" del grupo, BR-GROUP-04)   |

**Índices:**
- `groups_pkey` PRIMARY KEY (id)
- `groups_invite_code_unique` UNIQUE (invite_code)
- `groups_owner_id_idx` (owner_id)

**Constraints:**
- `groups_owner_id_fkey` FK (owner_id) → users(id)

**Relaciones:**
- belongsTo: User (owner)
- hasMany: GroupMembership, Player, Deck, Commander, Match

---

### E-004: group_memberships

**Descripción:** Relación User–Group con rol. Junction table con metadata.

| Campo      | Tipo              | Nullable | Default             | Descripción                              |
| ---------- | ----------------- | -------- | ------------------- | ---------------------------------------- |
| id         | uuid              | ❌       | `gen_random_uuid()` | PK                                       |
| group_id   | uuid              | ❌       | —                   | FK → groups                              |
| user_id    | uuid              | ❌       | —                   | FK → users                               |
| role       | group_role (enum) | ❌       | `'member'`          | `'owner'` o `'member'`                   |
| joined_at  | timestamptz       | ❌       | `now()`             | Cuándo se unió al grupo                  |

**Índices:**
- `group_memberships_pkey` PRIMARY KEY (id)
- `group_memberships_group_user_unique` UNIQUE (group_id, user_id) — un user una vez por grupo
- `group_memberships_user_id_idx` (user_id)

**Constraints:**
- `group_memberships_group_id_fkey` FK (group_id) → groups(id)
- `group_memberships_user_id_fkey` FK (user_id) → users(id)

**Enums:**
```
group_role: 'owner' | 'member'
```

---

### E-005: matches

**Descripción:** Una partida de Commander. Tiene 2–4 Participations y opcionalmente un MatchResult.

| Campo        | Tipo               | Nullable | Default             | Descripción                                           |
| ------------ | ------------------ | -------- | ------------------- | ----------------------------------------------------- |
| id           | uuid               | ❌       | `gen_random_uuid()` | PK                                                    |
| status       | match_status (enum)| ❌       | `'in_progress'`     | Estado del match (BR-MATCH state machine)             |
| group_id     | uuid               | ✅       | null                | FK → groups. Null = match personal                    |
| created_by   | uuid               | ❌       | —                   | FK → users. Quién creó el match                       |
| started_at   | timestamptz        | ❌       | `now()`             | Inicio del match                                      |
| ended_at     | timestamptz        | ✅       | null                | Fin del match (cuando status cambia de in_progress)   |

**Índices:**
- `matches_pkey` PRIMARY KEY (id)
- `matches_status_idx` (status)
- `matches_group_id_idx` (group_id)
- `matches_created_by_idx` (created_by)
- `matches_started_at_idx` (started_at) — ordenación historial

**Constraints:**
- `matches_group_id_fkey` FK (group_id) → groups(id)
- `matches_created_by_fkey` FK (created_by) → users(id)

**Enums:**
```
match_status: 'in_progress' | 'completed' | 'abandoned'
```

**Relaciones:**
- hasMany: Participation (2–4), MatchEvent
- hasOne: MatchResult (cuando completed)
- belongsTo (optional): Group

---

### E-006: match_events

**Descripción:** Log inmutable de eventos durante un match. Soporta Undo con `is_undone`.

| Campo               | Tipo                   | Nullable | Default             | Descripción                                           |
| ------------------- | ---------------------- | -------- | ------------------- | ----------------------------------------------------- |
| id                  | uuid                   | ❌       | `gen_random_uuid()` | PK                                                    |
| match_id            | uuid                   | ❌       | —                   | FK → matches                                          |
| participation_id    | uuid                   | ❌       | —                   | FK → participations. Jugador afectado                 |
| event_type          | match_event_type (enum)| ❌       | —                   | Tipo de evento                                        |
| delta               | integer                | ❌       | —                   | Cambio acumulado (positivo o negativo)                |
| previous_value      | integer                | ❌       | —                   | Valor antes del evento (para Undo, BR-TRACK-11)       |
| new_value           | integer                | ❌       | —                   | Valor después del evento                              |
| commander_id        | uuid                   | ✅       | null                | FK → commanders. Solo para event_type='commander_damage' (BR-TRACK-02) |
| is_undone           | boolean                | ❌       | `false`             | Marcado por Undo (BR-TRACK-11)                        |
| debounce_group_id   | uuid                   | ✅       | null                | Agrupa taps consecutivos (BR-TRACK-09)                |
| created_at          | timestamptz            | ❌       | `now()`             | Timestamp del evento                                  |

**Índices:**
- `match_events_pkey` PRIMARY KEY (id)
- `match_events_match_id_idx` (match_id)
- `match_events_participation_id_idx` (participation_id)
- `match_events_is_undone_idx` (is_undone) — queries de Undo filtran `= false`
- `match_events_debounce_group_id_idx` (debounce_group_id)

**Constraints:**
- `match_events_match_id_fkey` FK (match_id) → matches(id)
- `match_events_participation_id_fkey` FK (participation_id) → participations(id)
- `match_events_commander_id_fkey` FK (commander_id) → commanders(id)

**Enums:**
```
match_event_type: 'life_change' | 'poison_change' | 'commander_damage' | 'match_started' | 'match_ended'
```

---

### E-007: match_results

**Descripción:** Resultado final de un match. 1:1 con Match cuando status='completed'.

| Campo                    | Tipo                    | Nullable | Default | Descripción                                              |
| ------------------------ | ----------------------- | -------- | ------- | -------------------------------------------------------- |
| id                       | uuid                    | ❌       | `gen_random_uuid()` | PK                              |
| match_id                 | uuid                    | ❌       | —       | FK → matches. UNIQUE (1:1 con Match)                    |
| winner_participation_id  | uuid                    | ✅       | null    | FK → participations. Null si draw o abandoned (BR-MATCH-08) |
| win_condition            | win_condition (enum)    | ✅       | null    | Condición de victoria (BR-MATCH-09)                     |
| is_draw                  | boolean                 | ❌       | `false` | True si empate (BR-MATCH-08)                            |
| notes                    | text                    | ✅       | null    | Notas opcionales (futuro Fase 2)                        |

**Índices:**
- `match_results_pkey` PRIMARY KEY (id)
- `match_results_match_id_unique` UNIQUE (match_id)
- `match_results_winner_idx` (winner_participation_id)

**Constraints:**
- `match_results_match_id_fkey` FK (match_id) → matches(id)
- `match_results_winner_participation_id_fkey` FK (winner_participation_id) → participations(id)

**Enums:**
```
win_condition: 'combat_damage' | 'commander_damage' | 'infect' | 'combo' | 'mill' | 'scoop' | 'concede' | 'other'
```

---

### E-008: participations

**Descripción:** Instancia de un Player usando un Deck en un Match específico. Almacena estado en vivo.

| Campo              | Tipo               | Nullable | Default | Descripción                                               |
| ------------------ | ------------------ | -------- | ------- | --------------------------------------------------------- |
| id                 | uuid               | ❌       | `gen_random_uuid()` | PK                                    |
| match_id           | uuid               | ❌       | —       | FK → matches                                              |
| player_id          | uuid               | ❌       | —       | FK → players                                              |
| deck_id            | uuid               | ❌       | —       | FK → decks. UNIQUE per match (BR-MATCH-02)                |
| commander_id       | uuid               | ❌       | —       | FK → commanders. Commander en juego                       |
| commander_id_2     | uuid               | ✅       | null    | FK → commanders. Solo si partner                          |
| life_total         | integer            | ❌       | `40`    | Vida actual (BR-TRACK-01 — default configurable)          |
| poison_counters    | integer            | ❌       | `0`     | Poison counters (floor=0, BR-TRACK-06)                    |
| commander_damage   | jsonb              | ❌       | `'{}'`  | `{ commander_id: damage_amount }` (BR-TRACK-02)           |
| layout_position    | smallint           | ❌       | —       | Posición en el layout del tracker (0-3)                   |
| result             | participation_result (enum) | ✅ | null | Resultado al cerrar el match                        |

**Índices:**
- `participations_pkey` PRIMARY KEY (id)
- `participations_match_deck_unique` UNIQUE (match_id, deck_id) — BR-MATCH-02
- `participations_match_id_idx` (match_id)
- `participations_player_id_idx` (player_id) — queries de stats por jugador
- `participations_deck_id_idx` (deck_id) — queries de stats por deck

**Constraints:**
- `participations_match_id_fkey` FK (match_id) → matches(id)
- `participations_player_id_fkey` FK (player_id) → players(id)
- `participations_deck_id_fkey` FK (deck_id) → decks(id)
- `participations_commander_id_fkey` FK (commander_id) → commanders(id)
- `participations_commander_id_2_fkey` FK (commander_id_2) → commanders(id)
- `participations_poison_check` CHECK: `poison_counters >= 0` (BR-TRACK-06)

**Enums:**
```
participation_result: 'win' | 'lose' | 'draw'
(null = match in_progress o abandoned)
```

---

### E-009: players

**Descripción:** Perfil de jugador registrado. Puede pertenecer a un grupo o ser personal.

| Campo          | Tipo         | Nullable | Default             | Descripción                                           |
| -------------- | ------------ | -------- | ------------------- | ----------------------------------------------------- |
| id             | uuid         | ❌       | `gen_random_uuid()` | PK                                                    |
| name           | varchar(100) | ❌       | —                   | Nombre del jugador                                    |
| group_id       | uuid         | ✅       | null                | FK → groups. Null = jugador personal                  |
| owner_user_id  | uuid         | ❌       | —                   | FK → users. Quién creó el jugador                     |
| deleted_at     | timestamptz  | ✅       | null                | Soft delete (ADR-005, BR-ENTITY-03)                   |
| created_at     | timestamptz  | ❌       | `now()`             | —                                                     |
| updated_at     | timestamptz  | ❌       | `now()`             | —                                                     |

**Índices:**
- `players_pkey` PRIMARY KEY (id)
- `players_name_group_unique` UNIQUE (name, group_id) — BR-ENTITY-01
- `players_group_id_idx` (group_id)
- `players_owner_user_id_idx` (owner_user_id)
- `players_deleted_at_idx` (deleted_at)

**Constraints:**
- `players_group_id_fkey` FK (group_id) → groups(id)
- `players_owner_user_id_fkey` FK (owner_user_id) → users(id)

---

### E-010: users

**Descripción:** Cuenta de usuario autenticado.

| Campo        | Tipo               | Nullable | Default             | Descripción                                           |
| ------------ | ------------------ | -------- | ------------------- | ----------------------------------------------------- |
| id           | uuid               | ❌       | `gen_random_uuid()` | PK                                                    |
| email        | varchar(255)       | ❌       | —                   | Email único (BR-AUTH-05)                              |
| display_name | varchar(100)       | ❌       | —                   | Nombre visible en la app                              |
| avatar_url   | text               | ✅       | null                | URL de avatar (opcional)                              |
| provider     | auth_provider (enum)| ❌      | —                   | Auth provider usado en registro (BR-AUTH-05)          |
| created_at   | timestamptz        | ❌       | `now()`             | —                                                     |

**Índices:**
- `users_pkey` PRIMARY KEY (id)
- `users_email_unique` UNIQUE (email)

**Enums:**
```
auth_provider: 'email' | 'google' | 'apple' | 'magic_link'
```

**Notas:**
- La constraint `UNIQUE(email)` con provider diferente se maneja en aplicación (BR-AUTH-05): un email = un provider. No se permite auto-merge.

---

### E-011: user_settings

**Descripción:** Preferencias de usuario. 1:1 con User.

| Campo                  | Tipo              | Nullable | Default  | Descripción                                                    |
| ---------------------- | ----------------- | -------- | -------- | -------------------------------------------------------------- |
| id                     | uuid              | ❌       | `gen_random_uuid()` | PK                                                  |
| user_id                | uuid              | ❌       | —        | FK → users. UNIQUE (1:1)                                       |
| language               | varchar(10)       | ❌       | `'auto'` | `'en'` \| `'es'` \| `'auto'` (BR-I18N-01)                    |
| swipe_gestures_enabled | boolean           | ❌       | `true`   | Gestos swipe en tracker (BR-TRACK-08)                          |
| debounce_threshold_ms  | integer           | ❌       | `500`    | Debounce 200–2000ms (BR-TRACK-10)                              |
| require_commander      | boolean           | ❌       | `true`   | Commander obligatorio en creación de deck (BR-DECK-02)         |
| default_life_total     | integer           | ❌       | `40`     | Vida inicial por jugador (BR-TRACK-01)                         |
| premium                | boolean           | ❌       | `false`  | Premium ONE TIME activo — sin ads (BR-AUTH-04)                 |
| updated_at             | timestamptz       | ❌       | `now()`  | —                                                              |

**Índices:**
- `user_settings_pkey` PRIMARY KEY (id)
- `user_settings_user_id_unique` UNIQUE (user_id)

**Constraints:**
- `user_settings_user_id_fkey` FK (user_id) → users(id)
- `user_settings_debounce_check` CHECK: `debounce_threshold_ms BETWEEN 200 AND 2000` (BR-TRACK-10)

---

## Enums Completos

```sql
-- Auth provider
CREATE TYPE auth_provider AS ENUM ('email', 'google', 'apple', 'magic_link');

-- Group role
CREATE TYPE group_role AS ENUM ('owner', 'member');

-- Match status
CREATE TYPE match_status AS ENUM ('in_progress', 'completed', 'abandoned');

-- Match event type
CREATE TYPE match_event_type AS ENUM (
  'life_change', 'poison_change', 'commander_damage', 'match_started', 'match_ended'
);

-- Win condition
CREATE TYPE win_condition AS ENUM (
  'combat_damage', 'commander_damage', 'infect', 'combo', 'mill', 'scoop', 'concede', 'other'
);

-- Participation result
CREATE TYPE participation_result AS ENUM ('win', 'lose', 'draw');
```

---

## Soft Delete

| Tabla       | Campo        | Queries filtran           | Business Rule |
| ----------- | ------------ | ------------------------- | ------------- |
| players     | `deleted_at` | `WHERE deleted_at IS NULL` | BR-ENTITY-03 |
| decks       | `deleted_at` | `WHERE deleted_at IS NULL` | BR-DECK-07   |
| groups      | `archived_at` | `WHERE archived_at IS NULL` | BR-GROUP-04 |

---

## Queries Críticas de Stats (CALC-001)

### Win Rate de un jugador

```sql
SELECT
  p.id,
  p.name,
  COUNT(*) FILTER (WHERE pa.result = 'win') AS wins,
  COUNT(*) AS total_completed,
  ROUND(
    COUNT(*) FILTER (WHERE pa.result = 'win') * 100.0 / NULLIF(COUNT(*), 0),
    1
  ) AS win_rate_pct
FROM players p
JOIN participations pa ON pa.player_id = p.id
JOIN matches m ON m.id = pa.match_id
WHERE m.status = 'completed'   -- BR-STATS-01
  AND p.id = :player_id
GROUP BY p.id, p.name;
```

### Matches activos con un deck (para BR-MATCH-04)

```sql
SELECT m.id
FROM matches m
JOIN participations pa ON pa.match_id = m.id
WHERE m.status = 'in_progress'
  AND pa.deck_id = :deck_id;
```

### Historial con filtros (BR-STATS-08)

```sql
SELECT m.*, mr.win_condition, mr.is_draw
FROM matches m
LEFT JOIN match_results mr ON mr.match_id = m.id
WHERE m.status != 'in_progress'                     -- BR-MATCH-07
  AND (:player_id IS NULL OR EXISTS (
    SELECT 1 FROM participations pa
    WHERE pa.match_id = m.id AND pa.player_id = :player_id
  ))
  AND (:result IS NULL OR EXISTS (
    SELECT 1 FROM participations pa
    WHERE pa.match_id = m.id AND pa.result = :result
  ))
ORDER BY m.started_at DESC;
```

---

## Drizzle Schema Reference (TypeScript)

```typescript
// src/db/schema/index.ts — re-exports
export * from './commanders';
export * from './decks';
export * from './groups';
export * from './group-memberships';
export * from './matches';
export * from './match-events';
export * from './match-results';
export * from './participations';
export * from './players';
export * from './users';
export * from './user-settings';
```

```typescript
// src/db/schema/participations.ts (ejemplo)
import { pgTable, uuid, integer, jsonb, smallint, pgEnum } from 'drizzle-orm/pg-core';

export const participationResultEnum = pgEnum('participation_result', ['win', 'lose', 'draw']);

export const participations = pgTable('participations', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id').notNull().references(() => matches.id),
  playerId: uuid('player_id').notNull().references(() => players.id),
  deckId: uuid('deck_id').notNull().references(() => decks.id),
  commanderId: uuid('commander_id').notNull().references(() => commanders.id),
  commanderId2: uuid('commander_id_2').references(() => commanders.id),
  lifeTotal: integer('life_total').notNull().default(40),
  poisonCounters: integer('poison_counters').notNull().default(0),
  commanderDamage: jsonb('commander_damage').notNull().default({}),
  layoutPosition: smallint('layout_position').notNull(),
  result: participationResultEnum('result'),
});
```

---

## Migraciones

Convención: `YYYYMMDD_HHMMSS_descripcion.sql`

```
src/db/migrations/
├── 20260409_000001_initial_schema.sql   ← Todas las tablas del MVP
├── 20260409_000002_enums.sql            ← Enums declarados
└── ...
```

---

## Cross-Validation con Business Rules

| BR Rule        | Campo/Constraint en Schema                              | Status |
| -------------- | ------------------------------------------------------- | ------ |
| BR-MATCH-02    | `UNIQUE(match_id, deck_id)` en participations           | ✅     |
| BR-MATCH-08    | `winner_participation_id` nullable en match_results     | ✅     |
| BR-MATCH-09    | `win_condition` enum con 8 valores                      | ✅     |
| BR-DECK-03     | `decks_partner_check` constraint                        | ✅     |
| BR-DECK-07     | `deleted_at` en decks                                   | ✅     |
| BR-ENTITY-01   | `UNIQUE(name, group_id)` en players                     | ✅     |
| BR-ENTITY-03   | `deleted_at` en players                                 | ✅     |
| BR-ENTITY-05   | `commanders_colors_check` constraint                    | ✅     |
| BR-TRACK-02    | `commander_damage jsonb` keyed by commander_id          | ✅     |
| BR-TRACK-06    | `poison_counters >= 0` check constraint                 | ✅     |
| BR-TRACK-09    | `debounce_group_id` en match_events                     | ✅     |
| BR-TRACK-10    | `debounce_threshold_ms BETWEEN 200 AND 2000`            | ✅     |
| BR-TRACK-11    | `is_undone` + `previous_value` en match_events          | ✅     |
| BR-AUTH-04     | `premium boolean` en user_settings                      | ✅     |
| BR-AUTH-05     | `UNIQUE(email)` en users                                | ✅     |
| BR-GROUP-04    | `archived_at` en groups                                 | ✅     |
| BR-GROUP-05    | `invite_code UNIQUE` + `invite_expires_at` en groups    | ✅     |
| BR-STATS-09    | No cached fields de stats — calculados on-demand        | ✅     |

**Entity Reconciliation:** 11/11 entidades del Brief §4 cubiertas ✅

---

## Open Questions

| #     | Pregunta                                                                              | Impacto     | Owner   |
| ----- | ------------------------------------------------------------------------------------- | ----------- | ------- |
| OQ-01 | ¿`commander_damage` en Participation es source of truth o se recalcula desde MatchEvents? En el schema actual, ambos existen. | **Alto** | Dev |
| OQ-02 | ¿`life_total` en Participation es source of truth o se recalcula desde MatchEvents (CALC-003)? | **Alto** | Dev |
| OQ-03 | ¿Se necesita un índice adicional en `match_events(match_id, is_undone)` para la query de Undo? | Low | Dev |

---

## Assumptions

| #    | Supuesto                                                                              | Si es incorrecto                               |
| ---- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| A-01 | `Participation.life_total` y `commander_damage` son la fuente de verdad del estado en vivo. Los MatchEvents son el log histórico para Undo y trazabilidad. | Si se decide recalcular siempre desde events, eliminar los campos denormalizados de Participation. |
| A-02 | `commander_damage` en Participation es JSONB: `{ "commander-uuid": damage_int }`. Las keys son UUIDs de commanders. | Cambiar a tabla separada si se requieren queries complejas sobre daño. |
| A-03 | No existe tabla de sesiones de auth — se delega completamente al Auth provider elegido (ADR-003). | Si se requiere session management manual, agregar tabla `sessions`. |
| A-04 | `color_identity` en Deck se calcula en la aplicación al asignar commander(s) — no es un campo que el usuario edite directamente. | Agregar trigger de DB si se quiere auto-calcular en BD. |

---

_Generado por TimeKast Factory — /docs_
