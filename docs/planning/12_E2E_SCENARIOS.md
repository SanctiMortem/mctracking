# 🎭 E2E Scenarios — MTG Commander Tracker

> Generado desde 04_USER_STORIES, 05_BUSINESS_RULES, 11_TEST_STRATEGY por `/docs`
> **Fuente:** Discovery Brief §3, §4
> **Versión:** 1.0 — 2026-04-09

---

## Índice

- [Convenciones](#convenciones)
- [E2E-001 — Onboarding y Creación de Cuenta](#e2e-001--onboarding-y-creación-de-cuenta)
- [E2E-002 — Crear Deck con Partner Commanders](#e2e-002--crear-deck-con-partner-commanders)
- [E2E-003 — Partida Completa (4 jugadores)](#e2e-003--partida-completa-4-jugadores)
- [E2E-004 — Tracking con Undo](#e2e-004--tracking-con-undo)
- [E2E-005 — Ver Historial y Stats](#e2e-005--ver-historial-y-stats)
- [E2E-006 — Crear Grupo e Invitar Jugador](#e2e-006--crear-grupo-e-invitar-jugador)
- [E2E-007 — Flujo Guest (sin cuenta)](#e2e-007--flujo-guest-sin-cuenta)
- [E2E-008 — Compra Premium (sandbox)](#e2e-008--compra-premium-sandbox)

---

## Convenciones

### Estado Inicial
Cada escenario define su **precondición** de datos. Los tests E2E dependen de un entorno de staging con datos seed (ver `tests/helpers/seed.ts`).

### Notación de Steps

```
DADO    — precondición o estado inicial
CUANDO  — acción del usuario
ENTONCES — resultado esperado (assertion)
Y       — step adicional (puede ser CUANDO o ENTONCES)
```

### IDs de Maestro
Los `id:` en pasos Maestro corresponden a `testID` props en componentes React Native.

---

## E2E-001 — Onboarding y Creación de Cuenta

**US cubiertos:** US-001, US-040, US-041
**BR cubiertos:** BR-AUTH-01, BR-AUTH-02, BR-AUTH-03
**Duración estimada:** ~60s

### Precondiciones
- App instalada en estado limpio (primer launch o app data limpiada)
- Email de test disponible: `e2e-test-001@mtgtracker.test`
- Cuenta de Clerk para ese email no existe previamente

### Escenario 1.1 — Registro con Email (Happy Path)

```
DADO    que la app se abre por primera vez
ENTONCES se muestra la pantalla de onboarding (P16)
Y       el CTA "Crear cuenta" está visible
Y       la opción "Continuar como invitado" está visible

CUANDO  el usuario toca "Crear cuenta"
ENTONCES se muestra el formulario de registro

CUANDO  introduce email "e2e-test-001@mtgtracker.test" y contraseña válida
Y       toca "Registrarse"
ENTONCES se muestra pantalla de verificación de email
Y       Clerk envía email de verificación

CUANDO  introduce el código de verificación de 6 dígitos
ENTONCES la cuenta queda creada
Y       se navega a la pantalla Home (P01)
Y       el header muestra el avatar del usuario
```

### Escenario 1.2 — Login con cuenta existente

```
DADO    que existe una cuenta con email "e2e-test-001@mtgtracker.test"
Y       la app está en pantalla de onboarding

CUANDO  el usuario toca "Ya tengo cuenta"
Y       introduce email y contraseña correctos
Y       toca "Iniciar sesión"
ENTONCES se navega a la pantalla Home (P01)
Y       se muestran los datos del usuario
```

### Escenario 1.3 — Credenciales incorrectas

```
DADO    que la app está en pantalla de login

CUANDO  el usuario introduce contraseña incorrecta
Y       toca "Iniciar sesión"
ENTONCES se muestra el mensaje de error "Credenciales incorrectas"
Y       el usuario permanece en la pantalla de login
```

### Maestro YAML

```yaml
# .maestro/e2e-001-onboarding.yaml
appId: com.aboutagency.mtgtracker
---
- clearState
- launchApp
- assertVisible: "Bienvenido"
- tapOn: "Crear cuenta"
- assertVisible: "Crear cuenta"
- tapOn:
    id: "input-email"
- typeText: "e2e-test-001@mtgtracker.test"
- tapOn:
    id: "input-password"
- typeText: "TestPassword123!"
- tapOn: "Registrarse"
- assertVisible: "Verifica tu email"
# Nota: verificación de email requiere integración con inbox de test
# En CI usar magic link o Clerk test tokens
- assertNotVisible: "Bienvenido"
```

---

## E2E-002 — Crear Deck con Partner Commanders

**US cubiertos:** US-004, US-005, US-006, US-007
**BR cubiertos:** BR-DECK-01, BR-DECK-02, BR-DECK-03, BR-DECK-04, BR-DECK-05
**Duración estimada:** ~45s

### Precondiciones
- Usuario autenticado (user-1)
- Jugador "Jugador Uno" creado
- Commanders en DB:
  - `cmd-2`: "Thrasios, Triton Hero" (is_partner: true, colors: U/G)
  - `cmd-3`: "Tymna the Weaver" (is_partner: true, colors: W/B)
  - `cmd-1`: "Atraxa" (is_partner: false)

### Escenario 2.1 — Crear deck con un commander (Happy Path)

```
DADO    que el usuario está en la pantalla Home
CUANDO  navega a "Mis Decks" (P10)
Y       toca "Nuevo Deck"
ENTONCES se muestra el formulario de creación (P11)

CUANDO  introduce nombre "Atraxa Superfriends"
Y       selecciona commander "Atraxa, Praetors Voice"
Y       toca "Guardar"
ENTONCES el deck aparece en "Mis Decks"
Y       el color_identity muestra WUBG
```

### Escenario 2.2 — Crear deck con partner commanders

```
DADO    que el usuario está en "Nuevo Deck"
CUANDO  introduce nombre "Thrasios / Tymna"
Y       activa el toggle "Partner Commanders"
Y       selecciona primer commander "Thrasios, Triton Hero"
Y       selecciona segundo commander "Tymna the Weaver"
Y       toca "Guardar"
ENTONCES el deck aparece en "Mis Decks"
Y       muestra ambos commanders: "Thrasios + Tymna"
Y       el color_identity muestra WUBG (unión de U/G + W/B)
```

### Escenario 2.3 — Validación de partners (ambos deben ser is_partner=true)

```
DADO    que el usuario está en "Nuevo Deck" con toggle Partner activado
CUANDO  selecciona commander "Atraxa" (is_partner: false) como primer commander
ENTONCES "Atraxa" no aparece en la lista de partners disponibles
O       si aparece, al intentar guardar se muestra el error "Este commander no puede ser Partner"
```

### Escenario 2.4 — Deck con nombre duplicado

```
DADO    que ya existe un deck llamado "Atraxa Superfriends" del jugador
CUANDO  intenta crear otro deck con el mismo nombre
ENTONCES se muestra el error "Ya tienes un deck con ese nombre"
Y       el deck no se crea
```

### Maestro YAML

```yaml
# .maestro/e2e-002-create-deck-partners.yaml
appId: com.aboutagency.mtgtracker
---
- launchApp
- tapOn: "Mis Decks"
- tapOn: "Nuevo Deck"
- assertVisible: "Crear Deck"
- tapOn:
    id: "input-deck-name"
- typeText: "Thrasios / Tymna"
- tapOn:
    id: "toggle-partner-commanders"
- assertVisible: "Segundo Commander"
- tapOn: "Seleccionar Commander"
- assertVisible: "Thrasios, Triton Hero"
- tapOn: "Thrasios, Triton Hero"
- tapOn: "Seleccionar segundo Commander"
- assertVisible: "Tymna the Weaver"
- tapOn: "Tymna the Weaver"
- tapOn: "Guardar"
- assertVisible: "Thrasios / Tymna"
- assertVisible: "Thrasios + Tymna"
```

---

## E2E-003 — Partida Completa (4 jugadores)

**US cubiertos:** US-010, US-011, US-012, US-013, US-014, US-015, US-016, US-017, US-018, US-024, US-025, US-026, US-027, US-028, US-030, US-031
**BR cubiertos:** BR-MATCH-01→08, BR-TRACK-01→07
**Duración estimada:** ~120s

### Precondiciones
- 4 jugadores y sus decks existentes en DB
- Usuario autenticado con acceso a esos jugadores

### Escenario 3.1 — Setup y inicio de partida

```
DADO    que el usuario está en Home
CUANDO  toca "Nueva Partida"
ENTONCES se muestra la pantalla de configuración (P05)

CUANDO  agrega 4 jugadores: J1, J2, J3, J4
Y       asigna un deck a cada jugador
Y       configura vida inicial en 40
Y       toca "Iniciar Partida"
ENTONCES se muestra la pantalla Tracker (P06)
Y       los 4 jugadores muestran vida: 40
Y       los 4 jugadores muestran poison: 0
Y       el estado del match es "in_progress"
```

### Escenario 3.2 — Tracking de vida (con debounce)

```
DADO    que el match está en progreso y J1 tiene 40 de vida

CUANDO  el usuario toca el botón "-1" de J1 tres veces rápido (< 2s)
ENTONCES se muestra la vida de J1 actualizada en tiempo real: 37
Y       en el servidor, los 3 taps se guardan como UN solo MatchEvent (debounce group)
Y       el delta total es -3

CUANDO  espera más de 2 segundos y toca "-1" de J1 una vez más
ENTONCES se crea un NUEVO MatchEvent separado (nuevo grupo)
Y       la vida de J1 es 36
```

### Escenario 3.3 — Commander damage con alerta de 21

```
DADO    que el match está en progreso

CUANDO  el usuario registra daño de commander a J2:
Y       toca "Commander Damage" → J2 → Commander de J1
Y       introduce 7 de daño
Y       repite 2 veces más (total: 21)
ENTONCES se muestra la alerta "J2 ha recibido 21 de daño de commander"
Y       J2 sigue en juego (BR-TRACK-07: no auto-eliminate)
Y       el contador de J2 muestra "21 dmg de [Commander J1]"
```

### Escenario 3.4 — Poison counters

```
DADO    que el match está en progreso

CUANDO  el usuario agrega 10 poison counters a J3
ENTONCES se muestra el contador de poison de J3: 10
Y       se muestra alerta "J3 tiene 10 venenos — eliminado"
Y       J3 sigue en juego hasta que el usuario lo marque manualmente (BR-TRACK-05)
```

### Escenario 3.5 — Cerrar partida con ganador

```
DADO    que el match está en progreso

CUANDO  el usuario toca "Terminar Partida"
ENTONCES se muestra el sheet de cierre (P08)
Y       aparecen las opciones: "Declarar ganador", "Empate", "Abandonar"

CUANDO  selecciona "Declarar ganador" → J1
Y       selecciona condición de victoria "Commander Damage"
Y       confirma
ENTONCES el match queda con status "completed"
Y       se muestra la pantalla de resumen (P07)
Y       J1 aparece como ganador con win_condition "commander_damage"
Y       las stats de J1, J2, J3, J4 se actualizan
```

### Escenario 3.6 — Cerrar partida como empate

```
DADO    que el match está en progreso
CUANDO  el usuario toca "Terminar Partida" → "Empate" → Confirma
ENTONCES el match queda con status "completed", winner = null
Y       win_condition = "draw"
Y       ningún jugador suma victoria
```

### Maestro YAML

```yaml
# .maestro/e2e-003-full-match.yaml
appId: com.aboutagency.mtgtracker
---
- launchApp
- tapOn: "Nueva Partida"
- assertVisible: "Configurar Partida"

# Agregar 4 jugadores
- tapOn: "Agregar Jugador"
- tapOn: "Jugador 1"
- tapOn: "Agregar Jugador"
- tapOn: "Jugador 2"
- tapOn: "Agregar Jugador"
- tapOn: "Jugador 3"
- tapOn: "Agregar Jugador"
- tapOn: "Jugador 4"

- tapOn: "Iniciar Partida"
- assertVisible: "40"

# 3 taps rápidos en J1
- tapOn:
    id: "life-decrement-player-1"
- tapOn:
    id: "life-decrement-player-1"
- tapOn:
    id: "life-decrement-player-1"
- assertVisible: "37"

# Terminar partida
- tapOn: "Terminar Partida"
- assertVisible: "Declarar ganador"
- tapOn: "Declarar ganador"
- tapOn: "Jugador 1"
- tapOn: "Commander Damage"
- tapOn: "Confirmar"
- assertVisible: "Partida completada"
- assertVisible: "Jugador 1 ganó"
```

---

## E2E-004 — Tracking con Undo

**US cubiertos:** US-033, US-034
**BR cubiertos:** BR-TRACK-11
**Duración estimada:** ~45s

### Precondiciones
- Match en progreso con 2 jugadores, vida inicial 40

### Escenario 4.1 — Undo de último evento (Happy Path)

```
DADO    que el match está en progreso
Y       J1 tiene 40 de vida

CUANDO  el usuario toca "-5" en J1
ENTONCES J1 muestra 35 de vida

CUANDO  el usuario toca "-3" en J1
ENTONCES J1 muestra 32 de vida

CUANDO  el usuario toca el botón "Deshacer"
ENTONCES J1 muestra 35 de vida (restaurado al previous_value del último evento)
Y       el evento de -3 queda marcado como is_undone=true (no se elimina)
Y       se muestra el mensaje "Último cambio deshecho"
```

### Escenario 4.2 — Undo múltiple en secuencia

```
DADO    que el match está en progreso
Y       J1 ha recibido: -5, -3, -2 (vida actual: 30)

CUANDO  el usuario toca "Deshacer" tres veces
ENTONCES J1 vuelve a 35 (undo -2), luego 38 (undo -3), luego 40 (undo -5)
Y       los tres eventos quedan como is_undone=true
```

### Escenario 4.3 — Undo cuando no hay más eventos

```
DADO    que el match está en progreso sin eventos de tracking aún
O       que todos los eventos ya están marcados como is_undone=true

CUANDO  el usuario toca "Deshacer"
ENTONCES no ocurre ningún cambio de vida
Y       se muestra mensaje "No hay nada que deshacer"
Y       no aparece ningún error
```

### Escenario 4.4 — Undo de commander damage

```
DADO    que J2 ha recibido 7 de commander damage de cmd-1

CUANDO  el usuario toca "Deshacer"
ENTONCES el commander damage de cmd-1 en J2 vuelve a 0
Y       si había alerta de 21+ daño, la alerta desaparece
```

### Maestro YAML

```yaml
# .maestro/e2e-004-undo.yaml
appId: com.aboutagency.mtgtracker
---
- launchApp
# Asumir match en progreso ya iniciado (state preloaded via seed)
- assertVisible: "40"

# Reducir vida
- tapOn:
    id: "life-decrement-player-1"
    repeat: 5
- assertVisible: "35"

- tapOn:
    id: "life-decrement-player-1"
    repeat: 3
- assertVisible: "32"

# Undo
- tapOn:
    id: "btn-undo"
- assertVisible: "35"
- assertVisible: "Último cambio deshecho"

# Undo again
- tapOn:
    id: "btn-undo"
- assertVisible: "40"

# Undo when empty
- tapOn:
    id: "btn-undo"
- assertVisible: "No hay nada que deshacer"
- assertVisible: "40"
```

---

## E2E-005 — Ver Historial y Stats

**US cubiertos:** US-019, US-022, US-028, US-029
**BR cubiertos:** BR-STATS-01→09
**Duración estimada:** ~30s

### Precondiciones
- Usuario autenticado con ≥ 3 partidas completadas en DB
- Al menos 1 victoria, 1 derrota, 1 empate

### Escenario 5.1 — Historial de partidas

```
DADO    que el usuario está en Home
CUANDO  navega a "Historial" (P09)
ENTONCES se muestran las partidas completadas en orden cronológico inverso
Y       cada partida muestra: fecha, jugadores, ganador (o "Empate")
Y       las partidas "abandoned" aparecen con etiqueta "Abandonada"
Y       las partidas en progreso NO aparecen en historial
```

### Escenario 5.2 — Filtros de historial

```
DADO    que el usuario está en Historial (P09)
CUANDO  aplica filtro por jugador "Jugador 1"
ENTONCES solo aparecen partidas donde participó "Jugador 1"

CUANDO  aplica filtro por commander "Atraxa"
ENTONCES solo aparecen partidas donde se usó "Atraxa"
```

### Escenario 5.3 — Stats de jugador

```
DADO    que el usuario está en Historial
CUANDO  toca en "Jugador 1"
ENTONCES navega a las stats del jugador (P03 o P04)
Y       se muestra el win rate calculado: victorias / partidas_completadas × 100
Y       se muestra total de partidas jugadas
Y       se muestra lista de decks usados con stats por deck
Y       si el jugador tiene 0 partidas completadas, el win rate muestra "—" (no NaN)
```

### Escenario 5.4 — Stats globales (rankings)

```
DADO    que el usuario está en la sección de estadísticas
CUANDO  navega al ranking global (P15)
ENTONCES se muestra la tabla de rankings ordenada por win_rate desc
Y       en caso de empate en win_rate, todos los empatados aparecen en la misma posición (BR-STATS-07)
Y       un jugador con 0 partidas aparece al final (win_rate = 0)
```

### Maestro YAML

```yaml
# .maestro/e2e-005-history-stats.yaml
appId: com.aboutagency.mtgtracker
---
- launchApp
- tapOn: "Historial"
- assertVisible: "Historial de partidas"
- assertNotVisible: "in_progress"  # no deben aparecer partidas activas

# Stats de jugador
- tapOn: "Jugador 1"
- assertVisible: "Win Rate"
- assertNotVisible: "NaN"
- assertNotVisible: "Infinity"

# Ranking global
- navigateBack
- tapOn: "Rankings"
- assertVisible: "Ranking Global"
```

---

## E2E-006 — Crear Grupo e Invitar Jugador

**US cubiertos:** US-038, US-039, US-040
**BR cubiertos:** BR-GROUP-01, BR-GROUP-04, BR-GROUP-05
**Duración estimada:** ~75s

### Precondiciones
- Usuario A autenticado (futuro Group Owner)
- Usuario B con cuenta existente (futuro Group Member)
- Ambos en dispositivos/simuladores separados (o test con 2 sesiones)

### Escenario 6.1 — Crear grupo

```
DADO    que Usuario A está en Home
CUANDO  navega a "Grupos" (P17)
Y       toca "Crear Grupo"
Y       introduce nombre "Playgroup Local"
Y       confirma
ENTONCES el grupo queda creado
Y       se genera un invite_code único
Y       Usuario A tiene rol "owner" en el grupo
Y       el invite_code tiene expiración de 72h (BR-GROUP-05)
```

### Escenario 6.2 — Unirse al grupo con invite

```
DADO    que Usuario B tiene el invite_code del grupo
Y       Usuario B está en Grupos (P17)

CUANDO  toca "Unirse con código"
Y       introduce el invite_code válido
Y       confirma
ENTONCES Usuario B se une al grupo con rol "member"
Y       el grupo aparece en la lista de grupos de Usuario B
Y       los datos del grupo (jugadores, partidas) son accesibles
```

### Escenario 6.3 — Invite expirado

```
DADO    que el invite_code tiene más de 72h de antigüedad

CUANDO  Usuario B intenta unirse con ese código
ENTONCES se muestra el error "El código de invitación ha expirado"
Y       el usuario no se une al grupo
Y       el Group Owner debe generar un nuevo código
```

### Escenario 6.4 — Archivar grupo (solo owner)

```
DADO    que Usuario A es owner del grupo "Playgroup Local"

CUANDO  toca los 3 puntos del grupo → "Archivar grupo"
Y       confirma la acción
ENTONCES el grupo queda archivado (archived_at se establece)
Y       los datos históricos son accesibles en modo lectura
Y       NO es posible crear nuevas partidas en el grupo archivado
Y       el grupo no aparece activo en la lista principal (BR-GROUP-05)
```

### Maestro YAML

```yaml
# .maestro/e2e-006-groups.yaml
appId: com.aboutagency.mtgtracker
---
- launchApp
- tapOn: "Grupos"
- tapOn: "Crear Grupo"
- tapOn:
    id: "input-group-name"
- typeText: "Playgroup Local"
- tapOn: "Crear"
- assertVisible: "Playgroup Local"
- assertVisible: "Código de invitación"
# Copiar el código — en test usar valor conocido del seed
- tapOn: "Copiar código"
- assertVisible: "Código copiado"
```

---

## E2E-007 — Flujo Guest (sin cuenta)

**US cubiertos:** US-037, US-038, US-039
**BR cubiertos:** BR-AUTH-01
**Duración estimada:** ~30s

### Precondiciones
- App en estado limpio (sin sesión activa)

### Escenario 7.1 — Acceso como invitado

```
DADO    que la app muestra la pantalla de onboarding
CUANDO  el usuario toca "Continuar como invitado"
ENTONCES se accede a la pantalla de tracker de invitado (P19)
Y       es posible iniciar una partida local sin datos persistidos
Y       NO se muestra la sección "Historial"
Y       NO se muestra la sección "Stats"
Y       NO se muestra la sección "Grupos"
```

### Escenario 7.2 — Limitaciones del modo guest

```
DADO    que el usuario está en modo invitado

CUANDO  intenta acceder a "Historial"
ENTONCES se muestra el mensaje "Crea una cuenta para ver tu historial"
Y       aparece el CTA "Registrarse"

CUANDO  cierra la app y la vuelve a abrir
ENTONCES los datos de la partida anterior NO persisten (solo sesión local)
```

### Escenario 7.3 — Upgrade de Guest a cuenta

```
DADO    que el usuario está en modo invitado
CUANDO  toca "Registrarse" desde cualquier pantalla que lo requiera
ENTONCES se muestra el flujo de registro (mismo que E2E-001)
Y       después del registro exitoso, el usuario queda autenticado
Y       se accede a la app completa con historial y stats
```

### Maestro YAML

```yaml
# .maestro/e2e-007-guest.yaml
appId: com.aboutagency.mtgtracker
---
- clearState
- launchApp
- assertVisible: "Continuar como invitado"
- tapOn: "Continuar como invitado"
- assertVisible: "Tracker"
- assertNotVisible: "Historial"
- assertNotVisible: "Stats"
- tapOn: "Nueva Partida"
- assertVisible: "Tracker"
# Verificar que stats no son accesibles
- tapOn: "Stats"
- assertVisible: "Crea una cuenta"
- assertVisible: "Registrarse"
```

---

## E2E-008 — Compra Premium (Sandbox)

**US cubiertos:** US-039
**BR cubiertos:** BR-AUTH-03 (FT-018 Premium unlock)
**Duración estimada:** ~45s

### Precondiciones
- App en entorno de staging con IAP sandbox activo
- iOS: cuenta de Sandbox Tester en App Store Connect
- Android: cuenta en Play Store Internal Testing

### Escenario 8.1 — Comprar Premium (iOS)

```
DADO    que el usuario autenticado está en Ajustes (P18)
Y       el usuario tiene tier "free"
Y       se muestran banners de anuncios en la app

CUANDO  toca "Actualizar a Premium"
ENTONCES se muestra el sheet de compra con precio de una sola vez
Y       el sistema IAP de iOS maneja el flujo de pago (fuera del control de la app)

CUANDO  la compra sandbox se completa exitosamente
ENTONCES el campo "is_premium" del usuario queda en true
Y       los banners de anuncios desaparecen
Y       se muestra confirmación "¡Bienvenido a Premium!"
Y       el botón "Actualizar a Premium" ya no aparece
```

### Escenario 8.2 — Restaurar compra

```
DADO    que el usuario reinstala la app o cambia de dispositivo
Y       ya había comprado Premium previamente

CUANDO  toca "Restaurar compras" en Ajustes
ENTONCES el sistema verifica el recibo IAP con Apple/Google
Y       si es válido, is_premium vuelve a true
Y       los anuncios se ocultan nuevamente
```

### Escenario 8.3 — Fallo en compra (sandbox)

```
DADO    que el usuario intenta comprar Premium

CUANDO  la transacción IAP falla (sandbox error o cancelación)
ENTONCES se muestra el mensaje "No se pudo completar la compra"
Y       el estado de la app permanece en "free"
Y       el usuario puede intentar de nuevo
```

### Maestro YAML

```yaml
# .maestro/e2e-008-premium.yaml
appId: com.aboutagency.mtgtracker
---
- launchApp
- tapOn: "Ajustes"
- assertVisible: "Actualizar a Premium"
- tapOn: "Actualizar a Premium"
- assertVisible: "Una sola vez"
# El flujo de IAP es manejado por el OS — Maestro no puede interactuar con sheets del sistema
# En CI, mockear el receipt con un webhook de test
- assertVisible: "¡Bienvenido a Premium!"
- assertNotVisible: "Publicidad"
- assertNotVisible: "Actualizar a Premium"
```

---

## Matriz de Cobertura E2E

| E2E ID | Pantallas Ejercidas | US | BR | Crítico |
|--------|--------------------|----|----|---------| 
| E2E-001 | P16 (Login/Auth) | US-035, US-036 | BR-AUTH-01/02/03 | ✅ Sí |
| E2E-002 | P03, P11 (Decks) | US-004, US-005, US-006, US-007 | BR-DECK-01→05 | ✅ Sí |
| E2E-003 | P06, P07, P08, P09 (Match lifecycle) | US-010→018, US-030→031 | BR-MATCH-01→08, BR-TRACK-01→04 | ✅ Sí |
| E2E-004 | P07 (Tracker) | US-033, US-034 | BR-TRACK-11 | ✅ Sí |
| E2E-005 | P04, P05 (Historial, Stats) | US-019, US-022, US-028, US-029 | BR-STATS-01→09 | ✅ Sí |
| E2E-006 | P17 (Groups) | US-038, US-039, US-040 | BR-GROUP-01, BR-GROUP-04, BR-GROUP-05 | 🟡 Medio |
| E2E-007 | P19 (Guest Tracker) | US-037 | BR-AUTH-01 | ✅ Sí |
| E2E-008 | P18 (Settings) | US-042 | FT-018 | 🟡 Medio |

**Pantallas NO cubiertas por E2E** (cubiertas por unit/integration):
- P02 (Jugadores lista), P03/P04 (Player Detail), P12/P13 (Deck/Commander Detail), P14 (Matchup Stats)

---

*E2E Scenarios generados por `/docs` — actualizar `testID` props al implementar componentes React Native.*
