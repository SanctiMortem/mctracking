# DSTAT-001: Per-match stat box from the annotated log

> **Issue ID:** DSTAT-001
> **Priority:** P1
> **Story Points:** 8
> **Status:** 📋 Backlog
> **Epic:** [EPIC-11](../epics/EPIC-11-DEEP-STATS.md)
> **Blocked By:** [ANL-002](ANL-002-event-attribution-annotate-each-log-event.md)
> **Blocks:** [DSTAT-003](DSTAT-003-career-stats-from-annotations-nemesis-favorite-vic.md), [DSTAT-004](DSTAT-004-card-level-stats-per-deck.md), [DSTAT-005](DSTAT-005-ui-stat-box-and-career-stats-surfaces.md)

---

## Objective

Compute the numbers for one match.

## Acceptance criteria

- [ ] Damage dealt and taken per player, split by source (commander, combat, spells, other) and by target
- [ ] Commander damage per opponent; life gained; poison given and received; highest and lowest life; biggest single hit
- [ ] Kills and assists, time and turn of each elimination, turns survived
- [ ] Turn length per player, slowest turn, total game time
- [ ] Most-mentioned cards, MVP card, top damage cards
- [ ] Rules debates: count and duration
- [ ] Commander casts and tax: best effort from speech, labeled as such (OQ4)
- [ ] Undone entries excluded; unattributed events count in totals but not in by-source splits

## Technical context

- New `services/matchStats.ts`; computed on the server from events + annotations and cached in `match_recaps.content.stats`

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
