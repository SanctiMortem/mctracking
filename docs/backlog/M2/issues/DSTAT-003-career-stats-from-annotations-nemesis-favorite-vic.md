# DSTAT-003: Career stats from annotations: nemesis, favorite victim, kill method

> **Issue ID:** DSTAT-003
> **Priority:** P2
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-11](../epics/EPIC-11-DEEP-STATS.md)
> **Blocked By:** [DSTAT-001](DSTAT-001-per-match-stat-box-from-the-annotated-log.md)
> **Blocks:** [DSTAT-005](DSTAT-005-ui-stat-box-and-career-stats-surfaces.md)

---

## Objective

Roll per-match numbers up per player, deck and commander.

## Acceptance criteria

- [ ] Totals and averages of the per-match stats across matches with a published recap
- [ ] Nemesis (who eliminates you most), favorite victim, most-used kill method
- [ ] Each stat shows how many matches it is based on

## Technical context

- `services/stats.ts`; on-demand queries first, pre-compute only if slow

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
