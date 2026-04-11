/**
 * Integration tests — /api/stats/players/:id
 * Requires: DATABASE_URL in .env.test pointing to a Neon test branch.
 * HIST-004 (EPIC-04)
 */

// ─── GET /api/stats/decks/:id ────────────────────────────────────────────────

describe.skip('GET /api/stats/decks/:id', () => {
  it.todo('returns win rate summing victories across all players who used the deck (BR-STATS-04)');
  it.todo('returns players_used_by with per-player win_rate_pct');
  it.todo('returns 404 when deck does not exist');
  it.todo('returns 403 when deck belongs to a different user');
});

// ─── GET /api/stats/players/:id ──────────────────────────────────────────────

describe.skip('GET /api/stats/players/:id', () => {
  it.todo('returns win_rate_pct calculated correctly per CALC-001 (1 decimal, round)');
  it.todo('excludes abandoned matches from total_matches denominator (BR-STATS-03)');
  it.todo('returns win_rate_pct=null (not 0) when player has zero completed matches');
  it.todo('returns favorite_decks ordered by match count descending');
  it.todo('counts both commander and commander2 independently in favorite_commanders (BR-STATS-05)');
  it.todo('returns 404 when player does not exist');
  it.todo('returns 403 when player belongs to a different user');
  it.todo('returns 401 when no auth session');
});
