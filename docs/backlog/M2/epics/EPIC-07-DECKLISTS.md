# EPIC-07: Decklists

> **Milestone:** M2
> **Status:** 📋 Backlog
> **Issues:** 7 · **SP:** 22
> **Features:** FT-023, FT-024
> **Ships as:** OTA (clipboard assist rides 1.1.0)

---

## Objective

Give each deck an optional full card list, resolved and cached from Scryfall, plus a Moxfield link. The decklists later feed Deepgram keyterms and Claude's card attribution.

## Issues

| ID | Title | Depends on | Priority | SP | Status |
|----|-------|------------|----------|----|--------|
| [DECK-001](../issues/DECK-001-schema-cards-cache-deck-cards-decks-moxfield-url.md) | Schema: cards cache, deck_cards, decks.moxfield_url | — | P1 | 3 | 📋 |
| [DECK-002](../issues/DECK-002-decklist-text-parser.md) | Decklist text parser | — | P1 | 3 | 📋 |
| [DECK-003](../issues/DECK-003-api-import-decklist-and-resolve-with-scryfall.md) | API: import decklist and resolve with Scryfall | DECK-001, DECK-002 | P1 | 5 | 📋 |
| [DECK-004](../issues/DECK-004-color-identity-validation-and-unresolved-flags.md) | Color-identity validation and unresolved flags | DECK-003 | P2 | 2 | 📋 |
| [DECK-005](../issues/DECK-005-ui-decklist-section-on-deck-detail-with-paste-impo.md) | UI: decklist section on deck detail with paste import | DECK-003, DECK-004 | P1 | 5 | 📋 |
| [DECK-006](../issues/DECK-006-moxfield-link-field.md) | Moxfield link field | DECK-001 | P2 | 1 | 📋 |
| [DECK-007](../issues/DECK-007-assisted-import-get-list-from-moxfield-clipboard-p.md) | Assisted import: 'Get list from Moxfield' + clipboard prompt | DECK-005, DECK-006, REC-001 | P3 | 3 | 📋 |
