# MATCH-007: UI — SCR-010 Match Results

> **Issue ID:** MATCH-007
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-02-MATCH-LIFECYCLE](../epics/EPIC-02-MATCH-LIFECYCLE.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar SCR-010 (Match Results): pantalla de resumen post-match que muestra el ganador (o resultado de draw/abandon), la win condition, la duración del match, y los jugadores con su resultado (ganador/perdedor). Incluye CTAs para ver el detalle completo (SCR-011) o iniciar un nuevo match.

## User Story

> Como **P-002** (usuario), quiero **ver el resumen del match recién terminado** para **celebrar la victoria o registrar el resultado antes de que todos se vayan**.

**Implementa:** US-016, US-017

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-010 Resultados | [15_DESIGN.md#scr-010](../../planning/15_DESIGN.md) |
| USER_STORIES | US-016, US-017 | [04_USER_STORIES.md#us-016](../../planning/04_USER_STORIES.md) |
| DATA_MODEL | E-007 MatchResult | [06_DATA_MODEL.md#e-007](../../planning/06_DATA_MODEL.md) |

---

## ✅ Criterios de Aceptación

- [ ] Muestra ganador con su deck y commander (o "Empate" / "Partida abandonada")
- [ ] Muestra win condition en texto legible (ej: "Victoria por Combo")
- [ ] Lista de todos los participantes con su resultado (W/L/Draw)
- [ ] Duración del match (ended_at - created_at)
- [ ] CTA "Ver detalle" navega a SCR-011
- [ ] CTA "Nueva partida" navega a SCR-007
- [ ] CTA "Inicio" navega a Home (tab)

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Ver resultados de victoria
  Dado que el match terminó con "Gabriel" ganando por "combo"
  Cuando navego a SCR-010
  Entonces veo "Gabriel ganó" con su deck/commander y "Victoria por Combo"
  Y los otros 3 jugadores listados como perdedores

Escenario: Ver resultados de empate
  Dado que el match terminó en empate
  Cuando navego a SCR-010
  Entonces veo "Empate" como resultado prominente
  Y todos los jugadores listados con resultado "Draw"

Escenario: Ver resultado de partida abandonada
  Dado que el match fue abandonado
  Cuando navego a SCR-010
  Entonces veo "Partida Abandonada" sin ganador
  Y un texto "Esta partida no cuenta en las estadísticas"
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/match/[id]/results.tsx` — SCR-010 screen
- `components/match/MatchResultCard.tsx` — Card de resultado del match
- `components/match/ParticipantResultRow.tsx` — Fila por participante

**Dependencias de Issues:**
- Bloqueado por: MATCH-003 (PATCH API)

## ⚠️ Edge Cases

- Duración del match: si `ended_at` es null (edge case de DB), mostrar "–"
- Si abandoned: no mostrar CTA de stats (no hay stats que ver)

## 🧪 Tests Requeridos

- [ ] Unit: `MatchResultCard` muestra "Empate" correctamente
- [ ] E2E: flujo completo setup → tracker → cierre → results en simulador

## 🚫 Out of Scope

- Estadísticas en SCR-010 → EPIC-04
- Compartir resultado → Non-Goal MVP

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
