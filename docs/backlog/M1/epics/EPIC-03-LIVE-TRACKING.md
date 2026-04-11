# EPIC-03: Live Tracking

> **Milestone:** M1
> **Status:** ✅ Done
> **Issues:** 11 total (11 done)
> **Branch:** `epic/live-tracking`

---

## 🎯 Objetivo

Implementar el corazón del producto: el Match Tracker en vivo (SCR-008). Incluye el sistema de tracking de life totals, poison counters y commander damage, el event log con debounce configurable, y el undo ilimitado. Este epic es el de mayor complejidad técnica del proyecto (FT-005 está clasificado como XL).

**Prerequisitos de decisión:** ADR-002 y ADR-003 deben resolverse antes de implementar el schema de MatchEvents y los componentes del tracker.

---

## User Stories

| ID | Título | Priority | Features |
|----|--------|----------|---------|
| US-013 | Ver life totals en vivo | 🔴 Must | FT-005 |
| US-014 | Actualizar life total | 🔴 Must | FT-005 |
| US-015 | Layout rotable por sección | 🔴 Must | FT-005 |
| US-030 | Trackear commander damage | 🔴 Must | FT-013 |
| US-031 | Trackear poison counters | 🔴 Must | FT-014 |
| US-032 | Ver event log | 🔴 Must | FT-015 |
| US-033 | Undo último evento | 🔴 Must | FT-015 |
| US-034 | Ver log en detalle del match | 🟡 Should | FT-015 |

---

## 📋 Issues

| ID | Título | Depende de | Priority | Status | Effort | SP |
|----|--------|------------|----------|--------|--------|----|
| [ADR-002](../issues/ADR-002-commander-damage-source-of-truth.md) | ADR: commander_damage source of truth | MATCH-001 | P0 | ✅ | XS | 1 |
| [ADR-003](../issues/ADR-003-life-total-source-of-truth.md) | ADR: life_total source of truth | MATCH-001 | P0 | ✅ | XS | 1 |
| [TRACK-001](../issues/TRACK-001-db-schema-match-events.md) | DB schema: MatchEvent | ADR-002, ADR-003, MATCH-001 | P0 | ✅ | M | 5 |
| [TRACK-002](../issues/TRACK-002-api-match-events.md) | API: match-events (record + undo) | TRACK-001 | P0 | ✅ | M | 5 |
| [TRACK-003](../issues/TRACK-003-ui-tracker-shell.md) | UI: SCR-008 Match Tracker shell | TRACK-001, MATCH-001 | P0 | ✅ | L | 8 |
| [TRACK-004](../issues/TRACK-004-life-counter-component.md) | Component: LifeCounter (CMP-001) | TRACK-003 | P0 | ✅ | M | 5 |
| [TRACK-005](../issues/TRACK-005-commander-damage-panel.md) | Component: CommanderDamagePanel (CMP-005) | TRACK-004, ADR-002 | P1 | ✅ | M | 5 |
| [TRACK-006](../issues/TRACK-006-poison-counter-component.md) | Component: PoisonCounter | TRACK-004 | P1 | ✅ | S | 2 |
| [TRACK-007](../issues/TRACK-007-event-log-undo.md) | Component: EventLog + Undo (CMP-011) | TRACK-002, TRACK-003 | P1 | ✅ | M | 5 |
| [TRACK-008](../issues/TRACK-008-spike-iphone-se-layout.md) | Spike: iPhone SE 4-player layout | TRACK-003 | P2 | ✅ | S | 2 |
| [TRACK-009](../issues/TRACK-009-epic-tests.md) | 🧪 Epic Tests — Live Tracking | Todos | P1 | ✅ | M | 5 |

> **Total SP:** 44

---

## 🔗 Dependencias

**Requiere:**
- [EPIC-02](./EPIC-02-MATCH-LIFECYCLE.md) — MATCH-001 (schema Match/Participation)
- ADR-002 y ADR-003 resueltos antes de TRACK-001

**Bloquea:**
- EPIC-04 — El event log en SCR-011 (Match Detail) se completa en este epic

---

## 📐 Scope

**Incluido:**
- Schema MatchEvent con soporte de debounce e undo
- API Routes para registrar eventos y hacer undo
- SCR-008 Match Tracker: layout 2/3/4 players, secciones rotables
- LifeCounter component (tap +/-, long press para valor exacto)
- CommanderDamagePanel (contadores per-commander)
- PoisonCounter component
- EventLog panel colapsable + Undo ilimitado
- Spike de iPhone SE 4p layout

**Excluido:**
- Historial de eventos en SCR-011 (ya stubeado en MATCH-008) — el event log panel se conecta en este epic
- Settings de debounce threshold → EPIC-05 (FT-019)

---

## 📚 Referencias

- Feature Map: [02_FEATURE_MAP.md#ft-005](../../planning/02_FEATURE_MAP.md)
- Data Model: [06_DATA_MODEL.md#e-006](../../planning/06_DATA_MODEL.md)
- Design: [15_DESIGN.md#scr-008](../../planning/15_DESIGN.md)
- Business Rules: [05_BUSINESS_RULES.md#br-track-01](../../planning/05_BUSINESS_RULES.md)

---

## ✅ QC Checklist (Al Completar Epic)

- [x] Life totals se actualizan en tiempo real con debounce (useDebounce.ts, LifeCounter.tsx)
- [x] Commander damage por commander_id individual funcional (CommanderDamagePanel + JSONB merge)
- [x] Poison counter con alerta visual a 10 (PoisonCounter.tsx)
- [x] Undo revierte el último evento (no lo borra) (is_undone=true, undoLastEvent service)
- [x] Layout 2p/3p/4p funcional en iPhone 14 Pro (TrackerLayout.tsx)
- [x] TRACK-008 spike: decidido usar adjustsFontSizeToFit + minimumFontScale=0.5 (LifeCounter.tsx)

---

## 📈 Progreso

```
Total:     ███████████ 100% (11 issues)
Done:      ███████████ 100% (11 issues — ADR-002/003, TRACK-001–009)
Remaining: ░░░░░░░░░░░   0% (0 issues)
```

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-11 (EPIC-03 complete)_
