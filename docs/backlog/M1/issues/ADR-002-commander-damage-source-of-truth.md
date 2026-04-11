# ADR-002: Decidir source of truth de commander_damage

> **Issue ID:** ADR-002
> **Priority:** P0
> **Effort:** XS
> **Story Points:** 1
> **Status:** 📋 Backlog
> **Epic:** [EPIC-03-LIVE-TRACKING](../epics/EPIC-03-LIVE-TRACKING.md)
> **Skills:** `project/architecture`
> **Agents:** `architect`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Decidir si `commander_damage` en la tabla `participations` es el source of truth (denormalizado, actualizado por cada evento) o si se recalcula on-demand sumando los `match_events` correspondientes. Esta decisión afecta el schema de TRACK-001 y la lógica del API en TRACK-002.

## User Story

> Como **Gabriel Asse** (arquitecto del sistema), quiero **una decisión clara sobre dónde vive el estado de commander_damage** para **implementar el schema y la API sin ambigüedad**.

**Implementa:** — (Decisión arquitectural, §6 Data Model OQ-01)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DATA_MODEL | E-008 Participation + OQ-01 | [06_DATA_MODEL.md#e-008](../../planning/06_DATA_MODEL.md) |
| DATA_MODEL | E-006 MatchEvent | [06_DATA_MODEL.md#e-006](../../planning/06_DATA_MODEL.md) |
| BUSINESS_RULES | BR-TRACK-02, BR-TRACK-03, BR-TRACK-04 | [05_BUSINESS_RULES.md#br-track-02](../../planning/05_BUSINESS_RULES.md) |

---

## Contexto

`participations.commander_damage` es un campo JSONB `{ [commander_id]: number }` que registra cuánto daño total recibió el jugador de cada commander enemigo. Este valor cambia muchas veces durante un match.

Los MatchEvents registran cada cambio individual (delta de daño por commander).

### Opción A: Participation como source of truth (denormalizado)

- `participations.commander_damage` se actualiza en cada POST /api/match-events
- Los MatchEvents son el log de historia
- Pros: Leer el estado actual es O(1) — un SELECT en participations
- Cons: Dos tablas deben estar siempre en sync. El Undo debe recalcular el delta.

### Opción B: Recalcular desde MatchEvents (normalizado)

- `participations.commander_damage` es solo denormalización de caché (o no existe)
- Para leer el estado actual se suman todos los MatchEvents no-undone
- Pros: Single source of truth (MatchEvents), el Undo es trivial (marcar `is_undone=true`)
- Cons: Leer el estado actual es O(n) por número de eventos

### Recomendación (Architect)

**Opción A: Participation como source of truth.**

Razón: El tracker en vivo necesita leer el estado actual constantemente (cada render). Con Opción B, cada refresh del tracker haría una aggregation query sobre los events — con debounce activo, esto puede ser costoso. La tabla `participations` sirve como "snapshot del estado actual" y los MatchEvents son el log inmutable. El Undo actualiza el snapshot + marca el evento como `is_undone=true`.

## ✅ Criterios de Aceptación

- [ ] Decisión documentada en este ADR
- [ ] TRACK-001 implementa el schema según la opción elegida
- [ ] TRACK-002 implementa el Undo según la opción elegida

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Decisión tomada y documentada
  Dado que ADR-002 está en estado "Pendiente"
  Cuando Gabriel Asse revisa las opciones
  Entonces actualiza el campo "Decisión" de este ADR
  Y TRACK-001 se implementa reflejando la decisión
```

## 🔧 Contexto Técnico

**Afecta:**
- `TRACK-001`: schema de MatchEvent (event_type, delta, commander_id_source)
- `TRACK-002`: lógica de Undo en API

**Dependencias de Issues:**
- Bloqueado por: MATCH-001 (Participation schema base existe)
- Bloquea a: TRACK-001

## ⚠️ Edge Cases

- Con partners (ADR-002 y BR-TRACK-03): cada commander del partner tiene su propio contador en el JSONB

## 🧪 Tests Requeridos

- [ ] No aplica — decisión de arquitectura

## 🚫 Out of Scope

- Implementar el schema (→ TRACK-001)

## Decisión

**Pendiente** — Resolver antes de iniciar TRACK-001.

## Afecta a

- TRACK-001, TRACK-002, TRACK-005

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| — | Pendiente | — |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
