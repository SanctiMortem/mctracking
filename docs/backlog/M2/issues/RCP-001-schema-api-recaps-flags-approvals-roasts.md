# RCP-001: Schema + API: recaps, flags, approvals, roasts

> **Issue ID:** RCP-001
> **Priority:** P1
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-10](../epics/EPIC-10-RECAP.md)
> **Blocked By:** [ANL-003](ANL-003-narrative-key-moments-and-rules-debates.md)
> **Blocks:** [RCP-002](RCP-002-recap-screen.md)

---

## Objective

Storage and access rules for the recap lifecycle.

## Acceptance criteria

- [ ] `match_recaps`: `match_id` (unique), `status` draft/published, `content` jsonb (sections with stable paragraph ids), `publish_after`, `published_at`
- [ ] `recap_flags`: recap, paragraph id, player; `recap_approvals`: recap, player
- [ ] `match_roasts`: match, length, content, created_by
- [ ] Draft: readable only by the match's players. Published: readable by anyone who can view the match (pod members included)
- [ ] Flagged paragraphs are omitted from every read response the moment they are flagged

## Technical context

- `db/schema.ts`, `app/api/matches/[id]/recap+api.ts`; reuse the match visibility checks in `services/matches.ts`

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
