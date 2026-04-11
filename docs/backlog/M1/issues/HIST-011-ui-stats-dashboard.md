# HIST-011: UI — SCR-006 Stats Dashboard + SCR-015 Matchup Stats

> **Issue ID:** HIST-011
> **Priority:** P1
> **Effort:** L
> **Story Points:** 8
> **Status:** 📋 Backlog
> **Epic:** [EPIC-04-HISTORY-STATS](../epics/EPIC-04-HISTORY-STATS.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar dos pantallas de stats: SCR-006 (Stats Dashboard — tab "Stats") con el ranking global de jugadores y top decks/commanders, y SCR-015 (Matchup Stats — push desde el dashboard) con el selector de entidades para comparar head-to-head.

## User Story

> Como **P-002** (usuario autenticado), quiero **ver el dashboard global y comparar entidades** para **entender quién domina el meta de mi grupo**.

**Implementa:** US-026, US-027, US-028, US-029

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-006 Stats Dashboard | [15_DESIGN.md#scr-006](../../planning/15_DESIGN.md) |
| DESIGN | SCR-015 Matchup Stats | [15_DESIGN.md#scr-015](../../planning/15_DESIGN.md) |
| USER_STORIES | US-026, US-027, US-028, US-029 | [04_USER_STORIES.md#us-026](../../planning/04_USER_STORIES.md) |
| BUSINESS_RULES | BR-STATS-07 (empate en ranking) | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación (SCR-006 Stats Dashboard)

- [ ] Tab "Stats" en el bottom tab bar
- [ ] Métrica principal: "N partidas completadas" como stat de portada
- [ ] Sección "Ranking de jugadores": lista ordenada por win rate con posición (empate: misma posición — BR-STATS-07)
- [ ] Cada fila de ranking: posición `#1`, nombre del jugador, win rate, total matches
- [ ] Sección "Top Decks": top 5 decks con win rate (badge del commander)
- [ ] Sección "Top Commanders": top 5 commanders con win rate + color chips
- [ ] CTA "Ver Matchup" → navega a SCR-015
- [ ] Estado vacío si no hay partidas: "¡Registra tu primera partida para ver stats!"

## ✅ Criterios de Aceptación (SCR-015 Matchup Stats)

- [ ] Selector de `entity_type`: Player / Deck / Commander (segmented control o tab)
- [ ] Dos selectores de entidad (Entidad A, Entidad B) con search/dropdown
- [ ] Scope toggle: "Todos" / "Solo 1v1"
- [ ] Resultado: card con A vs B — wins de A, wins de B, draws, total_matches
- [ ] Si no hay matches compartidos: "Sin partidas en común"
- [ ] Estado inicial vacío con instrucción "Selecciona dos entidades para comparar"

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Dashboard con ranking de 4 jugadores
  Dado que el grupo tiene 15 matches completados y 4 jugadores con win rates distintos
  Cuando navego a SCR-006
  Entonces veo ranking #1–#4 con win rates, y las métricas de portada

Escenario: Empate en ranking
  Dado que Ana y Carlos tienen ambos 50% de win rate
  Cuando veo el ranking
  Entonces ambos aparecen en posición #1 (BR-STATS-07)
  Y el siguiente jugador aparece en #3

Escenario: Matchup Ana vs Carlos
  Dado que ambos se enfrentaron en 8 matches (Ana 3W, Carlos 4W, 1D)
  Cuando selecciono "Jugador", luego Ana y Carlos en SCR-015
  Entonces veo: Ana 3 - Carlos 4 (1 empate) de 8 matches

Escenario: Cambiar scope a 1v1
  Dado que de los 8 matches, 2 fueron 1v1
  Cuando cambio el toggle a "Solo 1v1"
  Entonces el resultado se actualiza automáticamente con los 2 matches 1v1
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/(tabs)/stats.tsx` — SCR-006 screen
- `app/stats/matchup.tsx` — SCR-015 screen
- `components/stats/PlayerRankingRow.tsx` — fila del ranking
- `components/stats/MatchupCard.tsx` — resultado del matchup
- `components/stats/EntitySelector.tsx` — dropdown de entidades para matchup
- `hooks/useGlobalStats.ts` — GET /stats/global
- `hooks/useMatchupStats.ts` — GET /stats/matchup con debounce en selección

**Ranking rendering:**
```typescript
// Posición con empate: DENSE_RANK
// Si rank===prevRank: misma posición visual (no incrementar el counter)
```

**Dependencias de Issues:**
- Bloqueado por: HIST-010 (API matchup + global), HIST-004 (para navegar a player profile)
- Bloquea a: —

---

## ⚠️ Edge Cases

- Muchos jugadores en ranking (20+): FlatList con sección fija "Top 10" y collapsible "Ver todos"
- Selector de entidades en SCR-015: lista puede tener muchos decks/commanders — usar search input
- Stats Dashboard sin partidas: estado vacío con ilustración y CTA "Iniciar Partida"

## 🧪 Tests Requeridos

- [ ] Unit: `PlayerRankingRow` muestra empate con misma posición visual (BR-STATS-07)
- [ ] Integration: SCR-015 se actualiza al cambiar scope toggle sin recargar la pantalla
- [ ] Unit: `MatchupCard` muestra "Sin partidas en común" cuando total_matches=0

## 🚫 Out of Scope

- Gráficas de win rate en el tiempo → Fase 2
- Export del dashboard → Non-Goal NG-006

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
