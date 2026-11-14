# CMDR-001: Commander damage screen: enter the hit, not the running total

> **Issue ID:** CMDR-001
> **Priority:** P1
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-06](../epics/EPIC-06-QUICK-WINS.md)
> **Blocked By:** —
> **Blocks:** [CMDR-002](CMDR-002-commander-damage-screen-no-auto-close-pass-turn-ar.md), [CMDR-003](CMDR-003-commander-damage-one-log-entry-per-hit-undo-by-hit.md)

---

## Objective

Each time the commander damage screen opens, every opponent commander's counter starts at 0 and + / − set only this hit. The running total sits next to the name.

## Acceptance criteria

- [ ] On open, every row shows 0 as the editable value
- [ ] Each row shows the running total beside the name, e.g. 'Atraxa – 7 / 21'
- [ ] − cannot take the hit below 0
- [ ] On exit, each non-zero hit is added to that commander's total and to the life loss, exactly as today's commander damage does
- [ ] Exiting with all hits at 0 writes nothing
- [ ] Partner commanders keep separate rows and totals

## Technical context

- `components/tracker/CommanderDamagePanel.tsx`, `CommanderDamageRow.tsx`, and the tracker hook that owns commander damage state
- Hit state is local to the open screen; commit on exit replaces the current debounce-per-tap flush for this screen
- Must stay correct under live sync (see commits d1319df, 529b44b): a remote snapshot arriving while the screen is open updates the shown total, not the pending hit

## Out of scope

- Changing how life totals are edited

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
