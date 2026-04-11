# HIST-002: UI — SCR-005 Match History + MatchCard

> **Issue ID:** HIST-002
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-04-HISTORY-STATS](../epics/EPIC-04-HISTORY-STATS.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar SCR-005 (Historial tab): lista paginada de matches con filtros, componente `MatchCard` reutilizable, y estado vacío. Tap en MatchCard navega a SCR-011 (Match Detail).

## User Story

> Como **P-002** (usuario autenticado), quiero **ver y filtrar mi historial de partidas** para **revisar resultados y encontrar matches específicos**.

**Implementa:** US-019, US-020

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-005 Historial | [15_DESIGN.md#scr-005](../../planning/15_DESIGN.md) |
| USER_STORIES | US-019, US-020 | [04_USER_STORIES.md#us-019](../../planning/04_USER_STORIES.md) |
| BUSINESS_RULES | BR-MATCH-07 | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [ ] FlatList con matches del hook `useMatchHistory` (conectado a HIST-001)
- [ ] `MatchCard` component: fecha, jugadores con decks, ganador (o "Draw" / "Abandoned"), win condition, duración
- [ ] Estado vacío con mensaje "Sin partidas registradas — ¡Inicia tu primera partida!" + CTA
- [ ] FilterBar colapsable: player, deck, commander, resultado, win_condition, rango de fechas
- [ ] Infinite scroll (FlatList `onEndReached`) que carga más con offset paginado
- [ ] Pull-to-refresh para recargar el historial
- [ ] Loading skeleton mientras carga (3 skeleton cards)
- [ ] Tap en MatchCard → navega a SCR-011

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Ver historial
  Dado que tengo 12 matches completados
  Cuando navego a SCR-005 (tab Historial)
  Entonces veo una lista de MatchCards ordenadas por fecha DESC (más reciente primero)
  Y cada card muestra fecha, jugadores, ganador (o estado especial)

Escenario: Estado vacío — primer uso
  Dado que no tengo matches registrados
  Cuando navego a SCR-005
  Entonces veo "Sin partidas registradas — ¡Inicia tu primera partida!" con CTA

Escenario: Filtrar por jugador
  Dado que abro la FilterBar y selecciono "Ana" como jugador
  Cuando aplico el filtro
  Entonces la lista se actualiza mostrando solo los matches en que participó Ana

Escenario: Infinite scroll
  Dado que tengo 35 matches y la lista muestra 20
  Cuando hago scroll hasta el final
  Entonces se cargan 15 matches adicionales automáticamente
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/(tabs)/history.tsx` — SCR-005 screen
- `components/match/MatchCard.tsx` — Card reutilizable (también usada en SCR-002 Home)
- `components/match/MatchHistoryFilterBar.tsx` — FilterBar colapsable
- `hooks/useMatchHistory.ts` — Fetch + paginación + filtros

**MatchCard anatomy:**
```
┌─────────────────────────────────────────────────────┐
│ 09 Abr 2026 · 2h 15m                        DRAW    │
│ Ana (Atraxa) · Carlos (Meren) · Miguel (Edgar)      │
│ Condition: —                                         │
└─────────────────────────────────────────────────────┘
```

**Filtros como query params:**
```typescript
type HistoryFilters = {
  player_id?: string;
  deck_id?: string;
  commander_id?: string;
  result?: 'win' | 'lose' | 'draw' | 'abandoned';
  win_condition?: WinCondition;
  date_from?: string;  // ISO date
  date_to?: string;
};
```

**Dependencias de Issues:**
- Bloqueado por: HIST-001 (API)
- Bloquea a: —

---

## ⚠️ Edge Cases

- MatchCard con 4 jugadores: truncar lista si no cabe en una línea → "Ana, Carlos +2"
- Match "abandoned" sin ganador: mostrar "Abandoned" en estado especial con color neutral
- Duración del match: si `ended_at - started_at` > 24h (posible si dejaron match pausado), mostrar "> 1 día"

## 🧪 Tests Requeridos

- [ ] Unit: `MatchCard` renderiza correctamente para win, draw, y abandoned
- [ ] Unit: `MatchCard` muestra duración formateada correctamente
- [ ] Integration: FilterBar actualiza la lista al cambiar filtros

## 🚫 Out of Scope

- Exportar historial → Non-Goal NG-006
- Match notes / comentarios → Fase 2

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
