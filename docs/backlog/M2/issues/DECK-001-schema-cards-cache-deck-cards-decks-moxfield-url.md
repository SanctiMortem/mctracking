# DECK-001: Schema: cards cache, deck_cards, decks.moxfield_url

> **Issue ID:** DECK-001
> **Priority:** P1
> **Story Points:** 3
> **Status:** 📋 Backlog
> **Epic:** [EPIC-07](../epics/EPIC-07-DECKLISTS.md)
> **Blocked By:** —
> **Blocks:** [DECK-003](DECK-003-api-import-decklist-and-resolve-with-scryfall.md), [DECK-006](DECK-006-moxfield-link-field.md)

---

## Objective

Add the tables that hold a decklist and the Scryfall cache.

## Acceptance criteria

- [ ] `cards`: `scryfall_id` (unique), `oracle_id`, `name`, `oracle_text`, `type_line`, `colors[]`, `color_identity[]`, `image_url`, `fetched_at`
- [ ] `deck_cards`: `deck_id`, `card_id` (nullable), `raw_name`, `quantity`, `off_identity` boolean; unique on (`deck_id`, `raw_name`)
- [ ] `decks.moxfield_url` nullable text
- [ ] Migration generated with `pnpm db:generate` and applied to prod only after cross-checking the target with `neonctl` (see memory: verify migration target)

## Technical context

- `db/schema.ts`; next migration number after 0009
- Double-faced cards: store the front face name plus full `name`; `oracle_text` joins faces with `//`

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
