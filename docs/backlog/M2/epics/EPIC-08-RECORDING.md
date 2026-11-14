# EPIC-08: Keys + Match Recording

> **Milestone:** M2
> **Status:** 📋 Backlog
> **Issues:** 10 · **SP:** 42
> **Features:** FT-025, FT-026
> **Ships as:** Native build 1.1.0

---

## Objective

Prove the audio is good enough (spike), then ship the native build that can hold the user's API keys and record a match with consent, pause, hand-off and a clock that matches the log.

## Issues

| ID | Title | Depends on | Priority | SP | Status |
|----|-------|------------|----------|----|--------|
| [SPIKE-001](../issues/SPIKE-001-spike-is-table-audio-good-enough-go-no-go.md) | Spike: is table audio good enough? (go/no-go) | — | P0 | 5 | 📋 |
| [ADR-009](../issues/ADR-009-adr-hybrid-ai-architecture-keys-on-device-results.md) | ADR: hybrid AI architecture (keys on device, results on backend) | — | P1 | 2 | 📋 |
| [REC-001](../issues/REC-001-native-build-1-1-0-audio-file-system-clipboard-per.md) | Native build 1.1.0: audio, file system, clipboard, permissions | SPIKE-001 | P1 | 5 | 📋 |
| [KEY-001](../issues/KEY-001-settings-connect-claude-and-deepgram-keys.md) | Settings: connect Claude and Deepgram keys | REC-001 | P1 | 5 | 📋 |
| [REC-002](../issues/REC-002-schema-recordings-segments-transcripts-event-occur.md) | Schema: recordings, segments, transcripts, event `occurred_at` | ADR-009 | P1 | 3 | 📋 |
| [REC-003](../issues/REC-003-match-setup-record-for-ai-recap-toggle-and-consent.md) | Match setup: 'Record for AI recap' toggle and consent screen | KEY-001, REC-002 | P1 | 3 | 📋 |
| [REC-004](../issues/REC-004-recorder-service-5-minute-local-files-on-the-match.md) | Recorder service: 5-minute local files on the match clock | REC-001, REC-002 | P1 | 8 | 📋 |
| [REC-005](../issues/REC-005-pause-off-the-record-and-recording-indicator.md) | Pause ('off the record') and recording indicator | REC-004 | P1 | 3 | 📋 |
| [REC-006](../issues/REC-006-recording-hand-off-when-another-phone-takes-over-t.md) | Recording hand-off when another phone takes over the match | REC-004 | P2 | 5 | 📋 |
| [REC-007](../issues/REC-007-recovery-leftover-audio-files-after-a-crash-or-dea.md) | Recovery: leftover audio files after a crash or dead battery | REC-004 | P2 | 3 | 📋 |
