# CMDR-002: Commander damage screen: no auto-close, pass-turn area becomes exit

> **Issue ID:** CMDR-002
> **Priority:** P1
> **Story Points:** 2
> **Status:** 📋 Backlog
> **Epic:** [EPIC-06](../epics/EPIC-06-QUICK-WINS.md)
> **Blocked By:** [CMDR-001](CMDR-001-commander-damage-screen-enter-the-hit-not-the-runn.md)
> **Blocks:** —

---

## Objective

The screen stays open until the user leaves, and the turn cannot be passed from it.

## Acceptance criteria

- [ ] The 3-second auto-close is removed; the screen never closes on a timer
- [ ] While open, the pass-turn area renders as an exit control (X or back arrow) that saves the hit and returns to the match
- [ ] No gesture or tap on this screen can pass the turn
- [ ] Android back button behaves like the exit control (saves, then closes)

## Technical context

- `components/match/TrackerLayout.tsx` (pass-turn area) + the panel's close timer
- Also applies in `CasualMatch.tsx` if it shares the panel

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
