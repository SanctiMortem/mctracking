# RCP-002: Recap screen

> **Issue ID:** RCP-002
> **Priority:** P1
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-10](../epics/EPIC-10-RECAP.md)
> **Blocked By:** [RCP-001](RCP-001-schema-api-recaps-flags-approvals-roasts.md)
> **Blocks:** [RCP-003](RCP-003-review-flag-lines-and-approve.md)

---

## Objective

Render the recap in the match history.

## Acceptance criteria

- [ ] Sections in order: headline, pregame (pod, seats, decks, commanders, who went first), turn-by-turn, key moments, eliminations, rules debates, stat box
- [ ] Sections with no content are hidden
- [ ] Reachable from match detail and from the match card in history when a recap exists
- [ ] A draft is clearly marked as a draft with its auto-publish date
- [ ] EN and ES chrome; recap text in the language it was generated in

## Technical context

- New `app/match/[id]/recap.tsx`, `components/recap/*`

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
