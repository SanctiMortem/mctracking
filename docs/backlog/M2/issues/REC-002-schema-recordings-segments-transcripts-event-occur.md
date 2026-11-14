# REC-002: Schema: recordings, segments, transcripts, event `occurred_at`

> **Issue ID:** REC-002
> **Priority:** P1
> **Story Points:** 3
> **Status:** 📋 Backlog
> **Epic:** [EPIC-08](../epics/EPIC-08-RECORDING.md)
> **Blocked By:** [ADR-009](ADR-009-adr-hybrid-ai-architecture-keys-on-device-results.md)
> **Blocks:** [REC-003](REC-003-match-setup-record-for-ai-recap-toggle-and-consent.md), [REC-004](REC-004-recorder-service-5-minute-local-files-on-the-match.md), [TRN-002](TRN-002-api-temporary-transcript-storage-and-time-ordered.md)

---

## Objective

Tables for recording metadata and the temporary transcript, and a client timestamp on log events so audio and log share a clock.

## Acceptance criteria

- [ ] `match_recordings`: `match_id`, `device_id`, `uploaded_by`, `consented_at`, `status` (recording / transcribing / analyzing / draft / published / failed)
- [ ] `recording_segments`: `recording_id`, `started_at`, `ended_at` (match clock) — no audio column anywhere
- [ ] `match_transcripts`: `recording_id`, `deepgram_json`, `speaker_map`, `delete_after`
- [ ] `match_events.occurred_at` nullable timestamp, set by clients to the tap time corrected by the measured server offset; old rows stay null and fall back to `created_at`
- [ ] `POST /api/match-events` accepts and stores `occurred_at`, rejecting values more than a few minutes from server time

## Technical context

- `db/schema.ts`, `app/api/match-events+api.ts`, tracker flush code
- Server offset: reuse the sync poll's response time if it exposes one, else add a server timestamp to it

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
