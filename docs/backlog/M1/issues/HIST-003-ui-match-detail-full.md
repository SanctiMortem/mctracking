# HIST-003: UI — SCR-011 Match Detail FULL (EventLog post-match)

> **Issue ID:** HIST-003
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

Completar SCR-011 (Match Detail) reemplazando el stub de MATCH-008. Muestra el resumen completo de un match: participantes, resultado, win condition, duración, y el EventLog completo post-match (reusando `EventLogPanel` de TRACK-007 en modo read-only).

## User Story

> Como **P-002** (usuario autenticado), quiero **ver el detalle completo de un match pasado con su event log** para **revisar qué ocurrió durante la partida**.

**Implementa:** US-021, US-034

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-011 Match Detail | [15_DESIGN.md#scr-011](../../planning/15_DESIGN.md) |
| USER_STORIES | US-021, US-034 | [04_USER_STORIES.md#us-021](../../planning/04_USER_STORIES.md) |

---

## ✅ Criterios de Aceptación

- [ ] Carga el match completo via `GET /matches/:id` (MATCH-004)
- [ ] Header: fecha del match, duración (ended_at - started_at)
- [ ] Sección "Resultado": ganador con nombre y deck, win condition, o "Draw" / "Abandoned"
- [ ] Lista de participations: jugador, deck, commander(s) con color chips WUBRG, resultado (W/L/D/—)
- [ ] EventLog completo (read-only): reutiliza `EventLogItem` de TRACK-007; is_undone events aparecen tachados
- [ ] EventLog ordenado cronológico inverso (más nuevo arriba), con scroll dentro del panel
- [ ] Si no hay eventos (match sin tracking): mensaje "Sin eventos registrados"
- [ ] Back navigation al historial (SCR-005) o al stack anterior

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Ver detalle de match completed con ganador
  Dado que el match "Partida 2026-04-09" tiene: ganador Ana, win_condition "commander_damage", 4 participantes, 20 eventos
  Cuando toco ese match en SCR-005
  Entonces navego a SCR-011 y veo:
    - Fecha y duración
    - Resultado: "Ana ganó — Commander Damage"
    - Lista de 4 participantes con deck y commander
    - EventLog con 20 eventos

Escenario: EventLog muestra eventos undone tachados
  Dado que el match tiene 5 eventos (2 de ellos is_undone=true)
  Cuando veo el EventLog en SCR-011
  Entonces los 2 eventos undone aparecen con texto tachado (~~Gabriel: -5 vida~~)
  Y los 3 eventos activos aparecen normales

Escenario: Match Abandoned
  Dado que el match tiene status="abandoned"
  Cuando veo SCR-011
  Entonces el resultado muestra "Partida abandonada" sin ganador
  Y los participantes no muestran W/L/D en su resultado
```

## 🔧 Contexto Técnico

**Archivos a modificar:**
- `app/match/[id]/index.tsx` — SCR-011 screen (reemplaza stub de MATCH-008)

**Archivos a reutilizar:**
- `components/tracker/EventLogItem.tsx` (de TRACK-007) — usar en modo read-only
- `components/match/ParticipationRow.tsx` — nueva, para listar participantes

**Data fetching:**
```typescript
// useMatchDetail(matchId) → GET /matches/:id
// Incluye: match + participations (con player, deck, commander) + result + events
```

**Dependencias de Issues:**
- Bloqueado por: HIST-001 (API historial), TRACK-007 (EventLogItem component)
- Bloquea a: — (completa el stub MATCH-008)

---

## ⚠️ Edge Cases

- Match muy largo (100+ eventos): VirtualizedList en EventLog para performance (mismo patrón que TRACK-007)
- Commander partners: mostrar ambos commanders en la participation row
- Match sin `ended_at` (abandonado antes del cierre): duración "—"

## 🧪 Tests Requeridos

- [ ] Unit: `ParticipationRow` renderiza resultado correcto para win/lose/draw/null
- [ ] Unit: EventLog read-only no muestra botón Undo ni interactividad

## 🚫 Out of Scope

- Editar el resultado post-match → Non-Goal
- Compartir el match detail → Fase 2

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
