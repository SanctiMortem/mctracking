# Discovery Brief — M2: AI Match Narration + Deck Win Stats

> **Milestone:** M2 (target app version 1.1.0)
> **Date:** 2026-11-13
> **Stakeholder:** Gabriel Asse
> **Mode:** D1 (source document provided). The M1 brief (`../00_DISCOVERY_BRIEF.md`) is untouched.
> **Backlog:** [`docs/backlog/M2/`](../../backlog/M2/README.md)

## Source package

| # | Source | Class | Notes |
|---|--------|-------|-------|
| 1 | `Sliver Counter – AI Match Narration (Discovery).pdf` (8 pages) | Source of truth | Read in full |
| 2 | Chat request, 2026-11-13: deck stats by win condition ("won by combat, by combo…") | Source of truth | New scope, not in the PDF |
| 3 | Chat answers, 2026-11-13: keys/backend, audio chunks, consent | Source of truth | Resolve three PDF gaps |
| 4 | Repo at `036063d` (`db/schema.ts`, `services/`, `app/`) | Legacy / reality check | Code wins over the PDF's "current state" |

---

## §1 Goal

Record a Commander match's table audio, transcribe it, and have an LLM explain the existing match log: for each life, poison or commander-damage event, who or what caused it. Turn the annotated log into a recap, an optional roast, and the deepest Commander stats of any MTG app. Off-topic talk is ignored; the log stays the source of truth.

Separately and immediately: show how each deck wins (combat, commander damage, infect, combo, mill…), using data the app already stores.

## §2 Users

| Role | What they do in M2 |
|------|--------------------|
| Host (phone running the tracker) | Turns recording on, holds the Deepgram + Anthropic keys, runs transcription and analysis |
| Player in the match | Reviews the draft recap, flags lines, approves |
| Pod member (did not play) | Reads the published recap, roast and stats |
| Guest (no account) | Unaffected — no recording in guest or casual matches |

## §3 What the repo already has (corrects the PDF)

| PDF assumption | Reality |
|----------------|---------|
| "Which platform and stack, where data is stored" is open | React Native + Expo SDK 55, Neon via Vercel API routes, Clerk auth, synced across the pod |
| "No backend for now" | A backend exists and is required for pod-visible recaps |
| Stats are wins and losses | Rich stats exist (matchups, colors, pod highlights, turn times) |
| Commander damage needs per-hit log entries | `match_events` already stores one row per debounced commander-damage change with `commander_id_source`; the UI is what shows running totals |
| Win method is unknown until AI | `match_results.win_condition` is picked at close: `combat_damage, commander_damage, infect, combo, mill, scoop, concede, other` |
| Log timestamps align with audio | **They do not yet.** `match_events.created_at` is server time at flush, 200–2000 ms (plus network) after the tap. A client `occurred_at` is needed |
| — | No audio, file-system or clipboard module is installed → recording needs a new native build, not an OTA |

## §4 Decision registry

### Firm (from the PDF)

| # | Decision |
|---|----------|
| F1 | Decklist is optional per deck; import by pasted text; keep quantity + name only |
| F2 | Resolve with Scryfall `/cards/collection` (75 per request), `/cards/named?fuzzy=` fallback; store name, oracle text, type, colors, image; cache; respect rate limits |
| F3 | Moxfield: saved tappable link only. No scraping, no unofficial API |
| F4 | Assisted import: open the link, user copies plain text, app offers "Import copied list?" |
| F5 | Validate against commander color identity; flag unresolved cards |
| F6 | Recording is per-match opt-in ("Record for AI recap") |
| F7 | Mono AAC/Opus at ~24–32 kbps |
| F8 | Recording clock = match log clock |
| F9 | Interruptions become segments with offsets; takeover on another phone continues recording, tagged by match, device and start time |
| F10 | Deepgram pre-recorded Nova-3 multilingual, diarization, word timestamps, keyterms = card, player and commander names |
| F11 | Audio is deleted after a successful transcription and never stored remotely |
| F12 | Claude gets players, decks, decklists (oracle text only for mentioned cards), full log, diarized transcript; per-event window ≈ −60 s / +15 s |
| F13 | Strict JSON output: cause (source card/commander, source player, target, damage type), confidence, short evidence quote; plus narrative and key moments |
| F14 | Low-confidence events stay unlabeled |
| F15 | Recap sections: headline, pregame, turn-by-turn, key moments, eliminations, rules debates, stat box. Roast is separate and optional |
| F16 | Undone log entries are excluded everywhere. Unattributed events count in totals but not in by-source stats |
| F17 | No voice profiles. Speaker mapping stacks: roll-call, turn-order anchoring, card ownership, being addressed, log cross-check, manual fix (reruns labeling only) |
| F18 | Keys are bring-your-own, stored in Keychain/Keystore, connected by clipboard detection, with Test and Remove |
| F19 | Pause button ("off the record"); nothing from a paused stretch leaves the phone |
| F20 | Review: private draft for players → long-press to flag (hidden at once) → approve checks → publish when all approve or after 10 days → rewrite without flagged moments → delete transcript |
| F21 | Roast is built only from the published recap + annotated log, short or long, can be regenerated or deleted |
| F22 | Commander damage screen: enter the hit, show "name – total / 21", no 3-second auto-close, pass-turn area becomes exit, each hit is its own log entry, undo removes one hit |

### Resolved in discovery (2026-11-13)

| # | Question | Decision |
|---|----------|----------|
| R1 | Keys vs backend | **Hybrid.** Keys stay on the phone and the phone calls Deepgram and Anthropic directly. The existing backend stores only results: temporary transcript, annotations, recap, flags, approvals, roast |
| R2 | "Chunks during the match" vs "upload at the end" | **Save locally, send at end.** 5-minute files on disk; each device sends its files to Deepgram at match end, then deletes them |
| R3 | Who records, how the pod consents | **Tracker phone only.** Full-screen consent prompt at setup, persistent recording/paused indicator; a takeover phone asks again |
| R4 | Win-condition deck stats | Aggregate existing `match_results.win_condition`; no AI needed; ships first as an OTA |

### Working hypotheses (mine — confirm or correct)

| # | Hypothesis | Why |
|---|------------|-----|
| H1 | Publish rewrite runs on a phone that has an Anthropic key (the uploader's), the next time it opens the app after everyone approved or day 10 passed | R1 means the server has no key |
| H2 | A server-side deadline deletes the transcript at day 10 no matter what; if no keyed phone has rewritten by then, the recap publishes with flagged lines simply removed | Keeps the "transcript is gone after 10 days" promise without a server key |
| H3 | Roll-call is a guided, skippable prompt | PDF open question; other signals still work without it |
| H4 | Win-condition breakdown appears on deck, commander and player detail | Same query, three surfaces |
| H5 | Recording is offered only in account matches with a pod, never in guest/casual | Those are in-memory with no match log to annotate |
| H6 | Docs and backlog for M2 are in English (M1 was Spanish) | The PDF and this conversation are in English |
| H7 | Analysis model is chosen in ADR-010 after a cost test on a real transcript | The PDF's $0.05–0.15/hour figure is unverified |

### Excluded from M2

In-game hints, deck insights, pre-game matchup notes, direct Moxfield import, backend key proxy, paid tier, voice profiles.

## §5 Features

| ID | Feature | Ships as |
|----|---------|----------|
| FT-021 | Deck win-condition breakdown | OTA |
| FT-022 | Commander damage per-hit entry | OTA |
| FT-023 | Decklist paste import + Scryfall resolve | OTA |
| FT-024 | Moxfield link + assisted clipboard import | Link: OTA · clipboard: native 1.1.0 |
| FT-025 | API key connect (Claude, Deepgram) | Native 1.1.0 |
| FT-026 | Match audio recording with consent, pause, hand-off | Native 1.1.0 |
| FT-027 | Deepgram transcription | OTA on 1.1.0 |
| FT-028 | Speaker-to-player mapping | OTA on 1.1.0 |
| FT-029 | AI event attribution (annotated log) | OTA on 1.1.0 |
| FT-030 | Match recap | OTA on 1.1.0 |
| FT-031 | Review window, flags, publish | OTA on 1.1.0 |
| FT-032 | Roast this match | OTA on 1.1.0 |
| FT-033 | Per-match stat box | OTA on 1.1.0 |
| FT-034 | Career and card-level stats | OTA on 1.1.0 |

## §6 Data model changes

| Table | Change |
|-------|--------|
| `decks` | `+ moxfield_url` |
| `cards` (new) | Scryfall cache: `scryfall_id`, `oracle_id`, `name`, `oracle_text`, `type_line`, `colors`, `color_identity`, `image_url`, `fetched_at` |
| `deck_cards` (new) | `deck_id`, `card_id` (null when unresolved), `raw_name`, `quantity`, `off_identity` |
| `match_events` | `+ occurred_at` (client clock, corrected to server offset) |
| `match_recordings` (new) | `match_id`, `device_id`, `uploaded_by`, `consented_at`, `status` |
| `recording_segments` (new) | `recording_id`, `started_at`, `ended_at` — metadata only, no audio |
| `match_transcripts` (new, temporary) | `recording_id`, `deepgram_json`, `speaker_map`, `delete_after` |
| `match_event_annotations` (new) | `event_id`, source card/commander/player, target, `damage_type`, `confidence`, `evidence_quote`, `run_id` |
| `match_recaps` (new) | `match_id`, `status` (draft/published), `content` jsonb, `publish_after`, `published_at` |
| `recap_flags`, `recap_approvals` (new) | per player |
| `match_roasts` (new) | `match_id`, `length`, `content`, `created_by` |

Neon HTTP has no transactions: every multi-table write must be sequential and safe to re-run.

## §7 Integrations

| Service | Called from | Purpose |
|---------|-------------|---------|
| Scryfall | Backend (`/api/decks/:id/decklist`) | Card resolution, cached in `cards` |
| Deepgram | Phone, user's key | Transcription |
| Anthropic API | Phone, user's key | Mapping, attribution, recap, roast |
| Moxfield | Browser link only | None programmatic |

## §8 Delivery order

1. **Quick wins (OTA now):** FT-021, FT-022.
2. **Decklists (OTA):** FT-023, Moxfield link.
3. **Spike before any native work:** record one real pod night with a voice-memo app, run it through Deepgram and Claude by script, and measure diarization and attribution quality. Go/no-go for everything below.
4. **Native build 1.1.0:** keys, recording, clipboard.
5. **Transcription → analysis → annotated log UI.**
6. **Recap, review, roast.**
7. **Deep stats.**

## §9 Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Diarization is poor with 4 people and one phone | Whole AI track | Spike in step 3 before building; iPad-in-the-middle vs host phone |
| Log timestamps drift from audio | Wrong attribution windows | `occurred_at` on events (REC-002) |
| Background recording stops on iOS/Android | Lost audio | Background audio mode, keep-awake already used, segment recovery |
| A new native build while Android is still in closed testing | Release friction | Fold 1.1.0 into the closed-test track |
| Recording people | Legal and trust | Consent prompt, indicator, pause, game-only output, deletion rules |
| LLM invents causes | Bad stats | Confidence threshold, evidence quote required, unattributed is allowed |
| Keys on device | Leak if device compromised | SecureStore only, never synced, per-member keys with spend limits |
| Lazy publish (H1) drifts past day 10 | Privacy promise | H2 server-side deadline |
| Overlap with the parked undo-unification work | Rework | CMDR-003 depends on id-explicit undo; do them together |

## §10 Open questions

| # | Question | Blocks |
|---|----------|--------|
| OQ1 | Confirm H1/H2 (who rewrites at publish; hard transcript deadline) | RCP-004 |
| OQ2 | Is Max-plan credit usable for API keys as the PDF states? Unverified | KEY-001 copy only |
| OQ3 | Does every player need to approve, or only account players (guests in a pod match cannot)? | RCP-003 |
| OQ4 | Commander casts and commander tax can only come from speech — acceptable as "best effort" stats? | DSTAT-001 |
