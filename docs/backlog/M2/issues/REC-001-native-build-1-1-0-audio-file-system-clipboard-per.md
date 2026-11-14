# REC-001: Native build 1.1.0: audio, file system, clipboard, permissions

> **Issue ID:** REC-001
> **Priority:** P1
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-08](../epics/EPIC-08-RECORDING.md)
> **Blocked By:** [SPIKE-001](SPIKE-001-spike-is-table-audio-good-enough-go-no-go.md)
> **Blocks:** [DECK-007](DECK-007-assisted-import-get-list-from-moxfield-clipboard-p.md), [KEY-001](KEY-001-settings-connect-claude-and-deepgram-keys.md), [REC-004](REC-004-recorder-service-5-minute-local-files-on-the-match.md)

---

## Objective

Add the native modules M2 needs and ship a new binary; everything after rides OTAs on runtime 1.1.0.

## Acceptance criteria

- [ ] Adds `expo-audio`, `expo-file-system`, `expo-clipboard` at the SDK 55 versions
- [ ] iOS: microphone usage string (EN + ES), background audio mode. Android: `RECORD_AUDIO` + foreground-service microphone permission
- [ ] App version 1.1.0 (new runtime version under the `appVersion` policy); build numbers bumped
- [ ] EAS builds succeed for iOS and Android; recording works with the screen locked on a physical device of each
- [ ] App Store privacy answers updated (audio is recorded, sent to a third party with the user's own key, not stored)
- [ ] Old 1.0.2 binaries keep receiving only 1.0.2-compatible OTAs

## Technical context

- `app.json` plugins + permissions, `eas.json`; verify EAS env with `eas env:list --environment production` before the first 1.1.0 OTA
- Android is still in closed testing — upload 1.1.0 to that track so the 14-day clock is not restarted on a separate track

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
