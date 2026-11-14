# ANL-002: Event attribution: annotate each log event

> **Issue ID:** ANL-002
> **Priority:** P1
> **Story Points:** 8
> **Status:** 📋 Backlog
> **Epic:** [EPIC-09](../epics/EPIC-09-ANALYSIS.md)
> **Blocked By:** [ANL-001](ANL-001-speaker-to-player-mapping.md)
> **Blocks:** [ANL-003](ANL-003-narrative-key-moments-and-rules-debates.md), [ANL-004](ANL-004-processing-pipeline-and-status-ui.md), [ANL-005](ANL-005-manual-speaker-fix-and-relabel.md), [ANL-006](ANL-006-annotated-log-in-match-detail.md), [DSTAT-001](DSTAT-001-per-match-stat-box-from-the-annotated-log.md)

---

## Objective

For every non-undone life, poison and commander-damage event, record what caused it.

## Acceptance criteria

- [ ] Schema `match_event_annotations`: `event_id`, `run_id`, `source_player_id`, `source_card_id`, `source_commander_id`, `target_player_id`, `damage_type` (combat / commander / spell / ability / other), `confidence`, `evidence_quote`
- [ ] Each event is sent with its transcript window (default −60 s / +15 s on `occurred_at`) and the oracle text of cards mentioned in that window only
- [ ] The response is validated against a schema; invalid output is retried once, then the event is left unlabeled
- [ ] Below the confidence threshold, or from an unmapped speaker, the event stays unlabeled
- [ ] Evidence quotes are game talk only and at most one short sentence
- [ ] The log is never changed by the analysis: amounts, targets and times come from the log
- [ ] A new run replaces the previous run's annotations (by `run_id`)

## Technical context

- `db/schema.ts`, `app/api/matches/[id]/annotations+api.ts`, `services/analysis/attribution.ts`
- Sequential writes, safe to re-run

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
