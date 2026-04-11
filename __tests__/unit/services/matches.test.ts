/**
 * Unit tests — services/matches.ts + hooks/useMatchResults.ts (pure helpers)
 * All service functions depend on the DB — covered by integration tests.
 * Pure helpers (formatMatchDuration, winConditionLabel) can run without DB
 * once the Jest + babel-preset-expo environment is wired up.
 *
 * MATCH-009 (EPIC-02)
 */

// ─── createMatch ─────────────────────────────────────────────────────────────

describe('createMatch (integration only)', () => {
  it.todo('returns { invalidPlayerCount: true } when fewer than 2 participants');
  it.todo('returns { invalidPlayerCount: true } when more than 4 participants');
  it.todo('returns { duplicateDeck: true } when the same deck_id appears twice');
  it.todo('returns { forbidden: deckId } when a deck does not belong to userId');
  it.todo('returns { deckInActiveMatch: deckId } when deck is already in an in_progress match');
  it.todo('creates match (status: in_progress) + participations in a single transaction');
  it.todo('rolls back all inserts if the transaction fails mid-way (BR-MATCH-05)');
});

// ─── closeMatch ───────────────────────────────────────────────────────────────

describe('closeMatch — guard rails (integration only)', () => {
  it.todo('returns { notFound: true } for a non-existent matchId');
  it.todo('returns { alreadyClosed: true } when match.status is not in_progress');
  it.todo('returns { forbidden: true } when userId does not own the match');
  it.todo('returns { invalidWinCondition: true } for an unrecognized win_condition value');
  it.todo('returns { participationNotFound: true } when winner_participation_id is not in this match');
});

describe('closeMatch — win (integration only)', () => {
  it.todo('sets match.status to "completed" and creates MatchResult with winnerParticipationId + winCondition');
  it.todo('marks winner participation result as "win"');
  it.todo('marks all other participations result as "lose"');
  it.todo('sets match.endedAt to current time');
});

describe('closeMatch — draw (integration only)', () => {
  it.todo('sets match.status to "completed" and creates MatchResult with isDraw=true');
  it.todo('marks all participations result as "draw"');
  it.todo('MatchResult has no winnerParticipationId (null)');
});

describe('closeMatch — abandon (integration only)', () => {
  it.todo('sets match.status to "abandoned" — no MatchResult created (BR-MATCH-06)');
  it.todo('leaves participation result as null (not counted in stats)');
  it.todo('sets match.endedAt to current time');
});

// ─── getMatchById ─────────────────────────────────────────────────────────────

describe('getMatchById (integration only)', () => {
  it.todo('returns { notFound: true } for non-existent matchId');
  it.todo('returns { notFound: true } when userId does not own the match (ownership == 404 guard)');
  it.todo('returns participations with embedded player name, deck name, and commander colors');
  it.todo('sets commander2 to null for non-partner decks');
  it.todo('embeds both commander and commander2 for partner decks');
  it.todo('returns result: null when match is in_progress or abandoned');
  it.todo('returns MatchResult when match is completed');
});

// ─── isDeckInActiveMatch ──────────────────────────────────────────────────────

describe('isDeckInActiveMatch (integration only)', () => {
  it.todo('returns true when deck participates in an in_progress match');
  it.todo('returns false when deck has no participation or its match is completed/abandoned');
});

// ─── formatMatchDuration (pure helper — hooks/useMatchResults.ts) ─────────────

describe('formatMatchDuration', () => {
  it.todo('returns "–" when endedAt is null');
  it.todo('returns "< 1 min" for durations under 60 seconds');
  it.todo('returns "~N min" for durations between 1 and 59 minutes');
  it.todo('returns "~Nh" for exactly N hours with no remaining minutes');
  it.todo('returns "~Nh Mm" for hours with a non-zero minute remainder');
});

// ─── winConditionLabel (pure helper — hooks/useMatchResults.ts) ───────────────

describe('winConditionLabel', () => {
  it.todo('returns "Combat Damage" for "combat_damage"');
  it.todo('returns "Commander Damage" for "commander_damage"');
  it.todo('returns "Concede" for "scoop"');
  it.todo('returns "Concede" for "concede"');
  it.todo('returns the raw value for any unknown key (fallback passthrough)');
});
