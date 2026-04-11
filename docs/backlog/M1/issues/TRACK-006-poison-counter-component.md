# TRACK-006: Component — PoisonCounter

> **Issue ID:** TRACK-006
> **Priority:** P1
> **Effort:** S
> **Story Points:** 2
> **Status:** ✅ Done
> **Epic:** [EPIC-03-LIVE-TRACKING](../epics/EPIC-03-LIVE-TRACKING.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar el componente PoisonCounter: contador de poison counters (Infect) por jugador. Empieza en 0, incrementa con +1, floor en 0 (no puede ser negativo). Alerta visual al llegar a 10 (BR-TRACK-05). Es S de complejidad — similar a LifeCounter pero más simple (no hay entrada directa, no hay debounce complejo).

## User Story

> Como **P-002** (usuario en partida), quiero **trackear los poison counters de cada jugador** para **saber si alguno está cerca de perder por infect**.

**Implementa:** US-031

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| USER_STORIES | US-031 | [04_USER_STORIES.md#us-031](../../planning/04_USER_STORIES.md) |
| BUSINESS_RULES | BR-TRACK-05 (poison 10) | [05_BUSINESS_RULES.md#br-track-05](../../planning/05_BUSINESS_RULES.md) |
| GLOSSARY | Poison Counter | [09_GLOSSARY.md#poison-counter](../../planning/09_GLOSSARY.md) |

---

## ✅ Criterios de Aceptación

- [ ] Contador de poison en sección del jugador (debajo de LifeCounter o en área separada)
- [ ] Botones +1 y -1; floor en 0 (botón -1 disabled cuando poison_counters=0)
- [ ] Alerta visual al llegar a 10: badge o cambio de color en el contador (BR-TRACK-05)
- [ ] Sin acción automática al llegar a 10 (solo alerta visual)
- [ ] Dispara `POST /api/match-events` con `event_type: "poison_change"` y delta acumulado (debounce)
- [ ] El icono de "skull" o símbolo de poison identifica visualmente el contador

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Incrementar poison counter
  Dado que poison_counters=0
  Cuando toco +1 tres veces
  Entonces el display muestra 3 y se envía delta=3 al API

Escenario: Alerta visual a 10 poison
  Dado que poison_counters=9
  Cuando toco +1
  Entonces el contador muestra 10 con alerta visual (rojo/badge)
  Y NO aparece ningún modal de eliminación automática

Escenario: Floor en 0
  Dado que poison_counters=0
  Cuando intento tocar el botón -1
  Entonces el botón está deshabilitado
  Y el contador permanece en 0
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `components/tracker/PoisonCounter.tsx`

**Dependencias de Issues:**
- Bloqueado por: TRACK-004 (LifeCounter — establece patrón de debounce)

## ⚠️ Edge Cases

- Proliferate puede sumar múltiples poison a la vez — el usuario puede tocar +1 varias veces rápidamente (debounce cubre esto)
- El símbolo de poison debe ser distinguible del icon de vida

## 🧪 Tests Requeridos

- [ ] Unit: floor en 0 (botón -1 deshabilitado)
- [ ] Unit: alerta visual activa a poison_counters=10

## 🚫 Out of Scope

- Estadísticas de partidas ganadas por infect → EPIC-04

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
