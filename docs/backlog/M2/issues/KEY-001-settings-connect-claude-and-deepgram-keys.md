# KEY-001: Settings: connect Claude and Deepgram keys

> **Issue ID:** KEY-001
> **Priority:** P1
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-08](../epics/EPIC-08-RECORDING.md)
> **Blocked By:** [REC-001](REC-001-native-build-1-1-0-audio-file-system-clipboard-per.md)
> **Blocks:** [REC-003](REC-003-match-setup-record-for-ai-recap-toggle-and-consent.md), [TRN-001](TRN-001-deepgram-transcription-client.md)

---

## Objective

A settings section where the user stores their own keys on the device and sees whether they work.

## Acceptance criteria

- [ ] 'Connect Claude' opens the Console API keys page in the browser; on return, a clipboard value starting with `sk-ant-` triggers 'Save this key?'
- [ ] 'Connect Deepgram' does the same for the Deepgram console; manual paste is always available for both
- [ ] Keys are stored only with `expo-secure-store`; they are never sent to our backend, logged, or included in error reports
- [ ] Saving runs a minimal test call and shows Connected or the provider's error
- [ ] Each key shows status with Test and Remove
- [ ] Recording cannot be switched on unless both keys are Connected; the toggle explains why

## Technical context

- New `services/aiKeys.ts`, settings screen section, `locales/*`
- Anthropic test call: smallest possible Messages request; Deepgram: a key/project lookup endpoint

## Out of scope

- Sharing keys between pod members, a backend proxy

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
