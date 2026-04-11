/**
 * Integration tests — /api/stats/* (EPIC-04 History & Stats)
 *
 * These tests validate business rules for stats calculation and history filtering.
 * Requires: DATABASE_URL in .env.test pointing to a Neon test branch.
 *
 * All describes are .skip — implementation in EPIC-05 perf / test infra sprint.
 * HIST-004, HIST-006, HIST-008, HIST-010, HIST-012 (EPIC-04)
 */

// ─── GET /matches (HIST-001, HIST-012) ───────────────────────────────────────

describe.skip('GET /api/matches — history filtering', () => {
  it.todo('excludes in_progress matches from response (BR-MATCH-07)');
  it.todo('includes completed matches');
  it.todo('includes abandoned matches');
  it.todo('returns matches paginated with offset (ADR-008)');
  it.todo('returns hasMore=false when all pages exhausted');
  it.todo('GET ?result=win — returns only matches where a winner was recorded');
  it.todo('GET ?player_id=X — returns only matches where player X participated');
  it.todo('GET ?date_from=Y&date_to=Z — filters by date range inclusive');
  it.todo('GET ?player_id=X&date_from=Y — combined filters work correctly');
  it.todo('returns 401 when no auth session');
});

// ─── GET /api/stats/players/:id (HIST-004, HIST-012) ─────────────────────────

describe.skip('GET /api/stats/players/:id', () => {
  it.todo('returns win_rate_pct calculated per CALC-001 (1 decimal, round half-up)');
  it.todo('returns win_rate_pct=null (not 0) when player has zero completed matches');
  it.todo('excludes abandoned matches from total_matches denominator (BR-STATS-03)');
  it.todo('counts only completed matches in total_matches (BR-STATS-01)');
  it.todo('returns favorite_decks ordered by match count descending');
  it.todo('counts both commanderId and commanderId2 independently in favorite_commanders (BR-STATS-05)');
  it.todo('returns 404 when player does not exist');
  it.todo('returns 403 when player belongs to a different user');
  it.todo('returns 401 when no auth session');
});

// ─── GET /api/stats/decks/:id (HIST-006, HIST-012) ───────────────────────────

describe.skip('GET /api/stats/decks/:id', () => {
  it.todo('returns win rate summing victories across all players who used the deck (BR-STATS-04)');
  it.todo('returns players_used_by with per-player win_rate_pct');
  it.todo('excludes abandoned matches from total_matches denominator (BR-STATS-03)');
  it.todo('returns 404 when deck does not exist');
  it.todo('returns 403 when deck belongs to a different user');
  it.todo('returns 401 when no auth session');
});

// ─── GET /api/stats/commanders/:id (HIST-008, HIST-012) ──────────────────────

describe.skip('GET /api/stats/commanders/:id', () => {
  it.todo('counts matches where commander appears as primary or partner (BR-STATS-05)');
  it.todo('returns decks_using ordered by match count descending');
  it.todo('returns players_using ordered by match count descending');
  it.todo('returns 404 when commander does not exist');
  it.todo('returns 403 when commander belongs to a different user');
  it.todo('returns 401 when no auth session');
});

// ─── GET /api/stats/matchup (HIST-010, HIST-012) ─────────────────────────────

describe.skip('GET /api/stats/matchup?scope=all — entity matchup', () => {
  it.todo('returns total_matches=0 when entities never shared a match');
  it.todo('scope=all includes matches with any number of players (BR-STATS-06)');
  it.todo('aggregates wins correctly when A and B played 8 matches (3W A, 4W B, 1D)');
  it.todo('entity_type=commander counts decks using that commander as primary or partner');
  it.todo('returns 400 when entity_a_id equals entity_b_id');
  it.todo('returns 400 when entity_type is invalid');
  it.todo('returns 404 when entity_a does not exist');
  it.todo('returns 401 when no auth session');
});

describe.skip('GET /api/stats/matchup?scope=1v1', () => {
  it.todo('scope=1v1 only counts matches with exactly 2 participants (BR-STATS-06)');
  it.todo('scope=1v1 returns fewer total_matches than scope=all when multi-player matches exist');
  it.todo('scope=1v1 returns total_matches=0 when no 2-player matches shared');
});

// ─── GET /api/stats/global (HIST-010, HIST-012) ──────────────────────────────

describe.skip('GET /api/stats/global — global stats dashboard', () => {
  it.todo('returns total_matches count for completed matches scoped to user');
  it.todo('returns player_rankings ordered by win_rate_pct DESC');
  it.todo('ranking uses RANK (1,1,3) when two players are tied — not DENSE_RANK (BR-STATS-07)');
  it.todo('player with 0 matches does not appear in player_rankings');
  it.todo('top_decks excludes decks with fewer than 3 completed matches');
  it.todo('top_decks returns at most 5 entries ordered by win_rate_pct DESC');
  it.todo('top_commanders excludes commanders with fewer than 3 completed matches');
  it.todo('top_commanders counts partner commanders (commanderId2) independently (BR-STATS-05)');
  it.todo('returns 401 when no auth session');
});
