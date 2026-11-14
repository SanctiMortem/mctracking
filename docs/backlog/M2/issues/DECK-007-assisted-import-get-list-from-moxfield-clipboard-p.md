# DECK-007: Assisted import: 'Get list from Moxfield' + clipboard prompt

> **Issue ID:** DECK-007
> **Priority:** P3
> **Story Points:** 3
> **Status:** 📋 Backlog
> **Epic:** [EPIC-07](../epics/EPIC-07-DECKLISTS.md)
> **Blocked By:** [DECK-005](DECK-005-ui-decklist-section-on-deck-detail-with-paste-impo.md), [DECK-006](DECK-006-moxfield-link-field.md), [REC-001](REC-001-native-build-1-1-0-audio-file-system-clipboard-per.md)
> **Blocks:** —

---

## Objective

Open the saved link, and when the user comes back with a copied list, offer to import it.

## Acceptance criteria

- [ ] 'Get list from Moxfield' opens the link with a one-line hint: Export → Copy as plain text
- [ ] On return to the app, if the clipboard passes `looksLikeDecklist`, show 'Import copied list?'
- [ ] The clipboard is read only on this screen after that button was tapped, never in the background
- [ ] Declining leaves the clipboard untouched and does not ask again for the same text

## Technical context

- Needs `expo-clipboard` (native) → ships with build 1.1.0. Until then users paste manually (DECK-005)

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
