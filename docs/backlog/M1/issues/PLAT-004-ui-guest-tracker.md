# PLAT-004: UI — SCR-019 Guest Tracker (full)

> **Issue ID:** PLAT-004
> **Priority:** P0
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
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

- [ ] Al entrar, pantalla de setup mínima: N jugadores (2/3/4), nombres opcionales (o "Jugador 1/2/3/4")
- [ ] Layout del tracker usando `TrackerLayout` + `PlayerSection` de TRACK-003
- [ ] `LifeCounter` funcional con debounce local (default 500ms) — sin API calls (BR-AUTH-01)
- [ ] `CommanderDamagePanel` funcional — in-memory, sin commanders precargados (nombres opcionales)
- [ ] `PoisonCounter` funcional
- [ ] Undo ilimitado funcional — solo en memoria (array de historial local)
- [ ] Banner superior fijo: "Modo invitado — Crea una cuenta para guardar el historial" + CTA → SCR-001
- [ ] Al salir del tracker (back/home): confirm dialog "¿Seguro? Los datos se perderán" (BR-AUTH-01)
- [ ] Sin API calls de ningún tipo — completamente offline

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

- [ ] Unit: `useGuestTracker` — undo revierte el estado in-memory
- [ ] Unit: confirm dialog al salir con datos modificados (no mostrar si no hay cambios)

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

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
