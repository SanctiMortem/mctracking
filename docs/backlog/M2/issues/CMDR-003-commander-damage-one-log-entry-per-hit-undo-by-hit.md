# CMDR-003: Commander damage: one log entry per hit, undo by hit, lethal warning

> **Issue ID:** CMDR-003
> **Priority:** P2
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-06](../epics/EPIC-06-QUICK-WINS.md)
> **Blocked By:** [CMDR-001](CMDR-001-commander-damage-screen-enter-the-hit-not-the-runn.md)
> **Blocks:** —

---

## Objective

Each committed hit is exactly one `commander_damage` event, and undoing it removes only that hit.

## Acceptance criteria

- [ ] Committing a hit of N writes one event with `delta = N`, `commander_id_source`, target participation and turn context
- [ ] Undo on that entry lowers the commander total by N and restores N life, nothing else
- [ ] The event log shows 'Atraxa hit Gabo for 8' style entries
- [ ] When a total reaches 21 or more, the row shows the lethal warning (no automatic elimination)

## Technical context

- `app/api/match-events+api.ts`, `app/api/match-events/undo+api.ts`, `hooks/useEventLog.ts`, `components/tracker/EventLogItem.tsx`
- Overlaps the parked undo-unification design (id-explicit undo, one flush = one undo). Implement undo here by explicit event id and fold that work in rather than building a second mechanism

## Out of scope

- Changing undo for life and poison beyond what id-explicit undo requires

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
