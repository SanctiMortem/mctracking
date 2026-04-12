# Inventory — MTG Commander Tracker v1.0.0

> Auto-generated reference snapshot.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/session` | Check current session (public) |
| GET | `/players` | List players (personal or group) |
| POST | `/players` | Create player |
| PATCH | `/players/:id` | Update player name |
| DELETE | `/players/:id` | Soft/hard-delete player |
| GET | `/commanders` | List commanders |
| POST | `/commanders` | Create commander |
| PATCH | `/commanders/:id` | Update commander |
| DELETE | `/commanders/:id` | Delete commander |
| GET | `/decks` | List decks |
| POST | `/decks` | Create deck |
| PATCH | `/decks/:id` | Update deck |
| DELETE | `/decks/:id` | Soft/hard-delete deck |
| POST | `/matches` | Create match + participations |
| GET | `/matches/:id` | Get match detail |
| GET | `/matches` | Match history with filters |
| POST | `/matches/:id/close` | Close match (winner/draw/abandoned) |
| POST | `/matches/:id/events` | Record match event (life/poison/commander damage) |
| POST | `/matches/:id/events/undo` | Undo last match event |
| GET | `/stats/players/:id` | Player stats |
| GET | `/stats/decks/:id` | Deck stats |
| GET | `/stats/commanders/:id` | Commander stats |
| GET | `/stats/matchup` | Head-to-head matchup stats |
| GET | `/stats/global` | Global rankings and stats |
| GET | `/groups` | List user groups |
| POST | `/groups` | Create group |
| PATCH | `/groups/:id` | Archive group |
| POST | `/groups/:id/invite` | Generate/regenerate invite link |
| POST | `/groups/join` | Join group via invite code |
| GET | `/settings` | Get user settings |
| PATCH | `/settings` | Update user settings |
| POST | `/purchases/verify` | Verify IAP receipt and activate Premium |

## Components

| Component | Path |
|-----------|------|
| ColorChips | `components/ui/ColorChips.tsx` |
| MatchResultCard | `components/match/MatchResultCard.tsx` |
| ParticipantResultRow | `components/match/ParticipantResultRow.tsx` |
| PlayerSelectorChip | `components/match/PlayerSelectorChip.tsx` |
| PlayerSection | `components/match/PlayerSection.tsx` |
| TrackerLayout | `components/match/TrackerLayout.tsx` |
| LifeCounter | `components/tracker/LifeCounter.tsx` |
| CommanderDamageRow | `components/tracker/CommanderDamageRow.tsx` |
| CommanderDamagePanel | `components/tracker/CommanderDamagePanel.tsx` |
| PoisonCounter | `components/tracker/PoisonCounter.tsx` |
| EventLogItem | `components/tracker/EventLogItem.tsx` |
| EventLogPanel | `components/tracker/EventLogPanel.tsx` |
| MatchCard | `components/match/MatchCard.tsx` |
| DeckStatRow | `components/match/DeckStatRow.tsx` |
| PlayerRankingRow | `components/stats/PlayerRankingRow.tsx` |
| MatchupCard | `components/stats/MatchupCard.tsx` |
| EntitySelector | `components/stats/EntitySelector.tsx` |
| AuthProviderButton | `components/auth/AuthProviderButton.tsx` |
| PlayerList | `components/players/PlayerList.tsx` |
| PlayerForm | `components/players/PlayerForm.tsx` |
| MatchHistoryFilterBar | `components/match/MatchHistoryFilterBar.tsx` |
| MatchSetupForm | `components/match/MatchSetupForm.tsx` |
| CloseMatchSheet | `components/match/CloseMatchSheet.tsx` |
| WinConditionPicker | `components/match/WinConditionPicker.tsx` |
| DeckList | `components/decks/DeckList.tsx` |
| DeckForm | `components/decks/DeckForm.tsx` |
| CommanderList | `components/commanders/CommanderList.tsx` |
| CommanderForm | `components/commanders/CommanderForm.tsx` |
| CommanderSelector | `components/decks/CommanderSelector.tsx` |
| ActiveMatchBanner | `components/home/ActiveMatchBanner.tsx` |
| BannerAdWrapper | `components/ads/BannerAdWrapper.tsx` |

## Screens

| Screen | Path |
|--------|------|
| Root Layout | `app/_layout.tsx` |
| Tabs Layout | `app/(tabs)/_layout.tsx` |
| App Index | `app/index.tsx` |
| Home | `app/(tabs)/home.tsx` |
| Tab Index | `app/(tabs)/index.tsx` |
| History | `app/(tabs)/history.tsx` |
| Stats | `app/(tabs)/stats.tsx` |
| Players (tab) | `app/(tabs)/players.tsx` |
| Decks (tab) | `app/(tabs)/decks.tsx` |
| Settings (tab) | `app/(tabs)/settings.tsx` |
| Settings | `app/settings.tsx` |
| Auth | `app/auth.tsx` |
| Guest | `app/guest.tsx` |
| Match Setup | `app/match/setup.tsx` |
| Match Tracker | `app/match/[id]/tracker.tsx` |
| Match Detail | `app/match/[id]/index.tsx` |
| Match Close | `app/match/[id]/close.tsx` |
| Match Results | `app/match/[id]/results.tsx` |
| Player Detail | `app/players/[id].tsx` |
| Deck Detail | `app/decks/[id].tsx` |
| Commanders Index | `app/commanders/index.tsx` |
| Commander Detail | `app/commanders/[id].tsx` |
| Groups Index | `app/groups/index.tsx` |
| Stats Matchup | `app/stats/matchup.tsx` |

## Database Tables

| Table | Columns | Key Constraints |
|-------|---------|-----------------|
| `groups` | id, name, owner_id, invite_code, invite_expires_at, archived_at, created_at | PK(id), UNIQUE(invite_code), IDX(owner_id) |
| `commanders` | id, name, colors, is_partner, created_by, deleted_at, created_at | PK(id), IDX(created_by), IDX(name) |
| `players` | id, name, group_id, created_by, deleted_at, created_at | PK(id), FK(group_id->groups), IDX(created_by), IDX(group_id) |
| `decks` | id, name, commander_id, commander_id_2, description, group_id, created_by, deleted_at, created_at | PK(id), FK(commander_id->commanders), FK(commander_id_2->commanders), FK(group_id->groups), IDX(created_by), IDX(commander_id), IDX(group_id) |
| `matches` | id, status, created_by, group_id, created_at, ended_at | PK(id), FK(group_id->groups), IDX(group_id) |
| `participations` | id, match_id, player_id, deck_id, result, life_total, poison_counters, commander_damage, created_at | PK(id), FK(match_id->matches), FK(player_id->players), FK(deck_id->decks), IDX(match_id), IDX(player_id), IDX(deck_id) |
| `match_events` | id, match_id, participation_id, event_type, delta, commander_id_source, is_undone, created_at | PK(id), FK(match_id->matches), FK(participation_id->participations), FK(commander_id_source->commanders), IDX(match_id, is_undone) |
| `match_results` | id, match_id, winner_participation_id, win_condition, is_draw, created_at | PK(id), FK(match_id->matches), FK(winner_participation_id->participations), UNIQUE(match_id) |
| `group_members` | id, group_id, user_id, role, joined_at | PK(id), FK(group_id->groups), UNIQUE(group_id, user_id), IDX(user_id) |
| `user_settings` | id, user_id, language, swipe_gestures_enabled, debounce_threshold_ms, require_commander, default_life_total, premium, created_at, updated_at | PK(id), UNIQUE(user_id) |
