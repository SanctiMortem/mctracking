# TRACK-007: Component — EventLog + Undo (CMP-011)

> **Issue ID:** TRACK-007
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-03-LIVE-TRACKING](../epics/EPIC-03-LIVE-TRACKING.md)
> **Skills:** `domains/ui`, `domains/api`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar el EventLog panel (CMP-011) y el botón de Undo en SCR-008: un panel colapsable que muestra el historial de eventos del match en curso, y un botón Undo prominente que invoca `POST /api/match-events/undo`. El Undo es ilimitado hacia atrás (BR-TRACK-11) y revierte el estado del tracker tanto localmente como en la API.

## User Story

> Como **P-002** (usuario en partida), quiero **ver los últimos cambios y poder deshacer errores** para **corregir un tap accidental sin interrumpir el juego**.

**Implementa:** US-032, US-033

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | CMP-011 EventLog | [15_DESIGN.md#cmp-011](../../planning/15_DESIGN.md) |
| USER_STORIES | US-032, US-033 | [04_USER_STORIES.md#us-032](../../planning/04_USER_STORIES.md) |
| BUSINESS_RULES | BR-TRACK-11 (undo ilimitado) | [05_BUSINESS_RULES.md#br-track-11](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-TRACK-09 (debounce context) | [05_BUSINESS_RULES.md#br-track-09](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [x] Panel de event log colapsable en SCR-008 (A-07: colapsable en tracker, no solo post-match)
- [x] Lista scrollable de MatchEvents recientes (más nuevo arriba) con descripción legible ("Gabriel: -5 vida", "Carlos recibió 7 de commander damage de Atraxa")
- [x] Eventos marcados como `is_undone=true` aparecen tachados (no ocultos)
- [x] Botón "Undo" prominente (esquina fija o en header) — invoca `POST /api/match-events/undo`
- [x] Undo actualiza el estado local del tracker inmediatamente (optimistic update) y confirma con la API
- [x] Si no hay eventos para deshacer: botón Undo disabled o con feedback "No hay acciones para deshacer"
- [x] El panel también se muestra en SCR-011 (Match Detail) post-match — conectar al completar EPIC-04

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Ver event log durante partida
  Dado que hay 5 MatchEvents registrados
  Cuando abro el panel de EventLog
  Entonces veo los 5 eventos en orden cronológico inverso (más nuevo arriba)
  Y los eventos tienen descripción legible en español

Escenario: Undo de último evento
  Dado que el último evento es "Gabriel: -5 vida"
  Cuando toco el botón "Undo"
  Entonces el tracker actualiza el life_total de Gabriel +5 inmediatamente
  Y el evento aparece tachado en el log

Escenario: Undo ilimitado
  Dado que hay 10 eventos registrados
  Cuando hago Undo 10 veces consecutivas
  Entonces todos los eventos quedan marcados como is_undone=true
  Y los valores del tracker vuelven al estado inicial (life=40, poison=0, commander_damage={})

Escenario: Botón Undo sin eventos
  Dado que no hay MatchEvents en el match (recién iniciado)
  Cuando intento hacer Undo
  Entonces el botón está disabled o muestra "No hay acciones para deshacer"
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `components/tracker/EventLogPanel.tsx` — Panel colapsable con lista
- `components/tracker/EventLogItem.tsx` — Fila individual por evento
- `hooks/useEventLog.ts` — Fetch de eventos del match

**Formato de descripción de evento:**
```typescript
function formatEvent(event: MatchEvent, participations: Participation[]): string {
  const player = participations.find(p => p.id === event.participationId)?.player.name;
  if (event.eventType === 'life_change') {
    return `${player}: ${event.delta > 0 ? '+' : ''}${event.delta} vida`;
  }
  // ...etc
}
```

**Dependencias de Issues:**
- Bloqueado por: TRACK-002 (API match-events undo), TRACK-003 (Tracker shell)
- Bloquea a: SCR-011 event log (EPIC-04)

## ⚠️ Edge Cases

- Si el Undo falla en la API (network error): revertir el optimistic update con toast de error
- Event log puede tener 100+ eventos en partidas largas — usar VirtualizedList o limitación de pantalla (últimos 50 eventos visibles)

## 🧪 Tests Requeridos

- [ ] Unit: `formatEvent` genera descripción correcta para los 3 tipos de evento
- [ ] Integration: botón Undo → API call → estado actualizado
- [ ] E2E: Undo revierte el tracker visualmente

## 🚫 Out of Scope

- Exportar el event log → Non-Goal NG-006

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
