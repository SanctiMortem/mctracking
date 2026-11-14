# EPIC-09: Transcription + AI Analysis

> **Milestone:** M2
> **Status:** 📋 Backlog
> **Issues:** 9 · **SP:** 39
> **Features:** FT-027, FT-028, FT-029
> **Ships as:** OTA on 1.1.0

---

## Objective

Turn the recorded segments into a diarized transcript, map speakers to players, and annotate every log event with its cause, confidence and evidence.

## Issues

| ID | Title | Depends on | Priority | SP | Status |
|----|-------|------------|----------|----|--------|
| [TRN-001](../issues/TRN-001-deepgram-transcription-client.md) | Deepgram transcription client | REC-004, KEY-001 | P1 | 5 | 📋 |
| [TRN-002](../issues/TRN-002-api-temporary-transcript-storage-and-time-ordered.md) | API: temporary transcript storage and time-ordered merge | REC-002, TRN-001 | P1 | 3 | 📋 |
| [ADR-010](../issues/ADR-010-adr-analysis-model-prompt-shape-and-cost-budget.md) | ADR: analysis model, prompt shape and cost budget | SPIKE-001 | P1 | 2 | 📋 |
| [ANL-001](../issues/ANL-001-speaker-to-player-mapping.md) | Speaker-to-player mapping | TRN-002, ADR-010 | P1 | 5 | 📋 |
| [ANL-002](../issues/ANL-002-event-attribution-annotate-each-log-event.md) | Event attribution: annotate each log event | ANL-001 | P1 | 8 | 📋 |
| [ANL-003](../issues/ANL-003-narrative-key-moments-and-rules-debates.md) | Narrative, key moments and rules debates | ANL-002 | P2 | 5 | 📋 |
| [ANL-004](../issues/ANL-004-processing-pipeline-and-status-ui.md) | Processing pipeline and status UI | TRN-001, ANL-002 | P1 | 5 | 📋 |
| [ANL-005](../issues/ANL-005-manual-speaker-fix-and-relabel.md) | Manual speaker fix and relabel | ANL-001, ANL-002 | P2 | 3 | 📋 |
| [ANL-006](../issues/ANL-006-annotated-log-in-match-detail.md) | Annotated log in match detail | ANL-002 | P1 | 3 | 📋 |
