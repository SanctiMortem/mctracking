# TRACK-009: 🧪 Epic Tests — Live Tracking (EPIC-03)

> **Issue ID:** TRACK-009
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-03-LIVE-TRACKING](../epics/EPIC-03-LIVE-TRACKING.md)
> **Skills:** `domains/test`
> **Agents:** `test-engineer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar la suite de tests de integración y E2E para EPIC-03 (Live Tracking). Los tests unitarios por componente se definen en cada issue individual (TRACK-001 a TRACK-007). Este issue cubre los tests de integración y E2E que validan el flujo completo del tracker: registro de eventos, undo, y reflejo del estado en la UI.

## User Story

> Como **desarrollador**, quiero **tests de integración y E2E para el tracker** para **garantizar que el flujo completo de registro de eventos y undo funciona correctamente antes de release**.

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| TEST_STRATEGY | §3 Integration, §4 E2E | [11_TEST_STRATEGY.md](../../planning/11_TEST_STRATEGY.md) |
| BUSINESS_RULES | BR-TRACK-09 (debounce), BR-TRACK-11 (undo) | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |
| API_CONTRACTS | /api/match-events | [08_API_CONTRACTS.md](../../planning/08_API_CONTRACTS.md) |

---

## ✅ Criterios de Aceptación

**Tests de Integración (API):**
- [ ] `POST /api/match-events` — life_change actualiza `life_total` en participation (snapshot)
- [ ] `POST /api/match-events` — commander_damage actualiza JSONB `commander_damage` en participation
- [ ] `POST /api/match-events` — poison_change actualiza `poison_counters` en participation
- [ ] `POST /api/match-events/undo` — marca último evento como `is_undone=true` y revierte snapshot
- [ ] `POST /api/match-events/undo` repetido N veces — todos los eventos quedan undone, snapshot vuelve a valores iniciales
- [ ] `POST /api/match-events/undo` sin eventos — responde 422 con mensaje claro

**Tests de Integración (UI + Hooks):**
- [ ] `useTracker` — optimistic update se aplica antes de confirmación API
- [ ] `useTracker` — fallo de API revierte el optimistic update y muestra toast de error
- [ ] `useDebounce` — acumula deltas y ejecuta callback una sola vez al expirar el threshold

**Tests E2E (Detox / Maestro):**
- [ ] Flujo completo: abrir SCR-008 → tap -1 cinco veces → esperar debounce → verificar life_total en DB
- [ ] Flujo undo: registrar evento → tap Undo → verificar revert visual y en DB
- [ ] Flujo undo ilimitado: 3 eventos → 3 undos → tracker vuelve a estado inicial (life=40, poison=0)

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Integración — debounce y snapshot
  Dado que hay un match con participación de life_total=40
  Cuando hago 5 taps en "-1" en menos de 500ms
  Entonces la UI muestra 35 inmediatamente (optimistic)
  Y después de 500ms se llama POST /api/match-events una sola vez con delta=-5
  Y la participation en DB tiene life_total=35

Escenario: Integración — undo revierte snapshot
  Dado que registré un evento life_change delta=-5 (life_total=35 en DB)
  Cuando invoco POST /api/match-events/undo
  Entonces el evento queda is_undone=true
  Y la participation tiene life_total=40 nuevamente

Escenario: E2E — tracker sincroniza estado al abrir
  Dado que el match tiene life_total=28 en DB
  Cuando navego a SCR-008
  Entonces el LifeCounter muestra "28"

Escenario: Integración — fallo de API revierte optimistic
  Dado que el servidor retorna 500 en POST /api/match-events
  Cuando hago tap -1 (optimistic aplica 39)
  Entonces aparece un toast de error
  Y el LifeCounter vuelve a mostrar 40
```

## 🔧 Contexto Técnico

**Framework de tests:**
- Unit/Integration: Jest + React Native Testing Library (`@testing-library/react-native`)
- API Integration: Supertest contra Hono handlers + test DB (Neon branch)
- E2E: Detox (iOS) o Maestro (cross-platform) — a definir en EPIC-05

**Fixtures necesarios:**
```typescript
// test/fixtures/tracker.ts
export const matchWithParticipations = {
  match: { id: 'match-1', status: 'in_progress' },
  participations: [
    { id: 'p1', player: { name: 'Gabriel' }, life_total: 40, poison_counters: 0, commander_damage: {} },
    { id: 'p2', player: { name: 'Carlos' }, life_total: 40, poison_counters: 0, commander_damage: {} },
  ]
};
```

**Mock de API en tests de hook:**
```typescript
// Usar MSW (Mock Service Worker) para interceptar fetch en useTracker tests
server.use(
  rest.post('/api/match-events', (req, res, ctx) => res(ctx.status(500)))
);
```

**Dependencias de Issues:**
- Bloqueado por: TRACK-001, TRACK-002, TRACK-003, TRACK-004, TRACK-005, TRACK-006, TRACK-007
- Bloquea a: nada (cierre de EPIC-03)

## ⚠️ Edge Cases a Testear

- Debounce flush en unmount del componente (para no perder el último delta si el usuario cierra la pantalla)
- Undo cuando `commander_damage` JSONB tiene múltiples keys — solo revertir la key del evento undone
- Concurrencia: dos jugadores actualizan simultáneamente (out-of-scope para MVP pero documentar el caso)

## 🧪 Tests Requeridos

- [ ] Integration: 6 casos API (listados arriba)
- [ ] Integration: 3 casos de hooks (listados arriba)
- [ ] E2E: 3 flujos (listados arriba)

## 🚫 Out of Scope

- Tests de rendimiento del tracker (60fps) → EPIC-05 perf spike
- Tests de concurrencia multi-usuario → MVP no tiene realtime sync

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| — | — | — |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
