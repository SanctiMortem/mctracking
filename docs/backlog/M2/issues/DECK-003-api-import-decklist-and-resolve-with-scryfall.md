# DECK-003: API: import decklist and resolve with Scryfall

> **Issue ID:** DECK-003
> **Priority:** P1
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-07](../epics/EPIC-07-DECKLISTS.md)
> **Blocked By:** [DECK-001](DECK-001-schema-cards-cache-deck-cards-decks-moxfield-url.md), [DECK-002](DECK-002-decklist-text-parser.md)
> **Blocks:** [DECK-004](DECK-004-color-identity-validation-and-unresolved-flags.md), [DECK-005](DECK-005-ui-decklist-section-on-deck-detail-with-paste-impo.md), [DSTAT-004](DSTAT-004-card-level-stats-per-deck.md)

---

## Objective

Server route that takes parsed lines, resolves them against the cache then Scryfall, and stores the list.

## Acceptance criteria

- [ ] `PUT /api/decks/:id/decklist` with `{ lines: {quantity, name}[] }` replaces the deck's list (idempotent on re-run)
- [ ] Names already in `cards` are not re-fetched
- [ ] Missing names go to `POST /cards/collection` in batches of 75; `not_found` names retry once each via `/cards/named?fuzzy=`
- [ ] At least 100 ms between Scryfall requests; a descriptive `User-Agent` and `Accept` header are sent
- [ ] Still-unresolved names are stored with `card_id = null` and returned in `unresolved[]`
- [ ] Only the deck's owner or a pod member with edit rights can import; `GET /api/decks/:id/decklist` follows `userCanViewDeck`
- [ ] `DELETE` clears the list

## Technical context

- New `app/api/decks/[id]/decklist+api.ts`, `services/scryfall.ts` (extend what `useScryfallAutocomplete` uses), `services/decklists.ts`
- No transactions on Neon HTTP: delete-then-insert must tolerate a retry; a 100-card first import is ~2 Scryfall calls and fits the Vercel function limit

## Out of scope

- Prices, legality, printings

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
