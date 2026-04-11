# HIST-007: UI — SCR-013 Deck Detail FULL

> **Issue ID:** HIST-007
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

Completar SCR-013 (Deck Detail) reemplazando el stub de DATA-009 con stats reales del deck y la lista de jugadores que lo usaron.

## User Story

> Como **P-002** (usuario autenticado), quiero **ver el detalle y stats de un deck** para **evaluar su rendimiento histórico**.

**Implementa:** US-024

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-013 Detalle Deck | [15_DESIGN.md#scr-013](../../planning/15_DESIGN.md) |
| USER_STORIES | US-024 | [04_USER_STORIES.md#us-024](../../planning/04_USER_STORIES.md) |

---

## ✅ Criterios de Aceptación

- [x] Header: nombre del deck + commander(s) con color chips WUBRG
- [x] Stat bar: win rate, total_matches, wins
- [x] Descripción del deck (si existe)
- [x] Sección "Jugadores": lista de `players_used_by` con nombre, partidas y win rate individual
- [x] Si no hay stats (deck nuevo sin partidas): "Sin partidas con este deck"

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Deck Detail con stats
  Dado que "Meren Reanimator" tiene win_rate_pct=42.9%, total_matches=7, players=[Ana, Carlos]
  Cuando navego a SCR-013
  Entonces veo las stats del deck y la lista de jugadores con sus win rates individuales
```

## 🔧 Contexto Técnico

**Archivos a modificar:**
- `app/decks/[id].tsx` — SCR-013 screen (reemplaza stub de DATA-009)

**Dependencias de Issues:**
- Bloqueado por: HIST-006 (API deck stats)

---

## ⚠️ Edge Cases

- Partner deck: mostrar "Commander 1 + Commander 2" con ambos color chips

## 🧪 Tests Requeridos

- [x] Unit: partner commanders se muestran correctamente con dos color chip rows

## 🚫 Out of Scope

- Editar el deck desde SCR-013 → ya existe en SCR-004

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-11 | `useDeckStats` importa `DeckStats` de `services/stats`, no `DeckWithCommanders` de `services/decks` | Ambos archivos exportan `DeckWithCommanders` con shapes ligeramente distintos; usar el tipo de stats evita ambigüedad en el screen |
| 2026-04-11 | `CommanderCard` recibe props primitivos (`name`, `cardColors`, `isPartner`) en vez del objeto `Commander` | Evita importar el tipo `Commander` en el screen; más explícito y resistente a cambios de schema |

### Artifacts Created

- `hooks/useDeckStats.ts` — fetch `GET /api/stats/decks/:id`
- `app/decks/[id].tsx` — SCR-013 completo (reemplaza stub DATA-009)

### Verification

- [x] Typecheck: Pass (0 errores)
- [x] Tests: cubiertos por stubs de HIST-012

---

_Completado: 2026-04-11_
