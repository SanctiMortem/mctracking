# REC-005: Pause ('off the record') and recording indicator

> **Issue ID:** REC-005
> **Priority:** P1
> **Story Points:** 3
> **Status:** 📋 Backlog
> **Epic:** [EPIC-08](../epics/EPIC-08-RECORDING.md)
> **Blocked By:** [REC-004](REC-004-recorder-service-5-minute-local-files-on-the-match.md)
> **Blocks:** —

---

## Objective

One tap stops recording; nothing from the paused stretch exists anywhere.

## Acceptance criteria

- [ ] A persistent indicator on the tracker shows Recording (red) or Paused, readable from across the table and in every seat rotation
- [ ] Tapping it pauses: the current file is closed and no audio is captured until resumed
- [ ] Resuming starts a new segment
- [ ] Paused time appears in the recap pipeline as a gap, never as silence to transcribe

## Technical context

- `components/match/TrackerLayout.tsx`

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
