# STAT-002: UI: 'How this deck wins' on deck, commander and player detail

> **Issue ID:** STAT-002
> **Priority:** P1
> **Story Points:** 3
> **Status:** 📋 Backlog
> **Epic:** [EPIC-06](../epics/EPIC-06-QUICK-WINS.md)
> **Blocked By:** [STAT-001](STAT-001-api-wins-by-win-condition-in-deck-commander-and-pl.md)
> **Blocks:** —

---

## Objective

Show the win-condition breakdown as a compact bar list on the three detail screens.

## Acceptance criteria

- [ ] Deck detail shows a section titled 'How this deck wins' with one row per condition: label, count, share of wins, proportional bar
- [ ] Same component on commander detail and player detail with matching titles
- [ ] Section is hidden when the entity has zero wins
- [ ] Labels reuse the existing win-condition translations used on the close-match screen (EN + ES)
- [ ] Works on iPhone SE width

## Technical context

- New `components/stats/WinConditionBreakdown.tsx`
- `app/decks/[id].tsx`, `app/commanders/[id].tsx`, `app/players/[id].tsx`; types in `hooks/useDeckStats.ts` etc.
- Add section-title keys to `locales/en.json` + `es.json`

## Out of scope

- Charts library; filtering history by tapping a row (nice follow-up — history already supports a `winCondition` filter)

---

_Created: 2026-11-13 · Source: [M2 Discovery Brief](../../../planning/M2/00_DISCOVERY_BRIEF.md)_
