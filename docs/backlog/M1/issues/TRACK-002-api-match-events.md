# TRACK-002: API — match-events (record + undo)

> **Issue ID:** TRACK-002
> **Priority:** P0
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-03-LIVE-TRACKING](../epics/EPIC-03-LIVE-TRACKING.md)
> **Skills:** `domains/api`, `domains/db`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar los endpoints del tracker en vivo: `POST /api/match-events` (registrar un cambio de estado con debounce) y `POST /api/match-events/undo` (revertir el último evento no-undone). Actualiza el snapshot en `participations` (según ADR-002 y ADR-003) e inserta el MatchEvent en el log.

## User Story

> Como **P-002** (usuario en una partida), quiero **que cada cambio de vida/poison/commander damage se registre automáticamente** para **tener un log completo de la partida y poder hacer undo**.

**Implementa:** US-013, US-014, US-032, US-033

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| API_CONTRACTS | POST /api/match-events | [08_API_CONTRACTS.md#post-apimatch-events](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-TRACK-09 (debounce) | [05_BUSINESS_RULES.md#br-track-09](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-TRACK-11 (undo) | [05_BUSINESS_RULES.md#br-track-11](../../planning/05_BUSINESS_RULES.md) |
| USER_STORIES | US-033 (undo) | [04_USER_STORIES.md#us-033](../../planning/04_USER_STORIES.md) |

---

## ✅ Criterios de Aceptación

- [ ] `POST /api/match-events` acepta `{ participation_id, event_type, delta, commander_id_source? }`
- [ ] Actualiza el snapshot en `participations` (life_total o poison_counters o commander_damage JSONB) en la misma transacción
- [ ] Inserta el MatchEvent en `match_events`
- [ ] Retorna `400` si el match no está `in_progress`
- [ ] `POST /api/match-events/undo?match_id=` marca el último MatchEvent no-undone como `is_undone=true` y revierte el snapshot en participations
- [ ] Undo en match sin eventos no falla — retorna `200` con `{ undone: null }`
- [ ] `commander_id_source` requerido si `event_type = 'commander_damage'`
- [ ] Debounce se implementa en el cliente (React Native) — la API recibe el delta ya acumulado

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Registrar cambio de vida
  Dado que el match está in_progress
  Y la participation tiene life_total=40
  Cuando hago POST /api/match-events con { event_type: "life_change", delta: -5, participation_id: "p1" }
  Entonces participations.life_total queda en 35
  Y existe un MatchEvent con delta=-5

Escenario: Undo del último evento
  Dado que el último MatchEvent es { event_type: "life_change", delta: -5 } y life_total=35
  Cuando hago POST /api/match-events/undo?match_id=abc
  Entonces el MatchEvent tiene is_undone=true
  Y participations.life_total vuelve a 40

Escenario: Registrar commander damage
  Cuando hago POST con { event_type: "commander_damage", delta: 7, commander_id_source: "cmd-1", participation_id: "p2" }
  Entonces participations.commander_damage["cmd-1"] se suma con 7

Escenario: Undo de commander damage
  Dado que commander_damage["cmd-1"] = 7 y hay un MatchEvent de commander_damage delta=7
  Cuando hago undo
  Entonces commander_damage["cmd-1"] vuelve a 0
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/api/match-events+api.ts` — POST handler
- `app/api/match-events/undo+api.ts` — POST undo
- `services/matchEvents.ts` — recordEvent, undoLastEvent (ambos con transacción)

**Transacción recordEvent:**
```typescript
await db.transaction(async (tx) => {
  // 1. Insert MatchEvent
  await tx.insert(matchEvents).values({ ... });
  // 2. Update participation snapshot
  if (eventType === 'life_change') {
    await tx.update(participations)
      .set({ lifeTotal: sql`life_total + ${delta}` })
      .where(eq(participations.id, participationId));
  }
  // ... similar para poison y commander_damage (JSONB update)
});
```

**Dependencias de Issues:**
- Bloqueado por: TRACK-001
- Bloquea a: TRACK-007 (EventLog UI)

## ⚠️ Edge Cases

- JSONB update para commander_damage: `UPDATE participations SET commander_damage = commander_damage || jsonb_build_object($1, COALESCE((commander_damage->$1)::int, 0) + $2)` — usar raw SQL o Drizzle json operators
- Undo de commander_damage: si el value llega a negativo por un undo, puede quedar en negative — considerar floor en 0 (BR-TRACK-04: si commander_damage llega a 0 por undo, es válido)

## 🧪 Tests Requeridos

- [ ] Unit: recordEvent — life_change, poison_change, commander_damage
- [ ] Unit: undoLastEvent — revierte snapshot correctamente
- [ ] Integration: transacción atómica (si falla el update de participation, no se inserta el event)

## 🚫 Out of Scope

- Debounce en el servidor (lo maneja el cliente RN)
- Leer historial de eventos (GET /api/match-events) → EPIC-04

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
