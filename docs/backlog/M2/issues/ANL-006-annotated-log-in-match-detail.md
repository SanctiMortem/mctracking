# ANL-006: Annotated log in match detail

> **Issue ID:** ANL-006
> **Priority:** P1
> **Story Points:** 3
> **Status:** 📋 Backlog
> **Epic:** [EPIC-09](../epics/EPIC-09-ANALYSIS.md)
> **Blocked By:** [ANL-002](ANL-002-event-attribution-annotate-each-log-event.md)
> **Blocks:** —

---

## Objective

Show causes next to log entries in the match history.

## Acceptance criteria

- [ ] Each annotated entry shows the cause, e.g. 'Atraxa (combat) → Gabo −8'
- [ ] Tapping shows confidence and the evidence quote
- [ ] Unlabeled entries look exactly as they do today
- [ ] Undone entries stay crossed out and carry no annotation
- [ ] Visible to match players while in draft; to the pod after publish

## Technical context

- `components/tracker/EventLogItem.tsx`, `hooks/useMatchDetail.ts`, `services/matches.ts`

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
