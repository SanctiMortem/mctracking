# ADR-009: ADR: hybrid AI architecture (keys on device, results on backend)

> **Issue ID:** ADR-009
> **Priority:** P1
> **Story Points:** 2
> **Status:** 📋 Backlog
> **Epic:** [EPIC-08](../epics/EPIC-08-RECORDING.md)
> **Blocked By:** —
> **Blocks:** [REC-002](REC-002-schema-recordings-segments-transcripts-event-occur.md), [RCP-004](RCP-004-publish-rewrite-without-flagged-moments-delete-tra.md)

---

## Objective

Record the decisions taken in discovery so later issues do not reopen them.

## Acceptance criteria

- [ ] States R1–R3 from the M2 brief: keys in SecureStore and direct calls from the phone; audio in 5-minute local files sent at match end; only the tracker phone records
- [ ] Lists exactly what the backend may store (transcript until publish, annotations, recap, flags, approvals, roast) and what it may never receive (audio, API keys)
- [ ] Settles working hypotheses H1/H2: who runs the publish rewrite and the hard transcript deadline
- [ ] Added to `docs/planning/07_ARCHITECTURE.md` as ADR-009

## Technical context

- Needs the user's answer to OQ1 in the brief

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
