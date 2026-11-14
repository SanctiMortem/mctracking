# REC-003: Match setup: 'Record for AI recap' toggle and consent screen

> **Issue ID:** REC-003
> **Priority:** P1
> **Story Points:** 3
> **Status:** 📋 Backlog
> **Epic:** [EPIC-08](../epics/EPIC-08-RECORDING.md)
> **Blocked By:** [KEY-001](KEY-001-settings-connect-claude-and-deepgram-keys.md), [REC-002](REC-002-schema-recordings-segments-transcripts-event-occur.md)
> **Blocks:** —

---

## Objective

Opt in per match, with a consent prompt the whole table reads on the tracker phone.

## Acceptance criteria

- [ ] Toggle appears in account match setup only (not guest or casual), default off
- [ ] Turning it on shows a full-screen consent: what is recorded, that audio is deleted after transcription, that only game talk reaches the recap, how to pause
- [ ] Recording starts only after 'Everyone agrees' is tapped; `consented_at` is stored
- [ ] Declining starts the match normally without recording
- [ ] Optional guided roll-call step: each player says their name in seat order; can be skipped

## Technical context

- `app/match/setup.tsx`, `hooks/useMatchSetup.ts`, new consent component

## Out of scope

- Per-player consent on their own phones

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
