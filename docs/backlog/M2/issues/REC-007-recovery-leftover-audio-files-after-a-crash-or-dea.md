# REC-007: Recovery: leftover audio files after a crash or dead battery

> **Issue ID:** REC-007
> **Priority:** P2
> **Story Points:** 3
> **Status:** 📋 Backlog
> **Epic:** [EPIC-08](../epics/EPIC-08-RECORDING.md)
> **Blocked By:** [REC-004](REC-004-recorder-service-5-minute-local-files-on-the-match.md)
> **Blocks:** —

---

## Objective

Audio already on disk is never silently lost or silently kept.

## Acceptance criteria

- [ ] On launch, leftover files for a match are detected and the user is offered: transcribe now, or delete
- [ ] Files for matches older than 10 days, or abandoned matches, are deleted automatically
- [ ] A storage line in settings shows how much recorded audio is on the device, with Delete all

## Technical context

- `services/recorder.ts`

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
