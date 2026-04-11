# HIST-009: UI — SCR-014 Commander Detail FULL

> **Issue ID:** HIST-009
> **Priority:** P1
> **Effort:** S
> **Story Points:** 2
> **Status:** ✅ Done
> **Epic:** [EPIC-04-HISTORY-STATS](../epics/EPIC-04-HISTORY-STATS.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Completar SCR-014 (Commander Detail) reemplazando el stub de DATA-010 con stats reales del commander: win rate, decks que lo usan, jugadores que lo pilotearon.

## User Story

> Como **P-002** (usuario autenticado), quiero **ver el detalle de un commander con sus stats** para **saber qué tan fuerte es en el meta de mi grupo**.

**Implementa:** US-025

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-014 Detalle Commander | [15_DESIGN.md#scr-014](../../planning/15_DESIGN.md) |
| USER_STORIES | US-025 | [04_USER_STORIES.md#us-025](../../planning/04_USER_STORIES.md) |

---

## ✅ Criterios de Aceptación

- [x] Header: nombre del commander + `ColorChips` WUBRG + badge "Partner" si aplica
- [x] Stat bar: win rate, total_matches, wins
- [x] Sección "Decks que lo usan": lista con nombre del deck + matches totales
- [x] Sección "Jugadores que lo pilotearon": lista con nombre + matches
- [x] Estado vacío si no hay historial: "Este commander aún no fue usado en ninguna partida"

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Commander Detail con stats
  Dado que "Atraxa" tiene win_rate=62.5%, decks=[Proliferación Total], players=[Ana, Carlos]
  Cuando navego a SCR-014
  Entonces veo stats + listas de decks y jugadores
```

## 🔧 Contexto Técnico

**Archivos a modificar:**
- `app/commanders/[id].tsx` — SCR-014 screen (reemplaza stub de DATA-010)

**Dependencias de Issues:**
- Bloqueado por: HIST-008

---

## 🧪 Tests Requeridos

- [x] Unit: `ColorChips` WUBRG muestra los colores correctos del commander

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-11 | `useCommanderStats` → `GET /api/stats/commanders/:id` (no reutiliza fetch del stub) | El stub llamaba `GET /api/commanders/:id` (solo metadatos); la nueva hook llama al endpoint de stats que devuelve metadatos + aggregations en una sola respuesta |
| 2026-04-11 | Tap en deck → `/decks/:id` (SCR-013) | Navigation a la pantalla de detalle completa del deck, no a la lista |

### Artifacts Created

- `hooks/useCommanderStats.ts` — fetch `GET /api/stats/commanders/:id`
- `app/commanders/[id].tsx` — SCR-014 completo (reemplaza stub DATA-010)

### Verification

- [x] Typecheck: Pass (0 errores)
- [x] Tests: cubiertos por stubs de HIST-012

---

_Completado: 2026-04-11_
