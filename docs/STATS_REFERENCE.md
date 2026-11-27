# Stats reference: every statistic and how it is computed

_Written 2026-11-27 from a full read of the stats code. Nothing was run against a database: "verified" below means verified by reading the code. Line numbers are as of commit `39515cd` and will drift._

`stats.ts` means `services/stats.ts`.

**Read in full:** `services/stats.ts`, `services/reports.ts`, `services/reportShared.ts`, `services/matchDuration.ts`, `services/matchEvents.ts`, `db/schema.ts`, `hooks/useMatchDetail.ts`, `hooks/useEventLog.ts`, `hooks/useTracker.ts`, `hooks/useHome.ts`, `app/(tabs)/stats.tsx`.

**Read in part:** `services/matches.ts` (lines 180-700 and the start of `listMatches`), `app/match/[id]/tracker.tsx` (lines 44-705), `hooks/useMatchResults.ts` (lines 1-150), `services/decklists.ts` (`getDeckVersionHistory` only).

**Skimmed only:** the screens and components (`app/players/[id].tsx`, `app/decks/[id].tsx`, `app/commanders/[id].tsx`, `app/stats/*`, `app/report.tsx`, `components/stats/*`, `components/home/*`, `components/match/*`), enough to see which field is shown where and how it is rounded.

**Not read:** `services/labs/statsReport.ts` and `statsReportPrompt.ts` (the Claude prompt side), `services/savedReports.ts`, `services/pods.ts`, `services/clockwiseOrder.ts`, `components/match/CasualMatch.tsx`, the narration and roast features.

---

## 0. Rules that apply to almost everything

- **Completed matches only.** Every stat query filters `matches.status = 'completed'`. Abandoned and in-progress matches never count, in numerator or denominator.
- **Win rate** (`calcWinRate`, stats.ts:140-143) = wins ÷ total × 100, rounded to 1 decimal. It returns `null` (shown as "—") when total is 0.
- **Draws count as a match played but not as a win**, so a draw lowers win rate exactly like a loss. Only the Player page shows draws separately.
- **How results are set** (`closeMatch`, services/matches.ts:259-353):
  - Win: one participation gets `win`, all others `lose`, and a `match_results` row stores the win condition.
  - Draw: everyone gets `draw`; `match_results` has `is_draw=true`, no winner, and win condition hard-coded to `other`.
  - Abandon: status `abandoned`, results stay null, no `match_results` row.
  - The result can be edited for 15 minutes after close (matches.ts:359-459).
- **Undone events** (`is_undone = true`) are excluded from every event-based stat.
- **Partner commanders:** a deck with two commanders counts one match (and one win) for each commander independently. A deck's colour identity is the union of both commanders' colours, in WUBRG order (`colorIdentityForDeck`, stats.ts:1068-1078). Colourless is shown as `C`.
- **Scopes:**
  - *Personal* = `personalMatchScope` (stats.ts:23-35): matches the user created, or matches their account player (not deleted) played in. This matches History's personal scope (matches.ts:789-823).
  - *Pod* = `matches.group_id = <pod>`; the API route checks membership.
  - *Unscoped* = Player, Deck and Commander pages and the Home "My stats" card. These use all completed matches for that entity, in any pod, hosted by anyone.
  - *World-wide* = Home "Global stats" card: every completed match in the database, all users.
- **Guest tracker and Casual match** are in-memory and call no API, so they feed no statistic.

---

## A. Raw data recorded during a match

**`matches`** (schema.ts:273-293): status (`in_progress` / `completed` / `abandoned`), `created_by`, `group_id` (null = personal), `created_at`, `ended_at` (set on close or abandon), seat `layout`.

**`participations`**, one per player per match (schema.ts:300-324):
- `player_id`, `deck_id`, `deck_version_id` (the deck's list version when the match was created; null if unknown).
- `result` (`win` / `lose` / `draw` / null).
- Live snapshots: `life_total`, `poison_counters`, `commander_damage` (JSON, damage per source commander).
- No statistic reads the final life, poison or commander-damage snapshots.

**`match_results`**, one per completed match (schema.ts:361-376): `winner_participation_id` (null on a draw), `win_condition`, `is_draw`. Win conditions are `combat_damage`, `commander_damage`, `infect`, `combo`, `mill`, `scoop`, `concede`, `other`. The UI labels both `scoop` and `concede` as "Concede" (useMatchResults.ts:23-32).

**`match_events`** (schema.ts:331-355). Fields: `match_id`, `participation_id`, `event_type`, `delta`, `commander_id_source`, `is_undone`, `turn_duration_seconds`, `created_at`.

| Event | What it means | Notes |
|---|---|---|
| `life_change` | Life gained (+) or lost (−) by that player | One event per burst of taps, not per tap (see below) |
| `poison_change` | Poison counters added or removed | Not used by any statistic |
| `commander_damage` | Damage to that player from `commander_id_source` | Also reduces the life snapshot, but writes no `life_change` event (matchEvents.ts:118-129). Delta can be negative: the API only rejects 0 (match-events+api.ts:55-56) |
| `player_died` | Marker from the Dead button, delta 0 | Not used by any statistic; only drives the tracker's dead state and turn skipping |
| `turn_passed` | Marker written when a player's turn starts, owned by the incoming player | Carries `turn_duration_seconds` = how long the outgoing player's turn lasted |

Details that affect the stats:

- **Tap batching.** Life, poison and commander-damage taps are batched per player with a fixed 600 ms debounce (`COMMIT_DEBOUNCE_MS`, useTracker.ts:98, 438-446). One event is the net of a burst. A +5 then −5 inside the window produces no event. A big hit entered slowly becomes several events.
- **The user debounce setting appears unused.** `debounce_threshold_ms` (200-2000) has no consumer found in the tracker. Suspected dead setting.
- **Turns are only logged for legitimate clockwise rotations** (tracker.tsx:218-243). Out-of-order taps move the timer but log nothing. Dead players are skipped.
- **The first turn of a match also writes a `turn_passed`**, with no duration (tracker.tsx:230-233, 529-546).
- **Turn duration** is the outgoing player's active clock, with pauses excluded. It is null for the first turn and for the first rotation after resuming a match on a device (tracker.tsx:196-210). The API accepts 0-86,400 seconds.
- **The last turn of every match is never timed**, because no later `turn_passed` exists to carry its duration.
- **Undo** soft-undoes the most recent non-undone event of the whole match, whatever its type (matchEvents.ts:145-199).

---

## B. Home

### B1. "My stats" card
`getAccountHomeStats` (stats.ts:1863-2019), endpoint `/api/stats/account-home`, shown by `components/home/AccountStatsCard.tsx`.

Scope: the user's account player, across all completed matches that player was in. It is not affected by the Home context switcher. If the user has no account player, everything is 0 or null and the card shows a "no player" message.

| Stat | Calculation | Ref |
|---|---|---|
| Total matches | Count of the account player's participations in completed matches | 1895-1902 |
| Wins | Those with result `win` | 1898 |
| Win rate ring | wins ÷ total, 1 decimal from the server, then rounded to a whole percent by the ring | 2013; WinRateRing.tsx:70 |
| Most played deck | Deck with the most completed matches by this player. Ties are arbitrary. Deleted and archived decks are included. Shows "—" if none | 1904-1914, 1931-1951 |
| Most common win condition | Among matches this player won, the condition with the highest count. Draws are excluded. Ties go to whichever the database returned first. Null if no wins | 1963-1969, 1989-2000 |
| Avg win turn | For each won match, count the non-undone `turn_passed` events owned by the winner (the number of turns the winner started). Average across won matches, 1 decimal. Won matches with no turn events for the winner are left out of the average. Null if none | 1971-1986, 2002-2005 |

### B2. "Global stats" card
`getGlobalAggregates` (stats.ts:2051-2303), endpoint `/api/stats/global-aggregate`, shown by `components/home/GlobalStatsCard.tsx`.

Scope: every completed match in the whole database, identical for all users. Only commander objects and colours are returned.

| Stat | Calculation | Ref |
|---|---|---|
| total_matches | All completed matches. Only used for the card's empty state | 2063-2066 |
| Top win condition | Most frequent `win_condition` among completed non-draw matches; shown with its win count. Ties: first seen | 2069-2073, 2121-2130 |
| Top commander | Commander with the most participations in completed matches. Each partner is counted. Value = plays | 2147-2152, 2181-2186 |
| Top damage commander | Commander with the highest sum of non-undone `commander_damage` deltas in completed matches. Negative corrections net out. Must be above 0 | 2089-2102, 2189-2198 |
| Fastest commander | For each winning participation: turns = the winner's non-undone `turn_passed` count in that match. Wins with 0 recorded turns are skipped. Averaged per commander (each partner credited). Requires at least 2 such wins. Lowest average wins; shown to 1 decimal | 2201-2248, 2289 |
| Top colour identity | Each distinct deck that appears in a completed match counts once, bucketed by exact colour combination (BG and BGR are separate buckets). Most common bucket wins; value = number of decks | 2160-2179, 2266-2271 |

### B3. Other Home numbers
- "See all (N)" and the recent matches list come from `/api/matches?limit=3`. The total is History's count, which includes abandoned matches and excludes in-progress ones (matches.ts:831-838).
- `useHome` also computes an aggregate `winRatePct` (hooks/useHome.ts:74-83), but the Home screen never reads it. It is dead code.

---

## C. Stats tab
`app/(tabs)/stats.tsx`. The scope picker offers "All my matches" (personal) or one pod. The tab auto-selects the pod when the user belongs to exactly one (stats.tsx:73-80). The whole tab shows an empty state when `total_matches` is 0.

### C1. Rankings
`getGlobalStats` (stats.ts:1560-1840), endpoint `/api/stats/global?group_id=&limit=all`.

| Stat | Calculation | Ref |
|---|---|---|
| total_matches | Completed matches in scope | 1575-1578 |
| total_players | Distinct players with at least one participation in scope, including soft-deleted players | 1832 |
| Player Ranking | Per player in scope: matches, wins, win rate. Sorted by win rate descending only. No minimum number of matches. Ties share a rank in 1, 1, 3 style. Everyone who appears in an in-scope match is ranked, guests and other people's players included. The tab shows the first 6; `/stats/players` shows all | 1581-1590, 1633-1648; stats.tsx:236 |
| "often [Commander]" subline | For players ranked 1-3: their most-played deck in scope (ties arbitrary), first commander's name | 1683-1698, 1813-1822; stats.tsx:95-102 |
| Top Decks | Per deck in scope: matches, wins, win rate, counted across every player who used it. Requires at least 5 matches (`TOP_LIST_MIN_MATCHES`). Sorted by win rate descending only. Top 5 on the tab (3 on the podium plus ranks 4-5); `/stats/decks` shows all qualifying decks. Deleted and archived decks are included | 1558, 1593-1602, 1652-1660 |
| Top Commanders | Per commander: every participation whose deck has it in either slot. Requires at least 5. Sorted by win rate descending. Top 5 on the tab; `/stats/commanders` shows all | 1664-1679 |
| current_streak (per top deck) | Consecutive wins counting back from the deck's most recent in-scope match; a loss or draw stops it. Computed but not shown anywhere | 1736-1767 |
| top_player_deck (singular) | The rank-1 player's most-used deck. Returned but not used in the UI | 1824-1827 |

### C2. Highlights carousel
See section H.

---

## D. Player page
`getPlayerStats` (stats.ts:384-663), endpoint `/api/stats/players/:id`, screens `app/players/[id].tsx` and `app/players/[id]/decks.tsx`.

Scope: unscoped. Visibility is checked by `userCanViewPlayer` (stats.ts:74-115).

| Stat | Calculation | Ref |
|---|---|---|
| Total / Wins / Losses / Draws | Counts of this player's participations by result | 401-412 |
| Win rate ring | wins ÷ total; the ring rounds to a whole percent. Shows "no matches yet" when total is 0 | 652; CircularWinRate.tsx:66 |
| Avg turn time | Walk the non-undone `turn_passed` events of each completed match the player was in, in time order. A duration on an event belongs to the player who owned the previous `turn_passed`. Sum the durations attributed to this player ÷ their count, rounded to whole seconds. Null if none | 449-469, 492-517 |
| Longest turn | Maximum of those durations | 508-518 |
| timed_turn_count | How many timed turns went into the above. The tempo row is hidden when it is 0 | 655; players/[id].tsx:197 |
| How it wins (`wins_by_condition`) | Wins grouped by win condition; non-draw only; zero rows omitted; sorted by wins, then name. The UI shows each as a count and a percent of total wins, rounded to a whole percent | 159-173, 471; WinConditionBreakdown.tsx:30-38 |
| Career breakdown | See below | 214-328 |
| Decks used (`favorite_decks`) | Every deck this player has played: matches and this player's win rate with it, most played first. The UI shows the top 5 with a "see all" toggle. Deleted decks are included | 415-429, 521-554 |
| Top commanders (`favorite_commanders`) | Per commander (partners each counted): matches and win rate for this player. Top 5 by matches; ties arbitrary | 606-643 |
| Owned decks (`owned_decks`) | Only for account players. Every non-deleted, non-archived deck the account created, played or not. The record shown is the deck's overall record across everyone who used it, not just this player. Sorted by commander name | 558-603 |

**Career breakdown** (`getCareerBreakdown`, stats.ts:214-328; shown by `components/stats/CareerBreakdown.tsx`). It is given the player's (or deck's) completed participations. Each bucket shows matches, wins, win rate and "X of N won". Draws count as matches, not wins.

- **By pod size:** bucketed by the number of participations in the match (stats.ts:239-243, 289-290).
- **By turn order:** seat position = the order in which players first appear in the match's non-undone `turn_passed` events (first seen = went first). Matches with no turn events for that player are left out (stats.ts:257-270, 292-293).
- **By game length:** length = `ended_at − created_at`, with no trailing-gap correction. Only lengths from 3 minutes to 8 hours are counted. Bands: under 30, 30-60, 60-90, over 90 minutes (stats.ts:199-208, 295-299).
- **Fastest win:** shortest plausible length among wins. **Longest game:** longest plausible length among all results. Both null if none (stats.ts:300-301).

---

## E. Deck page
`getDeckStats` (stats.ts:739-1060), endpoint `/api/stats/decks/:id`, screen `app/decks/[id].tsx`.

Scope: unscoped. All completed matches where this deck was played, by anyone. A deleted deck returns not-found.

| Stat | Calculation | Ref |
|---|---|---|
| Matches / Wins / Win rate | Participations with this deck; wins; ring rounded to a whole percent. No losses or draws field | 763-770, 1047-1049 |
| Played by (`players_used_by`) | Per player: matches and win rate with this deck; most matches first | 773-783, 815-834 |
| How it wins | Same as the Player page, filtered to this deck | 792 |
| Career breakdown | Same as the Player page, filtered to this deck's participations | 793 |
| Best / worst matchups | See below | 836-900, 991-1041 |
| Strong / weak against colours | See below | 925-938, 971-989 |
| Colour record | See below | 939-969 |
| List version records | Per decklist version: completed matches and wins grouped by `participations.deck_version_id`. Matches with a null version go in an "unknown version" bucket | services/decklists.ts:446-455, 505-517; DeckVersionHistory.tsx |

**Best / worst matchups.** For each opposing deck, only "decisive" matches count: matches where the winner was this deck or that opponent. Matches won by a third deck, and draws, are ignored for that pair.
- matches = decisive matches against that opponent; wins = those this deck won.
- An opponent needs at least 3 decisive matches (`MATCHUP_MIN_MATCHES`, stats.ts:732).
- Best = win rate strictly above 50%. Worst = strictly below 50%. Exactly 50% appears in neither.
- Top 3 each. Sort order: win rate, then more matches, then most recent, then name.
- The UI shows "wins-losses · Np" and the percentage.

**Strong / weak against colours.** Built from the same decisive pair totals, including opponents below the 3-match minimum. Each opposing deck's wins and losses are added to every colour in its identity. Score = wins − losses.
- Strong = the colour or colours tied for the highest positive score.
- Weak = the colour or colours tied for the lowest negative score.
- The UI shows only mana symbols, no numbers.

**Colour record** (`components/stats/ColorRecord.tsx`). Counted once per match:
- "Won against X" = matches this deck won where at least one opponent had colour X.
- "Lost to X" = matches this deck lost where the winning deck had colour X.
- Draws are skipped. Shown in WUBRG order then C; colours never faced are omitted.

---

## F. Commander page
`getCommanderStats` (stats.ts:1108-1232), endpoint `/api/stats/commanders/:id`, screen `app/commanders/[id].tsx`.

Scope: unscoped. Every completed participation whose deck has this commander in either slot.

| Stat | Calculation | Ref |
|---|---|---|
| Matches / Wins / Win rate | Count; wins; ring rounded to a whole percent | 1133-1141, 1224-1226 |
| How it wins | Wins by condition for decks with this commander in either slot | 1170-1172 |
| Decks using it | Per deck: match count only; most first; includes soft-deleted decks | 1144-1154, 1181-1199 |
| Players using it | Per player: match count only | 1157-1167, 1202-1219 |

---

## G. Matchup (head-to-head)
`getMatchupOptions` (stats.ts:1254-1313) and `getMatchupStats` (stats.ts:1329-1491); screen `app/stats/matchup.tsx`; card `components/stats/MatchupCard.tsx`.

**What you can pick.** Personal scope: only players, decks and commanders the user created (not deleted; decks not archived). Pod scope: those created by any pod member. Commanders offered are the ones referenced by the visible decks.

**Which matches count.**
- Personal scope: all completed matches anywhere that contain entity A. This is not limited by `personalMatchScope`.
- Pod scope: completed matches with that pod's `group_id`.
- Only matches where B also took part are kept.
- The "1v1" toggle keeps only matches with exactly 2 participations (stats.ts:1475).

**Numbers.**
- `total_matches` ("shared matches") = matches containing both A and B.
- `entity_a_wins` = matches where A's participation won. Otherwise `entity_b_wins` if B's won. Otherwise `draws` if A's result is a draw.
- If a third player won, the match is in the total but in none of the three buckets, so A wins + B wins + draws can be less than shared matches (stats.ts:1477-1480).
- No data: all zeros; the card shows an empty state.

---

## H. Highlights carousel
`getPodHighlights` (stats.ts:2393-2930), endpoint `/api/stats/pod-highlights?group_id=`, shown by `components/stats/PodHighlightsCarousel.tsx`.

Scope: the selected pod, or personal scope when no pod is selected. A slide is hidden when its value is null or 0.

| Slide | Calculation | Ref |
|---|---|---|
| Total matches (+ players) | Completed matches in scope; distinct players with a participation | 2415-2418, 2891 |
| Most active player | Most participations. Ties: first row returned | 2604-2611 |
| Top winner | Highest wins ÷ matches among players with at least 3 matches (`TOP_WINNER_MIN_MATCHES`). Shown as a percent with 1 decimal plus wins and total. Ties: first | 2379, 2612-2617, 2898 |
| Total play time | Sum over matches of (effective end − `created_at`). Effective end = `ended_at`, unless the gap from the last non-undone event to `ended_at` is over 2 hours, in which case the last event's time is used | 2437-2458 |
| Most infect wins / Most combo wins | Player with the most wins whose win condition is `infect` / `combo` | 2463-2473, 2621-2635 |
| Biggest hit | The single non-undone `commander_damage` event with the largest delta (one tap burst). Receiver = that event's player. Dealer = the first participation in that match whose deck contains the source commander | 2480-2496, 2641-2669 |
| Most healed | Per player, the sum of positive `life_change` deltas; highest wins | 2513-2527, 2694-2703 |
| Total life lost | Absolute sum of all negative `life_change` deltas in scope. Commander damage is not included | 2517, 2699, 2910 |
| Largest life swing in a turn | Within each match, a counter starts at 1 and goes up on every `turn_passed`. For each player and counter value, life changes are accumulated (`life_change` delta, minus `commander_damage` delta). The largest absolute running total seen anywhere wins; the sign is kept. The turn shown = ceil(counter ÷ number of players in the match) | 2730-2790, 2598-2601, 2911-2921 |
| Longest match | Longest effective duration, same rule as total play time | 2532-2560 |
| Avg violent turn | Per match: the first event that is a `life_change` of −8 or worse, or a `commander_damage` of 5 or more. Its counter value is converted to a round as above, then averaged across matches that had one and rounded to a whole number. Shown as "T{n}". Null if none | 2775-2789, 2796-2804 |
| Avg turn time | Sum of all `turn_duration_seconds` on non-undone `turn_passed` events in scope ÷ their count, whole seconds | 2756-2759, 2809-2811 |
| Current loss streak | Walk participations in match-creation order; a loss adds 1, a win or draw resets to 0. The player with the highest current run is shown, only if it is 2 or more | 2499-2508, 2675-2689 |

---

## I. Match detail, results screen and live tracker

**Match detail** (`app/match/[id]/index.tsx`) and **results** (`results.tsx`):
- **Outcome:** `abandoned` if the status says so; otherwise `draw` if `is_draw`; otherwise `win` (useMatchDetail.ts:125-136).
- **Duration:** `created_at` to effective end, using the same 2-hour trailing-gap rule. Displayed as "< 1 min", "~N min" or "~Hh Mm"; "–" if there is no `ended_at` (useMatchDetail.ts:141-147; matchDuration.ts:28-51; useMatchResults.ts:47-60).
- **Turns per player ("↻ N"):** count of that player's non-undone `turn_passed` events (useMatchDetail.ts:160-165). Shown on the detail screen; the results screen does not pass it.
- **Turn time per player ("⏱ avg · max"):** same previous-owner pairing as the Player page. avg = total seconds ÷ timed turns, rounded; max = longest (useMatchDetail.ts:171-185; ParticipantResultRow.tsx:121-123).
- **Event log:** all events newest first; undone ones are flagged.

**History list card** (`components/match/MatchCard.tsx:110`): duration is raw `ended_at − created_at`, with no trailing-gap correction.

**Live tracker** (`app/match/[id]/tracker.tsx`):
- Match clock = now − `matches.created_at`. It is wall time and includes pauses (lines 56-79).
- Per-player elapsed time and turn counts are rebuilt from events on resume (lines 617-654) and from the server sync snapshot (services/matches.ts:583-593).

---

## J. Labs AI stats report
`services/reports.ts`, `services/reportShared.ts`, rendered by `app/report.tsx`.

The server builds a data package and the phone sends it to Claude. Claude writes text only; the numbers are the ones below. A deck report is available only to the deck's creator. A player report is available only for the user's own account player (reports.ts:179, 253).

- **Sample label** on every record: 10+ matches = solid, 5-9 = early, 1-4 = few, 0 = none (reportShared.ts:18-25).
- **overall:** matches and wins from the Deck or Player page totals (unscoped).
- **by_seat, by_pod_size, by_game_length:** the career breakdown, exactly as in section D (reports.ts:52-64).
- **by_color** (deck report only): from the colour record; matches = wins + losses per colour (reports.ts:215-222).
- **by_version** (deck report only): the per-version records plus the unknown-version bucket; versions with 0 matches are dropped (reports.ts:194-208).
- **matchups** (deck report only): only the opponents already in best and worst matchups, so at most 6, each with 3+ decisive matches and not at exactly 50% (reports.ts:187-189, 225-227).
- **by_deck** (player report only): each deck played, with wins re-derived as round(matches × win rate ÷ 100) (reports.ts:271-279).
- **wins_by_condition:** passed through.
- **Deck shape** (reports.ts:78-108):
  - total cards = sum of quantities.
  - lands = cards whose type line (before the dash) contains "Land".
  - Card type = the first match in this order: Creature, Land, Planeswalker, Battle, Instant, Sorcery, Artifact, Enchantment, else Other.
  - Average mana value = across non-land cards with a known value, 2 decimals (the UI shows 1).
  - Curve = non-land counts in buckets 0 to 6 and 7+.
- **Player report decklists:** up to 4 of the player's own most-played decks that have a list (reports.ts:35, 257-260).
- **Checkup card counts** are counted in the app from card names Claude returns; lands come from the shape (app/report.tsx:86-91).

---

## K. Oddities, inconsistencies and likely bugs

### Verified by reading the code

1. **Turn numbers in the highlights are off by one.** The counter starts at 1 and goes up on every `turn_passed` (stats.ts:2733, 2755), but the tracker also writes a `turn_passed` for the very first turn (tracker.tsx:230-233, 529-546). First-turn events land on counter 2. In a 4-player game the fourth player's first turn becomes "round 2". This affects Avg violent turn and the turn shown on Largest life swing.
2. **The round conversion ignores eliminated players.** It always divides by the starting player count (stats.ts:2598-2601) although dead players are skipped in the rotation. Late-game rounds are under-reported.
3. **Matches without turn tracking distort two highlights.** With no `turn_passed` events the counter never moves, so a player's whole game is treated as one turn. Largest life swing then becomes that player's peak cumulative life change for the match (often around −40), and the first violent event counts as round 1, pulling Avg violent turn down (stats.ts:2743-2790).
4. **Total life lost excludes commander damage, but Largest life swing includes it.** Commander damage is stored only as a `commander_damage` event (matchEvents.ts:118-129); the life-lost sum reads only `life_change` (stats.ts:2513-2527).
5. **Most healed counts corrections as healing.** Any positive `life_change` counts, including fixing a mis-entered hit with "+" after the 600 ms window instead of Undo.
6. **Biggest hit and the violence thresholds work on tap bursts, not real hits.** A hit entered slowly is split into several events (useTracker.ts:98).
7. **Player Ranking has no minimum number of matches** (stats.ts:1633-1639). Top decks and commanders need 5; the Top winner highlight needs 3. A 1-for-1 player ranks #1 at 100%, and the ranking's #1 can differ from the Top winner slide on the same screen.
8. **Detail pages ignore the Stats tab scope.** Tapping a deck, player or commander in a pod-scoped list opens a page computed over all completed matches everywhere (stats.ts:401-412, 763-770, 1125-1141). Matches and win rate can differ from the row just tapped.
9. **Four different "match length" rules:**
   - Career bands, fastest win, longest game, and the AI report: raw `ended_at − created_at`, kept only between 3 minutes and 8 hours (stats.ts:295-302).
   - Highlights total play time and longest match: 2-hour trailing-gap truncation, no 3-minute or 8-hour bounds (stats.ts:2437-2458, 2532-2560).
   - Match detail and results: trailing-gap truncation (useMatchDetail.ts:141-147).
   - History card: raw, no correction (MatchCard.tsx:110).

   A match left open overnight shows an inflated time in History, a corrected one in detail, and is dropped from career stats.
10. **A match with no events is handled two ways.** The SQL version treats a match closed more than 2 hours after creation as 0 seconds long (stats.ts:2442-2443); the JS helper trusts `ended_at` (matchDuration.ts:35).
11. **All match lengths start at match creation and include pauses.** Only per-turn times exclude pauses.
12. **Head-to-head wins do not add up to "shared matches"** when a third player won (stats.ts:1477-1480). The card does not explain the gap.
13. **Head-to-head looks at only the first matching participation per side** (`parts.find`, stats.ts:1470-1471). If two players in one match both run commander A, or the same deck, and the second one wins, A's win is missed. A partner deck containing both A and B counts as an A-vs-B match, credited to A if it wins.
14. **Personal-scope matchup is not the same lens as the personal-scope Stats tab.** Selectable entities are limited to ones the user created, yet the match search is not limited by `personalMatchScope` (stats.ts:1350-1353, 1391-1393). The matchup screen also always opens in personal scope, even when the tab had auto-selected a pod (stats.tsx:224 passes no scope; matchup.tsx:100).
15. **Strong / weak colours are biased toward "strong".** They sum per-opponent decisive results (stats.ts:925-938). One win in a 4-player pod adds a win against each of 3 opponents; one loss adds a single loss against the winner. The Colour record on the same page counts once per match, so the two sections can disagree. Strong/weak also has no minimum sample and shows no numbers.
16. **Stale comments on matchup thresholds.** The type comments say "min 2 matches" (stats.ts:709-712) and a query comment says "min-3 filter" (stats.ts:1592); the code uses 3 for matchups and 5 for top lists.
17. **Soft-deleted entities still appear in aggregates.** Rankings, top decks, most played deck, decks used and opponent matchups have no `deleted_at` filter (e.g. stats.ts:1712-1718). The Player and Deck pages return not-found for deleted entities (stats.ts:392, 747), so tapping such a row should fail. Not tested in the app.
18. **Ties are broken arbitrarily in several places:** player ranking order within equal win rate, top decks and commanders with equal win rate (no tie-break on matches), most active player, top winner, most played deck, most common win condition, world-wide top lists.
19. **Rounding differs by component.** Rings show whole percents (CircularWinRate.tsx:66, WinRateRing.tsx:70); list rows and badges show 1 decimal. The same 66.7% reads "67%" in one place and "66.7%" in another.
20. **Draws are stored with win condition `other`** (matches.ts:344). All win-condition stats exclude draws correctly, either by `is_draw = false` or by the winner join.
21. **Avg win turn and Fastest commander silently drop wins with no turn events.** They also measure the winner's own turn count, not the table round.
22. **The final turn of every match is never timed,** so the winning turn never enters avg or longest turn time. Turns in progress when a device resumed are also untimed (tracker.tsx:205-210).
23. **Computed but unused:** `current_streak` and `top_player_deck` from `getGlobalStats`, and `winRatePct` in `useHome`.
24. **Partner commanders are counted independently.** One consequence: summing commander matches across the Top Commanders list double-counts partner decks.
25. **Owned decks shows each deck's record across all pilots,** while Decks used on the same page shows only that player's record with the deck (stats.ts:575-584 vs 415-426).

### Suspected, not confirmed

26. **The user debounce setting (200-2000 ms) may have no effect on the tracker.** The tracker uses a fixed 600 ms; no consumer was found, but the counter components were not read in full.
27. **Biggest hit may name the wrong dealer** when two players in the match run the same commander (`limit(1)`, stats.ts:2645-2659).
28. **Deck page mirror matches.** If the same deck id is played by two players in one match, per-match maps are keyed by match id and overwrite each other (stats.ts:846-847). Probably impossible in practice because setup blocks a deck already in a live match (matches.ts:190-195), but duplicates within one match were not confirmed blocked.
29. **AI report per-deck wins** are reconstructed from a rounded percentage (reports.ts:276). Exact at realistic sizes; it would drift only beyond roughly 1,000 matches on one deck.
30. **Undoing a `turn_passed` that carried a duration discards that turn's time** and shifts which player later durations are attributed to. Inferred from the pairing logic, not traced end to end.

### Stored but used by no statistic
- `poison_change` events and `player_died` events (no elimination order, kill counts, or poison totals).
- Final `life_total`, `poison_counters` and `commander_damage` snapshots on participations.
- Per-player commander damage received.
