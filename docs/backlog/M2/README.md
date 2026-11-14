# M2 — AI Match Narration + Deck Win Stats (v1.1.0)

> **Milestone:** M2
> **Status:** 📋 Backlog
> **Created:** 2026-11-13
> **Brief:** [M2 Discovery Brief](../../planning/M2/00_DISCOVERY_BRIEF.md)

---

## Epics

| Epic | Name | Features | Ships as | Issues | SP |
|------|------|----------|----------|--------|----|
| [EPIC-06](epics/EPIC-06-QUICK-WINS.md) | Quick Wins — Win Stats + Commander Damage | FT-021, FT-022 | OTA | 5 | 18 |
| [EPIC-07](epics/EPIC-07-DECKLISTS.md) | Decklists | FT-023, FT-024 | OTA (clipboard assist rides 1.1.0) | 7 | 22 |
| [EPIC-08](epics/EPIC-08-RECORDING.md) | Keys + Match Recording | FT-025, FT-026 | Native build 1.1.0 | 10 | 42 |
| [EPIC-09](epics/EPIC-09-ANALYSIS.md) | Transcription + AI Analysis | FT-027, FT-028, FT-029 | OTA on 1.1.0 | 9 | 39 |
| [EPIC-10](epics/EPIC-10-RECAP.md) | Recap, Review, Roast | FT-030, FT-031, FT-032 | OTA on 1.1.0 | 5 | 28 |
| [EPIC-11](epics/EPIC-11-DEEP-STATS.md) | Deep Stats | FT-033, FT-034 | OTA on 1.1.0 (DSTAT-002 can ship earlier) | 5 | 28 |
| **Total** | | | | **41** | **177** |

## Build order

1. **EPIC-06** — STAT-001 → STAT-002, then CMDR-001 → CMDR-002 → CMDR-003. OTA.
2. **EPIC-07** — DECK-001 → 002 → 003 → 004 → 005, DECK-006. OTA.
3. **SPIKE-001** — go/no-go for everything below. Can run in parallel with 1 and 2.
4. **EPIC-08** — ADR-009, REC-001 (native build 1.1.0), KEY-001, REC-002 → REC-007, DECK-007.
5. **EPIC-09** — ADR-010, TRN-001/002, ANL-001 → ANL-006.
6. **EPIC-10** — RCP-001 → RCP-005.
7. **EPIC-11** — DSTAT-001 → 005 (DSTAT-002 needs no AI and can ship early).

## All issues

| ID | Title | Epic | Priority | SP | Blocked by |
|----|-------|------|----------|----|------------|
| [STAT-001](issues/STAT-001-api-wins-by-win-condition-in-deck-commander-and-pl.md) | API: wins by win condition in deck, commander and player stats | EPIC-06 | P1 | 3 | — |
| [STAT-002](issues/STAT-002-ui-how-this-deck-wins-on-deck-commander-and-player.md) | UI: 'How this deck wins' on deck, commander and player detail | EPIC-06 | P1 | 3 | STAT-001 |
| [CMDR-001](issues/CMDR-001-commander-damage-screen-enter-the-hit-not-the-runn.md) | Commander damage screen: enter the hit, not the running total | EPIC-06 | P1 | 5 | — |
| [CMDR-002](issues/CMDR-002-commander-damage-screen-no-auto-close-pass-turn-ar.md) | Commander damage screen: no auto-close, pass-turn area becomes exit | EPIC-06 | P1 | 2 | CMDR-001 |
| [CMDR-003](issues/CMDR-003-commander-damage-one-log-entry-per-hit-undo-by-hit.md) | Commander damage: one log entry per hit, undo by hit, lethal warning | EPIC-06 | P2 | 5 | CMDR-001 |
| [DECK-001](issues/DECK-001-schema-cards-cache-deck-cards-decks-moxfield-url.md) | Schema: cards cache, deck_cards, decks.moxfield_url | EPIC-07 | P1 | 3 | — |
| [DECK-002](issues/DECK-002-decklist-text-parser.md) | Decklist text parser | EPIC-07 | P1 | 3 | — |
| [DECK-003](issues/DECK-003-api-import-decklist-and-resolve-with-scryfall.md) | API: import decklist and resolve with Scryfall | EPIC-07 | P1 | 5 | DECK-001, DECK-002 |
| [DECK-004](issues/DECK-004-color-identity-validation-and-unresolved-flags.md) | Color-identity validation and unresolved flags | EPIC-07 | P2 | 2 | DECK-003 |
| [DECK-005](issues/DECK-005-ui-decklist-section-on-deck-detail-with-paste-impo.md) | UI: decklist section on deck detail with paste import | EPIC-07 | P1 | 5 | DECK-003, DECK-004 |
| [DECK-006](issues/DECK-006-moxfield-link-field.md) | Moxfield link field | EPIC-07 | P2 | 1 | DECK-001 |
| [DECK-007](issues/DECK-007-assisted-import-get-list-from-moxfield-clipboard-p.md) | Assisted import: 'Get list from Moxfield' + clipboard prompt | EPIC-07 | P3 | 3 | DECK-005, DECK-006, REC-001 |
| [SPIKE-001](issues/SPIKE-001-spike-is-table-audio-good-enough-go-no-go.md) | Spike: is table audio good enough? (go/no-go) | EPIC-08 | P0 | 5 | — |
| [ADR-009](issues/ADR-009-adr-hybrid-ai-architecture-keys-on-device-results.md) | ADR: hybrid AI architecture (keys on device, results on backend) | EPIC-08 | P1 | 2 | — |
| [REC-001](issues/REC-001-native-build-1-1-0-audio-file-system-clipboard-per.md) | Native build 1.1.0: audio, file system, clipboard, permissions | EPIC-08 | P1 | 5 | SPIKE-001 |
| [KEY-001](issues/KEY-001-settings-connect-claude-and-deepgram-keys.md) | Settings: connect Claude and Deepgram keys | EPIC-08 | P1 | 5 | REC-001 |
| [REC-002](issues/REC-002-schema-recordings-segments-transcripts-event-occur.md) | Schema: recordings, segments, transcripts, event `occurred_at` | EPIC-08 | P1 | 3 | ADR-009 |
| [REC-003](issues/REC-003-match-setup-record-for-ai-recap-toggle-and-consent.md) | Match setup: 'Record for AI recap' toggle and consent screen | EPIC-08 | P1 | 3 | KEY-001, REC-002 |
| [REC-004](issues/REC-004-recorder-service-5-minute-local-files-on-the-match.md) | Recorder service: 5-minute local files on the match clock | EPIC-08 | P1 | 8 | REC-001, REC-002 |
| [REC-005](issues/REC-005-pause-off-the-record-and-recording-indicator.md) | Pause ('off the record') and recording indicator | EPIC-08 | P1 | 3 | REC-004 |
| [REC-006](issues/REC-006-recording-hand-off-when-another-phone-takes-over-t.md) | Recording hand-off when another phone takes over the match | EPIC-08 | P2 | 5 | REC-004 |
| [REC-007](issues/REC-007-recovery-leftover-audio-files-after-a-crash-or-dea.md) | Recovery: leftover audio files after a crash or dead battery | EPIC-08 | P2 | 3 | REC-004 |
| [TRN-001](issues/TRN-001-deepgram-transcription-client.md) | Deepgram transcription client | EPIC-09 | P1 | 5 | REC-004, KEY-001 |
| [TRN-002](issues/TRN-002-api-temporary-transcript-storage-and-time-ordered.md) | API: temporary transcript storage and time-ordered merge | EPIC-09 | P1 | 3 | REC-002, TRN-001 |
| [ADR-010](issues/ADR-010-adr-analysis-model-prompt-shape-and-cost-budget.md) | ADR: analysis model, prompt shape and cost budget | EPIC-09 | P1 | 2 | SPIKE-001 |
| [ANL-001](issues/ANL-001-speaker-to-player-mapping.md) | Speaker-to-player mapping | EPIC-09 | P1 | 5 | TRN-002, ADR-010 |
| [ANL-002](issues/ANL-002-event-attribution-annotate-each-log-event.md) | Event attribution: annotate each log event | EPIC-09 | P1 | 8 | ANL-001 |
| [ANL-003](issues/ANL-003-narrative-key-moments-and-rules-debates.md) | Narrative, key moments and rules debates | EPIC-09 | P2 | 5 | ANL-002 |
| [ANL-004](issues/ANL-004-processing-pipeline-and-status-ui.md) | Processing pipeline and status UI | EPIC-09 | P1 | 5 | TRN-001, ANL-002 |
| [ANL-005](issues/ANL-005-manual-speaker-fix-and-relabel.md) | Manual speaker fix and relabel | EPIC-09 | P2 | 3 | ANL-001, ANL-002 |
| [ANL-006](issues/ANL-006-annotated-log-in-match-detail.md) | Annotated log in match detail | EPIC-09 | P1 | 3 | ANL-002 |
| [RCP-001](issues/RCP-001-schema-api-recaps-flags-approvals-roasts.md) | Schema + API: recaps, flags, approvals, roasts | EPIC-10 | P1 | 5 | ANL-003 |
| [RCP-002](issues/RCP-002-recap-screen.md) | Recap screen | EPIC-10 | P1 | 5 | RCP-001 |
| [RCP-003](issues/RCP-003-review-flag-lines-and-approve.md) | Review: flag lines and approve | EPIC-10 | P1 | 5 | RCP-002 |
| [RCP-004](issues/RCP-004-publish-rewrite-without-flagged-moments-delete-tra.md) | Publish: rewrite without flagged moments, delete transcript | EPIC-10 | P1 | 8 | RCP-003, ADR-009 |
| [RCP-005](issues/RCP-005-roast-this-match.md) | Roast this match | EPIC-10 | P2 | 5 | RCP-004 |
| [DSTAT-001](issues/DSTAT-001-per-match-stat-box-from-the-annotated-log.md) | Per-match stat box from the annotated log | EPIC-11 | P1 | 8 | ANL-002 |
| [DSTAT-002](issues/DSTAT-002-career-stats-that-need-no-ai-seat-pod-size-game-le.md) | Career stats that need no AI: seat, pod size, game length, opponents | EPIC-11 | P2 | 5 | — |
| [DSTAT-003](issues/DSTAT-003-career-stats-from-annotations-nemesis-favorite-vic.md) | Career stats from annotations: nemesis, favorite victim, kill method | EPIC-11 | P2 | 5 | DSTAT-001 |
| [DSTAT-004](issues/DSTAT-004-card-level-stats-per-deck.md) | Card-level stats per deck | EPIC-11 | P3 | 5 | DSTAT-001, DECK-003 |
| [DSTAT-005](issues/DSTAT-005-ui-stat-box-and-career-stats-surfaces.md) | UI: stat box and career stats surfaces | EPIC-11 | P2 | 5 | DSTAT-001, DSTAT-002, DSTAT-003 |
