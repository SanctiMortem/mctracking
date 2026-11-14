# TRN-002: API: temporary transcript storage and time-ordered merge

> **Issue ID:** TRN-002
> **Priority:** P1
> **Story Points:** 3
> **Status:** 📋 Backlog
> **Epic:** [EPIC-09](../epics/EPIC-09-ANALYSIS.md)
> **Blocked By:** [REC-002](REC-002-schema-recordings-segments-transcripts-event-occur.md), [TRN-001](TRN-001-deepgram-transcription-client.md)
> **Blocks:** [ANL-001](ANL-001-speaker-to-player-mapping.md)

---

## Objective

Store each device's transcript until publish, and serve the merged timeline.

## Acceptance criteria

- [ ] `POST /api/matches/:id/transcripts` stores a segment transcript; only the recording's uploader can write
- [ ] `GET` returns all segments for the match merged in time order, readable only by the match's players
- [ ] Speaker labels are namespaced per recording (`rec1:spk0`)
- [ ] Every row carries `delete_after` = match end + 10 days

## Technical context

- New route under `app/api/matches/[id]/`

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
