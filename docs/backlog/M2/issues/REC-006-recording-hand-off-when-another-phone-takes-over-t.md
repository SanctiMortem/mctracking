# REC-006: Recording hand-off when another phone takes over the match

> **Issue ID:** REC-006
> **Priority:** P2
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-08](../epics/EPIC-08-RECORDING.md)
> **Blocked By:** [REC-004](REC-004-recorder-service-5-minute-local-files-on-the-match.md)
> **Blocks:** —

---

## Objective

When a match is taken over from the pod page, recording continues on the new phone as its own recording.

## Acceptance criteria

- [ ] The takeover phone sees that the match is being recorded and shows the consent prompt again
- [ ] It needs its own connected keys; without them the match continues unrecorded and the UI says so
- [ ] Its segments belong to a new `match_recordings` row (same match, different device)
- [ ] The first phone stops recording when it loses the tracker role and keeps its files for upload at match end

## Technical context

- Builds on match resume + live sync (d1319df)

## Out of scope

- Merging audio across devices — transcripts are merged instead (TRN-002)

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
