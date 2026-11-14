# DSTAT-002: Career stats that need no AI: seat, pod size, game length, opponents

> **Issue ID:** DSTAT-002
> **Priority:** P2
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-11](../epics/EPIC-11-DEEP-STATS.md)
> **Blocked By:** —
> **Blocks:** [DSTAT-005](DSTAT-005-ui-stat-box-and-career-stats-surfaces.md)

---

## Objective

Win rate by seat, by opponent, by pod size and by game length; fastest win, longest game, average turn length, slowest-player ranking.

## Acceptance criteria

- [ ] Added to player, deck and commander stats responses
- [ ] Seat comes from `matches.layout.playerOrder`; matches without a layout are skipped for that stat
- [ ] Turn stats use `turn_duration_seconds`; events without it are skipped
- [ ] Minimum sample of 5 matches before a rate is shown, matching the Top-5 lists

## Technical context

- `services/stats.ts`. Uses only existing data, so it can ship any time after EPIC-06

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
