# ADR-003: Decidir source of truth de life_total

> **Issue ID:** ADR-003
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

Decidir si `participations.life_total` es el source of truth (denormalizado) o si se recalcula sumando los MatchEvents de tipo `life_change`. Análogo a ADR-002 pero para vida. Ambas decisiones deben ser consistentes.

**Implementa:** — (Decisión arquitectural, §6 Data Model OQ-02)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DATA_MODEL | E-008 Participation + OQ-02 | [06_DATA_MODEL.md#e-008](../../planning/06_DATA_MODEL.md) |
| BUSINESS_RULES | BR-TRACK-01 (life total) | [05_BUSINESS_RULES.md#br-track-01](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-TRACK-07 (floor life 0?) | [05_BUSINESS_RULES.md#br-track-07](../../planning/05_BUSINESS_RULES.md) |

---

## Contexto

Similar a ADR-002. `participations.life_total` empieza en 40 y cambia con cada tap en el tracker.

### Opción A: Participation como source of truth (RECOMENDADA — consistente con ADR-002)

- `participations.life_total` se actualiza en cada POST /api/match-events
- Leer estado actual es O(1)
- Undo: revertir el delta en `participations.life_total` + marcar evento como `is_undone=true`

### Opción B: Recalcular desde MatchEvents

- Mismas pros/cons que ADR-002 Opción B

### Recomendación

**Opción A** — consistente con ADR-002. El tracker lee `participations.life_total` directamente para el display. Los MatchEvents son el log inmutable que soporta Undo y el event log en SCR-011.

## ✅ Criterios de Aceptación

- [ ] Decisión documentada en este ADR
- [ ] Consistente con ADR-002 (ambas usan el mismo patrón)
- [ ] TRACK-001 y TRACK-002 implementan según esta decisión

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Decisión tomada de forma consistente con ADR-002
  Dado que ADR-002 eligió Opción A (Participation como SoT)
  Cuando se decide ADR-003
  Entonces ambas opciones son consistentes (mismo patrón para life y commander_damage)
```

## 🔧 Contexto Técnico

**Afecta:** TRACK-001, TRACK-002, TRACK-004 (LifeCounter)
**Bloqueado por:** MATCH-001 (Participation schema)
**Bloquea a:** TRACK-001

## ⚠️ Edge Cases

- BR-TRACK-07: ¿puede life_total ser negativo? (OQ-01 en 05_BUSINESS_RULES) — documentar el floor que se decide aquí

## 🧪 Tests Requeridos

- [ ] No aplica — decisión de arquitectura

## 🚫 Out of Scope

- Implementar el schema (→ TRACK-001)

## Decisión

**Pendiente** — Resolver junto con ADR-002.

## Afecta a

- TRACK-001, TRACK-002, TRACK-004

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
