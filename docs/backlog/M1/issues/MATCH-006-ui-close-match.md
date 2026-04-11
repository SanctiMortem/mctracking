# MATCH-006: UI — SCR-009 Cierre de Match (sheet)

> **Issue ID:** MATCH-006
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

Implementar SCR-009 (Cierre de Match): bottom sheet que aparece sobre SCR-008 (Match Tracker) cuando el usuario decide terminar la partida. Permite seleccionar el modo de cierre (victorioso, draw, o abandon) y en caso de victoria, seleccionar el jugador ganador y la win condition.

## User Story

> Como **P-002** (usuario en una partida), quiero **cerrar la partida seleccionando el resultado** para **que quede registrado en el historial y cuente para las estadísticas**.

**Implementa:** US-016, US-017, US-018

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-009 Cierre de Match | [15_DESIGN.md#scr-009](../../planning/15_DESIGN.md) |
| USER_STORIES | US-016, US-017, US-018 | [04_USER_STORIES.md#us-016](../../planning/04_USER_STORIES.md) |
| BUSINESS_RULES | BR-MATCH-08 (draw) | [05_BUSINESS_RULES.md#br-match-08](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-MATCH-09 (manual result) | [05_BUSINESS_RULES.md#br-match-09](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [ ] Aparece como bottom sheet desde SCR-008 (ruta `/match/[id]/close`)
- [ ] 3 opciones claras: "Hubo un ganador", "Empate", "Abandonar"
- [ ] Si "Hubo un ganador": lista de jugadores de la partida para seleccionar el ganador + dropdown de win_condition (8 opciones)
- [ ] Si "Empate": confirmación y llama API con `action: "draw"`
- [ ] Si "Abandonar": confirmación ("¿Seguro? El match no contará en stats") + llama API con `action: "abandon"`
- [ ] Al confirmar victoria: llama `PATCH /api/matches/:id` con win data → navega a SCR-010
- [ ] Botón "Cancelar" cierra el sheet y vuelve al tracker (match sigue in_progress)

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Cerrar con ganador
  Dado que estoy en SCR-009 con 4 jugadores
  Cuando selecciono "Hubo un ganador", elijo a "Gabriel" y win_condition "combo"
  Y toco "Confirmar"
  Entonces se llama PATCH /api/matches/:id con action="win"
  Y navego a SCR-010 (Match Results)

Escenario: Cancelar cierre
  Dado que estoy en SCR-009
  Cuando toco "Cancelar"
  Entonces el sheet se cierra
  Y vuelvo a SCR-008 con el match aún in_progress

Escenario: Abandonar con confirmación
  Dado que estoy en SCR-009
  Cuando elijo "Abandonar" y confirmo
  Entonces el match queda como "abandoned"
  Y navego a SCR-010 mostrando el resultado de abandoned
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/match/[id]/close.tsx` — SCR-009 screen (sheet)
- `components/match/CloseMatchSheet.tsx` — Contenido del sheet
- `components/match/WinConditionPicker.tsx` — Dropdown de 8 win conditions

**Dependencias de Issues:**
- Bloqueado por: MATCH-003 (PATCH API)
- Bloquea a: MATCH-007 (Results UI)

## ⚠️ Edge Cases

- Si hay 2 jugadores, el selector del ganador es simple (2 botones); con 4 jugadores, lista scrollable
- Win condition "scoop"/"concede" son equivalentes visualmente — mostrar solo uno o agrupar

## 🧪 Tests Requeridos

- [ ] Unit: `CloseMatchSheet` — opciones y estados
- [ ] Integration: confirmar victoria → PATCH API → navegación a SCR-010

## 🚫 Out of Scope

- Asignación automática de ganador basada en life totals (BR-MATCH-09: siempre manual)

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
