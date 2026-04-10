# 📏 Business Rules — MTG Commander Tracker

> Generado desde Discovery Brief §6 por `/docs`
> **Fuente:** `docs/planning/00_DISCOVERY_BRIEF.md` §6
> **SSOT:** Este documento para invariantes, validaciones y reglas de negocio.
> **Versión:** 1.0 — 2026-04-09

---

## Índice de Namespaces

| Namespace    | Descripción                          | Reglas              |
| ------------ | ------------------------------------ | ------------------- |
| BR-MATCH     | Ciclo de vida de un match            | BR-MATCH-01→10      |
| BR-DECK      | Reglas de decks                      | BR-DECK-01→08       |
| BR-TRACK     | Tracker en vivo                      | BR-TRACK-01→13      |
| BR-STATS     | Motor de estadísticas                | BR-STATS-01→09      |
| BR-AUTH      | Auth y acceso                        | BR-AUTH-01→05       |
| BR-GROUP     | Friend Groups                        | BR-GROUP-01→05      |
| BR-ENTITY    | Integridad de entidades              | BR-ENTITY-01→05     |
| BR-I18N      | Internacionalización                 | BR-I18N-01→03       |
| CALC         | Fórmulas y cálculos                  | CALC-001→003        |
| VAL          | Validaciones de datos                | VAL-001→005         |
| ERR          | Códigos de error                     | Ver tabla final     |

---

## BR-MATCH — Match Lifecycle

### BR-MATCH-01: Rango válido de jugadores por match

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Un match DEBE tener entre 2 y 4 Participations.               |
| **Enforcement** | Backend validation al crear Match + Frontend (botón desactivado) |
| **Error**       | `MATCH_INVALID_PLAYER_COUNT`                                   |
| **Reversible**  | Low                                                            |
| **Refs**        | US-010, E-005, E-008                                           |

```
❌ Intentar iniciar match con 1 jugador → Error: MATCH_INVALID_PLAYER_COUNT
❌ Intentar iniciar match con 5 jugadores → Error: MATCH_INVALID_PLAYER_COUNT
✅ 2, 3 o 4 jugadores → Match válido
```

---

### BR-MATCH-02: No decks repetidos en el mismo match

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | `UNIQUE(match_id, deck_id)` en Participation.                  |
| **Enforcement** | DB constraint + Backend validation + Frontend (deck deshabilitado al ser seleccionado) |
| **Error**       | `MATCH_DECK_DUPLICATE`                                         |
| **Reversible**  | Low                                                            |
| **Refs**        | US-011, E-008                                                  |

```
❌ deck_id = X asignado a dos jugadores en el mismo match → Error: MATCH_DECK_DUPLICATE
✅ deck_id distinto por jugador → Válido
```

---

### BR-MATCH-03: Validación completa al iniciar match

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Al iniciar un match deben cumplirse TODAS: N jugadores ∈ [2,4], ningún deck repetido, cada jugador con deck asignado. |
| **Enforcement** | Backend transaction + Frontend gate                            |
| **Error**       | Múltiples: ver BR-MATCH-01, BR-MATCH-02                        |
| **Reversible**  | Low                                                            |
| **Refs**        | US-010, US-011, US-012                                         |

---

### BR-MATCH-04: Deck no puede estar en dos matches activos simultáneamente

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Un deck con una Participation en match `in_progress` no puede ser seleccionado en otro match nuevo. |
| **Enforcement** | Backend query al seleccionar deck + Frontend (deck grayed out con label "En partida activa") |
| **Error**       | `DECK_IN_ACTIVE_MATCH`                                         |
| **Reversible**  | Low (desaparece cuando el match activo termina)                |
| **Refs**        | US-012, BR-DECK-06, E-002, E-005                               |

---

### BR-MATCH-05: Resultado siempre manual

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | El resultado de un match es SIEMPRE selección manual del usuario. La app **nunca** asigna resultado automáticamente. |
| **Enforcement** | Arquitectura: no existe ningún job ni trigger que cierre un match. |
| **Refs**        | US-016, US-017, US-018, §1 Principios de Producto             |

---

### BR-MATCH-06: Matches abandoned excluidos de stats

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Matches con `status = 'abandoned'` aparecen en historial pero NO se computan en ningún cálculo de stats. |
| **Enforcement** | Filtro en todas las queries de stats: `WHERE status = 'completed'` |
| **Refs**        | US-018, US-022, CALC-001, BR-STATS-03                          |

---

### BR-MATCH-07: Matches in_progress no aparecen en historial

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | El historial (P04) filtra `status != 'in_progress'`.           |
| **Enforcement** | Query filter en historial                                       |
| **Refs**        | US-019, E-005                                                  |

---

### BR-MATCH-08: Draw — estructura de datos

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Draw: `MatchResult.winner_participation_id = null`, `MatchResult.is_draw = true`, todos los Participations con `result = 'draw'`. |
| **Enforcement** | Backend transaction atómica al cerrar draw                     |
| **Refs**        | US-017, E-007, E-008                                           |

---

### BR-MATCH-09: Win conditions válidas (enum)

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | `MatchResult.win_condition` DEBE ser uno de los 8 valores del enum. |
| **Enforcement** | DB enum constraint + Frontend select restringido               |
| **Valores**     | `combat_damage`, `commander_damage`, `infect`, `combo`, `mill`, `scoop`, `concede`, `other` |
| **Refs**        | US-016, E-007, 09_GLOSSARY                                     |

---

### BR-MATCH-10: Abandoned — participations sin resultado

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Al abandonar un match, ningún Participation recibe `result` (queda `null`). |
| **Enforcement** | Backend: no setear result en Participations al abandonar       |
| **Refs**        | US-018, E-008                                                  |

### State Machine — Match Status

```
[CREATED] ──── setup válido (BR-MATCH-03) ──────► [in_progress]
                                                        │
                              ┌─────────────────────────┼─────────────────────┐
                              ▼                          ▼                     ▼
                         [completed]               [abandoned]            (en curso)
                      win/draw manual           sin resultado         ← undo posible
                      (BR-MATCH-05)              (BR-MATCH-10)        (BR-TRACK-11)
```

| Desde        | Hacia       | Acción              | Condición               | Reversible |
| ------------ | ----------- | ------------------- | ----------------------- | ---------- |
| CREATED      | in_progress | Iniciar match       | BR-MATCH-01/02/03       | ❌         |
| in_progress  | completed   | Cerrar con resultado | Manual (BR-MATCH-05)   | ❌         |
| in_progress  | abandoned   | Abandonar           | Manual (BR-MATCH-05)    | ❌         |

---

## BR-DECK — Deck Rules

### BR-DECK-01: Campos obligatorios de deck

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Los campos de creación de deck son: nombre (obligatorio), commander (configurablemente obligatorio via require_commander), descripción (opcional). No hay lista de cartas. |
| **Refs**        | US-004, BR-DECK-02, E-002                                      |

---

### BR-DECK-02: Commander configurable como obligatorio

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | La obligatoriedad del commander al crear un deck está controlada por `UserSettings.require_commander`. Default: `true`. |
| **Reversible**  | High                                                           |
| **Refs**        | US-004, US-043, E-002, E-011                                   |

---

### BR-DECK-03: Partner commanders — ambos obligatorios

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Si `Deck.is_partner = true` → `commander_id` AND `commander_id_2` son ambos obligatorios. Con solo uno: bloquear. |
| **Enforcement** | DB constraint + Backend + Frontend (ambos campos required cuando toggle Partner activado) |
| **Error**       | `DECK_PARTNER_REQUIRES_TWO_COMMANDERS`                         |
| **Reversible**  | Low                                                            |
| **Refs**        | US-005, E-002                                                  |

---

### BR-DECK-04: Owner de deck es opcional

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | `Deck.owner_player_id` es nullable. Un deck puede existir sin propietario asignado. |
| **Reversible**  | High                                                           |
| **Refs**        | E-002                                                          |

---

### BR-DECK-05: Deck puede ser usado por distintos jugadores

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Un deck no tiene exclusividad de uso. Cualquier jugador puede pilotearlo en distintos matches (no simultáneamente). |
| **Reversible**  | Low                                                            |
| **Refs**        | US-024, BR-STATS-04, E-002, E-008                              |

---

### BR-DECK-06: Deck no puede estar en dos matches activos

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Un deck no puede tener Participations en dos matches con `status = 'in_progress'` simultáneamente. |
| **Enforcement** | Backend query + Frontend (grayed out)                          |
| **Error**       | `DECK_IN_ACTIVE_MATCH`                                         |
| **Refs**        | US-012, BR-MATCH-04                                            |

---

### BR-DECK-07: Soft delete obligatorio si tiene historial

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Si un deck tiene Participations históricas → soft delete únicamente (`deleted_at` timestamp). No borrado físico. |
| **Enforcement** | Backend: verificar Participations antes de eliminar; si existen → soft delete, si no → hard delete (opcional) |
| **Refs**        | US-007, BR-ENTITY-03, E-002                                    |

---

### BR-DECK-08: No eliminar deck en match activo

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | No se puede eliminar un deck que está en un match `in_progress`. |
| **Error**       | `DECK_IN_ACTIVE_MATCH_CANNOT_DELETE`                           |
| **Refs**        | US-007, E-002, E-005                                           |

---

## BR-TRACK — Tracker Rules

### BR-TRACK-01: Life total inicial

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Life total inicial por Participation = `UserSettings.default_life_total`. Default: 40. |
| **Refs**        | US-013, US-043, E-008, E-011                                   |

---

### BR-TRACK-02: Commander damage por commander_id

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Commander damage se trackea por `commander_id`, no por `player_id`. Cada commander tiene su propio contador en `Participation.commander_damage` (jsonb: `{ commander_id: damage_amount }`). |
| **Reversible**  | Low                                                            |
| **Refs**        | US-030, E-008                                                  |

---

### BR-TRACK-03: Partners — contadores de daño independientes

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Con partner commanders: Commander A y Commander B tienen contadores de daño independientes. 21 desde cualquiera de los dos activa la condición de pérdida de forma separada. |
| **Refs**        | US-031, BR-TRACK-04, E-001, E-008                              |

---

### BR-TRACK-04: 21 commander damage → alerta visual únicamente

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Al llegar a 21 commander damage desde un único commander → alerta visual. La app **NO** elimina al jugador automáticamente. |
| **Enforcement** | Frontend: detectar threshold y mostrar alerta                  |
| **Refs**        | US-030, BR-MATCH-05                                            |

---

### BR-TRACK-05: 10 poison counters → alerta visual únicamente

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Al llegar a 10 poison counters → alerta visual. La app **NO** elimina al jugador automáticamente. |
| **Enforcement** | Frontend: detectar threshold y mostrar alerta                  |
| **Refs**        | US-032, BR-MATCH-05                                            |

---

### BR-TRACK-06: Poison counters — floor en 0

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Poison counters: floor en 0. No pueden ser negativos. Sin cap superior. |
| **Enforcement** | Frontend: deshabilitar decremento en 0                         |
| **Refs**        | US-032, E-008                                                  |

---

### BR-TRACK-07: Un dispositivo, pantalla dividida

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | El tracker opera en un único dispositivo físico. La pantalla se divide en 2, 3 o 4 secciones según número de jugadores. |
| **Refs**        | US-013, §7 UI/UX, §8 Infra                                     |

---

### BR-TRACK-08: Swipe gestures — activable por usuario

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Los gestos swipe para cambiar vida son activables/desactivables via `UserSettings.swipe_gestures_enabled`. |
| **Reversible**  | High                                                           |
| **Refs**        | US-042, E-011                                                  |

---

### BR-TRACK-09: Debounce — agrupación de taps consecutivos

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Taps consecutivos dentro del `debounce_threshold_ms` se agrupan en un único `MatchEvent` con delta acumulado y `debounce_group_id` asignado. |
| **Enforcement** | Frontend timer + Backend: recibir evento agrupado              |
| **Refs**        | US-014, US-034, E-006                                          |

---

### BR-TRACK-10: Debounce threshold — rango 200ms–2000ms

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | `UserSettings.debounce_threshold_ms` ∈ [200, 2000]. Default: 500ms. |
| **Enforcement** | Backend validation + Frontend slider con límites              |
| **Error**       | `SETTINGS_DEBOUNCE_OUT_OF_RANGE`                               |
| **Refs**        | US-042, E-011                                                  |

---

### BR-TRACK-11: Undo — ilimitado, no destructivo

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Undo revierte el último `MatchEvent` no-undoneado. Ilimitado hacia atrás. Undo = `is_undone: true` + restaurar `previous_value` en Participation. Los eventos NO se eliminan — solo se marcan. |
| **Reversible**  | Med                                                            |
| **Refs**        | US-033, E-006, E-008                                           |

---

### BR-TRACK-12: Settings aplican solo a matches futuros

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Cambios en Settings (debounce, life total inicial, gestures) aplican únicamente a matches nuevos. Un match `in_progress` no se ve afectado. |
| **Refs**        | US-042, US-043, E-011                                          |

---

### BR-TRACK-13: Rotación individual de secciones

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Cada sección del tracker puede rotarse 180° independientemente para que el jugador al otro lado de la mesa pueda leer su información. |
| **Refs**        | US-015                                                         |

### State Machine — Participation durante el Match

```
[initial: life=40, poison=0, cmd_dmg={}]
          │
          ├── tap ±vida ──► debounce (BR-TRACK-09) ──► MatchEvent(life_change) ──► life_total updated
          ├── tap poison ──► debounce ──────────────► MatchEvent(poison_change) ──► poison_counters updated
          │                                               └─ if ≥10 → alerta (BR-TRACK-05)
          ├── tap cmd dmg ─► debounce ──────────────► MatchEvent(commander_damage) ──► cmd_dmg[commander_id] updated
          │                                               └─ if ≥21 → alerta (BR-TRACK-04)
          └── undo ────────────────────────────────► last event: is_undone=true ──► previous_value restored
```

---

## BR-STATS — Stats Engine

### BR-STATS-01: Solo matches completed en stats

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Solo matches con `status = 'completed'` se computan en todas las stats. |
| **Enforcement** | Todas las queries de stats filtran `WHERE status = 'completed'` |
| **Refs**        | US-022, US-028, CALC-001                                       |

---

### BR-STATS-02: Fórmula de win rate

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Fórmula**     | `win_rate = (wins / total_completed_matches) × 100`            |
| **Nota**        | Draws cuentan como no-win (incrementan denominador, no numerador) |
| **Refs**        | US-022, CALC-001                                               |

---

### BR-STATS-03: Matches abandoned excluidos de todas las stats

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Matches con `status = 'abandoned'` NO aparecen en ningún cálculo de stats (ni en numerador ni denominador). |
| **Refs**        | US-018, US-028, BR-MATCH-06                                    |

---

### BR-STATS-04: Stats de deck independientes del jugador

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Las stats de un deck son del deck como entidad — independientes del jugador que lo piloteó en cada match. |
| **Refs**        | US-024, BR-DECK-05, E-002                                      |

---

### BR-STATS-05: Partners — stats independientes por commander

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Stats de commander con partners: cada partner acumula stats de forma independiente. |
| **Refs**        | US-025, BR-TRACK-03, E-001                                     |

---

### BR-STATS-06: Matchup scope — 1v1 vs todos

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Matchup stats permiten filtro de scope seleccionable: "Solo 1v1" (N_players=2) vs "Todos" (cualquier match donde ambos participaron). |
| **Refs**        | US-026, US-027, E-005                                          |

---

### BR-STATS-07: Empate en ranking — mostrar todos los empatados

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | En empate de ranking (mismo win rate): mostrar todos los empatados en la misma posición. No aplicar criterio de desempate arbitrario. |
| **Refs**        | US-029, E-009                                                  |

---

### BR-STATS-08: Filtros disponibles en historial

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | El historial soporta filtros por: jugador, deck, commander, fecha (rango), resultado (`win`/`lose`/`draw`/`abandoned`), win condition. |
| **Refs**        | US-020, E-005                                                  |

---

### BR-STATS-09: Stats calculadas on-demand en MVP

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Las stats se calculan on-demand por request en MVP (sin cache, sin pre-cómputo). |
| **Nota**        | Latencia aceptada en MVP. Cache a considerar post-MVP.         |
| **Refs**        | §8 Infra, CALC-001                                             |

---

## BR-AUTH — Auth y Acceso

### BR-AUTH-01: Modo Guest sin persistencia

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Modo Guest: tracking básico en vivo (life, poison, commander damage) sin persistencia. Datos no se guardan al cerrar sesión. |
| **Refs**        | US-037, P-001                                                  |

---

### BR-AUTH-02: Login requerido para features completas

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Login requerido para: crear decks registrados, ver historial, ver stats, unirse a grupos, sync cloud. |
| **Refs**        | US-035, P-002, RBAC Matrix en 03_USER_PERSONAS                 |

---

### BR-AUTH-03: Free tier — acceso completo + ads

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Free tier: acceso completo a todas las features funcionales + anuncios. Premium no gatea features. |
| **Refs**        | §1 Monetización, P-002                                         |

---

### BR-AUTH-04: Premium — elimina ads, no gatea features

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Premium ONE TIME elimina anuncios permanentemente. No desbloquea ninguna feature funcional adicional. |
| **Refs**        | §1 Monetización, E-011 (UserSettings.premium)                  |

---

### BR-AUTH-05: No auto-merge de cuentas con mismo email

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Si el mismo email está registrado con un provider diferente → error + sugerir provider original. No auto-merge de cuentas en MVP. |
| **Error**       | `AUTH_EMAIL_PROVIDER_CONFLICT`                                 |
| **Refs**        | US-035, E-010                                                  |

---

## BR-GROUP — Friend Groups

### BR-GROUP-01: Múltiples grupos por usuario

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Un usuario puede pertenecer a múltiples grupos simultáneamente. Sin límite de grupos en MVP. |
| **Refs**        | US-038, E-003, E-004                                           |

---

### BR-GROUP-02: Historial preservado al salir del grupo

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Al salir un miembro del grupo, su historial de participaciones se preserva. |
| **Refs**        | US-040, E-004, E-008                                           |

---

### BR-GROUP-03: Conflictos de edición — último en guardar gana

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Conflictos de edición concurrente en datos del grupo: último en guardar gana. Sin merge complejo en MVP. |
| **Reversible**  | Med                                                            |
| **Refs**        | §5 Integraciones, §8 Infra                                     |

---

### BR-GROUP-04: Eliminar grupo → archivado, no borrado

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Eliminar grupo: operación de archivado (`Group.archived_at`), no borrado físico del historial. |
| **Refs**        | US-038, E-003                                                  |

---

### BR-GROUP-05: Invite link con expiración

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | El link de invitación tiene expiración. Si expira → el owner genera uno nuevo. |
| **Error**       | `GROUP_INVITE_EXPIRED`                                         |
| **Refs**        | US-039, US-040, E-003                                          |

---

## BR-ENTITY — Integridad de Entidades

### BR-ENTITY-01: Nombre de jugador único por cuenta/grupo

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | `UNIQUE(name, group_id)` en Player. Nombre único dentro del mismo grupo o cuenta personal. |
| **Enforcement** | DB unique constraint + Backend                                 |
| **Error**       | `PLAYER_NAME_DUPLICATE`                                        |
| **Refs**        | US-001, US-002, E-009                                          |

---

### BR-ENTITY-02: No eliminar jugador en match activo

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | No se puede eliminar un jugador que está en un match `in_progress`. |
| **Error**       | `PLAYER_IN_ACTIVE_MATCH_CANNOT_DELETE`                         |
| **Refs**        | US-003, E-009, E-005                                           |

---

### BR-ENTITY-03: Soft delete para Player/Deck con historial

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Player y Deck con Participations históricas → soft delete únicamente. |
| **Enforcement** | Backend: verificar Participations antes de eliminar            |
| **Refs**        | US-003, US-007, BR-DECK-07, E-009, E-002                       |

---

### BR-ENTITY-04: No eliminar commander referenciado en decks activos

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | No se puede eliminar un Commander referenciado en decks que no están soft-deleted. |
| **Error**       | `COMMANDER_IN_USE_CANNOT_DELETE`                               |
| **Refs**        | US-009, E-001, E-002                                           |

---

### BR-ENTITY-05: Colores de Commander — solo WUBRG+C

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | `Commander.colors` ⊆ `['W','U','B','R','G','C']`. Ningún otro valor es válido. |
| **Enforcement** | DB check constraint + Frontend select restringido              |
| **Error**       | `COMMANDER_INVALID_COLOR`                                      |
| **Refs**        | US-008, E-001, 09_GLOSSARY                                     |

---

## BR-I18N — Internacionalización

### BR-I18N-01: Idiomas soportados — EN/ES con fallback EN

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | La app soporta EN y ES. Detección automática del idioma del dispositivo. Fallback a EN si idioma no soportado. |
| **Refs**        | US-041, FT-018, E-011 (language setting)                       |

---

### BR-I18N-02: Terminología MTG siempre en inglés

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Términos del universo MTG (Commander, Infect, Scoop, Proliferate, Mill, etc.) se mantienen en inglés en AMBOS idiomas. No se traducen. |
| **Refs**        | US-041, 09_GLOSSARY                                            |

---

### BR-I18N-03: Nombres de commanders — siempre en inglés

| Atributo        | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Invariante**  | Nombres de commanders son nombres propios de cartas MTG — siempre en inglés en ambos idiomas de la app. |
| **Refs**        | US-041, E-001                                                  |

---

## Cálculos y Fórmulas

### CALC-001: Win Rate

| Atributo          | Valor                                                |
| ----------------- | ---------------------------------------------------- |
| **Descripción**   | Porcentaje de victorias de una entidad (jugador, deck, commander) |
| **Cuándo se usa** | FT-008, FT-009, FT-010, FT-012                       |
| **Filtro SSOT**   | Solo matches con `status = 'completed'` (BR-STATS-01) |

**Fórmula:**

```
win_rate = (wins / total_completed_matches) × 100
```

**Inputs:**

| Variable                  | Tipo    | Descripción                                         |
| ------------------------- | ------- | --------------------------------------------------- |
| `wins`                    | integer | Participations con `result = 'win'` en matches completed |
| `total_completed_matches` | integer | Matches completed donde la entidad participó (excluye abandoned) |

**Output:** Porcentaje (0–100). Si `total_completed_matches = 0` → mostrar "Sin partidas" (no dividir entre cero).

**Ejemplo:**

```
wins = 4, total_completed = 10
win_rate = (4 / 10) × 100 = 40%
```

**Nota sobre draws:** Draws cuentan en `total_completed_matches` pero no en `wins`. Es decir, un draw reduce el win rate.

---

### CALC-002: Commander Damage Acumulado

| Atributo          | Valor                                                |
| ----------------- | ---------------------------------------------------- |
| **Descripción**   | Daño total infligido por un commander específico a una Participation específica |
| **Cuándo se usa** | FT-013, BR-TRACK-04                                  |

**Fórmula:**

```
cmd_damage_total[commander_id] = SUM(delta) WHERE event_type = 'commander_damage' AND commander_id = X AND is_undone = false
```

**Threshold de alerta:** `cmd_damage_total >= 21` → alerta visual (BR-TRACK-04)

---

### CALC-003: Life Total en vivo

| Atributo          | Valor                                                |
| ----------------- | ---------------------------------------------------- |
| **Descripción**   | Vida actual de un jugador durante un match           |
| **Cuándo se usa** | FT-005, BR-TRACK-01                                  |

**Fórmula:**

```
life_total = default_life_total + SUM(delta) WHERE event_type = 'life_change' AND is_undone = false
```

**Nota:** `life_total` puede ser 0 o negativo — la app lo permite sin tomar acción automática (BR-MATCH-05).

---

## Validaciones de Datos

### VAL-001: Player.name

| Campo  | Regla                             | Error                  |
| ------ | --------------------------------- | ---------------------- |
| name   | Non-empty string, 1–50 chars      | `PLAYER_NAME_INVALID`  |
| name   | Unique per (name, group_id)       | `PLAYER_NAME_DUPLICATE` |

---

### VAL-002: Commander.colors

| Campo  | Regla                                      | Error                    |
| ------ | ------------------------------------------ | ------------------------ |
| colors | Array, subset de ['W','U','B','R','G','C'] | `COMMANDER_INVALID_COLOR` |
| colors | Puede ser vacío (commander incoloro)       | —                         |

---

### VAL-003: UserSettings.debounce_threshold_ms

| Campo                  | Regla                  | Error                          |
| ---------------------- | ---------------------- | ------------------------------ |
| debounce_threshold_ms  | integer, 200 ≤ x ≤ 2000 | `SETTINGS_DEBOUNCE_OUT_OF_RANGE` |

---

### VAL-004: Match Participation count

| Campo         | Regla          | Error                         |
| ------------- | -------------- | ----------------------------- |
| participations | 2 ≤ count ≤ 4 | `MATCH_INVALID_PLAYER_COUNT`  |

---

### VAL-005: Deck.is_partner

| Campo          | Regla                                                           | Error                                    |
| -------------- | --------------------------------------------------------------- | ---------------------------------------- |
| is_partner     | Si true → commander_id AND commander_id_2 NOT NULL              | `DECK_PARTNER_REQUIRES_TWO_COMMANDERS`   |
| is_partner     | Si false → commander_id_2 MUST BE NULL                          | —                                        |

---

## Códigos de Error del Proyecto

| Código                                  | Cuándo                                             | Mensaje user-friendly                                    |
| --------------------------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| `MATCH_INVALID_PLAYER_COUNT`            | Match con < 2 o > 4 jugadores                      | "Un match requiere entre 2 y 4 jugadores."               |
| `MATCH_DECK_DUPLICATE`                  | Mismo deck asignado a 2 jugadores en el match      | "Un deck no puede usarse dos veces en el mismo match."   |
| `DECK_IN_ACTIVE_MATCH`                  | Deck en match in_progress seleccionado en otro setup | "Este deck está en una partida activa."                |
| `DECK_IN_ACTIVE_MATCH_CANNOT_DELETE`    | Intento de eliminar deck en match activo           | "No puedes eliminar un deck con una partida en curso."   |
| `DECK_PARTNER_REQUIRES_TWO_COMMANDERS`  | Partner deck con solo un commander                 | "Los decks con Partner requieren dos commanders."        |
| `PLAYER_NAME_DUPLICATE`                 | Nombre de jugador ya existe en contexto            | "Ya existe un jugador con ese nombre en este grupo."     |
| `PLAYER_NAME_INVALID`                   | Nombre vacío o fuera de rango                      | "El nombre del jugador no es válido."                    |
| `PLAYER_IN_ACTIVE_MATCH_CANNOT_DELETE`  | Eliminar jugador en match activo                   | "No puedes eliminar un jugador con una partida en curso."|
| `COMMANDER_IN_USE_CANNOT_DELETE`        | Commander referenciado en decks activos            | "Este commander está en uso por uno o más decks activos."|
| `COMMANDER_INVALID_COLOR`               | Color fuera de WUBRG+C                             | "Color de mana no válido."                               |
| `AUTH_EMAIL_PROVIDER_CONFLICT`          | Email ya registrado con otro provider              | "Este email está registrado con [provider]. Usa ese método para ingresar." |
| `GROUP_INVITE_EXPIRED`                  | Link de invitación expirado                        | "Este link de invitación ha expirado. Pide uno nuevo al owner del grupo." |
| `SETTINGS_DEBOUNCE_OUT_OF_RANGE`        | debounce_threshold_ms fuera de 200–2000            | "Valor fuera de rango (200–2000ms)."                     |
| `UNAUTHORIZED`                          | Acción que requiere auth sin sesión                | "Por favor inicia sesión para continuar."                |
| `FORBIDDEN`                             | Acción sin permisos suficientes                    | "No tienes permiso para esta acción."                    |
| `NOT_FOUND`                             | Recurso no existe                                  | "No encontrado."                                         |

---

## Open Questions

| #     | Pregunta                                                                              | Impacto     | Owner   |
| ----- | ------------------------------------------------------------------------------------- | ----------- | ------- |
| OQ-01 | ¿El life total puede ser negativo (ir debajo de 0) o tiene floor en 0 igual que poison? | Med | Cliente |
| OQ-02 | ¿Existe un máximo de life total (cap superior) o es ilimitado?                         | Low | Dev     |
| OQ-03 | ¿BR-GROUP-03 (último en guardar gana) requiere algún indicador visual de "datos desactualizados" al usuario? | Med | Cliente |
| OQ-04 | ¿Los cambios de Settings en mid-session aplican si el usuario NO tiene ningún match activo? | Low | Dev |

---

## Assumptions

| #    | Supuesto                                                                              | Si es incorrecto                                |
| ---- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| A-01 | Life total puede ir por debajo de 0 (sin floor). La app no lo limita.                 | Si se confirma floor en 0, ajustar CALC-003 y Frontend. |
| A-02 | Hard delete solo se aplica a entidades sin historial; soft delete si tienen Participations. | Si se requiere hard delete siempre, simplificar lógica. |
| A-03 | Las stats se calculan desde los datos crudos (no existe tabla de pre-cómputo en MVP). | Si la performance lo requiere, agregar materialized view o cache. |
| A-04 | `Group.archived_at` es suficiente para el flujo de "eliminar grupo" sin pantalla de confirmación adicional. | Ajustar si se requiere UI de confirmación más explícita. |

---

_Generado por TimeKast Factory — /docs_
