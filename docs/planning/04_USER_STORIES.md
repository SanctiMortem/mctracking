# 📝 User Stories — MTG Commander Tracker

> Generado desde Discovery Brief §3 + 02_FEATURE_MAP por `/docs`
> **Fuente:** `docs/planning/00_DISCOVERY_BRIEF.md`, `docs/planning/02_FEATURE_MAP.md`
> **SSOT:** Este documento define user stories con acceptance criteria.
> **Versión:** 1.0 — 2026-04-09

---

## Épicas

| Épica | Nombre                    | Descripción                                              | Prioridad  | Features        |
| ----- | ------------------------- | -------------------------------------------------------- | ---------- | --------------- |
| E1    | Data Foundation           | CRUD de entidades base: jugadores, decks, commanders.    | 🔴 Must    | FT-001,002,003  |
| E2    | Match Lifecycle           | Flujo completo de una partida: setup → tracker → cierre. | 🔴 Must    | FT-004,005,006  |
| E3    | Live Tracking             | Tracking en vivo: commander damage, poison, event log, undo. | 🔴 Must | FT-013,014,015  |
| E4    | History & Stats           | Historial de partidas y motor de estadísticas.           | 🔴 Must    | FT-007,008,009,010,011,012 |
| E5    | Platform                  | Auth, grupos de amigos, i18n, settings, home.            | 🔴 Must    | FT-016,017,018,019,020 |

---

<!-- STORIES START — generadas en sub-batches -->

---

## Épica E1: Data Foundation

> FT-001 CRUD Jugadores · FT-002 CRUD Decks · FT-003 CRUD Commanders

---

### FT-001 — CRUD Jugadores

#### US-001: Crear jugador nuevo

| Atributo       | Valor                  |
| -------------- | ---------------------- |
| **Feature**    | FT-001                 |
| **Prioridad**  | 🔴 Must Have           |
| **Persona**    | P-002 (User)           |
| **Estimación** | S                      |
| **Reglas**     | BR-ENTITY-01           |

**Como** usuario autenticado,
**quiero** crear un jugador con un nombre único dentro de mi cuenta o grupo
**para** registrarlo en futuras partidas sin tener que escribir su nombre cada vez.

```gherkin
Scenario: Crear jugador con nombre válido
  Given estoy en la pantalla Jugadores (P02)
  And no existe un jugador llamado "Rodrigo" en mi contexto actual
  When ingreso el nombre "Rodrigo" y confirmo
  Then se crea el jugador "Rodrigo"
  And aparece en la lista de jugadores

Scenario: Error — nombre duplicado en el mismo contexto
  Given ya existe un jugador llamado "Rodrigo" en mi grupo activo
  When intento crear un jugador con el nombre "Rodrigo"
  Then se muestra un error "Ya existe un jugador con ese nombre en este grupo" (BR-ENTITY-01)
  And no se crea ningún jugador nuevo
```

---

#### US-002: Editar nombre de jugador

| Atributo       | Valor                  |
| -------------- | ---------------------- |
| **Feature**    | FT-001                 |
| **Prioridad**  | 🔴 Must Have           |
| **Persona**    | P-002 (User)           |
| **Estimación** | S                      |
| **Reglas**     | BR-ENTITY-01           |

**Como** usuario autenticado,
**quiero** editar el nombre de un jugador existente
**para** corregir errores tipográficos o actualizar el apodo del jugador.

```gherkin
Scenario: Editar nombre a uno disponible
  Given existe el jugador "Rodrigo" en mi lista
  When edito su nombre a "Rodri"
  Then el jugador aparece como "Rodri" en toda la app (historial incluido)

Scenario: Error — editar a nombre ya existente
  Given existen los jugadores "Rodrigo" y "Carlos" en mi grupo
  When intento renombrar "Rodrigo" a "Carlos"
  Then se muestra un error "Ya existe un jugador con ese nombre" (BR-ENTITY-01)
  And el nombre de "Rodrigo" no cambia
```

---

#### US-003: Eliminar jugador (soft delete)

| Atributo       | Valor                  |
| -------------- | ---------------------- |
| **Feature**    | FT-001                 |
| **Prioridad**  | 🔴 Must Have           |
| **Persona**    | P-002 (User)           |
| **Estimación** | S                      |
| **Reglas**     | BR-ENTITY-02, BR-ENTITY-03 |

**Como** usuario autenticado,
**quiero** eliminar un jugador que ya no participa en mi grupo
**para** mantener la lista limpia sin perder el historial de sus partidas.

```gherkin
Scenario: Eliminar jugador con historial — soft delete
  Given el jugador "Ana" tiene participaciones en matches pasados
  When selecciono "Eliminar" en el perfil de "Ana" y confirmo
  Then "Ana" ya no aparece en la lista de jugadores activos
  And sus partidas históricas siguen visibles en el historial (BR-ENTITY-03)
  And "Ana" no puede ser seleccionada en nuevos match setups

Scenario: Error — intentar eliminar jugador en match activo
  Given el jugador "Ana" está en un match con status "in_progress"
  When intento eliminar a "Ana"
  Then se muestra un error "No puedes eliminar un jugador con una partida en curso" (BR-ENTITY-02)
  And "Ana" no es eliminada
```

---

### FT-002 — CRUD Decks

#### US-004: Crear deck con un commander

| Atributo       | Valor                  |
| -------------- | ---------------------- |
| **Feature**    | FT-002                 |
| **Prioridad**  | 🔴 Must Have           |
| **Persona**    | P-002 (User)           |
| **Estimación** | M                      |
| **Reglas**     | BR-DECK-01, BR-DECK-02 |

**Como** usuario autenticado,
**quiero** registrar un deck con su nombre y commander
**para** poder usarlo en futuras partidas y trackear sus stats.

```gherkin
Scenario: Crear deck con commander obligatorio
  Given estoy en el formulario de creación de deck
  And el setting "require_commander" está en true (default)
  And existe el commander "Atraxa, Praetors' Voice" en mi lista
  When ingreso nombre "Proliferación Total", selecciono commander "Atraxa, Praetors' Voice", y confirmo
  Then se crea el deck "Proliferación Total" con commander "Atraxa"
  And el deck aparece en mi lista de decks

Scenario: Error — crear deck sin commander cuando es obligatorio
  Given el setting "require_commander" está en true
  When intento crear un deck con nombre "Sin Commander" sin seleccionar commander
  Then el botón de confirmación permanece desactivado (BR-DECK-01, BR-DECK-02)
  And no se crea ningún deck
```

---

#### US-005: Crear deck con partner commanders

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-002                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |
| **Reglas**     | BR-DECK-03              |

**Como** usuario autenticado,
**quiero** crear un deck con dos commanders marcados como Partner
**para** trackear el commander damage de cada uno de forma independiente.

```gherkin
Scenario: Crear deck con toggle Partner activado y ambos commanders seleccionados
  Given estoy en el formulario de creación de deck
  When activo el toggle "Partner?" 
  And selecciono "Thrasios, Triton Hero" como Commander 1
  And selecciono "Tymna the Weaver" como Commander 2
  And confirmo con nombre "Selvala Explorer's Pod"
  Then se crea el deck con is_partner = true, commander_id y commander_id_2 asignados (BR-DECK-03)

Scenario: Error — activar Partner pero seleccionar solo un commander
  Given activo el toggle "Partner?" en el formulario
  And selecciono solo "Thrasios, Triton Hero" como Commander 1
  When intento confirmar
  Then se muestra un error "Los decks con Partner requieren dos commanders" (BR-DECK-03)
  And el deck no se crea
```

---

#### US-006: Editar deck existente

| Atributo       | Valor                  |
| -------------- | ---------------------- |
| **Feature**    | FT-002                 |
| **Prioridad**  | 🔴 Must Have           |
| **Persona**    | P-002 (User)           |
| **Estimación** | S                      |

**Como** usuario autenticado,
**quiero** editar el nombre, descripción o commander de un deck existente
**para** mantener la información del deck actualizada.

```gherkin
Scenario: Editar nombre y descripción de deck
  Given existe el deck "Proliferación Total" en mi lista
  When edito su nombre a "Atraxa Infect" y agrego descripción "Enfoque en infect y counters"
  Then el deck aparece como "Atraxa Infect" con la nueva descripción
  And el historial de matches previos del deck se preserva bajo el nuevo nombre

Scenario: Cambiar commander de un deck sin historial
  Given existe el deck "Mi Deck" sin participaciones históricas
  When cambio su commander a "Meren of Clan Nel Toth"
  Then el deck actualiza su commander y su color_identity se recalcula automáticamente
```

---

#### US-007: Eliminar deck (soft delete)

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-002                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | S                       |
| **Reglas**     | BR-DECK-06, BR-DECK-07, BR-DECK-08 |

**Como** usuario autenticado,
**quiero** eliminar un deck que ya no uso
**para** mantener mi lista de decks limpia sin perder el historial.

```gherkin
Scenario: Eliminar deck con historial — soft delete
  Given el deck "Atraxa Infect" tiene 5 participaciones en matches pasados
  When selecciono "Eliminar deck" y confirmo
  Then el deck desaparece de la lista de decks activos
  And sus stats históricas siguen visibles en el historial (BR-DECK-07)
  And no puede ser seleccionado en nuevos setups

Scenario: Error — intentar eliminar deck en match activo
  Given el deck "Atraxa Infect" está en un match con status "in_progress"
  When intento eliminar el deck
  Then se muestra un error "No puedes eliminar un deck con una partida en curso" (BR-DECK-08)
```

---

### FT-003 — CRUD Commanders

#### US-008: Crear commander nuevo

| Atributo       | Valor                  |
| -------------- | ---------------------- |
| **Feature**    | FT-003                 |
| **Prioridad**  | 🔴 Must Have           |
| **Persona**    | P-002 (User)           |
| **Estimación** | S                      |
| **Reglas**     | BR-ENTITY-05           |

**Como** usuario autenticado,
**quiero** agregar un commander con su nombre y colores WUBRG
**para** asignarlo a un deck y trackear sus stats individuales.

```gherkin
Scenario: Crear commander con colores válidos
  Given estoy en la pantalla CRUD Commanders (P15)
  When ingreso nombre "Atraxa, Praetors' Voice", selecciono colores W U B G, y confirmo
  Then se crea el commander "Atraxa" con colors = ['W','U','B','G']
  And aparece en la lista de commanders

Scenario: Error — seleccionar color inválido
  Given estoy creando un commander
  When intento guardar con un color fuera del set ['W','U','B','R','G','C']
  Then el sistema bloquea la selección (BR-ENTITY-05)
  And solo los 6 colores válidos están disponibles en la UI
```

---

#### US-009: Editar commander existente

| Atributo       | Valor                  |
| -------------- | ---------------------- |
| **Feature**    | FT-003                 |
| **Prioridad**  | 🔴 Must Have           |
| **Persona**    | P-002 (User)           |
| **Estimación** | S                      |
| **Reglas**     | BR-ENTITY-04           |

**Como** usuario autenticado,
**quiero** editar el nombre o colores de un commander existente
**para** corregir errores tipográficos o actualizar la información.

```gherkin
Scenario: Editar nombre de commander sin decks activos
  Given el commander "Atrixa" existe (nombre con typo) y no está en decks activos
  When corrijo el nombre a "Atraxa, Praetors' Voice"
  Then el commander se actualiza en toda la app

Scenario: Error — eliminar commander referenciado en decks activos
  Given el commander "Atraxa" está asignado al deck "Proliferación Total" (no deleted)
  When intento eliminar el commander "Atraxa"
  Then se muestra un error "Este commander está en uso por uno o más decks activos" (BR-ENTITY-04)
  And el commander no se elimina
```

---

## Épica E2: Match Lifecycle (parte 1)

> FT-004 Match Setup · FT-005 Match Tracker en vivo

---

### FT-004 — Match Setup

#### US-010: Configurar match con 4 jugadores

| Atributo       | Valor                         |
| -------------- | ----------------------------- |
| **Feature**    | FT-004                        |
| **Prioridad**  | 🔴 Must Have                  |
| **Persona**    | P-002 (User), P-003/P-004     |
| **Estimación** | M                             |
| **Reglas**     | BR-MATCH-01, BR-MATCH-02, BR-MATCH-03 |

**Como** usuario autenticado,
**quiero** configurar una partida seleccionando jugadores y sus decks
**para** que la partida quede registrada con todos sus participantes desde el inicio.

```gherkin
Scenario: Setup exitoso con 4 jugadores y decks distintos
  Given estoy en Match Setup (P06)
  And existen los jugadores Ana, Carlos, Miguel, Sara con decks distintos asignados
  When selecciono los 4 jugadores, asigno un deck único a cada uno, y presiono "Iniciar"
  Then se crea el Match con status "in_progress"
  And se crean 4 Participations con life_total = 40 cada una (BR-MATCH-01, BR-MATCH-03)
  And la app navega al Match Tracker (P07)

Scenario: Setup con 2 jugadores (mínimo válido)
  Given selecciono exactamente 2 jugadores con decks distintos
  When presiono "Iniciar"
  Then se crea el Match con 2 Participations y navega al Tracker (BR-MATCH-01)
```

---

#### US-011: Validación — deck repetido en el mismo match

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-004                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | S                       |
| **Reglas**     | BR-MATCH-02, BR-MATCH-03 |

**Como** usuario autenticado,
**quiero** que la app me impida iniciar un match con el mismo deck asignado a dos jugadores
**para** garantizar la integridad del registro de la partida.

```gherkin
Scenario: Error — mismo deck asignado a dos jugadores
  Given estoy en Match Setup con Ana y Carlos
  When asigno el deck "Atraxa Infect" tanto a Ana como a Carlos
  Then el botón "Iniciar" permanece desactivado con mensaje "Un deck no puede usarse dos veces en el mismo match" (BR-MATCH-02)
  And el match no se crea hasta que se resuelva el conflicto
```

---

#### US-012: Validación — deck ya en match activo

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-004                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | S                       |
| **Reglas**     | BR-MATCH-04, BR-DECK-06 |

**Como** usuario autenticado,
**quiero** que la app me impida usar un deck que ya está en una partida activa
**para** evitar inconsistencias en el tracking simultáneo.

```gherkin
Scenario: Error — deck en match in_progress
  Given el deck "Meren Reanimator" está en un match con status "in_progress"
  When intento seleccionar ese deck en un nuevo setup
  Then el deck aparece deshabilitado con indicador "En partida activa" (BR-MATCH-04)
  And no puede ser seleccionado hasta que el match activo termine
```

---

### FT-005 — Match Tracker en vivo

#### US-013: Acceder al tracker al iniciar o retomar un match

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-005                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |
| **Reglas**     | BR-TRACK-07             |

**Como** usuario autenticado,
**quiero** que al iniciar o retomar un match la pantalla del tracker aparezca con las secciones divididas según el número de jugadores
**para** poder trackear a todos los jugadores simultáneamente desde un único dispositivo.

```gherkin
Scenario: Abrir tracker con 4 jugadores — layout 4 secciones
  Given un match "in_progress" con 4 participations fue creado
  When navego al Match Tracker (P07)
  Then la pantalla se divide en 4 secciones iguales
  And cada sección muestra: nombre del jugador, life total (40), poison (0), commander(s)
  And las secciones están orientadas en el layout default (BR-TRACK-07)

Scenario: Retomar match desde banner en Home
  Given hay un match "in_progress" y navego a Home (P01)
  When toco el banner "Partida en curso — Retomar"
  Then la app navega directamente al Match Tracker con el estado actual del match preservado
```

---

#### US-014: Modificar life total de un jugador

| Atributo       | Valor                          |
| -------------- | ------------------------------ |
| **Feature**    | FT-005                         |
| **Prioridad**  | 🔴 Must Have                   |
| **Persona**    | P-002 (User), P-001 (Guest)    |
| **Estimación** | M                              |
| **Reglas**     | BR-TRACK-09, BR-TRACK-10       |

**Como** cualquier usuario en el tracker (logueado o guest),
**quiero** tocar el área de vida de un jugador para aumentar o disminuir su life total
**para** reflejar el daño o curación recibidos durante la partida.

```gherkin
Scenario: Reducir vida con taps consecutivos dentro del debounce
  Given Ana tiene life_total = 40 y debounce_threshold = 500ms
  When toco "-1" en la sección de Ana 3 veces en 400ms
  Then se registra un único MatchEvent con delta = -3 y debounce_group_id asignado (BR-TRACK-09)
  And el life_total de Ana se actualiza a 37

Scenario: Incrementar vida (curación)
  Given Carlos tiene life_total = 30
  When toco "+5" en la sección de Carlos
  Then se registra un MatchEvent con delta = +5
  And el life_total de Carlos se actualiza a 35
```

---

#### US-015: Rotar sección del tracker individualmente

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-005                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |
| **Reglas**     | BR-TRACK-13             |

**Como** usuario en el tracker,
**quiero** rotar la sección de un jugador específico 180°
**para** que ese jugador pueda leer su información desde el lado opuesto de la mesa.

```gherkin
Scenario: Rotar sección de jugador individual
  Given el tracker está activo con 4 jugadores
  When el jugador que está sentado enfrente hace un gesto de rotación en su sección
  Then esa sección se rota 180° y su contenido es legible desde el lado opuesto (BR-TRACK-13)
  And las demás secciones no se ven afectadas

Scenario: Rotar de vuelta a orientación original
  Given la sección de Miguel está rotada 180°
  When Miguel hace el gesto de rotación nuevamente
  Then la sección vuelve a su orientación original
```

---

## Épica E2: Match Lifecycle (parte 2)

> FT-006 Cierre de Match + Win Conditions

---

### FT-006 — Cierre de Match + Win Conditions

#### US-016: Cerrar match con ganador y win condition

| Atributo       | Valor                         |
| -------------- | ----------------------------- |
| **Feature**    | FT-006                        |
| **Prioridad**  | 🔴 Must Have                  |
| **Persona**    | P-002 (User), P-003/P-004     |
| **Estimación** | M                             |
| **Reglas**     | BR-MATCH-05, BR-MATCH-08, BR-MATCH-09 |

**Como** usuario en el tracker,
**quiero** cerrar el match seleccionando manualmente quién ganó y bajo qué condición
**para** registrar el resultado oficial de la partida en el historial.

```gherkin
Scenario: Cerrar match con ganador único y win condition
  Given hay un match "in_progress" con Ana, Carlos, Miguel y Sara
  When toco "Cerrar Match" → selecciono "Ana" como ganadora → selecciono "Commander Damage" → confirmo
  Then se crea MatchResult con winner_participation_id = Ana, win_condition = 'commander_damage'
  And el Match.status cambia a "completed"
  And las Participations de Carlos, Miguel, Sara quedan con result = 'lose'
  And Ana queda con result = 'win'
  And la app navega a la pantalla de Resultados (P09) (BR-MATCH-05, BR-MATCH-09)

Scenario: Win condition "Other" para casos no listados
  Given estoy en la pantalla de cierre de match
  When selecciono "Ana" como ganadora y "Other" como win condition
  Then el match se cierra correctamente con win_condition = 'other'
```

---

#### US-017: Cerrar match como draw

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-006                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | S                       |
| **Reglas**     | BR-MATCH-08             |

**Como** usuario en el tracker,
**quiero** cerrar el match como empate cuando nadie gana
**para** registrar correctamente partidas que terminan sin ganador.

```gherkin
Scenario: Cerrar match como draw
  Given hay un match "in_progress" con Ana y Carlos
  When toco "Cerrar Match" → selecciono "Draw" → confirmo
  Then se crea MatchResult con winner_participation_id = null, is_draw = true
  And ambas Participations quedan con result = 'draw' (BR-MATCH-08)
  And el match aparece como empate en el historial

Scenario: Draw cuenta en total de matches pero no como win
  Given un match cerrado como draw para Ana
  When reviso las stats de Ana
  Then el match aparece en su total_matches pero no en sus wins (BR-STATS-01, BR-STATS-02)
```

---

#### US-018: Abandonar match (abandoned)

| Atributo       | Valor                       |
| -------------- | --------------------------- |
| **Feature**    | FT-006                      |
| **Prioridad**  | 🔴 Must Have                |
| **Persona**    | P-002 (User)                |
| **Estimación** | S                           |
| **Reglas**     | BR-MATCH-06, BR-MATCH-10    |

**Como** usuario en el tracker,
**quiero** marcar un match como "abandonado" cuando la partida se interrumpe sin resultado
**para** cerrar el match activo sin asignar ganador.

```gherkin
Scenario: Abandonar match en curso
  Given hay un match "in_progress" con 3 jugadores
  When toco "Cerrar Match" → selecciono "Abandonar" → confirmo
  Then el Match.status cambia a "abandoned"
  And todas las Participations quedan con result = null (BR-MATCH-10)
  And el match aparece en el historial marcado como "Abandoned"

Scenario: Match abandoned no computa en stats
  Given un match abandonado existe en el historial de Carlos
  When reviso las stats de Carlos
  Then ese match NO aparece en su win rate ni en sus totales de wins/losses (BR-MATCH-06)
```

---

## Épica E4: History & Stats (parte 1)

> FT-007 Historial · FT-008 Stats Jugador · FT-009 Stats Deck · FT-010 Stats Commander

---

### FT-007 — Historial de Matches

#### US-019: Ver historial de matches completados

| Atributo       | Valor                         |
| -------------- | ----------------------------- |
| **Feature**    | FT-007                        |
| **Prioridad**  | 🔴 Must Have                  |
| **Persona**    | P-002 (User), P-003/P-004     |
| **Estimación** | M                             |
| **Reglas**     | BR-MATCH-07, BR-STATS-01      |

**Como** usuario autenticado,
**quiero** ver una lista de mis partidas completadas y abandonadas
**para** revisar el historial de juego de mi cuenta o grupo.

```gherkin
Scenario: Ver historial con matches completados y abandonados
  Given tengo 8 matches completados y 2 abandonados
  When navego a Historial (P04)
  Then veo 10 matches listados, cada uno con: fecha, jugadores, ganador (o "Abandoned")
  And los matches "in_progress" NO aparecen (BR-MATCH-07)
  And los matches están ordenados por fecha descendente (más reciente primero)

Scenario: Historial vacío — primer uso
  Given el usuario no tiene matches registrados
  When navego a Historial
  Then se muestra un estado vacío con mensaje "Sin partidas registradas — ¡Inicia tu primera partida!"
```

---

#### US-020: Filtrar historial por jugador, deck y fecha

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-007                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |
| **Reglas**     | BR-STATS-08             |

**Como** usuario autenticado,
**quiero** filtrar el historial por jugador, deck, commander, fecha, resultado y win condition
**para** encontrar partidas específicas rápidamente.

```gherkin
Scenario: Filtrar por jugador
  Given tengo 10 matches, 6 de los cuales incluyen al jugador "Ana"
  When aplico filtro "Jugador = Ana"
  Then la lista muestra únicamente los 6 matches en que participó Ana (BR-STATS-08)

Scenario: Filtrar por resultado "win"
  Given tengo 10 matches y Carlos ganó 4
  When aplico filtro "Resultado = Win" y "Jugador = Carlos"
  Then la lista muestra las 4 partidas en que Carlos ganó
```

---

#### US-021: Ver detalle de un match

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-007                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |

**Como** usuario autenticado,
**quiero** tocar un match del historial para ver su detalle completo
**para** revisar quién jugó qué deck, el ganador, y la win condition de esa partida.

```gherkin
Scenario: Ver detalle de match completado
  Given el historial muestra el match "Partida del 2026-04-09"
  When toco ese match
  Then navego al Detalle Match (P10) que muestra:
    - Fecha y duración del match
    - Lista de Participations con jugador, deck, commander, resultado
    - Ganador y win condition (o "Draw" / "Abandoned")

Scenario: Detalle muestra el event log si existe
  Given un match tiene 12 MatchEvents registrados
  When abro su detalle
  Then se muestra el event log con todos los cambios de vida, poison y commander damage
```

---

### FT-008 — Stats por Jugador

#### US-022: Ver stats de un jugador

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-008                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |
| **Reglas**     | BR-STATS-01, BR-STATS-02, BR-STATS-03 |

**Como** usuario autenticado,
**quiero** ver el perfil de stats de un jugador
**para** conocer su win rate, decks favoritos y racha de victorias.

```gherkin
Scenario: Ver win rate calculado correctamente
  Given Carlos tiene 10 matches completados: 4 wins, 3 losses, 3 draws
  And 2 matches abandonados (excluidos de stats)
  When navego al Perfil de Carlos (P11)
  Then su win rate aparece como 40% (4/10 × 100) (BR-STATS-01, BR-STATS-02, BR-STATS-03)
  And los matches abandonados NO están en el denominador

Scenario: Stats de jugador con ningún match completado
  Given un jugador nuevo sin matches completados
  When veo su perfil
  Then win rate aparece como "Sin partidas" y no como 0% o error
```

---

#### US-023: Ver decks y commanders más usados por un jugador

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-008                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | S                       |
| **Reglas**     | BR-STATS-04             |

**Como** usuario autenticado,
**quiero** ver con qué decks y commanders juega más un jugador y cuál es su win rate con cada uno
**para** entender su estilo de juego.

```gherkin
Scenario: Ver top decks del jugador con win rate por deck
  Given Ana jugó 5 partidas con "Atraxa Infect" (3W) y 3 con "Meren Reanimator" (1W)
  When veo el perfil de Ana (P11)
  Then aparece una lista de decks ordenada por uso
  And "Atraxa Infect" muestra win rate 60%, "Meren Reanimator" 33%
```

---

### FT-009 — Stats por Deck

#### US-024: Ver stats de un deck

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-009                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |
| **Reglas**     | BR-STATS-04             |

**Como** usuario autenticado,
**quiero** ver las stats de un deck específico
**para** saber qué tan exitoso es el deck como entidad, independientemente de quién lo piloteó.

```gherkin
Scenario: Stats del deck como entidad independiente del jugador
  Given el deck "Meren Reanimator" fue usado por Ana (2W en 4 partidas) y por Carlos (1W en 3 partidas)
  When veo el Detalle del Deck "Meren Reanimator" (P12)
  Then el win rate del deck es 43% (3W / 7 total) (BR-STATS-04)
  And se listan los jugadores que lo usaron y su desempeño individual

Scenario: Ver commander(s) del deck en la pantalla de detalle
  Given el deck "Selvala Partners" tiene 2 commanders (Partner)
  When veo su detalle
  Then se muestran ambos commanders con sus colores WUBRG
```

---

### FT-010 — Stats por Commander

#### US-025: Ver stats de un commander

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-010                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |
| **Reglas**     | BR-STATS-05             |

**Como** usuario autenticado,
**quiero** ver las stats de un commander específico
**para** saber qué tan poderoso es ese commander en el meta de mi grupo.

```gherkin
Scenario: Stats del commander con win rate global
  Given el commander "Atraxa" fue usado en 8 partidas con 5 victorias
  When veo el Detalle del Commander "Atraxa" (P13)
  Then el win rate del commander es 62.5% (5/8)
  And se listan los decks que lo usan y los jugadores que lo pilotearon

Scenario: Stats de commander con Partner — contadores independientes
  Given "Thrasios" y "Tymna" son partners y cada uno apareció en 6 partidas
  When veo las stats de "Thrasios"
  Then sus stats son independientes de las de "Tymna" (BR-STATS-05)
  And el win rate de "Thrasios" se calcula únicamente sobre los matches donde participó
```

---

## Épica E4: History & Stats (parte 2)

> FT-011 Matchup Stats · FT-012 Stats Dashboard Global

---

### FT-011 — Matchup Stats

#### US-026: Ver head-to-head entre dos jugadores

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-011                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | L                       |
| **Reglas**     | BR-STATS-06, BR-STATS-07 |

**Como** usuario autenticado,
**quiero** ver el historial head-to-head entre dos jugadores específicos
**para** saber quién domina la rivalidad y en qué condiciones.

```gherkin
Scenario: Ver matchup entre Ana y Carlos — scope "Todos"
  Given Ana y Carlos participaron juntos en 8 matches (Ana ganó 3, Carlos ganó 4, 1 draw)
  When navego a Matchup Stats (P14), selecciono "Ana vs Carlos", scope = "Todos"
  Then se muestra: Ana 3W / Carlos 4W / 1 Draw de 8 matches compartidos (BR-STATS-06)

Scenario: Cambiar scope a "Solo 1v1"
  Given de los 8 matches, solo 2 fueron partidas de exactamente 2 jugadores (N_players=2)
  When cambio el scope a "Solo 1v1"
  Then el matchup se recalcula usando únicamente esos 2 matches (BR-STATS-06)
  And los totales cambian acorde al filtro
```

---

#### US-027: Ver matchup entre dos decks

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-011                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |
| **Reglas**     | BR-STATS-04, BR-STATS-06 |

**Como** usuario autenticado,
**quiero** ver el matchup entre dos decks específicos
**para** entender qué deck tiene ventaja sobre el otro en mi meta.

```gherkin
Scenario: Matchup deck vs deck
  Given "Atraxa Infect" y "Meren Reanimator" coincidieron en 5 matches (Atraxa ganó 3)
  When selecciono matchup "Atraxa Infect vs Meren Reanimator"
  Then se muestra: Atraxa 3W / Meren 2W de 5 matches compartidos
  And el win rate de Atraxa en este matchup aparece como 60%
```

---

### FT-012 — Stats Dashboard Global

#### US-028: Ver dashboard global de stats

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-012                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User), P-003/P-004 |
| **Estimación** | L                       |
| **Reglas**     | BR-STATS-01, BR-STATS-07 |

**Como** usuario autenticado,
**quiero** ver un dashboard con rankings y resúmenes globales de todas las partidas
**para** tener una vista consolidada del desempeño de mi grupo.

```gherkin
Scenario: Dashboard muestra ranking de jugadores por win rate
  Given el grupo tiene 4 jugadores con distintos win rates
  When navego a Stats (P05)
  Then veo un ranking de jugadores ordenado por win rate descendente
  And jugadores con el mismo win rate aparecen en empate visible (BR-STATS-07)

Scenario: Dashboard muestra total de matches jugados
  Given el grupo tiene 15 matches completados y 3 abandonados
  When veo el Dashboard Global
  Then se muestra "15 partidas completadas" como métrica principal (BR-STATS-03)
  And los 3 abandonados NO están incluidos en el conteo de stats
```

---

#### US-029: Empate en ranking — múltiples jugadores mismo win rate

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-012                  |
| **Prioridad**  | 🟡 Should Have          |
| **Persona**    | P-002 (User)            |
| **Estimación** | S                       |
| **Reglas**     | BR-STATS-07             |

**Como** usuario autenticado,
**quiero** que cuando dos jugadores tienen el mismo win rate aparezcan en el mismo puesto del ranking
**para** que el ranking sea justo y transparente.

```gherkin
Scenario: Dos jugadores empatados en win rate
  Given Ana y Carlos ambos tienen 50% de win rate (3W/6 partidas cada uno)
  When veo el ranking del dashboard
  Then Ana y Carlos aparecen en la misma posición (ej: "1°" ambos) (BR-STATS-07)
  And no se usa un criterio de desempate arbitrario sin comunicárselo al usuario
```

---

## Épica E3: Live Tracking

> FT-013 Commander Damage · FT-014 Poison Counters · FT-015 Event Log + Undo

---

### FT-013 — Commander Damage Tracking

#### US-030: Registrar commander damage de un oponente

| Atributo       | Valor                         |
| -------------- | ----------------------------- |
| **Feature**    | FT-013                        |
| **Prioridad**  | 🔴 Must Have                  |
| **Persona**    | P-002 (User), P-001 (Guest)   |
| **Estimación** | M                             |
| **Reglas**     | BR-TRACK-02, BR-TRACK-04      |

**Como** usuario en el tracker,
**quiero** registrar el daño de commander de un oponente específico sobre un jugador
**para** saber cuándo se alcanza la condición de derrota por 21 puntos.

```gherkin
Scenario: Registrar 21 commander damage — alerta visual sin acción automática
  Given Carlos tiene 18 de commander damage del commander "Atraxa" de Ana
  When agrego 3 puntos de commander damage de "Atraxa" sobre Carlos
  Then el contador de "Atraxa → Carlos" pasa a 21
  And se muestra una alerta visual "⚠️ 21 Commander Damage" (BR-TRACK-04)
  And la app NO elimina a Carlos automáticamente del match

Scenario: Commander damage por commander_id — no por player
  Given Ana tiene 2 commanders: "Thrasios" y "Tymna" (partner deck)
  When registro 10 de "Thrasios" sobre Miguel y 11 de "Tymna" sobre Miguel
  Then "Thrasios" tiene contador 10 y "Tymna" tiene contador 11, independientes (BR-TRACK-02)
  And la alerta de 21 se activa por cada commander de forma separada
```

---

#### US-031: Commander damage con partner commanders

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-013                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |
| **Reglas**     | BR-TRACK-03             |

**Como** usuario en el tracker,
**quiero** que los partner commanders tengan contadores de daño separados
**para** trackear correctamente cuándo cada uno de ellos alcanza los 21 puntos de daño.

```gherkin
Scenario: Dos partners — contadores independientes, alertas separadas
  Given Ana tiene deck con partners "Thrasios" y "Tymna"
  And Miguel tiene 20 de "Thrasios" y 5 de "Tymna"
  When agrego 1 de "Thrasios" sobre Miguel
  Then el contador de "Thrasios → Miguel" llega a 21 y se activa alerta (BR-TRACK-03)
  And el contador de "Tymna → Miguel" permanece en 5 sin alerta
```

---

### FT-014 — Poison Counter Tracking

#### US-032: Agregar y visualizar poison counters

| Atributo       | Valor                       |
| -------------- | --------------------------- |
| **Feature**    | FT-014                      |
| **Prioridad**  | 🔴 Must Have                |
| **Persona**    | P-002 (User), P-001 (Guest) |
| **Estimación** | S                           |
| **Reglas**     | BR-TRACK-05, BR-TRACK-06    |

**Como** usuario en el tracker,
**quiero** agregar poison counters a un jugador y ver una alerta al llegar a 10
**para** detectar la condición de derrota por Infect.

```gherkin
Scenario: Llegar a 10 poison counters — alerta visual
  Given Sara tiene 9 poison counters
  When agrego 1 poison counter a Sara
  Then el contador de Sara llega a 10
  And se muestra una alerta visual "⚠️ 10 Poison Counters — Infect Win Condition" (BR-TRACK-05)
  And la app NO elimina a Sara automáticamente

Scenario: Poison counters no pueden ser negativos
  Given Miguel tiene 0 poison counters
  When intento decrementar sus poison counters por debajo de 0
  Then el contador se mantiene en 0 y no baja más (BR-TRACK-06)
```

---

### FT-015 — Match Event Log + Undo

#### US-033: Deshacer el último cambio en el tracker

| Atributo       | Valor                         |
| -------------- | ----------------------------- |
| **Feature**    | FT-015                        |
| **Prioridad**  | 🔴 Must Have                  |
| **Persona**    | P-002 (User), P-001 (Guest)   |
| **Estimación** | L                             |
| **Reglas**     | BR-TRACK-11                   |

**Como** usuario en el tracker,
**quiero** deshacer el último cambio registrado
**para** corregir errores de tracking sin reiniciar la partida.

```gherkin
Scenario: Undo del último MatchEvent
  Given Ana tenía life_total = 40 y se registró un MatchEvent (delta = -5, new_value = 35)
  When toco "Undo"
  Then el último MatchEvent se marca con is_undone = true (BR-TRACK-11)
  And el life_total de Ana se restaura a 40 (previous_value)
  And el evento aparece tachado en el event log

Scenario: Undo ilimitado — revertir múltiples eventos hacia atrás
  Given existen 5 MatchEvents no-undoneados en el match
  When toco "Undo" 5 veces consecutivamente
  Then los 5 eventos quedan con is_undone = true en orden inverso (BR-TRACK-11)
  And el estado de cada Participation refleja los valores anteriores al primer evento
```

---

#### US-034: Ver event log completo del match

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-015                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |

**Como** usuario en el tracker o en el detalle del match,
**quiero** ver el log completo de eventos de la partida
**para** tener trazabilidad de todos los cambios que ocurrieron.

```gherkin
Scenario: Ver event log en pantalla de detalle post-match
  Given un match completado tiene 20 MatchEvents (3 undoneados)
  When abro el Detalle del Match (P10)
  Then se muestra la lista de eventos con: tipo, delta, jugador afectado, timestamp
  And los eventos undoneados aparecen visualmente diferenciados (tachados o atenuados)

Scenario: Eventos agrupados por debounce_group_id
  Given 4 taps de "-1" de vida en 300ms generaron un MatchEvent con delta = -4 y debounce_group_id asignado
  When veo el event log
  Then ese grupo de taps aparece como un único evento "−4 vida" con su timestamp
```

---

## Épica E5: Platform

> FT-016 Auth · FT-017 Friend Groups · FT-018 i18n · FT-019 Settings · FT-020 Home / Navigation

---

### FT-016 — Auth System (multi-provider)

#### US-035: Registrarse con email y contraseña

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-016                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User — nuevo)    |
| **Estimación** | M                       |
| **Reglas**     | BR-AUTH-02, BR-AUTH-05  |

**Como** usuario nuevo,
**quiero** crear una cuenta con mi email y contraseña
**para** tener acceso completo a todas las features del app.

```gherkin
Scenario: Registro exitoso con email nuevo
  Given estoy en la pantalla de Auth (P16)
  When ingreso email "carlos@example.com", contraseña válida, y confirmo registro
  Then se crea una cuenta con provider = 'email'
  And se crean UserSettings con valores default (BR-AUTH-02)
  And navego a Home (P01)

Scenario: Error — email ya registrado con otro provider
  Given "carlos@example.com" ya existe con provider = 'google'
  When intento registrarme con ese email vía email/password
  Then se muestra: "Este email está registrado con Google. Usa ese método para ingresar." (BR-AUTH-05)
  And no se crea cuenta duplicada
```

---

#### US-036: Iniciar sesión con Google OAuth

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-016                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |
| **Reglas**     | BR-AUTH-05              |

**Como** usuario,
**quiero** iniciar sesión con mi cuenta de Google
**para** no tener que crear ni recordar una contraseña nueva.

```gherkin
Scenario: Login exitoso con Google — primera vez
  Given no tengo cuenta en la app
  When selecciono "Continuar con Google" y autorizo en el flujo OAuth
  Then se crea una cuenta con provider = 'google'
  And se crean UserSettings default y navego a Home (P01)

Scenario: Login exitoso con Google — cuenta existente
  Given ya tengo cuenta con provider = 'google'
  When selecciono "Continuar con Google" y autorizo
  Then inicio sesión en mi cuenta existente sin crear duplicado
  And navego a Home (P01)
```

---

#### US-037: Usar modo Guest sin cuenta

| Atributo       | Valor                       |
| -------------- | --------------------------- |
| **Feature**    | FT-016                      |
| **Prioridad**  | 🔴 Must Have                |
| **Persona**    | P-001 (Guest)               |
| **Estimación** | M                           |
| **Reglas**     | BR-AUTH-01, BR-AUTH-02      |

**Como** visitante sin cuenta,
**quiero** iniciar el tracker básico sin registrarme
**para** poder jugar Commander de inmediato sin fricción de setup.

```gherkin
Scenario: Acceder al Guest Tracker sin cuenta
  Given estoy en la pantalla de bienvenida (P16)
  When toco "Continuar sin cuenta"
  Then navego al Guest Tracker (P19) con secciones de vida básicas
  And no se almacena ningún dato en la nube (BR-AUTH-01)

Scenario: Datos del Guest se descartan al salir
  Given usé el Guest Tracker durante una partida
  When cierro la app o navego fuera del tracker
  Then todos los datos del tracker (life, poison, cmd damage) se descartan
  And al volver a abrir la app se muestra la pantalla de bienvenida nuevamente
```

---

### FT-017 — Friend Groups

#### US-038: Crear un grupo nuevo

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-017                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-004 (Group Owner)     |
| **Estimación** | L                       |
| **Reglas**     | BR-GROUP-01, BR-GROUP-04 |

**Como** usuario autenticado,
**quiero** crear un grupo de amigos
**para** tener una base de datos compartida de jugadores, decks y partidas.

```gherkin
Scenario: Crear grupo exitosamente
  Given soy un usuario autenticado (P-002)
  When navego a Grupos (P17), ingreso nombre "Los Comandantes" y confirmo
  Then se crea el Group con owner_id = mi user_id
  And se crea automáticamente una GroupMembership con role = 'owner'
  And se genera un invite_code único
  And navego a la vista del grupo recién creado

Scenario: Usuario puede pertenecer a múltiples grupos
  Given ya soy owner de "Los Comandantes"
  When acepto una invitación a "Grupo MTG Martes"
  Then soy miembro de ambos grupos simultáneamente (BR-GROUP-01)
```

---

#### US-039: Invitar miembros al grupo

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-017                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-004 (Group Owner)     |
| **Estimación** | M                       |
| **Reglas**     | BR-GROUP-05             |

**Como** Group Owner,
**quiero** generar y compartir un link de invitación al grupo
**para** que mis amigos puedan unirse y acceder a la DB compartida.

```gherkin
Scenario: Generar y compartir link de invitación
  Given soy owner del grupo "Los Comandantes"
  When toco "Invitar miembros" → "Generar link"
  Then se genera un invite_code con expiración visible
  And puedo compartir el link directamente desde la app (WhatsApp, email, etc.)

Scenario: Link expirado — generar nuevo
  Given el invite_code del grupo expiró
  When toco "Generar nuevo link"
  Then se invalida el link anterior y se genera uno nuevo con nueva expiración (BR-GROUP-05)
```

---

#### US-040: Aceptar invitación y unirse al grupo

| Atributo       | Valor                    |
| -------------- | ------------------------ |
| **Feature**    | FT-017                   |
| **Prioridad**  | 🔴 Must Have             |
| **Persona**    | P-003 (Group Member)     |
| **Estimación** | M                        |
| **Reglas**     | BR-GROUP-02              |

**Como** usuario invitado,
**quiero** aceptar una invitación de grupo
**para** acceder a la base de datos compartida del grupo.

```gherkin
Scenario: Aceptar invitación con link válido
  Given tengo un link de invitación válido del grupo "Los Comandantes"
  When abro el link y confirmo la unión
  Then se crea GroupMembership con role = 'member'
  And puedo ver el historial y recursos del grupo (BR-GROUP-02)

Scenario: Error — link expirado
  Given el link de invitación expiró
  When intento usar el link
  Then se muestra "Este link de invitación ha expirado. Pide uno nuevo al owner del grupo." (BR-GROUP-05)
```

---

### FT-018 — i18n (EN/ES)

#### US-041: Cambiar idioma de la app

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-018                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |
| **Reglas**     | BR-I18N-01, BR-I18N-02, BR-I18N-03 |

**Como** usuario,
**quiero** usar la app en español o inglés
**para** interactuar con la interfaz en el idioma de mi preferencia.

```gherkin
Scenario: Detección automática de idioma del dispositivo
  Given el idioma del dispositivo está configurado en "es-MX"
  When abro la app por primera vez
  Then la UI aparece en español (BR-I18N-01)
  And los términos MTG como "Commander Damage", "Infect", "Scoop" permanecen en inglés (BR-I18N-02)

Scenario: Cambiar idioma manualmente en Settings
  Given la app está en español
  When en Settings cambio el idioma a "English"
  Then la UI cambia a inglés sin reiniciar la app
  And los nombres de commanders como "Atraxa, Praetors' Voice" no se traducen (BR-I18N-03)

Scenario: Fallback a inglés para idioma no soportado
  Given el dispositivo tiene idioma "fr-FR" (no soportado)
  When abro la app
  Then la UI aparece en inglés (fallback) (BR-I18N-01)
```

---

### FT-019 — Settings

#### US-042: Configurar debounce threshold del tracker

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-019                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |
| **Reglas**     | BR-TRACK-10, BR-TRACK-12 |

**Como** usuario,
**quiero** configurar el umbral de debounce del tracker entre 200ms y 2000ms
**para** ajustar la sensibilidad de detección de taps rápidos según mi estilo de juego.

```gherkin
Scenario: Cambiar debounce threshold a 1000ms
  Given el debounce_threshold_ms actual es 500ms
  When en Settings muevo el slider a 1000ms y guardo
  Then el setting se guarda como 1000ms en UserSettings (BR-TRACK-10)
  And el nuevo threshold aplica únicamente a matches futuros (BR-TRACK-12)
  And el match actualmente "in_progress" no se ve afectado

Scenario: Error — valor fuera del rango permitido
  Given intento ingresar 2500ms manualmente
  Then el campo muestra error "Valor fuera de rango (200–2000ms)" (BR-TRACK-10)
  And el valor no se guarda
```

---

#### US-043: Configurar life total inicial y commander obligatorio

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-019                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | S                       |
| **Reglas**     | BR-TRACK-01, BR-DECK-02 |

**Como** usuario,
**quiero** configurar el life total inicial (default 40) y si el commander es obligatorio al crear decks
**para** adaptar la app a variantes de Commander que usen diferentes reglas.

```gherkin
Scenario: Cambiar life total inicial
  Given default_life_total = 40
  When en Settings cambio a 30 y guardo
  Then UserSettings.default_life_total = 30
  And el próximo match inicia con life_total = 30 para todos los participantes (BR-TRACK-01)

Scenario: Desactivar commander obligatorio
  Given require_commander = true (default)
  When en Settings desactivo "Commander obligatorio"
  Then UserSettings.require_commander = false
  And al crear un deck, el campo de commander es opcional (BR-DECK-02)
```

---

### FT-020 — Home / Navigation

#### US-044: Ver Home con match activo en banner

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-020                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | M                       |

**Como** usuario autenticado,
**quiero** ver en Home un banner prominente cuando hay una partida en curso
**para** retomar el match rápidamente sin tener que buscarlo.

```gherkin
Scenario: Banner de match activo visible en Home
  Given hay un match con status "in_progress"
  When navego a Home (P01)
  Then aparece un banner "Partida en curso — Retomar" con los jugadores del match
  When toco el banner
  Then navego directamente al Match Tracker (P07) con el estado actual preservado

Scenario: Home sin match activo — muestra últimas partidas
  Given no hay ningún match "in_progress"
  When navego a Home
  Then se muestran las últimas 3–5 partidas completadas en la sección de historial reciente
  And se muestra el win rate global del grupo como stat highlight
```

---

#### US-045: Navegar entre tabs principales

| Atributo       | Valor                   |
| -------------- | ----------------------- |
| **Feature**    | FT-020                  |
| **Prioridad**  | 🔴 Must Have            |
| **Persona**    | P-002 (User)            |
| **Estimación** | S                       |

**Como** usuario autenticado,
**quiero** navegar entre las 5 tabs principales desde cualquier pantalla
**para** acceder rápidamente a Jugadores, Decks, Historial y Stats sin pasos adicionales.

```gherkin
Scenario: Tab bar visible y funcional desde todas las pantallas principales
  Given estoy en la pantalla de Historial (P04)
  When toco el tab "Stats"
  Then navego a Stats Dashboard (P05) sin perder el estado de la sesión

Scenario: Tab bar oculto durante el tracker en vivo
  Given hay un match "in_progress" y estoy en el Match Tracker (P07 — fullscreen modal)
  Then el tab bar NO es visible durante la partida
  And el único acceso de salida es el botón "Cerrar Match" o "Minimizar"
```

---

## Priorización MoSCoW

### 🔴 Must Have (MVP) — 45 stories

Todas las stories US-001 → US-045 son Must Have. Cubren los 20 features del MVP distribuidos en los 4 Batches del Brief.

| Batch | Features         | Stories        | Épica |
| ----- | ---------------- | -------------- | ----- |
| 1     | FT-001→003 + 004 + 006 | US-001→018 | E1, E2 |
| 2     | FT-005 + 007→010 + 013→015 | US-013→015 + 019→025 + 030→034 | E2, E3, E4 |
| 3     | FT-011→012       | US-026→029     | E4    |
| 4     | FT-016→020       | US-035→045     | E5    |

**Total MVP:** 45 user stories

---

## Dependencias entre Stories

```
US-008 (Commander) ──► US-004 (Deck — necesita commander)
US-004 (Deck) ──► US-010 (Match Setup — necesita decks)
US-001 (Jugador) ──► US-010 (Match Setup — necesita jugadores)
US-010 (Match Setup) ──► US-013 (Tracker — necesita match activo)
US-013 (Tracker) ──► US-014 (Life Total)
US-013 (Tracker) ──► US-030 (Commander Damage)
US-013 (Tracker) ──► US-032 (Poison Counters)
US-013 (Tracker) ──► US-033 (Undo)
US-016 (Cierre) ──► US-019 (Historial)
US-019 (Historial) ──► US-022 (Stats Jugador)
US-019 (Historial) ──► US-024 (Stats Deck)
US-019 (Historial) ──► US-025 (Stats Commander)
US-022 (Stats Jugador) ──► US-026 (Matchup Stats)
US-035 (Auth) ──► US-038 (Grupos)
US-035 (Auth) ──► US-042 (Settings)
```

---

## Open Questions

| #     | Pregunta                                                                             | Impacto     | Owner   |
| ----- | ------------------------------------------------------------------------------------ | ----------- | ------- |
| OQ-01 | ¿El Guest Tracker (US-037) permite ingresar nombres de jugadores ad-hoc o solo numera las secciones (J1, J2...)? | Med | Cliente |
| OQ-02 | ¿El flujo de upgrade Guest → User mid-match debe preservar los datos del tracker en curso? | **Alto** | Cliente |
| OQ-03 | ¿Al cambiar de grupo activo hay una pantalla de selección explícita, o el contexto del grupo cambia desde Settings? | **Alto** | Cliente |
| OQ-04 | ¿El tab bar muestra un indicador de "partida activa" cuando hay un match in_progress? | Med | Cliente |

---

## Assumptions

| #    | Supuesto                                                                              | Si es incorrecto                               |
| ---- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| A-01 | Los Gherkin scenarios usan datos concretos del dominio MTG, no datos genéricos.       | Ajustar si el cliente cambia nombres de ejemplo. |
| A-02 | Todas las 45 stories son Must Have — no hay Should Have ni Could Have en MVP.         | Repriorizar si el scope se reduce.             |
| A-03 | La navegación principal es tab bar de 5 tabs siempre visible (excepto en tracker fullscreen). | Rediseñar si cambia la arquitectura de nav. |
| A-04 | Settings aplican a matches futuros únicamente. Los settings mid-match no afectan el match en curso (BR-TRACK-12). | Revisar si se requiere cambio mid-match. |

---

_Generado por TimeKast Factory — /docs_
