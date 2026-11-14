# SPIKE-001: Spike: is table audio good enough? (go/no-go)

> **Issue ID:** SPIKE-001
> **Priority:** P0
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-08](../epics/EPIC-08-RECORDING.md)
> **Blocked By:** —
> **Blocks:** [REC-001](REC-001-native-build-1-1-0-audio-file-system-clipboard-per.md), [ADR-010](ADR-010-adr-analysis-model-prompt-shape-and-cost-budget.md)

---

## Objective

Before any native work, measure diarization and attribution on one real pod night.

## Acceptance criteria

- [ ] One real 4-player match recorded with a stock voice-memo app on the host phone, and once more with a device in the middle of the table
- [ ] A script sends the audio to Deepgram (Nova-3 multilingual, diarize, keyterms from the decks in play) and saves the JSON
- [ ] A script sends transcript + the real match log export to Claude with a first-draft attribution prompt
- [ ] Written result: share of speech assigned to the right player, share of log events attributed correctly, cost per hour for each candidate model, Spanish/English mix quality
- [ ] Explicit go / no-go / change-of-approach recommendation, and whether a guided roll-call is needed

## Technical context

- Scripts live under `scripts/spike-narration/`, keys from local env only, audio never committed
- Use the Deepgram and Anthropic docs current at the time for model ids, keyterm limits and pricing — do not rely on the PDF's figures

## Out of scope

- Any app code

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
