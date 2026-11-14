# DECK-004: Color-identity validation and unresolved flags

> **Issue ID:** DECK-004
> **Priority:** P2
> **Story Points:** 2
> **Status:** 📋 Backlog
> **Epic:** [EPIC-07](../epics/EPIC-07-DECKLISTS.md)
> **Blocked By:** [DECK-003](DECK-003-api-import-decklist-and-resolve-with-scryfall.md)
> **Blocks:** [DECK-005](DECK-005-ui-decklist-section-on-deck-detail-with-paste-impo.md)

---

## Objective

Flag cards outside the commander's color identity and cards Scryfall could not resolve.

## Acceptance criteria

- [ ] A card is `off_identity` when its `color_identity` is not a subset of the union of the deck's commander(s) identity
- [ ] Import response returns counts: total cards, unresolved, off-identity
- [ ] Changing a deck's commander recomputes the flags
- [ ] Flags never block saving

## Technical context

- `services/decklists.ts`; reuse `colorIdentityForDeck` in `services/stats.ts`

## Out of scope

- Full Commander legality (banlist, singleton, 100-card count) — show the count only

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
