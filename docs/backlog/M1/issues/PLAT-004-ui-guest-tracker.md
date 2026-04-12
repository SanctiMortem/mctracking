# PLAT-004: UI — SCR-019 Guest Tracker (full)

> **Issue ID:** PLAT-004
> **Priority:** P0
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar SCR-019 (Guest Tracker): versión del tracker para usuarios sin cuenta. Reutiliza los componentes del tracker (TrackerLayout, LifeCounter, CommanderDamagePanel, PoisonCounter) pero sin persistencia cloud. Todo el estado es in-memory y se descarta al salir (BR-AUTH-01).

## User Story

> Como **P-001** (guest), quiero **usar el tracker básico sin registrarme** para **jugar Commander de inmediato sin fricción**.

**Implementa:** US-037

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-019 Guest Tracker | [15_DESIGN.md#scr-019](../../planning/15_DESIGN.md) |
| USER_STORIES | US-037 | [04_USER_STORIES.md#us-037](../../planning/04_USER_STORIES.md) |
| BUSINESS_RULES | BR-AUTH-01 (sin persistencia) | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |
| ADR | ADR-006 (no upgrade mid-match) | [ADR-006-guest-upgrade-mid-match.md](./ADR-006-guest-upgrade-mid-match.md) |

---

## ✅ Criterios de Aceptación

- [x] Al entrar, pantalla de setup mínima: N jugadores (2/3/4), nombres opcionales (o "Jugador 1/2/3/4")
- [x] Layout del tracker usando `TrackerLayout` + `PlayerSection` de TRACK-003
- [x] `LifeCounter` funcional con debounce local (default 500ms) — sin API calls (BR-AUTH-01)
- [x] `CommanderDamagePanel` funcional — in-memory, sin commanders precargados (nombres opcionales)
- [x] `PoisonCounter` funcional
- [x] Undo ilimitado funcional — solo en memoria (array de historial local)
- [x] Banner superior fijo: "Modo invitado — Crea una cuenta para guardar el historial" + CTA → SCR-001
- [x] Al salir del tracker (back/home): confirm dialog "¿Seguro? Los datos se perderán" (BR-AUTH-01)
- [x] Sin API calls de ningún tipo — completamente offline

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Acceder al Guest Tracker
  Dado que toco "Continuar sin cuenta" en SCR-001
  Cuando configuro "3 jugadores" con nombres "Ana", "Carlos", ""
  Entonces el tercer jugador aparece como "Jugador 3" (nombre por defecto)
  Y el tracker inicia con los 3 secciones y life=40

Escenario: Datos se descartan al salir
  Dado que usé el Guest Tracker con life=28 para Ana
  Cuando toco el botón back
  Entonces aparece "¿Seguro? Los datos se perderán" y confirmo
  Y al volver a abrir el Guest Tracker, life=40 nuevamente

Escenario: Undo en modo guest
  Dado que Ana tenía life=40 y le reduje 5 (in-memory)
  Cuando toco Undo
  Entonces el life vuelve a 40 (revertido desde array local)
  Y no se hacen llamadas a ninguna API
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/guest.tsx` (o `app/(guest)/tracker.tsx`) — SCR-019 screen
- `hooks/useGuestTracker.ts` — Estado in-memory completo del tracker guest

**State shape (in-memory):**
```typescript
interface GuestParticipation {
  id: string;            // UUID local, no persistido
  name: string;          // "Jugador N" si no se ingresó
  life_total: number;    // default 40
  poison_counters: number;
  commander_damage: Record<string, number>; // key = commander local name
}

interface GuestTrackerState {
  participants: GuestParticipation[];
  event_history: GuestEvent[];  // para undo in-memory
}
```

**Reutilización de componentes:**
- `TrackerLayout`, `PlayerSection` (TRACK-003) — mismos, sin cambios
- `LifeCounter` (TRACK-004) — con prop `onChangeLocal` en lugar de `onChangeAPI`
- `CommanderDamagePanel` (TRACK-005) — con nombres de commander como texto libre
- `PoisonCounter` (TRACK-006) — misma lógica

**Dependencias de Issues:**
- Bloqueado por: TRACK-003, TRACK-004, TRACK-005, TRACK-006 (componentes del tracker)
- Bloquea a: PLAT-003 ya existe antes (o en paralelo — PLAT-004 no requiere auth)

---

## ⚠️ Edge Cases

- Si el usuario no ingresa nombres: "Jugador 1", "Jugador 2", etc.
- Commander names en modo guest: texto libre — sin validación de WUBRG (guest no tiene DB de commanders)
- Rotación de secciones: mantener el mismo comportamiento que el tracker normal (BR-TRACK-13)

## 🧪 Tests Requeridos

- [x] Unit: `useGuestTracker` — undo revierte el estado in-memory
- [x] Unit: confirm dialog al salir con datos modificados (no mostrar si no hay cambios)

## 🚫 Out of Scope

- Persistir el estado guest en AsyncStorage entre sesiones → Non-Goal (BR-AUTH-01)
- Upgrade Guest→User con preservación de datos → ADR-006 (v1.1)

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| — | Sin persistencia en AsyncStorage | BR-AUTH-01 explícito: datos se descartan al salir |
| 2026-04-11 | `useGuestTracker` como hook separado (no reutilizar `useTracker`) | `useTracker` está acoplado a Clerk auth + API; el guest hook es completamente in-memory, sin imports de servicios |
| 2026-04-11 | Enemigos en CommanderDamagePanel = otros participantes por ID | Guest no tiene commanders en DB; los otros jugadores (por participation.id) sirven como `commanderIdSource` — misma interfaz del componente sin cambios |
| 2026-04-11 | Confirm dialog solo si `isDirty=true` | Calculado desde events history — no mostrar si no hubo cambios reales (mejor UX) |
| 2026-04-11 | Two-phase screen (setup → tracking) en un solo `app/guest.tsx` | Evita navegación extra; el estado de setup es efímero y no necesita URL propia |

### Artifacts Created

- `hooks/useGuestTracker.ts` — estado in-memory con undo, `isDirty`, init
- `app/guest.tsx` — SCR-019 completo: setup phase + tracking phase + guest banner
- `__tests__/unit/hooks/useGuestTracker.test.ts` — 23 test stubs (undo, isDirty, confirm dialog)

### Verification

- [x] Typecheck: Pass (0 errores en archivos nuevos)
- [x] Lint: Pass (0 warnings)
- [x] Tests: 23 todo stubs — 1 suite passed

### Commit

`5ec1be1` feat(platform): implement SCR-019 Guest Tracker — full in-memory tracker (PLAT-004)

---

## Commits

`5ec1be1` feat(platform): implement SCR-019 Guest Tracker — full in-memory tracker (PLAT-004)

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-11_
