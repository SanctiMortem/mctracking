# ANL-001: Speaker-to-player mapping

> **Issue ID:** ANL-001
> **Priority:** P1
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-09](../epics/EPIC-09-ANALYSIS.md)
> **Blocked By:** [TRN-002](TRN-002-api-temporary-transcript-storage-and-time-ordered.md), [ADR-010](ADR-010-adr-analysis-model-prompt-shape-and-cost-budget.md)
> **Blocks:** [ANL-002](ANL-002-event-attribution-annotate-each-log-event.md), [ANL-005](ANL-005-manual-speaker-fix-and-relabel.md)

---

## Objective

Map Deepgram speaker labels to players, with confidence and evidence, before any event is labeled.

## Acceptance criteria

- [ ] Inputs: transcript, roll-call window if present, turn timeline (active player per turn), decklists and commanders, the log
- [ ] Output per speaker label: player or `unknown`, confidence, a short evidence line
- [ ] Signals used: roll-call order, speech during own turn, 'I cast' + card ownership, being addressed by name, reaction right after own life change
- [ ] Mapping runs separately for each recording (labels differ per device)
- [ ] Stored in `match_transcripts.speaker_map`; no voice sample or voice profile is stored

## Technical context

- New `services/analysis/speakerMapping.ts`; prompt text under `services/analysis/prompts/`

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
