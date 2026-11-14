# RCP-004: Publish: rewrite without flagged moments, delete transcript

> **Issue ID:** RCP-004
> **Priority:** P1
> **Story Points:** 8
> **Status:** 📋 Backlog
> **Epic:** [EPIC-10](../epics/EPIC-10-RECAP.md)
> **Blocked By:** [RCP-003](RCP-003-review-flag-lines-and-approve.md), [ADR-009](ADR-009-adr-hybrid-ai-architecture-keys-on-device-results.md)
> **Blocks:** [RCP-005](RCP-005-roast-this-match.md)

---

## Objective

Publish when every player approved or after 10 days, then remove the raw material.

## Acceptance criteria

- [ ] Publish is due when all required approvals exist, or at `publish_after` (match end + 10 days)
- [ ] When due, a phone holding the uploader's Anthropic key rewrites the recap from the transcript without flagged moments, stores it as published, then calls the delete-transcript route
- [ ] Hard deadline on the server: at `delete_after`, transcripts are deleted regardless; if no rewrite happened, the recap publishes with flagged parts removed as-is
- [ ] After publish, `match_transcripts` rows for the match no longer exist; only annotations, recap and stats remain
- [ ] Publishing is idempotent and safe if two phones try at once

## Technical context

- Server deadline needs a scheduled function (Vercel Cron) or an on-read check — decide in ADR-009
- No transactions: order is store recap → mark published → delete transcript, each step re-runnable

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
