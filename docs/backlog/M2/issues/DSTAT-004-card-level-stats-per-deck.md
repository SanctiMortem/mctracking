# DSTAT-004: Card-level stats per deck

> **Issue ID:** DSTAT-004
> **Priority:** P3
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-11](../epics/EPIC-11-DEEP-STATS.md)
> **Blocked By:** [DSTAT-001](DSTAT-001-per-match-stat-box-from-the-annotated-log.md), [DECK-003](DECK-003-api-import-decklist-and-resolve-with-scryfall.md)
> **Blocks:** —

---

## Objective

For each card in a deck: how often it shows up, damage dealt, win rate when it is played.

## Acceptance criteria

- [ ] A card 'shows up' in a match when at least one annotation or key moment names it
- [ ] Shown on the deck's decklist section, sortable
- [ ] Hidden until the deck has 5 recapped matches

## Technical context

- Joins `deck_cards` ↔ `match_event_annotations.source_card_id`

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
