# ANL-003: Narrative, key moments and rules debates

> **Issue ID:** ANL-003
> **Priority:** P2
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-09](../epics/EPIC-09-ANALYSIS.md)
> **Blocked By:** [ANL-002](ANL-002-event-attribution-annotate-each-log-event.md)
> **Blocks:** [RCP-001](RCP-001-schema-api-recaps-flags-approvals-roasts.md)

---

## Objective

Produce the structured story the recap is rendered from.

## Acceptance criteria

- [ ] Output JSON: headline, turn-by-turn paragraphs, key moments (combo, board wipe, big swing, comeback, biggest hit), eliminations (who, by whom, turn, time, method), rules debates (question, outcome)
- [ ] Every sentence about damage or elimination references event ids from the annotated log
- [ ] Where the table's ruling disagrees with the log, the log wins and the debate records that
- [ ] Non-game talk is not summarised, quoted or referenced
- [ ] Written in the app language of the uploader; card names stay in English

## Technical context

- `services/analysis/narrative.ts`

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
