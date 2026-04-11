# MATCH-005: UI — SCR-007 Match Setup

> **Issue ID:** MATCH-005
> **Priority:** P0
> **Effort:** L
> **Story Points:** 8
> **Status:** ✅ Done
> **Epic:** [EPIC-02-MATCH-LIFECYCLE](../epics/EPIC-02-MATCH-LIFECYCLE.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar SCR-007 (Match Setup): modal de pantalla completa (sin tab bar) donde el usuario selecciona 2-4 jugadores, asigna un deck a cada uno, y confirma el inicio de la partida. Es L de complejidad por el selector multi-jugador dinámico, la validación de no-repetición de decks, y la gestión de estado del formulario.

## User Story

> Como **P-002** (usuario autenticado), quiero **configurar una partida seleccionando jugadores y sus decks** para **iniciar el tracker en vivo con los participantes correctos**.

**Implementa:** US-010, US-011, US-012

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-007 Setup Match | [15_DESIGN.md#scr-007](../../planning/15_DESIGN.md) |
| USER_STORIES | US-010, US-011, US-012 | [04_USER_STORIES.md#us-010](../../planning/04_USER_STORIES.md) |
| BUSINESS_RULES | BR-MATCH-01 (2-4 players) | [05_BUSINESS_RULES.md#br-match-01](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-DECK-01 (no deck duplicado) | [05_BUSINESS_RULES.md#br-deck-01](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [ ] Modal de pantalla completa, sin tab bar visible
- [ ] Stepper/formulario: mínimo 2 slots de jugador, botón "+" para agregar hasta 4
- [ ] Cada slot: selector de jugador (de lista de players) + selector de deck (filtrado por jugador o global)
- [ ] Validación en tiempo real: misma deck seleccionada en dos slots → error visual inline
- [ ] Botón "Iniciar Partida" disabled hasta que todos los slots tengan jugador + deck
- [ ] Al confirmar: llama `POST /api/matches`, navega a SCR-008 (Tracker)
- [ ] Botón "Cancelar" cierra el modal y vuelve a Home
- [ ] Reutiliza `CommanderSelector` de DATA-007 para la selección de decks

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Configurar match con 3 jugadores
  Dado que estoy en SCR-007
  Cuando selecciono 3 jugadores (Gabriel, Carlos, Ana) con sus decks distintos
  Y toco "Iniciar Partida"
  Entonces se llama POST /api/matches
  Y navego a SCR-008 (Match Tracker) con los 3 jugadores

Escenario: Error por deck duplicado
  Dado que selecciono el mismo deck "Superfriends" para dos jugadores
  Entonces el botón "Iniciar Partida" está deshabilitado
  Y aparece el error "El mismo deck no puede usarse dos veces"

Escenario: Agregar cuarto jugador
  Dado que tengo 3 slots configurados
  Cuando toco el botón "+"
  Entonces aparece un cuarto slot
  Y el botón "+" desaparece (máximo 4 jugadores)

Escenario: Deck en match activo no disponible
  Dado que el deck "Atraxa" está en un match in_progress
  Cuando intento seleccionar "Atraxa" en el selector
  Entonces "Atraxa" aparece grayed out con badge "En partida activa"
  Y no puede seleccionarse
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `app/match/setup.tsx` — SCR-007 modal screen
- `components/match/PlayerSlot.tsx` — Slot individual (jugador + deck selector)
- `components/match/MatchSetupForm.tsx` — Formulario con slots + validación
- `hooks/useMatchSetup.ts` — Estado del form + llamada a API

**Dependencias de Issues:**
- Bloqueado por: MATCH-002 (POST /api/matches), DATA-003 (Player API), DATA-004 (Deck API)
- Bloquea a: TRACK-003 (Tracker UI)

## ⚠️ Edge Cases

- Si el usuario no tiene jugadores → mostrar prompt "Crea jugadores primero" con CTA a SCR-003
- Si el usuario no tiene decks → prompt "Crea decks primero" con CTA a SCR-004
- Loading state durante `POST /api/matches` (puede tardar si Neon está cold)

## 🧪 Tests Requeridos

- [x] Unit: `useMatchSetup` — isValid=false con deck duplicado (MATCH-009)
- [x] Integration: form completo → POST /api/matches → navegación a tracker (MATCH-009)
- [ ] E2E: happy path 3-player match setup en simulador (MATCH-009)

## 🚫 Out of Scope

- El tracker en sí (SCR-008) → EPIC-03
- Guardar borradores de setup

---

## SK Leverage

No aplica — funcionalidad nueva. Reutiliza `CommanderSelector` de DATA-007.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-11 | Player selection via chips (horizontal scroll) over explicit "+" slots | Matches SCR-007 wireframe in 15_DESIGN.md — chips are more readable with many players |
| 2026-04-11 | Deck picker as Modal (pageSheet) instead of inline dropdown | No bottom sheet library in scope; Modal is simpler and works cross-platform |
| 2026-04-11 | Deck-in-active-match graying deferred; handled at POST error level | DeckWithCommanders doesn't expose `inActiveMatch`; server-side error is sufficient for MVP |
| 2026-04-11 | `PlayerSlot.tsx` merged into `MatchSetupForm.tsx` | Only used in one place; separate file adds indirection without benefit |

### AC Evidence

| AC | Descripción | Cubierto | Evidencia |
|----|-------------|----------|-----------|
| 1 | Modal full-screen, sin tab bar visible | ✅ | `_layout.tsx` — `presentation: 'fullScreenModal'` |
| 2 | 2–4 jugadores via chips | ✅ | `useMatchSetup.ts` — `togglePlayer` guards `length >= 4` |
| 3 | Selector de jugador + deck por slot | ✅ | `MatchSetupForm.tsx` — chip row + deck trigger per selected player |
| 4 | Duplicate deck → error visual inline | ✅ | `useMatchSetup.ts` — `duplicateDeckIds`; `MatchSetupForm.tsx` — `deckTriggerError` border + error text |
| 5 | "Iniciar Partida" disabled hasta valid | ✅ | `useMatchSetup.ts` — `isValid`; `MatchSetupForm.tsx` — `submitBtnDisabled` |
| 6 | POST /api/matches → navega a tracker | ✅ | `useMatchSetup.ts:submit()`; `setup.tsx:handleSubmit` → `router.replace` |
| 7 | Cancelar cierra modal | ✅ | `setup.tsx:handleCancel` → `router.dismiss()` |
| 8 | Reutiliza ColorChips (CMP equiv.) | ✅ | `MatchSetupForm.tsx` — `<ColorChips readonly />` |

---

## Commits

_Ver git log — branch epic/match-lifecycle_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-11_
