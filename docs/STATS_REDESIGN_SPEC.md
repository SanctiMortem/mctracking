# Stats redesign spec: Sliver Counter

Read `STATS_REFERENCE.md` first. It documents the current stats code, and the `#N` references below point to its section K (oddities and bugs).

## Goals

1. **One result model.** Matchups, colours, head-to-head and rankings all come from the same pairwise "duel" data, so they can't disagree.
2. **Nothing is required except the winner.** The Dead button, the turn button, life taps and "Killed by" are all optional. Stats must never break, throw, or produce misleading numbers when these are missing. Each stat uses only matches that have its inputs and shows its coverage.
3. **Competitive rankings.** A multiplayer skill rating replaces the raw win-rate sorting with ad-hoc minimums.
4. **Fix the inconsistencies** listed in the reference (section K).

## Decisions after review (2026-11-27)

These override the sections below where they disagree. Each affected section carries a short "Decision" note.

1. **Sample sizes are counted in matches, not duels.** One 4-player win is three duels; three such wins are 9–0 from three games and must not be labelled "solid".
2. **Matchups, head-to-head, colours and rankings use winner-only duels.** Placement is kept for descriptive stats only (average placement, top-2 rate, first-out rate). Reasons: a player who died without tapping Dead would be ranked above one who did tap, and going out first in Commander often means being the threat, not being the weakest.
3. **Placement is derived at read time and never stored.** No `placement` columns and no backfill script. The post-close "Who went out first?" prompt (1d) is deferred, since it is the only thing that would need storage.
4. **The killer is set by match + dead player, not by event id.** The tracker only learns a `player_died` event's id after its POST returns, and other devices learn of deaths through sync.
5. **Ratings are parked.** No OpenSkill in the first build, and no global-scope or commander ratings at all. Rankings use a minimum-games rule meanwhile (section 5). A printout of "current order vs rating order" can be produced later to decide.
6. **Change requests (section 9) are a separate project**, with no notifications (see section 9).

## Rollout

Nothing replaces the current stats until the numbers have been looked at.

- **New code in new files:** `services/stats2/` (pure calculations plus one loader). `services/stats.ts` and the current `/api/stats/*` routes stay untouched.
- **Step A, no UI:** `scripts/stats-compare/compare.ts` loads the real matches read-only and prints current vs new numbers side by side.
- **Step B, behind Labs:** new routes under `/api/stats/v2/`, and a "New stats" switch in Labs that makes the stats screens call them on that device only, with an error boundary that falls back to the current sections.
- **Step C:** when the numbers look right, v2 becomes the default and the old code is deleted.
- **Killed by** gets its own Labs switch and its own additive migration (nullable columns only).

## Phase order

Do them in this order. Each phase ships on its own.

1. Placement derivation (read time), duel engine, colour stats, head-to-head, minimum-games ranking, coverage rules: sections 2, 3, 4, 5 (interim rule), 7. No schema change.
2. Cleanup of the section K items (section 8). No schema change.
3. Killed by UI and data capture (section 1a, 1b), then kills, nemesis and round-based stats (section 6).
4. Ratings, only if the printout justifies them (section 5).
5. Match result change requests (section 9), as a separate project.

---

## 1. Data capture

### 1a. "Killed by" panel (tracker)

**Flow**
1. The player taps **Dead**. The current behaviour stays: the frame goes grey and the player is skipped in the turn rotation.
2. Inside the greyed frame, show a panel titled **"Killed by"**.
3. The panel shows one button per opposing commander, using the same layout and grid as the commander-damage picker.
   - Main label: the commander name.
   - Smaller font under it: the player name.
   - Partner decks get one button per commander, like the commander-damage picker.
   - Leave out the dead player's own commanders.
   - Also leave out players already dead before this player. Keep it simple: only players alive at the moment of death are listed.
   - Add one last button, **"Self-inflicted"**, styled differently (outlined or muted), for deaths the player caused themselves.
4. Tapping a button marks it selected (highlighted). Tapping another button switches the selection. Tapping the selected one clears it.
5. **There is no confirm, no required action and no blocking.** If nobody taps, the panel just stays in the greyed frame and the match goes on. The panel never blocks the turn flow, other players' inputs or closing the match.
6. If the player is revived (Dead toggled off, or the `player_died` event is undone), hide the panel and clear the killer.

**Storage**
- Add nullable columns to `match_events` for `player_died` rows only:
  - `killer_participation_id` (FK to participations, nullable)
  - `killer_commander_id` (FK to commanders, nullable, for partner precision)
  - `death_cause` (enum `opponent | self`, nullable). Null means not specified. Selecting a commander sets `opponent`. Selecting "Self-inflicted" sets `self`, with both killer fields null.
- Add an endpoint to set or clear the killer of a dead player: `PATCH /api/matches/:id/deaths/:participationId/killer`, with `{ death_cause | null, killer_participation_id | null, killer_commander_id | null }`. The server applies it to that player's latest non-undone `player_died` event (decision 4: the client often does not have the event id).
  - Validate that the killer is a participation in the same match and isn't the dead player.
  - 404 if that player has no non-undone `player_died` event.
  - It can be edited while the match is in progress, and in the existing 15-minute post-close edit window.
- A killer selection is **never its own Undo step**: it updates the `player_died` row rather than writing a new event. Undoing the Dead event itself revives the player and clears the killer with it. To fix only the killer, tap another option or tap the selected one again to clear it.
- Offline and sync: the killer follows the same queue and sync path as other tracker writes.

### 1b. Table round on turn events

- When writing `turn_passed`, also store `round` (int, nullable).
  - The first-turn marker is round 1 (fixes #1).
  - The round goes up when rotation wraps past the first living seat in clockwise order. Dead players are skipped (fixes #2).
- Never infer a round for matches without turn events. `round` stays null (fixes #3).

### 1c. Placement

**Decision 3: no columns.** Placement (1 = winner; tied players share a placement) and its source (`derived | winner_only`) are computed at read time by `derivePlacements` (section 2) from data that already exists.

### 1d. Optional post-close prompt (deferred)

Deferred: it is the only feature that needs placement to be stored. Kept here for later.

On the results screen, if 2 or more losers share a tied placement, show an optional row: **"Who went out first?"**, with the tied players as chips. A tap orders them, and **Skip** dismisses the row. This writes an ordering that feeds placement derivation as `explicit`. It is never required.

---

## 2. Placement derivation

`derivePlacements(match)` is a pure function in `services/stats2/placements.ts`, called at read time by the stats that need it (decision 3). It works on every existing match without a backfill.

It also reports `unresolvedLosers`: how many losers have no evidence of death. With 0 or 1 the order of elimination is fully known; with 2 or more, those losers are only assumed to have outlived the ones who tapped Dead. Stats may require `unresolvedLosers <= 1` when the assumption matters.

**Draw:** everyone gets placement 1, source `derived`.

**Win:**
1. The winner gets placement 1.
2. Build the death order of the losers:
   - **Dead tap:** the time of death is the `created_at` of the non-undone `player_died` event.
   - **No tap but clearly dead at close:** final `life_total <= 0`, or `poison_counters >= 10`, or 21+ damage from any single commander in the `commander_damage` snapshot. The time of death is the timestamp of the last non-undone life, poison or commander-damage event for that player.
     - If there are no events, the player is dead with an unknown time. Treat them as the earliest deaths, tied with each other.
   - **Explicit ordering** from the post-close prompt (1d) overrides the timestamps. (Deferred with 1d.)
3. Players with no evidence of death all tie for 2nd.
4. Players who died get ranked below them in reverse death order. The last to die gets the best placement among the dead, and the first to die gets the worst.
5. Source:
   - `explicit` if the prompt was used.
   - `derived` if any death evidence was used.
   - Otherwise `winner_only` (winner = 1, all others tied at 2).

Example with 4 players. A wins, B and C have no evidence, D tapped Dead. Placements: A=1, B=2, C=2, D=4.

**Never throws.** Missing snapshots or events just mean less evidence.

---

## 3. Duel engine

New module: `services/duels.ts`.

```ts
type Duel = {
  match_id: string;
  a_participation_id: string; b_participation_id: string;
  a_player_id; b_player_id; a_deck_id; b_deck_id;
  a_commander_ids: string[]; b_commander_ids: string[];
  a_colors: Color[]; b_colors: Color[];   // deck identity, WUBRG + 'C'
  outcome: 'a' | 'b' | 'tie';
  pod_size: number;
  group_id: string | null;
  played_at: Date;
};
```

**Decision 2: two modes.** `buildDuels(match, mode)` takes `'winner_only'` (the default, used by every consumer below) or `'placement'` (available, not used by any stat yet).

- `winner_only`: the winner beats each loser; pairs of losers emit no duel. In a draw every pair is a `tie`.
- `placement`: the rules below.

**Rules for each completed match, for each unordered pair of participations (`placement` mode):**
- `placement_a < placement_b` means a wins. `>` means b wins.
- **Equal placements:** if the match is a draw, the outcome is `tie`. Otherwise, **skip the pair** and emit no duel: two losers with no ordering tell you nothing.
- Never pair a participation with itself. If two participations use the same deck id, skip that pair for deck stats but keep it for player stats.

**Properties**
- In `winner_only` mode a 4-player match gives 3 duels (the winner beats each loser), which matches today's "decisive matches" logic.
- In `placement` mode with full placement data, it gives 6 duels.
- The baseline is always 50%, whatever the pod size.

**Implementation**
- Compute in TypeScript from participations for the scope in question.
- If performance needs it later, materialise a `match_duels` table and rebuild a match's rows on close or edit.

**Consumers** (these replace the current logic):
- **Deck best/worst matchups:** duel win % vs each opposing deck. Replaces the "decisive matches" logic (stats.ts:836-900).
- **Head-to-head** (`getMatchupStats`): A vs B record = duels between A and B. Wins, losses and ties now always add up to the total. Show "shared matches" separately, with this note: "N matches where neither finished ahead of the other". Fixes #12.
  - Handle every participation per side, not `parts.find` (fixes #13).
  - A partner deck containing both A and B isn't an A-vs-B duel.
  - The 1v1 toggle still filters `pod_size = 2`.

---

## 4. Colour stats

These replace the Strong/Weak section and the Colour record on the deck page (stats.ts:925-989), and `by_color` in the AI report.

For a deck and each colour X in `W U B R G C`:
- Duels = the deck's duels against opponents whose identity includes X. A 3-colour opponent counts toward all 3 colours.
- `raw_pct = wins / (wins + losses)`. Ties are excluded from the percentage but shown in the count.
- `adj_pct = (wins + 2.5) / (wins + losses + 5)`. This pulls small samples toward 50%.
- Sample label (same thresholds as reportShared.ts), **counted in matches, not duels** (decision 1): 10+ matches is solid, 5-9 early, 1-4 few, 0 none. Each row carries both `duels` and `matches`.

**UI**
- One row per colour faced, showing the mana symbol, `W-L`, `adj_pct`, and the sample label.
- Grey out "few".
- **Strong / weak** chips are the colours with the largest positive or negative gap of `adj_pct` from 50%. Only colours at "early" or better qualify. Show the numbers, not just symbols.
- Add a **By colour count** block (mono, 2, 3, 4, 5, colourless opponents), using the same duel maths.
- Delete the old Colour record, so a single source drives the page (fixes #15).

---

## 5. Ratings (OpenSkill)

**Decision 5: parked.** Until a printout justifies ratings, rankings use this interim rule, implemented in `services/stats2/rankings.ts`:

- Sort by win %, among entities with at least 3 matches for players and 5 for decks and commanders (today's deck and commander floor). Entities below the floor are listed underneath as "Unranked (N matches)". This fixes #7: a 1-for-1 player is no longer #1, and the ranking's #1 agrees with the Top winner highlight.
- Tie-break order: win %, then matches, then most recent match, then name (fixes #18).
- Secondary column "Wins vs expected": `wins - Σ(1/pod_size)`.
- Soft-deleted entities are left out (#17).

If ratings are built later, the rest of this section applies, except: **no global-scope ratings and no commander ratings.**

- Library: `openskill` (npm), Plackett-Luce model. The ranks input is the `placement` array. Ties are supported natively, so winner-only matches work.
- **Separate ratings:**
  - Player rating.
  - Deck rating.
  - Commander rating is optional: rate it as a team of the partners, or skip it in v1.
- **Process** matches in `ended_at` order, per scope:
  - Personal scope.
  - Each pod.
  - Global (for the detail pages).
  - Ratings are recomputed from scratch for the scope. That's cheap at playgroup scale. Cache by scope and the latest `ended_at` if needed.
  - Draws: everyone tied.
- **Display score:** `ordinal = mu - 3*sigma`, scaled to a friendly number, e.g. `round(ordinal * 40 + 1000)`. Show μ and σ only in a detail tooltip.
- **Player Ranking, Top Decks and Top Commanders** are sorted by display score:
  - Remove the ad-hoc minimums of 3, 5 and none. Fixes #7.
  - Keep a soft floor: entities with fewer than 3 matches are listed under the ranking as "Unranked (N matches)", not mixed in.
  - Tie-break order: score, then matches, then most recent match, then name (fixes #18).
- **Secondary column, "Wins vs expected":** `wins - Σ(1/pod_size)` over the matches played, shown as e.g. "+2.3". Keep raw win % as a third, smaller column.

---

## 6. New stats

All of these are optional-data aware (see section 7).

**From placement**
- Average placement.
- Top-2 rate.
- First-out rate: the share of matches where the player or deck had the worst placement, counting only matches with `placement_source != winner_only`.

**From killer**
- Kills per player, deck and commander. Credit goes to `killer_commander_id` if set, otherwise all of the killer deck's commanders.
- **Nemesis:** the player or deck that killed you most (minimum 2).
- **Victim:** the player or deck you killed most (minimum 2).
- Pod highlight "Executioner": most kills in scope.
- Self-inflicted deaths are **never** kills, and never count toward nemesis or victim. Show a separate "Self-inflicted deaths" count per player and deck. Optional pod highlight: "Own worst enemy" (most self-inflicted deaths, minimum 2).

**From rounds**
- Win round: the table round of the last `turn_passed` in won matches with turn data. This replaces "Avg win turn" (the winner's own turn count) and fixes #21.
- Seat advantage: duel win % by seat (seat comes from the first-round turn order), against the 50% baseline.

**From the existing life and damage data**
- Keep the current highlights, but only from matches with turn data where they're turn-based (see section 7).

---

## 7. Coverage rules (all stats)

Every stat declares which inputs it needs:

| Input | Available when |
|---|---|
| `winner` | always (completed match) |
| `placement_full` | `placement_source in (explicit, derived)` |
| `killer` | any `player_died` with `killer_participation_id` |
| `turns` | match has ≥1 non-undone `turn_passed` with non-null `round` |
| `life_events` | match has ≥1 non-undone life or commander-damage event |

**Rules**
- A stat only reads matches that have its inputs. It never infers missing inputs, and never treats missing data as zero.
- Each stat returns `{ value, coverage: { used, total } }`.
- The UI shows "based on X of Y matches" whenever `used < total`.
- If `used < 5`, show "Not enough tracked games" instead of a value. Use 3 for kill-based stats.
- No stat may throw or return NaN on partial data. Add unit tests for these four cases:
  - winner only
  - deaths but no turns
  - turns but no deaths
  - everything recorded

---

## 8. Cleanup (from reference section K)

- **#9–11:** one `matchDuration(match)` used everywhere: History card, detail, career bands, highlights.
  - Rule: `created_at` to the effective end, using the 2-hour trailing-gap truncation.
  - Keep the 3-minute and 8-hour plausibility filter only for "fastest win" and "longest game".
- **#8:** detail pages (player, deck, commander) accept and inherit the Stats tab scope (`?group_id=`), and show the scope in the header.
- **#14:** the matchup screen opens in the tab's current scope, and the personal-scope match search uses `personalMatchScope`.
- **#4:** "Total life lost" includes commander damage.
- **#5:** add "Most healed" as a highlight only if positive `life_change` events are at least 2 within one burst window. Otherwise drop the highlight. Implementer's call: simplest is to drop it.
- **#17:** filter soft-deleted entities from all ranking lists. If kept for history, render them as non-tappable.
- **#19:** one rounding rule. Whole percent everywhere; 1 decimal only in detail tooltips.
- **#23, #26:** remove `current_streak` (or show it), `top_player_deck` and `useHome.winRatePct`. Either wire up `debounce_threshold_ms` or delete the setting.
- **#16:** update the stale threshold comments.
- **#27:** biggest hit uses the event's `commander_id_source` together with the participation that actually holds it. If ambiguous, show the commander only.

---

## 9. Match result change requests

Lets players fix a wrong winner or win condition after the 15-minute edit window, with every player in the match approving.

### Who can do what
- **Can request:** the match creator, or any participant whose player is linked to an account.
- **Approvers:** every participant whose player is linked to an account, except the requester.
  - Guest and unlinked players are represented by the match creator, who approves on their behalf. This applies only if the creator isn't the requester.
  - If that leaves zero approvers, the change applies immediately. That's the same power the requester already has in the 15-minute window.
- **Limits:**
  - One open request per match at a time.
  - Only `completed` matches.
  - Not available while the 15-minute direct-edit window is still open; use direct edit then.

### What can be changed
- Winner: another participant, or Draw.
- Win condition, with the same options as close. Draw forces `other`, the current rule.
- An optional note explaining why, max 280 characters.
- Nothing else (killers, deaths, life) in v1.

### Flow
1. Match history, then match detail, then **"Request change"**. A sheet opens, pre-filled with the current result. The user picks the new winner and win condition, adds a note, and submits.
2. **No notifications of any kind** (decided by Gabo, 2026-11-27): no push, no in-app inbox. The only signal is a "Change pending" highlight on the match card (History and Home's recent matches), visible to everyone who can see the match. Players are expected to have agreed at the table already, and to ask each other to open the match and approve.
3. An approver opens the match detail and sees current vs proposed, side by side, with the note. They tap **Approve** or **Reject**.
4. **Resolution:**
   - All approve: apply the change.
   - Any reject: the request is rejected.
   - No full approval in 7 days: it expires.
   - The requester can cancel while it's pending.
   - Nobody is notified of the outcome. The highlight goes away, and the match detail shows the result (see "Applying the change" for the approved case).
5. **Applying the change:**
   - Use the same code path as the 15-minute edit (matches.ts:359-459): update `participations.result` and `match_results`.
   - Rerun `derivePlacements`.
   - Invalidate rating and stat caches for every affected scope.
   - Write an audit row.
   - The match detail shows "Result changed on {date}, approved by all players".

### Storage
- `match_change_requests`:
  - `id`, `match_id`, `requested_by_user_id`
  - `proposed_winner_participation_id` (nullable), `proposed_is_draw`, `proposed_win_condition`, `note`
  - `previous_result` (JSON snapshot of the winner, is_draw and win_condition)
  - `status` (`pending | approved | rejected | cancelled | expired`)
  - `created_at`, `resolved_at`
- `match_change_votes`: `request_id`, `user_id`, `vote` (`approve | reject`), `voted_at`. Unique on (request_id, user_id).
- Approvers are snapshotted when the request is created, so later account linking doesn't change who has to vote.

### Edge cases
- If the match is deleted or abandoned while a request is pending, the request is cancelled.
- If a participant's account is deleted, they're dropped from the approver list. If they were the last approver needed, the request resolves on the remaining votes.
- Ratings are recomputed from scratch per scope, so a changed old match naturally shifts the ratings afterwards. That's expected.

## Acceptance checks

- [ ] A match closed with only a winner (no Dead, no turns, no taps) appears in every winner-based stat, and in nothing that needs other inputs.
- [ ] Nothing crashes or shows NaN, `null%` or a placeholder number.
- [ ] Tapping Dead shows "Killed by" in the grey frame. Ignoring it changes nothing else.
- [ ] Selecting a killer (including Self-inflicted), changing it and clearing it all persist, and survive app restart and sync.
- [ ] A killer selection is never its own Undo step. Undoing the Dead event revives the player and clears the killer.
- [ ] Self-inflicted deaths never count as kills.
- [ ] A change request applies only after every approver approves. One reject rejects it, and it expires after 7 days. Applying it reruns placements and updates all stats.
- [ ] On every head-to-head, W + L + T = duels.
- [ ] The deck page has a single colour section, with numbers and sample labels.
- [ ] A 1-match, 1-win player isn't #1 in the rankings.
- [ ] The comparison script prints current vs new numbers for the real matches without writing to the database.
- [ ] Unit tests cover the four coverage scenarios in section 7.

## Open questions (ask Gabo before deciding)

- ~~Should commander ratings be a v1 feature or deferred?~~ Decided: no commander ratings (decision 5).
- Table round (1b): store it on new `turn_passed` events as written, or derive it at read time from the existing event stream? Deriving would cover old matches too, but needs a rule for matches recorded before the first-turn marker existed.
