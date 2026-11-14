# ANL-004: Processing pipeline and status UI

> **Issue ID:** ANL-004
> **Priority:** P1
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-09](../epics/EPIC-09-ANALYSIS.md)
> **Blocked By:** [TRN-001](TRN-001-deepgram-transcription-client.md), [ANL-002](ANL-002-event-attribution-annotate-each-log-event.md)
> **Blocks:** —

---

## Objective

One resumable flow from 'match ended' to 'draft ready', visible to the user.

## Acceptance criteria

- [ ] After closing a recorded match the uploader sees steps: Transcribing → Mapping speakers → Analyzing → Draft ready
- [ ] Each step is resumable after the app is closed; no step is paid for twice once its result is stored
- [ ] Errors show the provider's message and a Retry button; a missing or invalid key links to settings
- [ ] Other players see 'Recap in progress' on the match
- [ ] Runs only on Wi-Fi by default, with an override

## Technical context

- `match_recordings.status` drives the UI; new `hooks/useRecapPipeline.ts`

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
