# MATCH-005: UI — SCR-007 Match Setup

> **Issue ID:** MATCH-005
> **Priority:** P0
> **Effort:** L
> **Story Points:** 8
> **Status:** 📋 Backlog
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

- [ ] Unit: `MatchSetupForm` — deshabilita "Iniciar" con deck duplicado
- [ ] Integration: form completo → POST /api/matches → navegación a tracker
- [ ] E2E: happy path 3-player match setup en simulador

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
| — | — | — |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
