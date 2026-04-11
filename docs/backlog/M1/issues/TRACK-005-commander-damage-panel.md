# TRACK-005: Component — CommanderDamagePanel (CMP-005)

> **Issue ID:** TRACK-005
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-03-LIVE-TRACKING](../epics/EPIC-03-LIVE-TRACKING.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse
>
> **Blocked By:** ADR-002

---

## 🎯 Objetivo

Implementar el CommanderDamagePanel (CMP-005): panel dentro de cada PlayerSection que muestra los contadores de daño por commander. Para cada commander enemigo del match, hay un sub-contador independiente. Si hay partners (BR-TRACK-03), cada commander tiene su propio contador. Al llegar a 21 damage de un solo commander → alerta visual (sin acción automática).

## User Story

> Como **P-002** (usuario en partida), quiero **trackear el daño de commander de cada oponente por separado** para **saber si algún jugador está cerca de perder por commander damage**.

**Implementa:** US-030

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | CMP-005 CommanderDamagePanel | [15_DESIGN.md#cmp-005](../../planning/15_DESIGN.md) |
| USER_STORIES | US-030 | [04_USER_STORIES.md#us-030](../../planning/04_USER_STORIES.md) |
| BUSINESS_RULES | BR-TRACK-02, BR-TRACK-03, BR-TRACK-04 | [05_BUSINESS_RULES.md#br-track-02](../../planning/05_BUSINESS_RULES.md) |
| GLOSSARY | Commander Damage | [09_GLOSSARY.md#commander-damage](../../planning/09_GLOSSARY.md) |

---

## ✅ Criterios de Aceptación

- [x] Panel accesible como sección expandible dentro de PlayerSection (tap para expandir/colapsar)
- [x] Una sub-row por commander enemigo en el match (A-05: todos los commanders, no solo los que ya causaron daño)
- [x] Si un commander tiene partner: dos sub-rows separadas (una por commander_id), con nombre visible
- [x] Cada sub-row: nombre del commander, botones +/- (de 1), y el valor actual
- [x] Al llegar a 21 → alerta visual en la sub-row (color rojo, badge "21!") — sin acción automática (BR-TRACK-04)
- [x] Taps disparan `POST /api/match-events` con `event_type: "commander_damage"` y `commander_id_source`

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Panel muestra commanders de todos los oponentes
  Dado que el match tiene 4 jugadores con commanders Atraxa, Edgar, Kenrith, y Muldrotha
  Cuando abro el panel de daño de commander del jugador "Gabriel"
  Entonces veo 3 sub-rows: Edgar (0), Kenrith (0), Muldrotha (0)
  (No ve su propio commander)

Escenario: Alerta al llegar a 21 de un commander
  Dado que Edgar ha causado 20 puntos de commander damage a Gabriel
  Cuando agrego 1 más (total 21)
  Entonces la sub-row de Edgar se marca en rojo con "21!"
  Y NO aparece ningún modal automático de eliminación

Escenario: Partner commanders separados
  Dado que el oponente juega Thrasios + Tymna (partners)
  Cuando abro el panel de commander damage
  Entonces veo dos sub-rows: "Thrasios" y "Tymna" con contadores independientes
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `components/tracker/CommanderDamagePanel.tsx` — CMP-005
- `components/tracker/CommanderDamageRow.tsx` — Sub-row por commander

**Datos necesarios en el tracker:**
- Lista de commanders del match: `participations[].deck.commander_id` + `commander_id_2` (si partner)
- Estado actual de `commander_damage` JSONB de la participation del jugador

**Dependencias de Issues:**
- Bloqueado por: TRACK-004 (LifeCounter — la PlayerSection ya existe), ADR-002 (define cómo se lee el estado)
- Bloquea a: nada (independiente)

## ⚠️ Edge Cases

- Si 4 jugadores con partners → 6 sub-rows por jugador → layout compacto necesario
- Nombre del commander puede ser largo ("Atraxa, Praetors' Voice") → truncar con ellipsis

## 🧪 Tests Requeridos

- [ ] Unit: `CommanderDamagePanel` renderiza correctamente con 3 opponents + 1 con partner (6 rows)
- [ ] Unit: alerta visual activa a 21

## 🚫 Out of Scope

- Daño de criatura normal (solo commander damage aquí)
- Historial de quién hizo más daño → stats EPIC-04

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| — | Pendiente ADR-002 | Define cómo se lee el estado de commander_damage desde la DB |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
