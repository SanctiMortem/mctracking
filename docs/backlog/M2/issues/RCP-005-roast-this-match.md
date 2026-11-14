# RCP-005: Roast this match

> **Issue ID:** RCP-005
> **Priority:** P2
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-10](../epics/EPIC-10-RECAP.md)
> **Blocked By:** [RCP-004](RCP-004-publish-rewrite-without-flagged-moments-delete-tra.md)
> **Blocks:** —

---

## Objective

An optional satirical retelling, separate from the straight recap.

## Acceptance criteria

- [ ] On publish, players are asked 'Want a roast of this match?'; a 'Roast this match' button stays on every published match
- [ ] Length: short (a couple of paragraphs) or long
- [ ] Input is only the published recap and the annotated log — never the transcript — so flagged moments cannot return
- [ ] The prompt forbids invented facts and targets plays, not people
- [ ] Stored with the match, visible to the pod; can be regenerated or deleted
- [ ] Requires the tapping user's own Anthropic key; without one the button explains how to connect

## Technical context

- `services/analysis/roast.ts`, `match_roasts` routes

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
