# DECK-002: Decklist text parser

> **Issue ID:** DECK-002
> **Priority:** P1
> **Story Points:** 3
> **Status:** 📋 Backlog
> **Epic:** [EPIC-07](../epics/EPIC-07-DECKLISTS.md)
> **Blocked By:** —
> **Blocks:** [DECK-003](DECK-003-api-import-decklist-and-resolve-with-scryfall.md)

---

## Objective

Pure function that turns pasted text into `{ quantity, name }[]`.

## Acceptance criteria

- [ ] Accepts `1 Card Name`, `1x Card Name`, and a bare `Card Name` (quantity 1)
- [ ] Strips set codes `(MH3)`, collector numbers, `*F*` / `*E*` foil and etched tags
- [ ] Skips blank lines and category headers (`Commander`, `Creatures (23)`, `// Lands`, `SIDEBOARD:` …)
- [ ] Merges duplicate names by summing quantities
- [ ] Exports `looksLikeDecklist(text)` for the clipboard prompt: true when at least 10 lines parse as quantity + name
- [ ] Unit tests cover Moxfield, Archidekt and MTGA export samples

## Technical context

- New `services/decklistParser.ts` + test file; no dependencies
- `pnpm test` is red at HEAD — run this test file directly and report its result on its own

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
