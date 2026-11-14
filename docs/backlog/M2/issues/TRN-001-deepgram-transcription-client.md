# TRN-001: Deepgram transcription client

> **Issue ID:** TRN-001
> **Priority:** P1
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-09](../epics/EPIC-09-ANALYSIS.md)
> **Blocked By:** [REC-004](REC-004-recorder-service-5-minute-local-files-on-the-match.md), [KEY-001](KEY-001-settings-connect-claude-and-deepgram-keys.md)
> **Blocks:** [TRN-002](TRN-002-api-temporary-transcript-storage-and-time-ordered.md), [ANL-004](ANL-004-processing-pipeline-and-status-ui.md)

---

## Objective

At match end, send each segment file to Deepgram with the user's key and delete the audio on success.

## Acceptance criteria

- [ ] Uses pre-recorded Nova-3 multilingual with diarization and word-level timestamps
- [ ] Keyterms: card names from the decklists in play, player names, commander names, trimmed to the provider's current limit with commanders and players first
- [ ] Each file is deleted from disk as soon as its transcript is safely stored; a failed file is kept and retried
- [ ] Works over a flaky connection: per-file retry with backoff, resumable after the app is reopened
- [ ] Word timestamps are converted to match-clock time using the segment start

## Technical context

- New `services/deepgram.ts`; direct upload from the phone via file-system upload
- Confirm model id, keyterm parameter and limits in Deepgram's current docs

## Out of scope

- Live/streaming transcription

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
