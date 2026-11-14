# REC-004: Recorder service: 5-minute local files on the match clock

> **Issue ID:** REC-004
> **Priority:** P1
> **Story Points:** 8
> **Status:** 📋 Backlog
> **Epic:** [EPIC-08](../epics/EPIC-08-RECORDING.md)
> **Blocked By:** [REC-001](REC-001-native-build-1-1-0-audio-file-system-clipboard-per.md), [REC-002](REC-002-schema-recordings-segments-transcripts-event-occur.md)
> **Blocks:** [REC-005](REC-005-pause-off-the-record-and-recording-indicator.md), [REC-006](REC-006-recording-hand-off-when-another-phone-takes-over-t.md), [REC-007](REC-007-recovery-leftover-audio-files-after-a-crash-or-dea.md), [TRN-001](TRN-001-deepgram-transcription-client.md)

---

## Objective

Record compressed mono audio to disk in rolling files, with exact start times.

## Acceptance criteria

- [ ] AAC mono at 24–32 kbps; two hours stays under ~60 MB
- [ ] A new file every 5 minutes with no audible gap; each file's start time is recorded on the match clock
- [ ] Interruptions (call, audio focus loss, app killed) end the current segment; recording resumes as a new segment when possible
- [ ] Recording continues with the screen locked and the app in the background
- [ ] Files live in the app's private documents directory, excluded from device backups
- [ ] Segment metadata is posted to the backend as each segment closes

## Technical context

- New `services/recorder.ts` + `hooks/useMatchRecorder.ts`; mounted by the tracker screen
- Check the current `expo-audio` docs for recording presets and background behaviour before choosing options

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
