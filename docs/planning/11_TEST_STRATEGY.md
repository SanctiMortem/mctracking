# 🧪 Test Strategy — MTG Commander Tracker

> Generado desde 04_USER_STORIES, 05_BUSINESS_RULES, 08_API_CONTRACTS por `/docs`
> **Fuente:** Discovery Brief §5, §8
> **Versión:** 1.0 — 2026-04-09

---

## Índice

1. [Filosofía de Testing](#1-filosofía-de-testing)
2. [Pirámide de Testing](#2-pirámide-de-testing)
3. [Niveles de Testing](#3-niveles-de-testing)
4. [Coverage Targets](#4-coverage-targets)
5. [Herramientas](#5-herramientas)
6. [Áreas Críticas](#6-áreas-críticas)
7. [Plan de Ejecución](#7-plan-de-ejecución)
8. [Test Data & Fixtures](#8-test-data--fixtures)

---

## 1. Filosofía de Testing

### Principios

1. **Test behavior, not implementation** — Testear qué hace el código, no cómo lo hace internamente.
2. **Real DB > Mocks** — Para tests de integración, usar una Neon branch de test. Los mocks de DB han causado falsos positivos históricamente (ver feedback del equipo).
3. **Happy path + edge cases** — Cada Business Rule crítica necesita al menos un test de camino feliz y uno de error.
4. **Debounce y undo son críticos** — BR-TRACK-09 (debounce) y BR-TRACK-11 (undo) son las reglas más propensas a bugs; merecen coverage exhaustivo.
5. **No over-testing UI trivial** — Componentes de presentación sin lógica no necesitan tests unitarios.

### Qué NO testear

- Lógica de terceros (Clerk, Neon SDK, Expo APIs)
- Componentes puramente visuales sin lógica de estado
- Configuración de build y bundler
- Tipos de TypeScript (el compilador los valida)

---

## 2. Pirámide de Testing

```
         ┌─────────────┐
         │  E2E Tests  │  ~10% — Flujos críticos completos
         │  (Maestro)  │  Lento, costoso, alto valor
         └──────┬──────┘
                │
       ┌────────┴────────┐
       │ Integration Tests│  ~30% — API endpoints + DB
       │  (Vitest + DB)  │  Velocidad media, alto valor
       └────────┬────────┘
                │
     ┌──────────┴──────────┐
     │    Unit Tests       │  ~60% — Business logic, utils, hooks
     │    (Vitest)         │  Rápido, bajo costo
     └─────────────────────┘
```

---

## 3. Niveles de Testing

### 3.1 Unit Tests

**Propósito:** Validar lógica pura aislada de I/O.

**Qué cubrir:**

| Módulo | Qué testear | Prioridad |
|--------|-------------|-----------|
| `lib/debounce.ts` | Agrupación de eventos por ventana de tiempo | 🔴 Alta |
| `lib/lifeTotal.ts` | Cálculo de vida desde MatchEvents | 🔴 Alta |
| `lib/commanderDamage.ts` | Suma de daño por commander_id | 🔴 Alta |
| `lib/winRate.ts` | Fórmula CALC-001 | 🔴 Alta |
| `lib/validators.ts` | Todas las VAL-001→VAL-005 | 🔴 Alta |
| `lib/matchStateMachine.ts` | Transiciones válidas/inválidas del match | 🟡 Media |
| `lib/trackerStateMachine.ts` | Transiciones del tracker | 🟡 Media |
| `hooks/useTracker.ts` | Estado local del tracker en partida | 🟡 Media |
| `hooks/useUndoStack.ts` | Stack de undo ilimitado | 🟡 Media |
| `lib/colorIdentity.ts` | Derivación de color_identity desde commanders | 🟢 Baja |

**Ejemplos de tests unitarios críticos:**

```typescript
// lib/debounce.test.ts
describe('debounce grouping', () => {
  it('groups consecutive taps within 2000ms window', () => {
    const events = [
      { timestamp: 1000, delta: -1 },
      { timestamp: 2500, delta: -1 },  // +1500ms — mismo grupo
      { timestamp: 3000, delta: -1 },  // +500ms — mismo grupo
    ]
    const grouped = groupByDebounce(events, 2000)
    expect(grouped).toHaveLength(1)
    expect(grouped[0].totalDelta).toBe(-3)
  })

  it('creates new group when gap exceeds window', () => {
    const events = [
      { timestamp: 1000, delta: -1 },
      { timestamp: 4000, delta: -1 },  // +3000ms — nuevo grupo
    ]
    const grouped = groupByDebounce(events, 2000)
    expect(grouped).toHaveLength(2)
  })

  it('rejects debounce_window below 200ms (BR-TRACK-10, VAL-003)', () => {
    expect(() => groupByDebounce(events, 100)).toThrow('DEBOUNCE_OUT_OF_RANGE')
  })
})

// lib/commanderDamage.test.ts
describe('commander damage calculation', () => {
  it('sums only non-undone events for specific commander (CALC-002)', () => {
    const events = [
      { commander_id: 'cmd-1', delta: 7, is_undone: false },
      { commander_id: 'cmd-1', delta: 7, is_undone: false },
      { commander_id: 'cmd-1', delta: 7, is_undone: true },  // undone
      { commander_id: 'cmd-2', delta: 21, is_undone: false }, // diferente commander
    ]
    expect(calcCommanderDamage(events, 'cmd-1')).toBe(14)
  })

  it('triggers 21-damage alert threshold (BR-TRACK-04)', () => {
    const total = 21
    expect(isCommanderDamageLethal(total)).toBe(true)
    // No auto-action — solo alerta (BR-TRACK-04)
  })
})

// lib/validators.test.ts
describe('partner commander validation (VAL-005)', () => {
  it('allows partner commanders when both have is_partner=true', () => {
    const deck = { commander_id: 'cmd-1', commander_id_2: 'cmd-2' }
    const commanders = [
      { id: 'cmd-1', is_partner: true },
      { id: 'cmd-2', is_partner: true },
    ]
    expect(validateDeckCommanders(deck, commanders)).toBeNull()
  })

  it('rejects two non-partner commanders', () => {
    const deck = { commander_id: 'cmd-1', commander_id_2: 'cmd-2' }
    const commanders = [
      { id: 'cmd-1', is_partner: false },
      { id: 'cmd-2', is_partner: false },
    ]
    expect(validateDeckCommanders(deck, commanders)).toMatchObject({
      code: 'PARTNER_INVALID',
    })
  })
})
```

---

### 3.2 Integration Tests

**Propósito:** Verificar que los endpoints API funcionan correctamente con la DB real.

**Setup:** Neon test branch separada, con migrations aplicadas y data de seed.

**Endpoints a cubrir:**

| Endpoint | Tests requeridos | BR/US |
|----------|-----------------|-------|
| `POST /matches` | happy path, 2-player min, max players, jugador duplicado | BR-MATCH-02/03/04 |
| `POST /matches/:id/events` | life change, commander damage, poison, tipos inválidos | BR-TRACK-01/02 |
| `POST /matches/:id/events/undo` | undo último evento, undo en secuencia, undo cuando no hay eventos | BR-TRACK-11 |
| `POST /matches/:id/close` | winner, draw, abandoned, cerrar ya cerrado | BR-MATCH-06/07/08 |
| `GET /stats/players/:id` | con matches, sin matches, guest access denied | BR-STATS-01/02 |
| `GET /stats/global` | ranking con tie-breaking (BR-STATS-07) | BR-STATS-07 |
| `PATCH /decks/:id` | soft delete, deck en partida activa | BR-DECK-07 |
| `POST /groups` | crear grupo, nombre duplicado | BR-GROUP-01 |
| `POST /groups/join` | invite válido, invite expirado, invite inválido | BR-GROUP-05 |

**Estructura de un integration test:**

```typescript
// tests/integration/matches.test.ts
import { testDb } from '../helpers/db'
import { seedTestData } from '../helpers/seed'
import { createTestApp } from '../helpers/app'

describe('POST /matches', () => {
  let db: TestDb
  let app: TestApp
  let authToken: string

  beforeAll(async () => {
    db = await testDb.connect()
    await db.migrate()
    const seed = await seedTestData(db)
    app = createTestApp(db)
    authToken = seed.userToken
  })

  afterAll(async () => {
    await db.cleanup()
  })

  it('creates match with 4 players (happy path)', async () => {
    const res = await app.request('/matches', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        player_ids: ['p1', 'p2', 'p3', 'p4'],
        deck_ids: ['d1', 'd2', 'd3', 'd4'],
        default_life_total: 40,
      }),
    })
    expect(res.status).toBe(201)
    const { data } = await res.json()
    expect(data.match.status).toBe('in_progress')
    expect(data.participations).toHaveLength(4)
  })

  it('rejects match with 1 player (BR-MATCH-02)', async () => {
    const res = await app.request('/matches', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        player_ids: ['p1'],
        deck_ids: ['d1'],
        default_life_total: 40,
      }),
    })
    expect(res.status).toBe(400)
    const { error } = await res.json()
    expect(error.code).toBe('MATCH_PLAYER_COUNT_INVALID')
  })
})
```

---

### 3.3 E2E Tests (Maestro)

**Propósito:** Validar los flujos críticos de usuario completos en dispositivo real o simulador.

**Herramienta:** [Maestro](https://maestro.mobile.dev/) — YAML-based, soporta iOS y Android.

**Flujos E2E prioritarios:**

| ID | Flujo | US cubiertos | Duración est. |
|----|-------|-------------|---------------|
| E2E-001 | Onboarding → Crear cuenta (Email) | US-001, US-040 | ~45s |
| E2E-002 | Crear deck con partner commanders | US-005, US-006 | ~30s |
| E2E-003 | Crear y completar una partida completa (4 jugadores) | US-010→US-018, US-024 | ~90s |
| E2E-004 | Tracking con undo | US-033, US-034 | ~45s |
| E2E-005 | Ver historial y stats de un jugador | US-035, US-036 | ~30s |
| E2E-006 | Crear grupo e invitar jugador | US-042, US-043 | ~60s |
| E2E-007 | Flujo Guest (sin cuenta) | US-037, US-038 | ~30s |
| E2E-008 | Compra Premium (sandbox) | US-039 | ~45s |

**Ejemplo de flow Maestro:**

```yaml
# flows/e2e-003-match-complete.yaml
appId: com.aboutagency.mtgtracker
---
- launchApp
- assertVisible: "Home"
- tapOn: "Nueva Partida"
- assertVisible: "Configurar Partida"

# Seleccionar jugadores
- tapOn: "Agregar Jugador"
- typeText: "Jugador 1"
- tapOn: "Confirmar"
# ... repetir para 4 jugadores

# Iniciar partida
- tapOn: "Iniciar Partida"
- assertVisible: "Tracker"

# Tracking de vida
- tapOn:
    id: "life-decrement-player-1"
- tapOn:
    id: "life-decrement-player-1"
- assertVisible: "38"  # 40 - 2

# Undo
- tapOn: "Deshacer"
- assertVisible: "39"  # restaurado

# Cerrar partida
- tapOn: "Terminar Partida"
- tapOn: "Jugador 1 ganó"
- assertVisible: "Partida completada"
```

---

## 4. Coverage Targets

| Nivel | Target | Justificación |
|-------|--------|---------------|
| **Unit — Business Logic** | ≥ 90% | Lógica crítica: debounce, life calc, commander damage |
| **Unit — Validators** | 100% | Todas las reglas VAL-001→VAL-005 |
| **Unit — State Machines** | ≥ 85% | Transiciones de match y tracker |
| **Integration — API Endpoints** | ≥ 80% | Todos los endpoints documentados en 08_API_CONTRACTS |
| **Integration — DB Queries** | ≥ 75% | Queries de stats (CALC-001→003) |
| **E2E — Critical Paths** | 100% de los 8 flujos definidos | Sin excepción para flujos en tabla E2E |

**Métricas de calidad (no solo coverage):**

- Tiempo de ejecución suite unit: < 30s
- Tiempo de ejecución suite integration: < 3 min
- Tiempo de ejecución suite E2E: < 15 min
- Zero flaky tests en CI (flakyness = auto-retry = se descarta el test)

---

## 5. Herramientas

| Herramienta | Propósito | Config |
|------------|-----------|--------|
| **Vitest** | Unit + Integration tests | `vitest.config.ts` |
| **@testing-library/react-native** | Test de hooks y componentes con lógica | Plugin de Vitest |
| **Maestro** | E2E flows en iOS/Android | `.maestro/` directorio |
| **neon-serverless (test mode)** | DB real en tests de integración | Neon test branch |
| **msw** | Mock de fetch para requests externos (Scryfall) | Solo para unit tests |
| **GitHub Actions** | CI pipeline | `.github/workflows/test.yml` |

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/lib/**', 'src/hooks/**', 'src/api/**'],
      exclude: ['src/**/*.d.ts', 'src/db/migrations/**'],
    },
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
```

### GitHub Actions CI

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-and-integration:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.NEON_TEST_DATABASE_URL }}
      CLERK_SECRET_KEY: ${{ secrets.CLERK_TEST_SECRET_KEY }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx drizzle-kit migrate  # aplicar migrations a DB de test
      - run: npm run test:unit
      - run: npm run test:integration
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  e2e-ios:
    runs-on: macos-14
    needs: unit-and-integration
    steps:
      - uses: actions/checkout@v4
      - name: Install Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash
      - name: Build for testing
        run: eas build --platform ios --profile development --local
      - name: Boot simulator
        run: xcrun simctl boot "iPhone 15"
      - name: Run E2E flows
        run: maestro test .maestro/
```

---

## 6. Áreas Críticas

Las siguientes áreas requieren coverage exhaustivo por su complejidad o impacto en UX.

### 6.1 Debounce Engine (BR-TRACK-09)

```
Casos de test requeridos:
✅ Un solo tap → 1 evento, 1 grupo
✅ 3 taps en 1.5s → 1 evento agrupado, delta sumado
✅ 2 taps + pausa 3s + 2 taps → 2 grupos separados
✅ Debounce en el límite exacto (2000ms) → mismo grupo
✅ Debounce justo después del límite (2001ms) → nuevo grupo
✅ debounce_window = 200ms (mínimo válido)
✅ debounce_window = 2000ms (máximo válido)
✅ debounce_window = 199ms → error VAL-003
✅ debounce_window = 2001ms → error VAL-003
✅ Debounce aplicado antes de enviar al API (client-side)
```

### 6.2 Undo Stack (BR-TRACK-11)

```
Casos de test requeridos:
✅ Undo de último life event → previous_value restaurado
✅ Undo de último commander damage event
✅ Undo de último poison event
✅ Undo en secuencia (3 undos consecutivos)
✅ Undo cuando no hay eventos → no-op, sin error (US-034)
✅ is_undone=true no cuenta en cálculos (CALC-001, CALC-002, CALC-003)
✅ Re-do NO está implementado (NG-006) — no testear ni exponer
```

### 6.3 Commander Damage Lethality (BR-TRACK-04)

```
Casos de test requeridos:
✅ 20 daño de commander → no alerta
✅ 21 daño de commander → alerta visible (US-030)
✅ 22 daño de commander → alerta visible (ya lethal)
✅ Undo de evento que causó lethal → alerta desaparece
✅ Partner commanders: daño rastreado por separado (cmd_id_1 vs cmd_id_2)
✅ Alerta NO elimina automáticamente al jugador (BR-TRACK-04)
```

### 6.4 Match State Machine (BR-MATCH-01)

```
Transiciones válidas a testear:
✅ setup → in_progress (iniciar partida)
✅ in_progress → completed (cerrar con ganador)
✅ in_progress → completed (cerrar como draw)
✅ in_progress → abandoned (abandonar)

Transiciones inválidas a testear:
✅ completed → in_progress → error MATCH_ALREADY_CLOSED
✅ abandoned → in_progress → error MATCH_ALREADY_CLOSED
✅ setup → completed (sin iniciar) → error
✅ Agregar evento a match completed → error
```

### 6.5 Stats Engine (BR-STATS-01→09)

```
Casos de test requeridos:
✅ Win rate con 0 partidas → 0 (no NaN, no división por cero)
✅ Win rate con 1 victoria de 1 → 100%
✅ Win rate solo cuenta partidas completed (no abandoned)
✅ Commander damage stats separadas por commander
✅ Ranking con ties → todos los empatados aparecen en la misma posición (BR-STATS-07)
✅ Matchup stats scope='1v1' filtra partidas con más de 2 jugadores
✅ Guest no puede acceder a stats → 401
```

---

## 7. Plan de Ejecución

### Scripts de npm

```json
// package.json (fragmento)
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run --project unit",
    "test:integration": "vitest run --project integration",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "maestro test .maestro/",
    "test:e2e:ios": "maestro test .maestro/ --platform ios",
    "test:e2e:android": "maestro test .maestro/ --platform android"
  }
}
```

### Orden de implementación de tests

| Fase | Tests | Cuándo |
|------|-------|--------|
| **Fase 1** | Unit tests de lógica crítica (debounce, damage, undo) | Junto con implementación de `lib/` |
| **Fase 2** | Integration tests de endpoints CRUD básicos | Junto con implementación de API |
| **Fase 3** | Integration tests de endpoints de stats | Junto con implementación de stats |
| **Fase 4** | E2E flows E2E-001 a E2E-005 (core match flow) | Al tener las pantallas principales |
| **Fase 5** | E2E flows E2E-006 a E2E-008 (groups, premium) | Pre-launch |

---

## 8. Test Data & Fixtures

### Seed de datos de test

```typescript
// tests/helpers/seed.ts
export async function seedTestData(db: TestDb) {
  // Usuarios
  const user1 = await db.insert(users).values({
    id: 'user-1',
    clerk_id: 'clerk_test_user1',
    email: 'player1@test.com',
    auth_provider: 'email',
  })

  // Jugadores
  const player1 = await db.insert(players).values({
    id: 'player-1',
    name: 'Jugador Uno',
    user_id: 'user-1',
  })

  // Commanders (incluyendo partner)
  const commanders = await db.insert(commanders_table).values([
    { id: 'cmd-1', name: 'Atraxa, Praetors Voice', colors: ['W','U','B','G'], is_partner: false },
    { id: 'cmd-2', name: 'Thrasios, Triton Hero', colors: ['U','G'], is_partner: true },
    { id: 'cmd-3', name: 'Tymna the Weaver', colors: ['W','B'], is_partner: true },
  ])

  // Deck con partners
  const partnerDeck = await db.insert(decks).values({
    id: 'deck-partner',
    name: 'Thrasios + Tymna',
    commander_id: 'cmd-2',
    commander_id_2: 'cmd-3',
    player_id: 'player-1',
    color_identity: ['W','U','B','G'],
  })

  return { user1, player1, commanders, partnerDeck }
}
```

### Fixtures de MatchEvents para tests de cálculo

```typescript
// tests/fixtures/matchEvents.ts
export const lifeEvents = [
  { event_type: 'life_change', delta: -5, is_undone: false, previous_value: 40, new_value: 35 },
  { event_type: 'life_change', delta: -3, is_undone: false, previous_value: 35, new_value: 32 },
  { event_type: 'life_change', delta: -2, is_undone: true, previous_value: 32, new_value: 30 },  // undone
]
// Expected life total: 40 + (-5) + (-3) = 32 (el -2 está undone)

export const commanderDamageEvents = [
  { event_type: 'commander_damage', delta: 7, commander_id: 'cmd-1', is_undone: false },
  { event_type: 'commander_damage', delta: 7, commander_id: 'cmd-1', is_undone: false },
  { event_type: 'commander_damage', delta: 7, commander_id: 'cmd-2', is_undone: false },
]
// Expected cmd-1 damage: 14, Expected cmd-2 damage: 7

export const poisonEvents = [
  { event_type: 'poison', delta: 3, is_undone: false },
  { event_type: 'poison', delta: 3, is_undone: false },
  { event_type: 'poison', delta: 3, is_undone: false },
  { event_type: 'poison', delta: 1, is_undone: true },  // undone
]
// Expected poison counters: 9 (no 10)
```

---

## Referencias Cruzadas

| Business Rule | Tests Unitarios | Tests Integración | E2E |
|--------------|----------------|-------------------|-----|
| BR-MATCH-02 (min 2 jugadores) | `validators.test.ts` | `POST /matches` | E2E-003 |
| BR-MATCH-06 (match ya cerrado) | `matchStateMachine.test.ts` | `POST /matches/:id/close` | — |
| BR-TRACK-09 (debounce) | `debounce.test.ts` | `POST /matches/:id/events` | E2E-003 |
| BR-TRACK-11 (undo) | `undoStack.test.ts` | `POST /matches/:id/events/undo` | E2E-004 |
| BR-TRACK-04 (cmd damage 21) | `commanderDamage.test.ts` | — | E2E-003 |
| BR-DECK-04 (partner check) | `validators.test.ts` | `POST /decks` | E2E-002 |
| BR-STATS-01 (win rate 0 partidas) | `winRate.test.ts` | `GET /stats/players/:id` | — |
| BR-STATS-07 (tie-breaking) | `rankings.test.ts` | `GET /stats/global` | — |
| BR-GROUP-05 (invite expiry) | `validators.test.ts` | `POST /groups/join` | E2E-006 |
| VAL-003 (debounce range) | `validators.test.ts` | `PATCH /settings` | — |
| CALC-001 (win rate) | `winRate.test.ts` | `GET /stats/players/:id` | E2E-005 |
| CALC-002 (commander damage) | `commanderDamage.test.ts` | `GET /stats/decks/:id` | — |
| CALC-003 (life total) | `lifeTotal.test.ts` | `GET /matches/:id` | E2E-003 |

---

*Test Strategy generado por `/docs` — actualizar file paths cuando se defina estructura de directorios definitiva.*
