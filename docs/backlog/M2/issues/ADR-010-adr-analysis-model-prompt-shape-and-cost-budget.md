# ADR-010: ADR: analysis model, prompt shape and cost budget

> **Issue ID:** ADR-010
> **Priority:** P1
> **Story Points:** 2
> **Status:** 📋 Backlog
> **Epic:** [EPIC-09](../epics/EPIC-09-ANALYSIS.md)
> **Blocked By:** [SPIKE-001](SPIKE-001-spike-is-table-audio-good-enough-go-no-go.md)
> **Blocks:** [ANL-001](ANL-001-speaker-to-player-mapping.md)

---

## Objective

Choose the Claude model(s) and call structure from the spike's numbers.

## Acceptance criteria

- [ ] Compares candidate models on the spike transcript: attribution accuracy, cost per hour of play, latency
- [ ] Decides one call vs several (mapping → attribution → narrative), and how long matches are chunked
- [ ] Decides how strict JSON is enforced and validated
- [ ] Sets the confidence threshold below which an event stays unlabeled

## Technical context

- Read the current Anthropic API docs for model ids, pricing, structured output and prompt caching at decision time

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
