# STAT-001: API: wins by win condition in deck, commander and player stats

> **Issue ID:** STAT-001
> **Priority:** P1
> **Story Points:** 3
> **Status:** 📋 Backlog
> **Epic:** [EPIC-06](../epics/EPIC-06-QUICK-WINS.md)
> **Blocked By:** —
> **Blocks:** [STAT-002](STAT-002-ui-how-this-deck-wins-on-deck-commander-and-player.md)

---

## Objective

Add a win-condition breakdown to the three stats endpoints, aggregating the existing `match_results.win_condition` for completed, non-draw matches the entity won.

## Acceptance criteria

- [ ] `getDeckStats`, `getCommanderStats` and `getPlayerStats` each return `wins_by_condition: { condition, wins }[]` sorted by wins desc
- [ ] All eight enum values can appear; conditions with zero wins are omitted
- [ ] Draws and abandoned matches are excluded; the sum equals the entity's total wins
- [ ] Commander stats count wins for decks where the commander is either `commander_id` or `commander_id_2`
- [ ] Visibility still goes through `userCanViewDeck` / `userCanViewCommander` / `userCanViewPlayer`
- [ ] No new typecheck errors against the baseline

## Technical context

- `services/stats.ts` — reuse the join already used at ~L1624 and ~L2120 (participations → match_results on `winner_participation_id`)
- One extra grouped query per endpoint, added to the existing `Promise.all`
- No migration

## Out of scope

- Losses by condition ('how this deck dies') — needs AI attribution, see DSTAT-001

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
