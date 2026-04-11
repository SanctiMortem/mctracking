# MATCH-008: UI — SCR-011 Match Detail (stub)

> **Issue ID:** MATCH-008
> **Priority:** P2
> **Effort:** S
> **Story Points:** 2
> **Status:** ✅ Done
> **Epic:** [EPIC-02-MATCH-LIFECYCLE](../epics/EPIC-02-MATCH-LIFECYCLE.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar el stub de SCR-011 (Match Detail): pantalla que muestra información básica del match (fecha, jugadores, decks, resultado). El event log (movimientos del match) se agrega en EPIC-03. El historial de matches (lista) se construye en EPIC-04.

## User Story

> Como **P-002** (usuario), quiero **ver el detalle de un match** para **revisar quién ganó con qué condición y quiénes participaron**.

**Implementa:** US-021 (parcial — event log en EPIC-03)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-011 Detalle Match | [15_DESIGN.md#scr-011](../../planning/15_DESIGN.md) |
| USER_STORIES | US-021 | [04_USER_STORIES.md#us-021](../../planning/04_USER_STORIES.md) |
| DATA_MODEL | E-005 Match | [06_DATA_MODEL.md#e-005](../../planning/06_DATA_MODEL.md) |

---

## ✅ Criterios de Aceptación

- [x] Muestra fecha del match, duración, status
- [x] Lista de participantes con jugador, deck, commander y resultado
- [x] Sección "Ganador" con win condition (o draw/abandoned)
- [x] Sección "Event Log" con placeholder "Próximamente" (se implementa en EPIC-03)
- [x] Accesible desde SCR-010 (CTA "Ver detalle") y eventualmente desde SCR-005 (Historial, EPIC-04)

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Ver detalle de match completado
  Dado que el match está completed con un ganador
  Cuando navego a SCR-011
  Entonces veo la fecha, participantes y el ganador con win condition

Escenario: Placeholder de event log
  Dado que el event log no está implementado aún
  Cuando estoy en SCR-011
  Entonces veo la sección "Event Log" con "Próximamente"
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `app/match/[id]/index.tsx` — SCR-011

**Dependencias de Issues:**
- Bloqueado por: MATCH-004 (Match Detail API)

## ⚠️ Edge Cases

- Match `in_progress`: mostrar banner "Partida en curso" con CTA al tracker

## 🧪 Tests Requeridos

- [ ] Unit: `SCR-011` renderiza participantes y resultado correctamente

## 🚫 Out of Scope

- Event Log → EPIC-03
- Historial de matches → EPIC-04

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-11 | Reusa `useMatchResults` sin nuevo hook | Misma llamada GET /api/matches/:id — no hay lógica adicional para detalle vs. resultados |
| 2026-04-11 | Reusa `ParticipantResultRow` del MATCH-007 | Mismo formato visual; SCR-011 es más detallado que SCR-010 pero la fila es idéntica |
| 2026-04-11 | Banner "Partida en curso" con CTA al tracker | Edge case del issue — match puede estar `in_progress` si se accede desde URL directa o historia |
| 2026-04-11 | Event Log placeholder simple (no componente separado) | Es un stub con 2 líneas de texto; el componente real se construye en EPIC-03 |

### AC Evidence

| AC | Descripción | Cubierto | Evidencia |
|----|-------------|----------|-----------|
| 1 | Fecha, duración, status badge | ✅ | `index.tsx:metaCard` — `formatDate`, `duration`, `statusConfig` |
| 2 | Lista participantes con player/deck/commander/resultado | ✅ | `index.tsx` → `ParticipantResultRow × N` |
| 3 | Sección "Ganador" con win condition | ✅ | `index.tsx:outcomeCard` — `outcomeLabelConfig` + `conditionBadge` |
| 4 | Event Log placeholder "Próximamente" | ✅ | `index.tsx:placeholderCard` |
| 5 | Accesible desde SCR-010 | ✅ | `results.tsx` CTA "Ver detalle" → `router.push('/match/${id}')` |

---

## Commits

_Ver git log — branch epic/match-lifecycle_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-11_
