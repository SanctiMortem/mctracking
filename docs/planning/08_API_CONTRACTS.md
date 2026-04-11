# 🔌 API Contracts — MTG Commander Tracker

> Generado desde Discovery Brief + 06_DATA_MODEL + 07_ARCHITECTURE por `/docs`
> **Fuente:** `docs/planning/00_DISCOVERY_BRIEF.md`, `docs/planning/07_ARCHITECTURE.md`
> **SSOT:** Este documento para contratos de API (Expo API Routes + Hono).
> **Versión:** 1.0 — 2026-04-09

> **Stack:** Expo API Routes con Hono handlers. Auth via Clerk JWT middleware. DB via Drizzle + Neon.
> **Base path:** `/api/v1/`
> **Auth:** Todas las rutas (excepto las marcadas `🟢 public`) requieren Clerk JWT válido en header `Authorization: Bearer <token>`.

---

## Resumen de Endpoints

| Módulo         | Endpoint                              | Método | Auth      | Refs         |
| -------------- | ------------------------------------- | ------ | --------- | ------------ |
| **Auth**       | `/auth/session`                       | GET    | 🟢 public | FT-016       |
| **Players**    | `/players`                            | GET    | 🔒        | FT-001, US-001 |
| **Players**    | `/players`                            | POST   | 🔒        | FT-001, US-001 |
| **Players**    | `/players/:id`                        | PATCH  | 🔒        | FT-001, US-002 |
| **Players**    | `/players/:id`                        | DELETE | 🔒        | FT-001, US-003 |
| **Commanders** | `/commanders`                         | GET    | 🔒        | FT-003       |
| **Commanders** | `/commanders`                         | POST   | 🔒        | FT-003, US-008 |
| **Commanders** | `/commanders/:id`                     | PATCH  | 🔒        | FT-003, US-009 |
| **Commanders** | `/commanders/:id`                     | DELETE | 🔒        | FT-003, US-009 |
| **Decks**      | `/decks`                              | GET    | 🔒        | FT-002       |
| **Decks**      | `/decks`                              | POST   | 🔒        | FT-002, US-004/005 |
| **Decks**      | `/decks/:id`                          | PATCH  | 🔒        | FT-002, US-006 |
| **Decks**      | `/decks/:id`                          | DELETE | 🔒        | FT-002, US-007 |
| **Matches**    | `/matches`                            | POST   | 🔒        | FT-004, US-010 |
| **Matches**    | `/matches/:id`                        | GET    | 🔒        | FT-007, US-021 |
| **Matches**    | `/matches/:id/close`                  | POST   | 🔒        | FT-006, US-016/017/018 |
| **Match Events** | `/matches/:id/events`               | POST   | 🔒        | FT-015, US-014 |
| **Match Events** | `/matches/:id/events/undo`          | POST   | 🔒        | FT-015, US-033 |
| **History**    | `/matches`                            | GET    | 🔒        | FT-007, US-019/020 |
| **Stats**      | `/stats/players/:id`                  | GET    | 🔒        | FT-008, US-022/023 |
| **Stats**      | `/stats/decks/:id`                    | GET    | 🔒        | FT-009, US-024 |
| **Stats**      | `/stats/commanders/:id`               | GET    | 🔒        | FT-010, US-025 |
| **Stats**      | `/stats/matchup`                      | GET    | 🔒        | FT-011, US-026/027 |
| **Stats**      | `/stats/global`                       | GET    | 🔒        | FT-012, US-028/029 |
| **Groups**     | `/groups`                             | GET    | 🔒        | FT-017, US-038 |
| **Groups**     | `/groups`                             | POST   | 🔒        | FT-017, US-038 |
| **Groups**     | `/groups/:id`                         | PATCH  | 🔒        | FT-017, BR-GROUP-04 |
| **Groups**     | `/groups/:id/invite`                  | POST   | 🔒        | FT-017, US-039 |
| **Groups**     | `/groups/join`                        | POST   | 🔒        | FT-017, US-040 |
| **Settings**   | `/settings`                           | GET    | 🔒        | FT-019       |
| **Settings**   | `/settings`                           | PATCH  | 🔒        | FT-019, US-042/043 |
| **Purchases**  | `/purchases/verify`                   | POST   | 🔒        | PLAT-012, BR-AUTH-04 |

---

## Patrones Comunes

### Estructura de Respuesta

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string, code: ErrorCode }
```

### Auth Middleware (Hono)

```typescript
// src/api/middleware/auth.ts
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';

app.use('*', clerkMiddleware());

app.use('/api/v1/*', async (c, next) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }
  await next();
});
```

### Validación con Zod

```typescript
import { z } from 'zod';

const schema = z.object({ name: z.string().min(1).max(100) });
const parsed = schema.safeParse(body);
if (!parsed.success) {
  return c.json({ success: false, error: 'Validation error', code: 'VALIDATION_ERROR',
    details: parsed.error.flatten() }, 400);
}
```

### Códigos de Error Globales

| Code | HTTP | Descripción |
|---|---|---|
| `UNAUTHORIZED` | 401 | Sin sesión válida o Clerk JWT expirado |
| `FORBIDDEN` | 403 | Sin permiso para el recurso (RBAC) |
| `VALIDATION_ERROR` | 400 | Input inválido (Zod) |
| `NOT_FOUND` | 404 | Recurso no existe |
| `CONFLICT` | 409 | Conflicto de estado (ej: deck en match activo) |
| `INTERNAL_ERROR` | 500 | Error inesperado del servidor |

---

## Módulo: Players

### GET /players

**Propósito:** Listar jugadores del contexto activo (personal o grupo).

**Query params:**

| Param | Tipo | Required | Descripción |
|---|---|---|---|
| `group_id` | uuid | ❌ | Filtrar por grupo. Si omitido, devuelve personales. |
| `include_deleted` | boolean | ❌ | Default false. Excluye soft-deleted. |

**Output:**
```typescript
{ success: true, data: Player[] }
// Player = { id, name, group_id, owner_user_id, created_at }
```

**Refs:** FT-001, E-009, BR-ENTITY-03

---

### POST /players

**Propósito:** Crear jugador nuevo.

**Input:**
```typescript
{
  name: string;       // 1–100 chars
  group_id?: string;  // UUID. Si omitido, jugador personal.
}
```

**Output:**
```typescript
{ success: true, data: Player }
```

**Errors:**

| Code | Razón |
|---|---|
| `PLAYER_NAME_DUPLICATE` | `UNIQUE(name, group_id)` violado (BR-ENTITY-01) |
| `FORBIDDEN` | El usuario no pertenece al grupo especificado |

**Refs:** US-001, BR-ENTITY-01, E-009

---

### PATCH /players/:id

**Propósito:** Editar nombre de jugador.

**Input:**
```typescript
{ name: string }  // 1–100 chars
```

**Errors:**

| Code | Razón |
|---|---|
| `PLAYER_NAME_DUPLICATE` | Nuevo nombre ya existe en el contexto |
| `NOT_FOUND` | Jugador no encontrado o soft-deleted |
| `FORBIDDEN` | El usuario no es owner ni miembro del grupo |

**Refs:** US-002, BR-ENTITY-01

---

### DELETE /players/:id

**Propósito:** Soft-delete o hard-delete de jugador según si tiene historial.

**Output:**
```typescript
{ success: true, data: { deleted: true, soft: boolean } }
```

**Errors:**

| Code | Razón |
|---|---|
| `PLAYER_IN_ACTIVE_MATCH_CANNOT_DELETE` | Jugador en match in_progress (BR-ENTITY-02) |
| `FORBIDDEN` | Sin permisos |

**Side Effects:** Si tiene Participations → `deleted_at = now()` (soft). Si no → DELETE físico. (BR-ENTITY-03)

**Refs:** US-003, BR-ENTITY-02, BR-ENTITY-03

---

## Módulo: Commanders

### GET /commanders

**Query params:** `group_id?` (uuid)

**Output:** `{ success: true, data: Commander[] }`

---

### POST /commanders

**Input:**
```typescript
{
  name: string;        // 1–200 chars
  colors: string[];    // subset de ['W','U','B','R','G','C']
  is_partner?: boolean; // default false
  group_id?: string;
}
```

**Errors:**

| Code | Razón |
|---|---|
| `COMMANDER_INVALID_COLOR` | Color fuera de WUBRG+C (BR-ENTITY-05) |
| `VALIDATION_ERROR` | Nombre vacío o colors inválido |

**Refs:** US-008, BR-ENTITY-05, E-001

---

### PATCH /commanders/:id

**Input:** `{ name?, colors?, is_partner? }` (partial)

**Refs:** US-009

---

### DELETE /commanders/:id

**Errors:**

| Code | Razón |
|---|---|
| `COMMANDER_IN_USE_CANNOT_DELETE` | Referenciado en decks activos (BR-ENTITY-04) |

**Refs:** US-009, BR-ENTITY-04

---

## Módulo: Decks

### GET /decks

**Query params:** `group_id?`, `include_deleted?` (boolean, default false)

**Output:** `{ success: true, data: Deck[] }`

---

### POST /decks

**Input:**
```typescript
{
  name: string;              // 1–100 chars
  description?: string;
  commander_id?: string;     // UUID. Requerido si require_commander=true en UserSettings
  commander_id_2?: string;   // UUID. Requerido si is_partner=true
  is_partner?: boolean;      // default false
  owner_player_id?: string;  // UUID. Opcional (BR-DECK-04)
  group_id?: string;
}
```

**Errors:**

| Code | Razón |
|---|---|
| `DECK_PARTNER_REQUIRES_TWO_COMMANDERS` | is_partner=true pero falta commander_id o commander_id_2 (BR-DECK-03) |
| `VALIDATION_ERROR` | commander_id requerido según UserSettings.require_commander (BR-DECK-02) |

**Side Effects:** `color_identity` calculado desde commander(s) y guardado.

**Refs:** US-004, US-005, BR-DECK-01/02/03, E-002

---

### PATCH /decks/:id

**Input:** `{ name?, description?, commander_id?, commander_id_2?, is_partner?, owner_player_id? }` (partial)

**Errors:**

| Code | Razón |
|---|---|
| `DECK_PARTNER_REQUIRES_TWO_COMMANDERS` | Cambio de partner sin ambos commanders |
| `NOT_FOUND` | Deck soft-deleted o inexistente |

**Refs:** US-006

---

### DELETE /decks/:id

**Errors:**

| Code | Razón |
|---|---|
| `DECK_IN_ACTIVE_MATCH_CANNOT_DELETE` | Deck en match in_progress (BR-DECK-08) |

**Side Effects:** Si tiene Participations → soft delete. Si no → hard delete. (BR-DECK-07)

**Refs:** US-007, BR-DECK-07, BR-DECK-08

---

## Módulo: Matches

### POST /matches

**Propósito:** Crear match + participations (Match Setup, P06).

**Input:**
```typescript
{
  group_id?: string;
  participants: Array<{
    player_id: string;
    deck_id: string;
    commander_id: string;
    commander_id_2?: string;  // si partner
    layout_position: number;  // 0-3
  }>;
}
```

**Output:**
```typescript
{
  success: true,
  data: {
    match: Match,
    participations: Participation[]
  }
}
```

**Errors:**

| Code | Razón |
|---|---|
| `MATCH_INVALID_PLAYER_COUNT` | < 2 o > 4 participantes (BR-MATCH-01) |
| `MATCH_DECK_DUPLICATE` | Mismo deck en 2+ participants (BR-MATCH-02) |
| `DECK_IN_ACTIVE_MATCH` | Deck ya en match in_progress (BR-MATCH-04) |

**Side Effects:** Crea `Match(status=in_progress)` + N `Participations(life_total=UserSettings.default_life_total)`.

**Refs:** US-010, US-011, US-012, BR-MATCH-01/02/03/04, E-005, E-008

---

### GET /matches/:id

**Propósito:** Detalle completo de un match (P10).

**Output:**
```typescript
{
  success: true,
  data: {
    match: Match,
    participations: Array<Participation & { player: Player, deck: Deck, commander: Commander }>,
    result?: MatchResult,
    events?: MatchEvent[]
  }
}
```

**Refs:** US-021, FT-007

---

### GET /matches (historial)

**Propósito:** Historial con filtros (P04).

**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `group_id` | uuid | Filtrar por grupo |
| `player_id` | uuid | Matches donde participó este jugador |
| `deck_id` | uuid | Matches donde se usó este deck |
| `commander_id` | uuid | Matches donde se usó este commander |
| `result` | string | `win` \| `lose` \| `draw` \| `abandoned` |
| `win_condition` | string | Enum de win conditions |
| `date_from` | ISO date | Rango de fecha inicio |
| `date_to` | ISO date | Rango de fecha fin |
| `limit` | number | Default 20 |
| `offset` | number | Default 0 (paginación) |

**Nota:** Excluye matches `in_progress` (BR-MATCH-07). Matches `abandoned` incluidos pero NO en stats.

**Refs:** US-019, US-020, BR-MATCH-07, BR-STATS-08

---

### POST /matches/:id/close

**Propósito:** Cerrar match con resultado (ganador, draw, o abandoned).

**Input:**
```typescript
// Opción A: Ganador
{
  type: 'winner';
  winner_participation_id: string;
  win_condition: WinCondition;  // enum
}

// Opción B: Draw
{
  type: 'draw';
}

// Opción C: Abandoned
{
  type: 'abandoned';
}
```

**Output:** `{ success: true, data: { match: Match, result: MatchResult } }`

**Side Effects:**
- `Match.status` → `'completed'` o `'abandoned'`
- `Match.ended_at` → `now()`
- Crea `MatchResult` (si winner o draw)
- Actualiza `Participation.result` para cada participant (win/lose/draw o null si abandoned) — en transacción atómica

**Errors:**

| Code | Razón |
|---|---|
| `NOT_FOUND` | Match no existe o no está in_progress |
| `FORBIDDEN` | Usuario no creó el match ni está en el grupo |
| `VALIDATION_ERROR` | win_condition inválido |

**Refs:** US-016, US-017, US-018, BR-MATCH-05/08/09/10, E-007

---

## Módulo: Match Events

### POST /matches/:id/events

**Propósito:** Registrar un cambio de estado durante el match (life, poison, commander damage).

**Input:**
```typescript
{
  participation_id: string;
  event_type: 'life_change' | 'poison_change' | 'commander_damage';
  delta: number;              // Negativo = daño, positivo = curación
  previous_value: number;     // Valor anterior (para Undo)
  new_value: number;          // Valor nuevo
  commander_id?: string;      // UUID. Requerido si event_type='commander_damage'
  debounce_group_id?: string; // UUID. Para agrupar taps consecutivos
}
```

**Output:** `{ success: true, data: MatchEvent }`

**Side Effects:**
- Crea `MatchEvent`
- Actualiza `Participation.life_total` / `poison_counters` / `commander_damage` en la DB

**Errors:**

| Code | Razón |
|---|---|
| `NOT_FOUND` | Match no in_progress |
| `VALIDATION_ERROR` | commander_id faltante para event_type='commander_damage' |

**Nota:** El cliente debe aplicar debounce (BR-TRACK-09) antes de llamar este endpoint. El endpoint recibe el evento ya agrupado.

**Refs:** US-014, US-030, US-032, BR-TRACK-02/06/09, E-006, E-008

---

### POST /matches/:id/events/undo

**Propósito:** Revertir el último MatchEvent no-undoneado.

**Input:** `{}` (sin body — el endpoint detecta el último evento automáticamente)

**Output:**
```typescript
{
  success: true,
  data: {
    undone_event: MatchEvent,     // is_undone = true
    restored_participation: Participation  // valores restaurados
  }
}
```

**Side Effects:**
- `MatchEvent.is_undone` → `true` para el último evento
- `Participation.[campo]` → restaurado a `previous_value`

**Errors:**

| Code | Razón |
|---|---|
| `NOT_FOUND` | No hay eventos para deshacer o match no in_progress |

**Refs:** US-033, BR-TRACK-11, E-006, E-008

---

## Módulo: Stats

> Todas las queries de stats filtran `WHERE match.status = 'completed'` (BR-STATS-01). Stats calculadas on-demand (BR-STATS-09).

### GET /stats/players/:id

**Output:**
```typescript
{
  success: true,
  data: {
    player: Player,
    total_matches: number,
    wins: number,
    losses: number,
    draws: number,
    win_rate_pct: number,         // CALC-001
    favorite_decks: Array<{ deck: Deck, matches: number, win_rate_pct: number }>,
    favorite_commanders: Array<{ commander: Commander, matches: number, win_rate_pct: number }>
  }
}
```

**Refs:** US-022, US-023, CALC-001, BR-STATS-01/02/03

---

### GET /stats/decks/:id

**Output:**
```typescript
{
  success: true,
  data: {
    deck: Deck & { commander: Commander, commander2?: Commander },
    total_matches: number,
    wins: number,
    win_rate_pct: number,
    players_used_by: Array<{ player: Player, matches: number, win_rate_pct: number }>
  }
}
```

**Refs:** US-024, CALC-001, BR-STATS-04

---

### GET /stats/commanders/:id

**Output:**
```typescript
{
  success: true,
  data: {
    commander: Commander,
    total_matches: number,
    wins: number,
    win_rate_pct: number,
    decks_using: Array<{ deck: Deck, matches: number }>,
    players_using: Array<{ player: Player, matches: number }>
  }
}
```

**Refs:** US-025, CALC-001, BR-STATS-05

---

### GET /stats/matchup

**Query params:**

| Param | Tipo | Required | Descripción |
|---|---|---|---|
| `entity_type` | string | ✅ | `'player'` \| `'deck'` \| `'commander'` |
| `entity_a_id` | uuid | ✅ | Primera entidad |
| `entity_b_id` | uuid | ✅ | Segunda entidad |
| `scope` | string | ❌ | `'all'` (default) \| `'1v1'` (N_players=2) |
| `group_id` | uuid | ❌ | Filtrar por grupo |

**Output:**
```typescript
{
  success: true,
  data: {
    entity_a: { id, name, wins: number },
    entity_b: { id, name, wins: number },
    draws: number,
    total_matches: number,
    scope: 'all' | '1v1'
  }
}
```

**Refs:** US-026, US-027, BR-STATS-06

---

### GET /stats/global

**Query params:** `group_id?`

**Output:**
```typescript
{
  success: true,
  data: {
    total_matches: number,
    total_players: number,
    player_rankings: Array<{
      player: Player, wins: number, win_rate_pct: number, rank: number
    }>,
    top_decks: Array<{ deck: Deck, win_rate_pct: number }>,
    top_commanders: Array<{ commander: Commander, win_rate_pct: number }>
  }
}
```

**Refs:** US-028, US-029, BR-STATS-07

---

## Módulo: Groups

### GET /groups

**Propósito:** Listar grupos a los que pertenece el usuario autenticado (owner o member).

**Output:**
```typescript
{
  success: true,
  data: Array<{
    group: Group,
    role: 'owner' | 'member'
  }>
}
```

**Notes:** Grupos con `archived_at IS NOT NULL` excluidos por defecto.

**Refs:** FT-017, US-038, PLAT-006, PLAT-010

---

### POST /groups

**Input:** `{ name: string }` (1–100 chars)

**Output:** `{ success: true, data: { group: Group, membership: GroupMembership } }`

**Side Effects:**
- Crea `Group` con `owner_id = clerk_user_id`
- Crea `GroupMembership(role='owner')`
- Genera `invite_code` único con `invite_expires_at`

**Refs:** US-038, BR-GROUP-01/04, E-003, E-004

---

### POST /groups/:id/invite

**Propósito:** Generar nuevo invite link (o regenerar si expiró).

**Output:** `{ success: true, data: { invite_code: string, invite_expires_at: string } }`

**Errors:**

| Code | Razón |
|---|---|
| `FORBIDDEN` | Solo Group Owner puede generar invite (P-004) |

**Refs:** US-039, BR-GROUP-05

---

### PATCH /groups/:id

**Propósito:** Archivar un grupo (soft-archive). No elimina el grupo ni su historial. (BR-GROUP-04)

**Input:** `{}` (sin body — la acción es siempre archivar)

**Output:** `{ success: true, data: { group: Group } }`

**Errors:**

| Code | Razón |
|---|---|
| `FORBIDDEN` | Solo el Group Owner puede archivar |
| `NOT_FOUND` | Grupo no existe |

**Side Effects:** Setea `Group.archived_at = now()`. El grupo deja de aparecer en `GET /groups` y no puede recibir nuevos miembros o matches.

**Refs:** BR-GROUP-04, PLAT-005

---

### POST /groups/join

**Input:** `{ invite_code: string }`

**Output:** `{ success: true, data: { group: Group, membership: GroupMembership } }`

**Side Effects:** Crea `GroupMembership(role='member')`.

**Errors:**

| Code | Razón |
|---|---|
| `GROUP_INVITE_EXPIRED` | invite_code expirado (BR-GROUP-05) |
| `NOT_FOUND` | invite_code no existe |
| `CONFLICT` | Usuario ya es miembro del grupo |

**Refs:** US-040, BR-GROUP-02/05

---

## Módulo: Settings

### GET /settings

**Output:** `{ success: true, data: UserSettings }`

---

### PATCH /settings

**Input:**
```typescript
{
  language?: 'en' | 'es' | 'auto';
  swipe_gestures_enabled?: boolean;
  debounce_threshold_ms?: number;    // 200–2000 (BR-TRACK-10)
  require_commander?: boolean;
  default_life_total?: integer;
  // NOTE: `premium` is NOT accepted here — use POST /purchases/verify (ADR-007)
}
```

**Errors:**

| Code | Razón |
|---|---|
| `SETTINGS_DEBOUNCE_OUT_OF_RANGE` | debounce_threshold_ms fuera de 200–2000 (BR-TRACK-10) |
| `SETTINGS_PREMIUM_FIELD_REJECTED` | El campo `premium` fue enviado en el body — usar `POST /purchases/verify` |

**Nota:** El campo `premium` es read-only en este endpoint. Solo se actualiza a `true` tras validación server-side de receipt IAP en `POST /purchases/verify`. (BR-AUTH-04, ADR-007)

**Refs:** US-042, US-043, BR-TRACK-08/10/12, BR-DECK-02, E-011

---

### POST /purchases/verify

> Valida un receipt IAP y activa el tier Premium si es válido. **ADR-007 ✅**

**Auth:** 🔒 Clerk session requerida

**Input:**
```typescript
{
  receipt: string;           // Raw receipt data del cliente (StoreKit 2 / Google Play Billing)
  product_id: 'premium_one_time';
  platform: 'ios' | 'android';
}
```

**Output:**
```typescript
{
  success: true;
  data: {
    premium: boolean;        // true si receipt válido y activado
  }
}
```

**Side Effects:** Si receipt válido → `UserSettings.premium = true` (server-side only)

**Errors:**

| Code | Razón |
|---|---|
| `RECEIPT_INVALID` | Receipt rechazado por App Store / Google Play |
| `RECEIPT_ALREADY_USED` | Receipt ya procesado para esta cuenta |
| `PRODUCT_NOT_RECOGNIZED` | `product_id` desconocido |

**Refs:** BR-AUTH-04, PLAT-012

---

## Open Questions

| #     | Pregunta                                                                              | Impacto     | Owner   | Estado |
| ----- | ------------------------------------------------------------------------------------- | ----------- | ------- | ------ |
| OQ-01 | ¿La validación de receipt IAP (Premium) se hace en `/settings PATCH` o en un endpoint `/purchases/verify` separado? | **Alto** | Dev | 🟢 Resuelta — `POST /purchases/verify` separado (ADR-007) |
| OQ-02 | ¿Paginación en `/matches` (historial) es por cursor o por offset? El schema actual usa offset. | Med | Dev | 🟢 Resuelta — Cursor (ADR-008) |
| OQ-03 | ¿El endpoint de Undo devuelve el match completo actualizado o solo el evento undone + participation? | Low | Dev | 🔴 Abierta |

---

## Assumptions

| #    | Supuesto                                                                              | Si es incorrecto                               |
| ---- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| A-01 | El cliente RN aplica el debounce antes de llamar a `POST /matches/:id/events`. El servidor recibe el evento ya agrupado con `debounce_group_id`. | Si se quiere debounce server-side, rediseñar el endpoint. |
| A-02 | Stats se calculan en el endpoint (on-demand). No hay tabla pre-calculada. Latencia aceptada en MVP (BR-STATS-09). | Si performance es problema, agregar Materialized View en Neon. |
| A-03 | Todas las rutas retornan `{ success: true/false, data/error }`. No se usan HTTP status codes como único indicador de éxito. | Ajustar si el cliente prefiere status codes puros. |
| A-04 | La capa de RBAC (group scoping) se implementa con Clerk JWT + RLS en Neon — el `user_id` del token determina qué datos puede ver el usuario. | Si RLS no cubre todos los casos, agregar filtros explícitos en cada query. |

---

_Generado por TimeKast Factory — /docs_
