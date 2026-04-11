# 📋 Discovery Brief — MTG Commander Tracker

> **Version:** 1.0 (Final — Challenge Pass aprobado)
> **Source:** Freeze Map v2.0 + Deep-Dive v1.0 (20/20 features)
> **Date:** 2026-04-09
> **Status:** ✅ Completo — Discovery cerrado

---

## 📦 Source Package

| # | Documento | Clasificación | Decisiones Clave | Ubicación |
|---|-----------|---------------|-----------------|-----------|
| 1 | User Request (17 secciones) | Source of Truth | Modelo de datos, scope MVP, pantallas, features, reglas de negocio | Proporcionado por usuario |
| 2 | Gap Interview Responses | Source of Truth | Stack, auth, plataforma, UX, branding, i18n, distribución | Proporcionado por usuario |

---

## §1 Idea General

### Pitch

**MTG Commander Tracker** es una app móvil para iOS y Android que sirve como doble propósito: **gameplay tracker en vivo** para partidas de Commander (Magic: The Gathering) y **stats engine histórico** que permite a grupos de amigos analizar su desempeño a lo largo del tiempo.

El problema que resuelve: en partidas de Commander (2-4 jugadores), seguir la pista de life totals, commander damage por oponente, poison counters, y al mismo tiempo mantener un historial preciso de quién ganó, con qué deck y bajo qué condición, requiere una herramienta dedicada. Los grupos de amigos usan papeles, apps genéricas de contador de vida, o simplemente no llevan registro histórico.

### Qué es / Qué NO es

| ✅ ES | ❌ NO ES |
|-------|----------|
| Tracker de vida en vivo para Commander (2-4 jugadores) | Editor de decklists (no hay subida de cartas) |
| Stats engine histórico (win rate, matchup, etc.) | App de torneos o competitiva |
| Repositorio de decks y commanders (metadata) | Integración con Scryfall/Moxfield en MVP |
| App de grupos de amigos (shared DB) | Modo multijugador en tiempo real simultáneo |
| App bilingüe EN/ES | Modo tablet dedicado |
| App con modo guest para tracking básico | Sincronización en tiempo real entre múltiples dispositivos |

### North Star

Un grupo de amigos puede abrir la app al inicio de una partida, registrar el match en segundos, trackear vida y daño durante la partida, cerrar el resultado con un tap, y ver sus stats históricas al terminar — todo en un solo dispositivo, sin fricción.

### Principios de Producto

- **Calidad sobre velocidad:** Sin deadline. La calidad siempre tiene prioridad sobre la velocidad de entrega. (F35)
- **Zero fricción en el tracker:** El tracker en vivo es la función más usada — debe ser rápido, confiable, y no interrumpir el flujo de juego.
- **Honesto con el resultado:** El resultado de un match es siempre selección manual del usuario. La app nunca asigna resultados automáticamente. (F40)
- **Un dispositivo, toda la mesa:** El tracker está diseñado para operar en un solo dispositivo compartido en la mesa. (F29)

### Stack y Distribución

| Atributo | Valor |
|----------|-------|
| **Stack** | React Native + Neon (PostgreSQL serverless) |
| **Distribución** | App Store (iOS) + Play Store (Android) |
| **Modelo de datos** | Cloud individual con grupos de amigos compartidos |
| **Deadline** | Sin deadline — calidad sobre velocidad |

### Monetización

- **Free tier:** Acceso completo a todas las features con anuncios (Ads).
- **Premium ONE TIME:** Compra única para eliminar anuncios permanentemente.
- La monetización no gatea ninguna feature funcional — solo los anuncios.

---

## §2 Usuarios y Roles

### Modos de Acceso

| Modo | Descripción | Features disponibles | Persistencia |
|------|-------------|---------------------|--------------|
| **Guest / Local** | Sin login | Match tracking básico: life, poison, commander damage en vivo | Ninguna — datos solo en sesión |
| **Authenticated** | Con cuenta | Todas las features: decks, historial, stats, grupos, sync cloud | Cloud (Neon) |

> **F45:** El modo Guest existe para el uso más básico (sentar a 4 personas y empezar a trackear vida). No requiere setup previo. Para todo lo demás se requiere login.

### Roles por Contexto

#### Contexto Individual (cuenta propia)

| Rol | Descripción | Capacidades |
|-----|-------------|-------------|
| **Guest** | Usuario sin cuenta | Tracking básico sin persistencia. No puede crear decks, ver historial ni stats. |
| **User** | Usuario autenticado | Acceso completo. Crea jugadores, decks, matches. Ve historial y stats propias. |

#### Contexto de Grupo

| Rol | Descripción | Capacidades |
|-----|-------------|-------------|
| **Group Owner** | Creador del grupo | Crea grupo, invita miembros, puede eliminar/archivar grupo. Acceso completo a la base de datos compartida. |
| **Group Member** | Miembro invitado | Acceso completo a la base de datos del grupo. No puede eliminar el grupo. |

> **F46:** Un usuario puede pertenecer a múltiples grupos simultáneamente. Sin límite de grupos en MVP. Cuando se crea un match dentro de un grupo, los recursos (decks, jugadores) son del grupo activo seleccionado.

### Auth Providers

| Provider | Tipo |
|----------|------|
| Email / Password | Registro manual |
| Google | OAuth |
| Apple | OAuth |
| Magic Link | Email link sin contraseña |

> **F26:** Todas las opciones disponibles desde el inicio.

### Permisos por Acción

| Acción | Guest | User | Group Member | Group Owner |
|--------|-------|------|--------------|-------------|
| Match tracking básico (vida, poison, cmd damage) | ✅ | ✅ | ✅ | ✅ |
| Crear/editar jugadores | ❌ | ✅ (personal) | ✅ (grupo) | ✅ (grupo) |
| Crear/editar decks | ❌ | ✅ (personal) | ✅ (grupo) | ✅ (grupo) |
| Crear/editar commanders | ❌ | ✅ (personal) | ✅ (grupo) | ✅ (grupo) |
| Crear match (con decks registrados) | ❌ | ✅ | ✅ | ✅ |
| Ver historial de matches | ❌ | ✅ | ✅ | ✅ |
| Ver stats | ❌ | ✅ | ✅ | ✅ |
| Invitar miembros al grupo | ❌ | ❌ | ❌ | ✅ |
| Eliminar/archivar grupo | ❌ | ❌ | ❌ | ✅ |
| Cambiar settings | ❌ | ✅ | ✅ | ✅ |

---

## §3 Funcionalidades Core

### Feature List — MVP (20 features)

| # | Feature ID | Nombre | Complexity | Fase | Batch |
|---|-----------|--------|------------|------|-------|
| 1 | FT-001 | CRUD Jugadores | S | MVP | 1 |
| 2 | FT-002 | CRUD Decks | M | MVP | 1 |
| 3 | FT-003 | CRUD Commanders | S | MVP | 1 |
| 4 | FT-004 | Match Setup (2/3/4 jugadores) | M | MVP | 1 |
| 5 | FT-006 | Cierre de Match + Win Conditions | M | MVP | 1 |
| 6 | FT-005 | Match Tracker en vivo | XL | MVP | 2 |
| 7 | FT-007 | Historial de Matches | M | MVP | 2 |
| 8 | FT-013 | Commander Damage Tracking | M | MVP | 2 |
| 9 | FT-014 | Poison Counter Tracking | S | MVP | 2 |
| 10 | FT-015 | Match Event Log + Undo | L | MVP | 2 |
| 11 | FT-008 | Stats por Jugador | M | MVP | 3 |
| 12 | FT-009 | Stats por Deck | M | MVP | 3 |
| 13 | FT-010 | Stats por Commander | M | MVP | 3 |
| 14 | FT-011 | Matchup Stats | L | MVP | 3 |
| 15 | FT-012 | Stats Dashboard Global | L | MVP | 3 |
| 16 | FT-016 | Auth System (multi-provider) | L | MVP | 4 |
| 17 | FT-017 | Friend Groups (shared DB) | L | MVP | 4 |
| 18 | FT-018 | i18n (EN/ES) | M | MVP | 4 |
| 19 | FT-019 | Settings (gestures, layout, prefs) | M | MVP | 4 |
| 20 | FT-020 | Home / Navigation | M | MVP | 4 |

### Feature List — Fase 2 (post-MVP, catalogada)

| Feature ID | Nombre | Complexity |
|-----------|--------|------------|
| FT-015-F2 | Mana Pool Tracking | M |
| FT-016-F2 | Orden de eliminación | S |
| FT-017-F2 | Notas por match | S |
| FT-018-F2 | Filtros avanzados en Stats | M |
| FT-019-F2 | Gráficas de win rate | M |

### Scope Boundaries

**Incluido en MVP:**
- Tracking en vivo: life total, commander damage (por oponente individual, F12), poison counters
- CRUD completo de jugadores, decks (nombre + commander + descripción, sin cartas), commanders
- Match setup validado (2-4 jugadores, no decks repetidos, F9)
- Partner commanders (toggle al crear deck, 2 commanders obligatorios si partner activado, F38)
- Cierre de match: ganador manual, win condition, draw, abandoned (F40)
- Event log con debounce + Undo ilimitado (F32, F33)
- Historial con filtros completos (jugador, deck, commander, fecha, resultado, win condition, F41)
- Stats: por jugador, deck, commander, matchup (con filtro 1v1 vs todos, F44), dashboard global
- Auth multi-provider + modo guest (F26, F45)
- Friend groups, múltiples grupos por usuario (F17, F46)
- i18n EN/ES, términos MTG en inglés siempre (F27)
- Settings configurables: swipe, debounce, commander obligatorio, life inicial, idioma (F31, F43, F37)
- Ads + Premium one-time para quitar ads (F36)

**Excluido del MVP:**
- Subida/edición de decklists (listas de cartas)
- Integración con Scryfall / Moxfield / Archidekt (F3)
- Sincronización multiusuario en tiempo real (F2 / F3)
- Importación de decklists (F3)
- Mana pool tracking (F2)
- Orden de eliminación, notas por match (F2)
- Ranking ELO, heatmaps de commanders (futuro)
- Modo tablet, compartir partida en vivo (futuro)
- Export CSV/Excel (futuro)

---

## §4 Modelo de Datos

### Entidades Principales

| # | Entidad | Descripción | CRUD | Relaciones clave |
|---|---------|-------------|------|-----------------|
| E1 | **User** | Cuenta de usuario autenticado | C/R/U | owner de Group, tiene UserSettings |
| E2 | **Player** | Perfil de jugador (puede no ser el mismo que User) | C/R/U/D* | scoped a Group/User, participa en Matches |
| E3 | **Commander** | Carta commander con nombre + colores + is_partner | C/R/U/D* | referenciado por Deck, Participation |
| E4 | **Deck** | Deck registrado: nombre + commander(s) + descripción | C/R/U/D* | tiene commander(s), owner Player opcional, usado en Participations |
| E5 | **Match** | Partida: estado, timestamps, resultado | C/R/U | tiene 2-4 Participations, 1 MatchResult |
| E6 | **Participation** | Jugador-en-match: estado vivo durante la partida | C/R/U | une Match + Player + Deck + Commander |
| E7 | **MatchResult** | Resultado final del match | C/R | vincula Match con ganador y win condition |
| E8 | **MatchEvent** | Log de eventos con debounce (elevado a MVP) | C/R | scoped a Match, vincula Participation |
| E9 | **Group** | Grupo de amigos: base de datos compartida | C/R/U/D | tiene GroupMemberships, scopa todos los resources |
| E10 | **GroupMembership** | Relación User-Group con rol | C/R/D | une User + Group |
| E11 | **UserSettings** | Preferencias de usuario | C/R/U | scoped a User |

> *D = soft delete (los registros con historial no se eliminan físicamente)

### Schemas Detallados

#### User
```
User {
  id: uuid PK
  email: string UNIQUE
  display_name: string
  avatar_url: string?
  provider: enum ('email' | 'google' | 'apple' | 'magic_link')
  created_at: timestamp
}
```

#### Player
```
Player {
  id: uuid PK
  name: string
  group_id: uuid FK → Group (nullable para uso personal)
  owner_user_id: uuid FK → User
  created_at: timestamp
  updated_at: timestamp
  deleted_at: timestamp? (soft delete)
  UNIQUE(name, group_id)
}
```

#### Commander
```
Commander {
  id: uuid PK
  name: string
  colors: string[]  -- subset de ['W','U','B','R','G','C']
  is_partner: boolean DEFAULT false
  scryfall_id: string?  -- para F3
  group_id: uuid FK → Group (nullable)
  created_at: timestamp
}
```

#### Deck
```
Deck {
  id: uuid PK
  name: string
  description: string?
  commander_id: uuid FK → Commander (nullable si setting permite)
  commander_id_2: uuid FK → Commander?  -- solo si is_partner = true
  is_partner: boolean DEFAULT false
  owner_player_id: uuid FK → Player (nullable, F20)
  color_identity: string[]  -- auto-derivada del/los commanders
  group_id: uuid FK → Group (nullable)
  created_at: timestamp
  deleted_at: timestamp?
  CONSTRAINT: si is_partner = true → commander_id AND commander_id_2 NOT NULL
}
```

#### Match
```
Match {
  id: uuid PK
  status: enum ('in_progress' | 'completed' | 'abandoned')
  group_id: uuid FK → Group (nullable)
  created_by: uuid FK → User
  started_at: timestamp
  ended_at: timestamp?
}
```

#### Participation
```
Participation {
  id: uuid PK
  match_id: uuid FK → Match
  player_id: uuid FK → Player
  deck_id: uuid FK → Deck
  commander_id: uuid FK → Commander
  commander_id_2: uuid FK → Commander?  -- si partner
  life_total: integer DEFAULT 40
  poison_counters: integer DEFAULT 0
  commander_damage: jsonb  -- { commander_id: damage_amount }
                           -- clave = commander_id del oponente (individual, F42)
  layout_position: integer (0-3)
  result: enum ('win' | 'lose' | 'draw') nullable
  UNIQUE(match_id, deck_id)  -- F7
}
```

#### MatchResult
```
MatchResult {
  id: uuid PK
  match_id: uuid FK → Match UNIQUE
  winner_participation_id: uuid FK → Participation? (null si draw o abandoned)
  win_condition: enum (
    'combat_damage' | 'commander_damage' | 'infect' | 'combo' |
    'mill' | 'scoop' | 'concede' | 'other'
  )?
  is_draw: boolean DEFAULT false
  notes: string?
}
```

#### MatchEvent
```
MatchEvent {
  id: uuid PK
  match_id: uuid FK → Match
  participation_id: uuid FK → Participation
  event_type: enum ('life_change' | 'poison_change' | 'commander_damage' | 'match_started' | 'match_ended')
  delta: integer
  previous_value: integer
  new_value: integer
  commander_id: uuid FK → Commander?  -- para commander_damage events (F42)
  is_undone: boolean DEFAULT false
  debounce_group_id: uuid?  -- agrupa taps consecutivos (F32)
  created_at: timestamp
}
```

#### Group + GroupMembership
```
Group {
  id: uuid PK
  name: string
  owner_id: uuid FK → User
  invite_code: string UNIQUE
  created_at: timestamp
  archived_at: timestamp?
}

GroupMembership {
  id: uuid PK
  group_id: uuid FK → Group
  user_id: uuid FK → User
  role: enum ('owner' | 'member')
  joined_at: timestamp
  UNIQUE(group_id, user_id)
}
```

#### UserSettings
```
UserSettings {
  id: uuid PK
  user_id: uuid FK → User UNIQUE
  language: enum ('en' | 'es' | 'auto') DEFAULT 'auto'
  swipe_gestures_enabled: boolean DEFAULT true
  debounce_threshold_ms: integer DEFAULT 500 CHECK (200 <= value <= 2000)
  require_commander: boolean DEFAULT true
  default_life_total: integer DEFAULT 40
  updated_at: timestamp
}
```

### Diagrama de Relaciones (texto)

```
User ──────────────────── owns ──► Group
  │                                  │
  ├── has ──► UserSettings            ├── has many ──► GroupMembership ◄── User
  │                                  │
  └── creates ──► Match              └── scopes ──► Player, Deck, Commander, Match
                    │
                    ├── has 2-4 ──► Participation
                    │                    ├── Player
                    │                    ├── Deck ──► Commander (1 o 2 si partner)
                    │                    └── Commander (commander en juego)
                    │
                    ├── has 1 ──► MatchResult
                    └── has many ──► MatchEvent
```

### Reglas de Integridad

| Regla | Descripción | Fuente |
|-------|-------------|--------|
| BR-01 | unique(match_id, deck_id) en Participation | F7 |
| BR-02 | 2 ≤ N participaciones por match ≤ 4 | F4 / F9 |
| BR-03 | Deck no puede estar en 2 matches activos simultáneamente | F39 |
| BR-04 | Si Deck.is_partner = true → commander_id Y commander_id_2 NOT NULL | F38 |
| BR-05 | commander_damage keyed por commander_id (no por player) — tracking individual | F42 |
| BR-06 | Soft delete en Player/Deck si tienen Participations históricas | F deep-dive |
| BR-07 | Matches 'abandoned' excluidos de cálculo de stats | F deep-dive |
| BR-08 | Result siempre asignado manualmente — nunca automático por la app | F40 |

---

## Drift Guard — Pass 1

- [x] No cambié stakeholder principal
- [x] No reinterpreté deadlines (no hay deadline — F35 verbatim)
- [x] No alteré alcance MVP (20 features, igual al freeze-map)
- [x] No convertí reference/legacy en source of truth
- [x] No agregué decisiones nuevas como si fueran firmes
- [x] No promoví recomendaciones a decisiones cerradas
- [x] No inventé business rules que no estén en el source

**Drift Guard Pass 1: ✅ clean**

---

---

## §5 Integraciones

### APIs Externas en MVP

| # | Proveedor | Propósito | Frecuencia | Rol | Notas |
|---|-----------|-----------|-----------|-----|-------|
| I1 | **Neon (PostgreSQL serverless)** | Base de datos principal — toda la persistencia | Cada operación CRUD, sync | Core infra | Sin alternativa en MVP |
| I2 | **Google OAuth** | Auth provider | On login/register | Opcional para el usuario | Provider de F26 |
| I3 | **Apple Sign In** | Auth provider (obligatorio en App Store si se ofrece auth social) | On login/register | Obligatorio si se usa Google OAuth en iOS | Provider de F26 |
| I4 | **Magic Link (email)** | Auth sin contraseña | On login/register | Opcional para el usuario | Provider de F26 |
| I5 | **Ad Network (TBD)** | Monetización: anuncios en modo Free | On screen load / interstitial | Solo Free tier | Red específica a definir en /docs |
| I6 | **Apple IAP** | Compra única Premium (iOS) | One-time purchase | Premium tier | Elimina ads |
| I7 | **Google Play Billing** | Compra única Premium (Android) | One-time purchase | Premium tier | Elimina ads |

### Integraciones Diferidas (Fase 3)

| # | Proveedor | Propósito | Fuente |
|---|-----------|-----------|--------|
| D1 | Scryfall API | Importar commanders y cartas automáticamente | F18 — Fase 3 |
| D2 | Moxfield / Archidekt | Importar decklists | F18 — Fase 3 |

### Reglas de Integración

- **Auth:** Si un email ya está registrado con un provider diferente → mostrar error y sugerir el provider original. No auto-merge de cuentas en MVP.
- **IAP:** La compra Premium está gestionada por Apple/Google. La app solo verifica el receipt y actualiza `UserSettings { premium: true }`. La verificación se hace server-side (Neon backend).
- **Ads:** Los ads solo se muestran a usuarios Free (no Premium). La condición se verifica en cada sesión contra `UserSettings`.
- **Offline:** En modo offline, el tracker en vivo funciona con estado local. La sincronización ocurre cuando se recupera conexión. No hay resolución de conflictos compleja en MVP (último en guardar gana, BR-GROUP-03).

---

## §6 Reglas de Negocio

### BR-MATCH — Match Lifecycle

| ID | Invariante | Reversibilidad |
|----|-----------|----------------|
| BR-MATCH-01 | Cada match debe tener entre 2 y 4 jugadores (Participations). Fuera de ese rango: bloquear inicio. | Low |
| BR-MATCH-02 | Un deck no puede repetirse dentro del mismo match: `UNIQUE(match_id, deck_id)`. | Low |
| BR-MATCH-03 | Validación completa al iniciar match: N jugadores ∈ [2,4], ningún deck repetido, cada jugador con deck asignado. Si falla cualquier condición → bloquear. | Low |
| BR-MATCH-04 | Un deck no puede participar en dos matches con status `in_progress` simultáneamente. | Low |
| BR-MATCH-05 | El resultado de un match es SIEMPRE selección manual del usuario. La app nunca asigna resultado automáticamente. | Low |
| BR-MATCH-06 | Matches con status `abandoned` aparecen en el historial pero NO se computan en ninguna stat. | Med |
| BR-MATCH-07 | Matches con status `in_progress` no aparecen en el historial de matches. | Low |
| BR-MATCH-08 | Draw: `winner_participation_id = null`, `is_draw = true`, todos los Participations con `result = 'draw'`. | Low |
| BR-MATCH-09 | Win conditions válidas (enum): `combat_damage`, `commander_damage`, `infect`, `combo`, `mill`, `scoop`, `concede`, `other`. | Med |
| BR-MATCH-10 | Al cerrar match como `abandoned`, ningún participation recibe result (queda `null`). | Low |

**State Machine — Match Status:**
```
[CREATED] ──── setup completo ──────► [in_progress]
                                            │
                          ┌─────────────────┼─────────────────┐
                          ▼                 ▼                  ▼
                     [completed]       [abandoned]        (en curso)
                   (ganador/draw)    (sin resultado)    ← undo posible
```

### BR-DECK — Deck Rules

| ID | Invariante | Reversibilidad |
|----|-----------|----------------|
| BR-DECK-01 | Los campos de creación de deck son: nombre, commander (configurablemente obligatorio), descripción básica. No hay lista de cartas. | Low |
| BR-DECK-02 | La obligatoriedad del commander al crear deck es configurable en Settings (`require_commander`). Default: true. | High |
| BR-DECK-03 | Si `is_partner = true` al crear deck → ambos `commander_id` y `commander_id_2` son obligatorios. Con uno solo: bloquear. | Low |
| BR-DECK-04 | El owner de un deck es opcional. Un deck puede no tener propietario. | High |
| BR-DECK-05 | Un deck puede ser usado por diferentes jugadores en distintos matches (no exclusividad de uso). | Low |
| BR-DECK-06 | Un deck no puede estar en dos matches activos (`in_progress`) simultáneamente. | Low |
| BR-DECK-07 | Si un deck tiene Participations históricas → soft delete únicamente (no borrado físico). | Low |
| BR-DECK-08 | No se puede eliminar un deck que está en un match `in_progress`. | Low |

### BR-TRACK — Tracker Rules

| ID | Invariante | Reversibilidad |
|----|-----------|----------------|
| BR-TRACK-01 | Life total inicial por participante = 40 (default configurable en Settings, `default_life_total`). | High |
| BR-TRACK-02 | Commander damage se trackea por `commander_id` (no por `player_id`). Cada commander tiene su propio contador de daño. | Low |
| BR-TRACK-03 | Con partner commanders: Commander A y Commander B tienen contadores de daño independientes. 21 desde cualquiera de los dos activa la condición de pérdida de forma separada. | Low |
| BR-TRACK-04 | 21 commander damage desde un único commander → alerta visual únicamente. Sin acción automática de la app. | Low |
| BR-TRACK-05 | 10 poison counters → alerta visual únicamente. Sin acción automática de la app. | Low |
| BR-TRACK-06 | Poison counters: floor en 0 (no pueden ir negativos). Sin cap superior. | Low |
| BR-TRACK-07 | El tracker opera en un único dispositivo físico en la mesa. Layout dividido en 2/3/4 secciones según número de jugadores. | Low |
| BR-TRACK-08 | Gestos swipe: activables/desactivables por el usuario en Settings (`swipe_gestures_enabled`). | High |
| BR-TRACK-09 | Debounce: taps consecutivos dentro del threshold → agrupados como un único MatchEvent con delta acumulado (`debounce_group_id`). | High |
| BR-TRACK-10 | Threshold de debounce configurable en Settings (`debounce_threshold_ms`). Rango válido: 200ms – 2000ms. Default: 500ms. | High |
| BR-TRACK-11 | Undo: revierte el último MatchEvent no-undoneado. Ilimitado hacia atrás. Undo = `is_undone: true` + restaurar `previous_value` en la Participation. | Med |
| BR-TRACK-12 | Cambios en Settings se aplican únicamente a matches nuevos. Un match en curso no se ve afectado por cambios de Settings durante la partida. | Low |
| BR-TRACK-13 | Layout de cada sección del tracker es rotatable individualmente por jugador (F30). | High |

**State Machine — Participation durante el Match:**
```
[initial: life=40, poison=0, cmd_dmg={}]
          │
          ├── tap +/- life ──► debounce ──► MatchEvent (life_change) ──► life_total updated
          ├── tap poison ────► debounce ──► MatchEvent (poison_change) ──► poison updated
          ├── tap cmd dmg ───► debounce ──► MatchEvent (commander_damage) ──► cmd_dmg[commander_id] updated
          └── undo ──────────────────────► last event is_undone=true ──► previous_value restored
```

### BR-STATS — Stats Engine

| ID | Invariante | Reversibilidad |
|----|-----------|----------------|
| BR-STATS-01 | Solo matches con status `completed` se computan en todas las stats. | Low |
| BR-STATS-02 | Win rate = `wins / total_completed_matches × 100`. Draws cuentan como no-win. | Low |
| BR-STATS-03 | Matches `abandoned` excluidos de todas las stats. | Low |
| BR-STATS-04 | Stats de un deck son del deck como entidad — independiente del jugador que lo piloteó en cada match. | Low |
| BR-STATS-05 | Stats de commander con partners: cada partner acumula stats de forma independiente (consistente con BR-TRACK-03). | Low |
| BR-STATS-06 | Matchup stats: filtro de scope seleccionable por el usuario: "Solo 1v1" (N_players=2) vs "Todos" (cualquier match donde ambos participaron). | High |
| BR-STATS-07 | En empate de ranking (ej: dos jugadores con mismo win rate): mostrar todos los empatados. | Med |
| BR-STATS-08 | Historial filtros disponibles: jugador, deck, commander, fecha (rango), resultado (`win`/`lose`/`draw`/`abandoned`), win condition. | High |
| BR-STATS-09 | Stats calculadas on-demand en MVP (sin cache). | Med |

### BR-AUTH — Auth y Acceso

| ID | Invariante | Reversibilidad |
|----|-----------|----------------|
| BR-AUTH-01 | Modo Guest: tracking básico en vivo (life, poison, commander damage) sin persistencia. Datos no se guardan al cerrar la sesión. | Low |
| BR-AUTH-02 | Login requerido para: crear decks registrados, ver historial, ver stats, unirse a grupos, sync cloud. | Low |
| BR-AUTH-03 | Free tier: acceso completo a todas las features funcionales + anuncios. | Low |
| BR-AUTH-04 | Premium ONE TIME: pago único que elimina anuncios permanentemente. No gatea ninguna feature funcional. | Low |
| BR-AUTH-05 | Si el mismo email está registrado con un provider diferente → error + sugerir provider original. No auto-merge. | Low |

### BR-GROUP — Friend Groups

| ID | Invariante | Reversibilidad |
|----|-----------|----------------|
| BR-GROUP-01 | Un usuario puede pertenecer a múltiples grupos simultáneamente. Sin límite de grupos en MVP. | High |
| BR-GROUP-02 | Al salir un miembro del grupo, su historial de participaciones se preserva. | Low |
| BR-GROUP-03 | Conflictos de edición concurrente: último en guardar gana (MVP). Sin merge complejo. | Med |
| BR-GROUP-04 | Eliminar grupo: operación de archivado (`archived_at`), no borrado físico del historial. | Low |
| BR-GROUP-05 | Link de invitación tiene expiración. Si expira → el owner genera uno nuevo. | Med |

### BR-ENTITY — Integridad de Entidades

| ID | Invariante | Reversibilidad |
|----|-----------|----------------|
| BR-ENTITY-01 | Nombre de jugador único por cuenta/grupo: `UNIQUE(name, group_id)`. | Med |
| BR-ENTITY-02 | No se puede eliminar un jugador que está en un match `in_progress`. | Low |
| BR-ENTITY-03 | Player/Deck con Participations históricas → soft delete únicamente. | Low |
| BR-ENTITY-04 | No se puede eliminar un Commander referenciado en decks activos (no soft-deleted). | Low |
| BR-ENTITY-05 | Colores de Commander: subset de `['W','U','B','R','G','C']`. Ningún otro valor válido. | Low |

### BR-I18N — Internacionalización

| ID | Invariante | Reversibilidad |
|----|-----------|----------------|
| BR-I18N-01 | La app es bilingüe EN/ES con detección automática del idioma del dispositivo. Fallback a EN si idioma no soportado. | High |
| BR-I18N-02 | Terminología MTG (Commander, Infect, Scoop, Proliferate, Mill, etc.) se mantiene en inglés en AMBOS idiomas. Son términos de juego propios del universo MTG, no se traducen. | Low |
| BR-I18N-03 | Nombres de commanders son nombres propios de cartas MTG — siempre en inglés en ambos idiomas. | Low |

---

## §7 UI/UX

### Principios Visuales

| # | Principio | Fuente |
|---|-----------|--------|
| V1 | **Dark mode como modo primario y único en MVP.** No hay light mode en MVP. | F34 |
| V2 | **Estética MTG Arena** — moderno, minimalista, con referencias visuales al universo MTG. | F34 |
| V3 | **Colors WUBRG como lenguaje visual** — los colores de MTG (blanco, azul, negro, rojo, verde) son el sistema de color primario para identificar commanders y decks. | deep-dive |
| V4 | **Tracker en pantalla dividida** — la pantalla del dispositivo se divide en 2, 3 o 4 secciones equivalentes, cada sección orientable individualmente. | F29/F30 |
| V5 | **Sin fricción en el tracker** — el menor número posible de taps para una acción de tracking. El debounce agrupa taps rápidos. | F32 |
| V6 | **Términos MTG en inglés** — toda la terminología del juego se muestra en inglés independientemente del idioma de la app. | F27/BR-I18N-02 |

### Pantallas Principales

| ID | Pantalla | Tipo | Descripción | Features |
|----|---------|------|-------------|---------|
| P01 | **Home** | Tab | Dashboard principal: match activo (banner de retomar), últimas 3-5 partidas, stat highlight (win rate global), CTA "Nuevo Match". | FT-020 |
| P02 | **Jugadores** | Tab | Lista de jugadores con CRUD. Tap en jugador → perfil con stats. | FT-001, FT-008 |
| P03 | **Decks** | Tab | Lista de decks con CRUD. Filtrable. Tap en deck → detalle con stats. | FT-002, FT-009 |
| P04 | **Historial** | Tab | Lista de matches completados/abandonados con filtros completos. Tap → detalle del match. | FT-007 |
| P05 | **Stats** | Tab | Stats Dashboard Global con rankings y resúmenes. | FT-012 |
| P06 | **Setup Match** | Modal | Selección de jugadores + decks + validación. Transición al Tracker. | FT-004 |
| P07 | **Match Tracker** | Modal (full screen) | Pantalla dividida 2/3/4. Life, poison, commander damage. Acceso a Undo y cierre. | FT-005, FT-013, FT-014, FT-015 |
| P08 | **Cierre de Match** | Sheet/Modal | Selección de resultado: ganador + win condition / draw / abandon. | FT-006 |
| P09 | **Resultados** | Screen | Resumen post-match: ganador, win condition, stats rápidas del match. | FT-006 |
| P10 | **Detalle Match** | Screen | Info completa del match + event log si existe. Accesible desde historial. | FT-007, FT-015 |
| P11 | **Perfil Jugador** | Screen | Stats completas del jugador: win rate, decks usados, commanders, racha. | FT-008 |
| P12 | **Detalle Deck** | Screen | Stats del deck: win rate, jugadores que lo usaron, commanders. | FT-009 |
| P13 | **Detalle Commander** | Screen | Stats del commander: win rate, decks que lo usan, jugadores. | FT-010 |
| P14 | **Matchup Stats** | Screen | Head-to-head entre dos jugadores, decks o commanders. Filtro scope 1v1/todos. | FT-011 |
| P15 | **CRUD Commanders** | Screen | Lista + creación/edición de commanders. | FT-003 |
| P16 | **Auth / Login** | Screen (gate) | Pantalla de bienvenida con opciones de auth + modo guest. | FT-016 |
| P17 | **Grupos** | Screen | Crear grupo, ver miembros, invitar por email/link. | FT-017 |
| P18 | **Settings** | Screen | Configuración de usuario: tracker, match setup, preferencias, cuenta. | FT-019 |
| P19 | **Guest Tracker** | Modal (full screen) | Tracker básico sin login. Sin decks registrados — solo life/poison/cmd damage en sesión. | FT-016/F45 |

### Flujos Críticos

| ID | Flujo | Pantallas | Trigger → Resultado |
|----|-------|-----------|---------------------|
| FL-01 | **Nuevo Match (logueado)** | P01 → P06 → P07 → P08 → P09 | CTA "Nuevo Match" → setup validado → tracker en vivo → cierre → resultados |
| FL-02 | **Tracking Guest** | P16 → P19 | "Continuar sin cuenta" → tracker básico sin persistencia |
| FL-03 | **Undo en Tracker** | P07 → event log panel → P07 | Tap "Undo" → último evento revertido → estado restaurado |
| FL-04 | **Cerrar Match (ganador)** | P07 → P08 → P09 | Tap "Cerrar Match" → seleccionar ganador + win condition → confirm → P09 |
| FL-05 | **Cerrar Match (Draw)** | P07 → P08 → P09 | Tap "Cerrar Match" → seleccionar "Draw" → confirm → P09 (todos draw) |
| FL-06 | **Crear Deck con Partners** | P03 → create form | Crear deck → toggle "Partner?" → seleccionar 2 commanders → guardar |
| FL-07 | **Auth + Onboarding** | P16 → P01 | Seleccionar provider → auth → cuenta creada/iniciada → Home |
| FL-08 | **Crear Grupo + Invitar** | P18/P17 → create → invite | Crear grupo → nombre → invitar por email o link → miembro acepta → shared DB activa |
| FL-09 | **Ver Matchup Stats** | P05 → P14 | Dashboard global → seleccionar dos entidades → matchup view → filtro scope |
| FL-10 | **Historial con Filtros** | P04 → filter → P10 | Lista historial → aplicar filtros (jugador, deck, fecha, resultado) → lista filtrada → tap → detalle |

### Navegación

```
┌─────────────────────────────────────────┐
│           TAB BAR (siempre visible)      │
│  Home | Jugadores | Decks | Historial | Stats │
└─────────────────────────────────────────┘
         │                    │
         ▼ modal              ▼ push
   Setup Match            Perfil Jugador
         │                Detalle Deck
         ▼ full screen    Detalle Commander
   Match Tracker          Matchup Stats
         │                CRUD Commanders
         ▼ sheet           Grupos
   Cierre de Match        Settings
         │
         ▼ push
      Resultados
```

- **Tab bar:** Home · Jugadores · Decks · Historial · Stats (5 tabs, siempre visible)
- **Modales:** Setup Match, Match Tracker, Cierre de Match, Guest Tracker
- **Settings:** Accesible desde ícono en header del Home (fuera del tab bar)
- **Auth gate:** P16 se muestra solo si no hay sesión activa (ni guest ni logged)

---

## §8 Infraestructura

### Stack Técnico

| Componente | Tecnología | Notas |
|------------|-----------|-------|
| **Frontend** | React Native | iOS + Android. Un solo codebase. |
| **Base de datos** | Neon (PostgreSQL serverless) | Cloud-hosted. Serverless = escala a cero en inactividad. |
| **Auth** | TBD (compatible Neon) — email, Google, Apple, magic link | Implementación a definir en /docs. Opciones: Neon Auth, Clerk, Auth.js |
| **Storage** | [INFERRED] Neon + posiblemente S3/R2 para avatares | Avatares son opcionales en MVP |
| **Ads** | TBD — red a seleccionar en /docs | Solo en Free tier |
| **Payments** | Apple IAP + Google Play Billing | One-time purchase para Premium |
| **Distribución** | App Store + Play Store | F24 |
| **i18n** | react-i18next + expo-localization | [INFERRED] estándar del ecosistema RN |

### Automation Jobs

| Job | Frecuencia | Propósito | Fallback |
|-----|-----------|-----------|---------|
| Stats computation | On-demand (por request) en MVP | Calcular win rates y rankings cuando el usuario navega a stats | Sin cache en MVP — latencia aceptada |
| Auth token refresh | Automático en background | Mantener sesión activa | Si falla: redirigir a login |
| Group sync | On app foreground / explicit pull en MVP | Sincronizar datos del grupo con el servidor | Datos locales se muestran, indicador de "sin conexión" |

> ⚠️ No hay jobs de cron o background en MVP. La app es pull-based. Real-time sync (Fase 3) no aplica al MVP.

### Real-time Strategy

- **MVP:** Sin real-time multi-device. El tracker opera en **un único dispositivo** (F29). La sincronización cloud ocurre al guardar/completar un match.
- **Conflictos:** Último en guardar gana (BR-GROUP-03). Sin merge en MVP.
- **Offline:** El tracker en vivo funciona con estado local. Sync al recuperar conexión.
- **Fase 3:** Sincronización multiusuario en tiempo real (fuera del scope MVP, E2).

### Timezone Rules

> No hay reglas de timezone específicas en las fuentes. Las fechas (`started_at`, `ended_at`, `created_at`) se almacenan en UTC y se muestran en el timezone local del dispositivo. `[INFERRED]` — estándar para apps móviles.

### Delivery Phasing (Sin Deadline — F35)

> `[INFERRED]` — Propuesta basada en las dependencias naturales del backlog. No es decisión firme.

| Batch | Features | Foco | Prerequisitos |
|-------|---------|------|---------------|
| **Batch 1** | FT-001, FT-002, FT-003, FT-004, FT-006 | CRUD foundation + match setup/close | Ninguno |
| **Batch 2** | FT-005, FT-007, FT-013, FT-014, FT-015 | Match Tracker en vivo + historial | Batch 1 |
| **Batch 3** | FT-008, FT-009, FT-010, FT-011, FT-012 | Stats engine completo | Batch 1 + 2 (datos históricos) |
| **Batch 4** | FT-016, FT-017, FT-018, FT-019, FT-020 | Auth, grupos, i18n, settings, home | Batches 1-3 (features para proteger con auth) |

---

## Consistency Check — Pass 2 vs Pass 1

| Check | Status | Notas |
|-------|--------|-------|
| §2 Usuarios ↔ §6 BR-AUTH | ✅ | Guest/Auth alineados con BR-AUTH-01/02 |
| §3 Features ↔ §7 Pantallas | ✅ | 20 features → 19 pantallas (algunas features comparten pantalla) |
| §3 Features ↔ §4 Entidades | ✅ | Todas las features tienen entidades correspondientes en §4 |
| §4 Datos ↔ §5 Integraciones | ✅ | Neon como DB principal, IAP para premium, Auth providers |

## Drift Guard — Pass 2

- [x] No cambié stakeholder principal
- [x] No reinterpreté deadlines (F35 verbatim: sin deadline, calidad > velocidad)
- [x] No alteré alcance MVP
- [x] Integraciones Fase 3 (Scryfall, etc.) marcadas como diferidas — no promovidas a MVP
- [x] Delivery phasing marcado como `[INFERRED]` — no como decisión firme
- [x] Auth implementation marcada como `[TBD]` — no inventada
- [x] No inventé business rules adicionales

**Drift Guard Pass 2: ✅ clean**

---

---

## §9 Branding

### Nombre y Assets

| Atributo | Estado | Valor |
|----------|--------|-------|
| **Nombre de la app** | ✅ Definido | MTG Commander Tracker |
| **Logo** | 🟡 Pendiente | No definido — Deferred to /design |
| **Ícono de app** | 🟡 Pendiente | No definido — Deferred to /design |
| **Tipografía** | 🟡 Pendiente | No definida — Deferred to /design. Referencia: MTG Arena usa tipografías bold/display para headers. |
| **Tagline** | 🟡 Pendiente | No definido |

### Paleta de Colores

| Color | Uso | Base |
|-------|-----|------|
| **Dark background** | Fondo principal | Dark mode base (F34) — equivalente a ~#1a1a2e o similar MTG Arena dark |
| **White (W)** | Color MTG Blanco — decks/commanders blancos | WUBRG system |
| **Blue (U)** | Color MTG Azul | WUBRG system |
| **Black (B)** | Color MTG Negro | WUBRG system |
| **Red (R)** | Color MTG Rojo | WUBRG system |
| **Green (G)** | Color MTG Verde | WUBRG system |
| **Accent** | CTA principal, highlights | A definir en /design — referencia MTG Arena gold/amber |

> Hexadecimales exactos a definir en /design (15_DESIGN.md). La paleta base es el sistema de 5 colores de MTG como lenguaje visual primario, sobre fondo dark.

### Tono de Comunicación

- **Audiencia:** Jugadores de MTG Commander (casual-competitivo), grupos de amigos
- **Tono:** Directo, limpio, sin jerga excesiva. Respeta la inteligencia del jugador.
- **Terminología:** Términos de MTG siempre en inglés (BR-I18N-02). Resto de la UI en EN/ES según preferencia.
- **Personalidad:** Confiable, rápido, "no me interrumpas mientras juego"

### Variantes Visuales / Skins

No definidas en MVP. Modo tablet y skins especiales marcados como futuro (E10).

---

## §10 Mobile / Distribución

### Plataformas y Prioridad

| Plataforma | Prioridad | Canal | Notas |
|-----------|----------|-------|-------|
| **iOS** | P1 | App Store | Apple Sign In obligatorio si se ofrece auth social (BR-AUTH, Apple guidelines) |
| **Android** | P1 | Google Play | Google Play Billing para IAP |

> Ambas plataformas son P1 simultáneo. React Native = un codebase para ambas (F23).

### Funcionalidad Offline

| Feature | Offline | Notas |
|---------|---------|-------|
| Match Tracker (Guest) | ✅ Total | Sin red — tracking en sesión, sin persistencia (F45) |
| Match Tracker (Logged) | ✅ Parcial | Estado local durante la partida. Sync al recuperar conexión. |
| Historial / Stats | ❌ | Requieren conexión a Neon |
| CRUD (jugadores, decks) | ❌ | Requiere conexión |
| Auth | ❌ | Requiere conexión |

### Capacidades Nativas Requeridas

| Capacidad | Feature | Obligatoria |
|-----------|---------|------------|
| Rotación de pantalla (landscape/portrait por sección) | FT-005 Tracker | ✅ |
| Gestos touch (swipe, tap múltiple) | FT-005, FT-019 | ✅ |
| In-App Purchase (one-time) | FT-016 Premium | ✅ |
| Auth nativo (Google, Apple) | FT-016 | ✅ |
| Keep screen awake (sin bloqueo durante tracker) | FT-005 | ✅ [INFERRED] |
| Push notifications | No en MVP | ❌ |
| Cámara | No en MVP (avatar opcional F2) | ❌ |

### Performance Targets

No definidos en las fuentes. `[INFERRED]` para MVP:
- Cold start: < 3s
- Tracker response: < 100ms por tap (crítico para UX de tracking)
- Stats load: < 2s (on-demand, sin cache)

---

## §11 Visual Direction Seeds

### Postura Visual

**"MTG Arena en tu bolsillo"** — La referencia visual principal es la interfaz de MTG Arena: dark, premium, con detalles dorados/ámbar, tipografía bold, y los 5 colores de MTG como sistema cromático. Minimalista en layout pero rico en identidad visual.

### Referencias Visuales

| Referencia | Qué tomar | Qué NO tomar |
|-----------|-----------|-------------|
| **MTG Arena** | Paleta dark, colores WUBRG como identidad, estética premium | Complejidad de interfaz de juego completo |
| **Lifelink (iOS)** | Simplicidad del tracker, split screen limpio | Estética genérica |
| **Chess.com** | Stats visualization, historial limpio | Branding chess |
| **Letterboxd** | Perfil de usuario con historial rich | Social features |

### Nivel de Acabado

- Dark mode exclusivo en MVP (no hay toggle light/dark)
- Animaciones mínimas y funcionales (no decorativas)
- Iconografía clara, tamaños touch-friendly (mínimo 44pt tap target)
- Los 5 colores MTG (WUBRG) como color identity de cada commander/deck son el principal elemento de personalización visual

### Constraints de Marca

- El nombre "MTG" y assets de Wizards of the Coast son propiedad intelectual de WotC. La app no puede usar arte oficial, símbolos de set, o el logo de Magic: The Gathering sin licencia.
- Los nombres de commanders son nombres de cartas (propiedad WotC) — usados como datos de usuario, no como assets gráficos.
- Los colores WUBRG son parte del universo MTG pero su representación abstracta (círculos de color, etc.) es un estándar ampliamente aceptado en la comunidad.

---

## 📋 Decision Registry

> Fuente única: Freeze Map v2.0. Todas las decisiones firmes + resueltas durante discovery.

### Firm Decisions (F1–F21)

| # | Decisión | Tipo | Fuente | Reversibilidad |
|---|---------|------|--------|---------------|
| F1 | Nombre: MTG Commander Tracker | Firm | Source §1 | Low |
| F2 | Doble propósito: Gameplay Tracker en vivo + Stats Engine histórico | Firm | Source §1 | Low |
| F3 | Tracking en vivo: life total, commander damage, poison counters | Firm | Source §1 | Low |
| F4 | Soporte para 2, 3 y 4 jugadores | Firm | Source §1 | Low |
| F5 | Entidades separadas: Jugador, Deck, Commander, Match, Participación | Firm | Source §3 | Low |
| F6 | Un deck puede ser usado por diferentes jugadores en distintos matches | Firm | Source §4 R1 | Low |
| F7 | Un deck NO puede repetirse en el mismo match → unique(match_id, deck_id) | Firm | Source §4 R2 | Low |
| F8 | Cada participación guarda: jugador, deck, commander, posición, resultado | Firm | Source §4 R3 | Low |
| F9 | Validación al iniciar match: 2-4 jugadores, no decks repetidos, cada jugador con deck | Firm | Source §4 R4 | Low |
| F10 | Soporte para partner commanders como extensión | Firm | Source §4 R5 | Med |
| F11 | Life total inicial: 40 por default (configurable en Settings) | Firm | Source §5C | High |
| F12 | Commander damage se guarda por rival individual | Firm | Source §12 | Low |
| F13 | Modelo de datos: 8 tablas + match_events | Firm | Source §6 | Low |
| F14 | Result por participante: win / lose | Firm | Source §6 | Low |
| F15 | Métricas: win rate por jugador, deck, commander, matchup | Firm | Source §9 | Low |
| F16 | MVP incluye: CRUD, match 2-4, tracking, historial, stats básicas | Firm | Source §11 | Low |
| F17 | Fase 2: Mana pool, eliminación, notas, filtros avanzados, gráficas | Firm | Source §11 | Med |
| F18 | Fase 3: Sync multiusuario, importación decklists, Scryfall | Firm | Source §11 | Med |
| F19 | Pantallas: Home, Jugadores, Decks, Setup Match, Tracker, Resultados, Stats | Firm | Source §8 | Med |
| F20 | Deck owner opcional, uso compartido permitido | Firm | Source §12 | High |
| F21 | Mana pool tracking opcional — Fase 2 | Firm | Source §12 | — |

### Resolved During Discovery (F23–F46)

| # | Decisión | Fuente | Reversibilidad |
|---|---------|--------|---------------|
| F23 | Stack: React Native + Neon (PostgreSQL serverless) | Gap Interview | Low |
| F24 | Distribución: App Store + Play Store | Gap Interview | Low |
| F25 | Modelo: Cloud individual con grupos de amigos | Gap Interview | Low |
| F26 | Auth: email/password, Google, Apple, magic link | Gap Interview | Med |
| F27 | Bilingüe EN/ES — i18n desde el inicio | Gap Interview | Low |
| F28 | Win conditions: todos los de MTG (combat, combo, infect, cmd damage, mill, scoop, other) | Gap Interview | Med |
| F29 | UX Tracker: 1 dispositivo, pantalla dividida 2/3/4 | Gap Interview | Low |
| F30 | Layout configurable: rotación individual por jugador | Gap Interview | High |
| F31 | Gestos swipe: activables/desactivables en Settings | Gap Interview | High |
| F32 | Match Log con debounce: taps consecutivos → 1 evento | Gap Interview | High |
| F33 | Match History + Undo en MVP (elevado de Fase 3) | Gap Interview | Low |
| F34 | Visual: Dark mode base, estilo MTG Arena, moderno, minimalista | Gap Interview | Med |
| F35 | Sin deadline — calidad siempre prioridad sobre velocidad | Discovery (O5) | Low |
| F36 | Monetización: Free + Ads. Premium ONE TIME para quitar ads | Discovery (O7) | Med |
| F37 | Deck creation: nombre + commander + descripción. Commander obligatorio configurable. | Discovery (OQ-D1) | High |
| F38 | Partner commanders: toggle al crear deck. Si sí → 2 commanders obligatorios. | Discovery (OQ-D2) | Low |
| F39 | Un deck NO puede estar en 2 matches activos simultáneamente | Discovery (OQ-D3) | Low |
| F40 | Empate soportado. Resultado SIEMPRE manual — nunca automático. | Discovery (OQ-D4) | Low |
| F41 | Historial filtros: jugador, deck, commander, fecha, resultado, win condition | Discovery (OQ-D7) | High |
| F42 | Commander damage con partners: tracking por commander individual (regla oficial MTG) | Discovery (OQ-D8) | Low |
| F43 | Threshold debounce configurable en Settings (200ms–2000ms) | Discovery (OQ-D9) | High |
| F44 | Matchup stats: filtro scope "Solo 1v1" vs "Todos" | Discovery (OQ-D10) | High |
| F45 | Modo Guest: tracking básico sin persistencia. Login para funciones completas. | Discovery (OQ-D11) | Low |
| F46 | Usuario puede pertenecer a múltiples grupos. Sin límite en MVP. | Discovery (OQ-D12) | High |

---

## 📊 Drift Report

| # | Item | Categoría | Severidad | Acción |
|---|------|-----------|-----------|--------|
| 1 | Debounce threshold range 200ms–2000ms | helpful — constraint razonable derivada de la feature | low | keep |
| 2 | Performance targets (cold start <3s, tracker <100ms) | helpful — estándar mobile | low | keep — marcar [INFERRED] |
| 3 | Keep screen awake durante tracker | helpful — necesidad obvia del use case | low | keep — marcar [INFERRED] |
| 4 | Auth implementation TBD (Neon Auth / Clerk / Auth.js) | harmless — TBD explícito, no inventado | low | keep — definir en /docs |
| 5 | Ad network TBD | harmless — TBD explícito | low | keep — definir en /docs |
| 6 | Storage para avatares (S3/R2) | helpful — derivado del modelo de datos | low | keep — marcar [INFERRED] |
| 7 | Timezone: UTC almacenado, local display | helpful — estándar mobile | low | keep — marcar [INFERRED] |
| 8 | Delivery phasing order (Batch 1→4) | helpful — derivado de dependencias naturales | low | keep — marcado [INFERRED] |
| 9 | Apple Sign In obligatorio si se usa auth social en iOS | helpful — regla de App Store, no del usuario | low | keep — constraint técnico |

**Total:** 9 items | Unauthorized: 0 | Risky: 0 | Safe: 9

---

## ❓ Open Questions & Assumptions

### OQs Activas

> Todas las OQs de discovery fueron resueltas. No hay OQs activas.

### Deferred to /design

| # | Item | Destino | Impacto |
|---|------|---------|---------|
| D1 | Logo + ícono de la app | /design (15_DESIGN.md) | Visual identity |
| D2 | Tipografía exacta | /design | Visual identity |
| D3 | Hexadecimales exactos de la paleta | /design | Visual |
| D4 | Tagline de la app | /design | Branding |
| D5 | Animaciones y microinteracciones | /design | UX polish |

### Deferred to /docs

| # | Item | Destino | Impacto |
|---|------|---------|---------|
| D6 | Auth implementation (Neon Auth / Clerk / Auth.js) | /docs (08_AUTH.md) | Arquitectura |
| D7 | Ad network específico | /docs | Monetización |
| D8 | Estrategia de cache para stats (si se añade) | /docs | Performance |

### Working Hypotheses

| # | Hipótesis | Categoría | Plan de Validación |
|---|-----------|-----------|-------------------|
| WH1 | Stats on-demand sin cache son suficientemente rápidas en MVP (< 2s) | Performance | Probar en /implement con datasets reales |
| WH2 | React Native cubre todas las capacidades nativas necesarias (split screen, rotación por sección) | Tech | Prototipo en /implement Batch 2 |
| WH3 | Un solo dispositivo en la mesa es el modo de uso real del 80%+ de los grupos | UX | Validar post-MVP con usuarios |

### Resolved During Discovery (todas)

O1–O4, O6, O8–O10 → Gap Interview → F23–F34
O5 (deadline) → F35 | O7 (monetización) → F36
OQ-D1 → F37 | OQ-D2 → F38 | OQ-D3 → F39 | OQ-D4 → F40
OQ-D7 → F41 | OQ-D8 → F42 | OQ-D9 → F43 | OQ-D10 → F44
OQ-D11 → F45 | OQ-D12 → F46

---

## ⚠️ Riesgos y Mitigaciones

| # | Riesgo | Severidad | Mitigación |
|---|--------|-----------|-----------|
| R1 | Sin deadline: sin forcing function externa. El proyecto puede extenderse indefinidamente. | 🟡 | Quality-first es una decisión consciente (F35). Definir milestones internos en /backlog para medir progreso. |
| R2 | Auth implementation TBD: elección incorrecta puede requerir refactor mayor. | 🟡 | Evaluar Neon Auth, Clerk, Auth.js antes de /implement Batch 4. Decidir en /docs. |
| R3 | Split screen para 4 jugadores en dispositivos pequeños (iPhone SE, etc.) | 🟡 | Definir breakpoints y min font sizes en /design. Priorizar legibilidad sobre densidad. |
| R4 | Stats on-demand sin cache pueden ser lentas con historial grande. | 🟡 | Monitorear en /implement. Añadir cache en F2 si se confirma problema. |
| R5 | Partner commander tracking (cmd damage por commander_id) añade complejidad al modelo y la UI. | 🟡 | Feature de nicho — documentar claramente en /docs. UI debe ser opcional y no intrusiva. |
| R6 | Propiedad intelectual WotC: uso del nombre "MTG" y términos de juego. | 🔴 | Revisar fair use y guidelines de WotC antes de publicar en App Store. Consultar en /deploy. |
| R7 | Apple Sign In: obligatorio si se ofrece cualquier otro auth social en iOS. Tiene requirements específicos. | 🟡 | Implementar Apple Sign In desde el inicio junto con Google OAuth. |
| R8 | Ad network TBD: elección incorrecta afecta UX y revenue. | 🟢 | Definir en /docs. Opciones: Google AdMob, Unity Ads. |

---

## Appendix A — Reconciliation Checklist

### A1. Entities Registry

| # | Entidad | §4 Definida | §3 Feature(s) | §7 Pantalla(s) | §6 Reglas |
|---|---------|------------|---------------|----------------|-----------|
| E1 | User | ✅ | FT-016 | P16, P17, P18 | BR-AUTH-01–05 |
| E2 | Player | ✅ | FT-001, FT-004, FT-008 | P02, P06, P07, P11 | BR-ENTITY-01–03 |
| E3 | Commander | ✅ | FT-003, FT-004, FT-010, FT-013 | P07, P13, P15 | BR-ENTITY-04–05, BR-TRACK-02–03 |
| E4 | Deck | ✅ | FT-002, FT-004, FT-009 | P03, P06, P07, P12 | BR-DECK-01–08 |
| E5 | Match | ✅ | FT-004, FT-006, FT-007 | P06, P07, P08, P09, P10 | BR-MATCH-01–10 |
| E6 | Participation | ✅ | FT-004, FT-005, FT-013, FT-014 | P07 | BR-MATCH-02, BR-TRACK-01–02 |
| E7 | MatchResult | ✅ | FT-006 | P08, P09 | BR-MATCH-05–09 |
| E8 | MatchEvent | ✅ | FT-015 | P07, P10 | BR-TRACK-09–11 |
| E9 | Group | ✅ | FT-017 | P17 | BR-GROUP-01–05 |
| E10 | GroupMembership | ✅ | FT-017 | P17 | BR-GROUP-01 |
| E11 | UserSettings | ✅ | FT-019 | P18 | BR-TRACK-08/10/12/13, BR-DECK-02 |

### A2. Screens Registry

| # | Pantalla | §7 Definida | Entidades | Roles | Features |
|---|---------|------------|-----------|-------|---------|
| P01 | Home | ✅ | E5, E6 | Guest, User, Member | FT-020 |
| P02 | Jugadores | ✅ | E2 | User, Member | FT-001, FT-008 |
| P03 | Decks | ✅ | E4, E3 | User, Member | FT-002, FT-009 |
| P04 | Historial | ✅ | E5, E6, E7 | User, Member | FT-007 |
| P05 | Stats Dashboard | ✅ | E2, E4, E3 | User, Member | FT-012 |
| P06 | Setup Match | ✅ | E5, E6, E2, E4 | User, Member | FT-004 |
| P07 | Match Tracker | ✅ | E6, E8 | Guest, User, Member | FT-005, FT-013, FT-014, FT-015 |
| P08 | Cierre de Match | ✅ | E5, E7 | User, Member | FT-006 |
| P09 | Resultados | ✅ | E5, E7, E6 | User, Member | FT-006 |
| P10 | Detalle Match | ✅ | E5, E6, E7, E8 | User, Member | FT-007, FT-015 |
| P11 | Perfil Jugador | ✅ | E2, E6, E5 | User, Member | FT-008 |
| P12 | Detalle Deck | ✅ | E4, E6, E5 | User, Member | FT-009 |
| P13 | Detalle Commander | ✅ | E3, E6, E5 | User, Member | FT-010 |
| P14 | Matchup Stats | ✅ | E2, E4, E3, E5 | User, Member | FT-011 |
| P15 | CRUD Commanders | ✅ | E3 | User, Member | FT-003 |
| P16 | Auth / Login | ✅ | E1 | Guest | FT-016 |
| P17 | Grupos | ✅ | E9, E10, E1 | User, Owner, Member | FT-017 |
| P18 | Settings | ✅ | E11, E1 | User, Member | FT-019 |
| P19 | Guest Tracker | ✅ | — (sin persistencia) | Guest | FT-016/F45 |

### A3. Features Cross-Map

| Feature | Entidades §4 | Pantallas §7 | Reglas §6 |
|---------|-------------|--------------|-----------|
| FT-001 | E2 | P02 | BR-ENTITY-01–03 |
| FT-002 | E4, E3 | P03 | BR-DECK-01–08 |
| FT-003 | E3 | P15 | BR-ENTITY-04–05 |
| FT-004 | E5, E6, E2, E4, E3 | P06 | BR-MATCH-01–04, BR-TRACK-01 |
| FT-005 | E6, E8 | P07 | BR-TRACK-07–13 |
| FT-006 | E5, E7, E6 | P08, P09 | BR-MATCH-05–10 |
| FT-007 | E5, E6, E7 | P04, P10 | BR-MATCH-06–07, BR-STATS-01/03 |
| FT-008 | E2, E6, E5 | P11 | BR-STATS-01–04/07–09 |
| FT-009 | E4, E6, E5 | P12 | BR-STATS-01–05 |
| FT-010 | E3, E6, E5 | P13 | BR-STATS-01–03/05–06 |
| FT-011 | E2, E4, E3, E5 | P14 | BR-STATS-01/06–07 |
| FT-012 | E2, E4, E3, E5 | P05 | BR-STATS-01–04/07–09 |
| FT-013 | E6, E3, E8 | P07 | BR-TRACK-02–04 |
| FT-014 | E6, E8 | P07 | BR-TRACK-05–06 |
| FT-015 | E8, E6 | P07, P10 | BR-TRACK-09–11 |
| FT-016 | E1 | P16, P19 | BR-AUTH-01–05 |
| FT-017 | E9, E10, E1 | P17 | BR-GROUP-01–05 |
| FT-018 | E11 | P18 | BR-I18N-01–03 |
| FT-019 | E11 | P18 | BR-TRACK-08/10/12–13, BR-DECK-02, BR-I18N-01 |
| FT-020 | E5, E6, E2, E4, E3 | P01 | BR-MATCH-07 |

---

## Appendix B — Glosario

| Término | Definición |
|---------|-----------|
| **Commander** | Formato de MTG para 4 jugadores. También el nombre de la carta líder del deck, que comienza en la "zona de comando". |
| **Commander Damage** | Daño de combate infligido por el commander de un jugador. 21 de un mismo commander a un mismo jugador = pérdida. |
| **Poison Counter** | Contador de veneno. 10 = pérdida en MTG (regla de Infect/Toxic). |
| **Partner Commander** | Dos comandantes que pueden jugarse juntos en el mismo deck gracias al keyword "Partner". |
| **Win Condition** | La forma en que se ganó la partida (combat damage, commander damage, infect, combo, mill, scoop, etc.). |
| **Scoop** | Rendirse voluntariamente en MTG ("doblar las cartas"). |
| **Mill** | Win condition por hacer que el oponente saque su última carta de su biblioteca. |
| **Life Total** | Puntos de vida de un jugador. En Commander comienza en 40. |
| **Match** | Una partida completa de Commander entre 2-4 jugadores. |
| **Participation** | La instancia de un jugador específico con un deck específico en un match específico. |
| **Deck** | El mazo de 100 cartas (sin contar el commander) usado por un jugador. En esta app: metadata del deck (nombre, commander, descripción). |
| **WUBRG** | Las 5 colores de MTG: White (W), Blue (U), Black (B), Red (R), Green (G). |
| **Event Log** | Registro cronológico de todos los cambios de estado durante una partida (cambios de vida, poison, commander damage). |
| **Debounce** | Técnica que agrupa eventos rápidos consecutivos en un único evento con el delta acumulado. |
| **Undo** | Revertir el último evento registrado, restaurando el estado anterior. |
| **Guest Mode** | Modo de uso sin login. Solo permite tracking básico sin persistencia. |
| **Friend Group** | Grupo de usuarios que comparten una base de datos común de jugadores, decks, matches y estadísticas. |
| **Win Rate** | Porcentaje de victorias: wins / total_completed_matches × 100. |
| **Matchup** | Comparativa de rendimiento histórico entre dos jugadores, decks o commanders. |
| **Soft Delete** | Borrado lógico — el registro se marca como eliminado (`deleted_at`) pero no se borra físicamente de la BD. |
| **Neon** | Proveedor de PostgreSQL serverless usado como base de datos cloud. |

---

## Drift Guard — Pass 3

- [x] §9 Branding: logo/tipografía correctamente marcados como [Deferred to /design]
- [x] §10 Mobile: capacidades nativas correctamente [INFERRED] donde no hay fuente
- [x] §11 Visual: referencias sin inventar decisiones de diseño firmes
- [x] Decision Registry: todas las F firmes + todas las resueltas durante discovery incluidas (F1-F21, F23-F46)
- [x] Drift Report: 9 items identificados, 0 unauthorized
- [x] Riesgo IP/WotC correctamente identificado como 🔴
- [x] Reconciliation: 11 entidades, 19 pantallas, 20 features — todos cruzados
- [x] No promoción de Fase 2/3 features a MVP

**Drift Guard Pass 3: ✅ clean**

---

_Discovery Brief v1.0 — FINAL — MTG Commander Tracker_
_Generado: 2026-04-09 | Challenge Pass: ✅ | Siguiente: /proposal_
