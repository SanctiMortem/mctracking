# TRACK-003: UI — SCR-008 Match Tracker shell (layout system)

> **Issue ID:** TRACK-003
> **Priority:** P0
> **Effort:** L
> **Story Points:** 8
> **Status:** 📋 Backlog
> **Epic:** [EPIC-03-LIVE-TRACKING](../epics/EPIC-03-LIVE-TRACKING.md)
> **Skills:** `domains/ui`
> **Agents:** `mobile-developer`, `layout-composer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar el shell de SCR-008 (Match Tracker): la pantalla modal de pantalla completa con el sistema de layout dinámico para 2, 3 y 4 jugadores. Cada sección de jugador ocupa su porción de la pantalla y puede rotarse individualmente (BR-TRACK-13). Este issue establece la estructura del tracker — los componentes internos (life counter, commander damage, etc.) se agregan en TRACK-004 a TRACK-007.

## User Story

> Como **P-002** (usuario en una partida), quiero **ver el tracker con las secciones de cada jugador en pantalla** para **trackear todos los contadores simultáneamente sin salir de la misma pantalla**.

**Implementa:** US-013, US-015

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-008 Match Tracker | [15_DESIGN.md#scr-008](../../planning/15_DESIGN.md) |
| DESIGN | §0.7 Shell + Navegación | [15_DESIGN.md#§07-shell--navegacion-general](../../planning/15_DESIGN.md) |
| USER_STORIES | US-013, US-015 | [04_USER_STORIES.md#us-013](../../planning/04_USER_STORIES.md) |
| BUSINESS_RULES | BR-TRACK-13 (section rotation) | [05_BUSINESS_RULES.md#br-track-13](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [ ] Modal de pantalla completa sin tab bar (tab bar hidden en SCR-008)
- [ ] Layout 2 jugadores: 2 secciones de 50% de la pantalla (una arriba, una abajo)
- [ ] Layout 3 jugadores: 1 sección top full-width + 2 secciones bottom de 50%
- [ ] Layout 4 jugadores: 2x2 grid de cuadros iguales
- [ ] Cada sección tiene orientación de contenido rotable 180° (BR-TRACK-13): long-press activa rotación de la sección individual con gesture + handle icon visible (A-06 de 15_DESIGN)
- [ ] Header mínimo: timer del match (tiempo transcurrido) + botón "Cerrar Match" que abre SCR-009
- [ ] Placeholder de contenido en cada sección (se rellena con TRACK-004+)
- [ ] `GET /api/matches/:id` al montar para cargar el estado actual

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Layout correcto para 3 jugadores
  Dado que el match tiene 3 participations
  Cuando navego a SCR-008
  Entonces veo 1 sección arriba (full width) y 2 secciones abajo (50/50)

Escenario: Rotar sección individual
  Dado que estoy en SCR-008 con 4 jugadores
  Cuando hago long-press en la sección de Gabriel
  Entonces esa sección rota 180° (para que el jugador al otro lado pueda verla)
  Y las otras 3 secciones no se ven afectadas

Escenario: Abrir cierre de match
  Dado que estoy en SCR-008
  Cuando toco "Cerrar Match"
  Entonces se abre SCR-009 (Cierre) como bottom sheet
  Y el tracker permanece visible detrás del sheet

Escenario: Recuperar match en curso
  Dado que el match abc está in_progress
  Cuando abro SCR-008 para el match abc
  Entonces los life totals y contadores muestran el estado actual de la DB
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `app/match/[id]/tracker.tsx` — SCR-008 screen
- `components/match/TrackerLayout.tsx` — Sistema de layout 2/3/4p
- `components/match/PlayerSection.tsx` — Sección individual con rotación
- `hooks/useTracker.ts` — Estado local del tracker + sync con API

**Layout system:**
```typescript
// TrackerLayout determina el layout según número de participantes
type LayoutType = '2p' | '3p' | '4p';
```

**Rotación con Reanimated:**
```typescript
// react-native-reanimated + react-native-gesture-handler
// Long press → toggle 180° rotation del contenedor
```

**Dependencias de Issues:**
- Bloqueado por: TRACK-001 (MatchEvent schema), MATCH-001 (Participation schema)
- Bloquea a: TRACK-004, TRACK-005, TRACK-006, TRACK-007

## ⚠️ Edge Cases

- 4 secciones en iPhone SE (375pt wide): el spike TRACK-008 investiga si hay legibilidad
- La rotación es por `PlayerSection` — cada sección tiene su propio estado de rotación independiente
- Si el match está completed/abandoned al cargar SCR-008 → redirigir a SCR-010/011

## 🧪 Tests Requeridos

- [ ] Unit: `TrackerLayout` renderiza layout correcto para 2p, 3p, 4p
- [ ] Unit: `PlayerSection` toggle rotation cambia 0° ↔ 180°
- [ ] E2E: SCR-008 carga con estado actual del match

## 🚫 Out of Scope

- Componentes de tracking (life, poison, commander damage) → TRACK-004+
- Animaciones de cierre del match → MATCH-006

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
