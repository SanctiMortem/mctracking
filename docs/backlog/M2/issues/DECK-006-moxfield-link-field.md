# DECK-006: Moxfield link field

> **Issue ID:** DECK-006
> **Priority:** P2
> **Story Points:** 1
> **Status:** 📋 Backlog
> **Epic:** [EPIC-07](../epics/EPIC-07-DECKLISTS.md)
> **Blocked By:** [DECK-001](DECK-001-schema-cards-cache-deck-cards-decks-moxfield-url.md)
> **Blocks:** [DECK-007](DECK-007-assisted-import-get-list-from-moxfield-clipboard-p.md)

---

## Objective

Save an optional Moxfield URL on a deck and show it as a tappable link.

## Acceptance criteria

- [ ] Create/edit deck accepts an optional link; only `https://moxfield.com/…` (and `www.`) URLs are accepted
- [ ] Deck detail shows 'Open in Moxfield', opening the system browser
- [ ] No request is ever made to Moxfield by the app or backend

## Technical context

- `app/api/decks+api.ts`, `app/api/decks/[id]+api.ts`, deck form, `expo-web-browser` (already installed)

## Out of scope

- Automatic import from Moxfield

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
