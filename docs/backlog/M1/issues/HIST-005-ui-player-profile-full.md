# HIST-005: UI — SCR-012 Player Profile FULL

> **Issue ID:** HIST-005
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

Completar SCR-012 (Player Profile) reemplazando el stub de DATA-008 con stats reales. Muestra win rate prominente, total de matches, decks y commanders más usados con sus win rates individuales.

## User Story

> Como **P-002** (usuario autenticado), quiero **ver el perfil completo de un jugador con sus stats** para **entender su historial y estilo de juego**.

**Implementa:** US-022, US-023

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-012 Perfil Jugador | [15_DESIGN.md#scr-012](../../planning/15_DESIGN.md) |
| USER_STORIES | US-022, US-023 | [04_USER_STORIES.md#us-022](../../planning/04_USER_STORIES.md) |
| BUSINESS_RULES | BR-STATS-01, CALC-001 | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [ ] Header: nombre del jugador en `headline-md`
- [ ] Stat bar prominente: win rate (o "Sin partidas"), total_matches, wins/losses/draws
- [ ] Win rate como número grande (`display-sm` 48sp) con `primary` (amber) — destaca visualmente
- [ ] Si total_matches=0: mensaje "Sin partidas registradas" (no "0%" — US-022)
- [ ] Sección "Decks más usados": lista de hasta 5 decks con nombre, commander(s), partidas, win rate
- [ ] Sección "Commanders más usados": lista de hasta 5 commanders con color chips WUBRG, partidas, win rate
- [ ] Tap en un deck → navega a SCR-013 (Deck Detail)
- [ ] Tap en un commander → navega a SCR-014 (Commander Detail)

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Perfil con stats completas
  Dado que Carlos tiene 10 matches: 4W/3L/3D, decks: Atraxa (60%WR, 5p), Meren (33%WR, 3p)
  Cuando navego a SCR-012 de Carlos
  Entonces veo win_rate prominente "40%", total_matches=10
  Y en "Decks más usados" veo Atraxa (5p, 60%) y Meren (3p, 33%)

Escenario: Jugador sin partidas
  Dado que Ana no tiene matches completed
  Cuando navego a SCR-012 de Ana
  Entonces veo "Sin partidas registradas" en lugar de "0%"
  Y las secciones de decks y commanders muestran estado vacío
```

## 🔧 Contexto Técnico

**Archivos a modificar:**
- `app/players/[id].tsx` — SCR-012 screen (reemplaza stub de DATA-008)

**Hook:**
```typescript
// usePlayerStats(playerId) → GET /stats/players/:id
```

**DeckStatRow component:**
```typescript
// Reutilizable en SCR-012, SCR-013, SCR-014
interface DeckStatRowProps {
  deck: Deck;
  matches: number;
  win_rate_pct: number | null;
}
```

**Dependencias de Issues:**
- Bloqueado por: HIST-004 (API player stats)
- Bloquea a: —

---

## ⚠️ Edge Cases

- Nombre largo del jugador: truncar con ellipsis en header
- Deck con partner: mostrar ambos commanders en DeckStatRow (+ chip de "Partner")

## 🧪 Tests Requeridos

- [ ] Unit: win rate "Sin partidas" vs "0%" — asegurar diferenciación visual
- [ ] Unit: `DeckStatRow` muestra win rate como porcentaje formateado

## 🚫 Out of Scope

- Editar nombre del jugador desde SCR-012 → ya existe en SCR-003 inline
- Historial de matches del jugador aquí → accesible desde SCR-005 con filtro de jugador

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
