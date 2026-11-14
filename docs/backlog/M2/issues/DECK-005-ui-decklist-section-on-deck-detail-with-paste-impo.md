# DECK-005: UI: decklist section on deck detail with paste import

> **Issue ID:** DECK-005
> **Priority:** P1
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-07](../epics/EPIC-07-DECKLISTS.md)
> **Blocked By:** [DECK-003](DECK-003-api-import-decklist-and-resolve-with-scryfall.md), [DECK-004](DECK-004-color-identity-validation-and-unresolved-flags.md)
> **Blocks:** [DECK-007](DECK-007-assisted-import-get-list-from-moxfield-clipboard-p.md)

---

## Objective

Let the user paste, import, view and replace a decklist from the deck screen.

## Acceptance criteria

- [ ] Deck detail shows 'Decklist' with the card count, or an 'Add decklist' empty state
- [ ] Import is a plain multiline text box plus an Import button (simple text input, no picker)
- [ ] After import: cards grouped by type with quantity; unresolved and off-identity cards listed first with a warning mark
- [ ] An unresolved line can be edited and retried on its own
- [ ] Tapping a card shows its image and oracle text
- [ ] Card names always stay in English in both locales
- [ ] Replace and Remove are available to whoever can edit the deck; others see it read-only

## Technical context

- `app/decks/[id].tsx`, new `components/decks/DecklistSection.tsx`, `hooks/useDecklist.ts` (hold `getToken` in a ref)

## Out of scope

- Editing single cards in place, deck building tools

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
