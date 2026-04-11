/**
 * Integration tests — /api/matches
 * Requires: DATABASE_URL in .env.test pointing to a Neon test branch.
 * MATCH-009 (EPIC-02)
 */

// ─── POST /api/matches ───────────────────────────────────────────────────────

describe.skip('POST /api/matches', () => {
  it('returns 201 with match + participations for a valid 3-player setup', async () => {});
  it('returns 201 for a 2-player match (minimum)', async () => {});
  it('returns 201 for a 4-player match (maximum)', async () => {});

  it('returns 400 when fewer than 2 participants provided', async () => {});
  it('returns 400 when more than 4 participants provided', async () => {});
  it('returns 400 when the same deck_id appears twice in participants', async () => {});

  it('returns 403 when a deck does not belong to the authenticated user', async () => {});

  it('returns 409 when a deck is already in an in_progress match', async () => {
    // Create a match with deckA, then try POST with deckA again — expect 409
  });

  it('does not persist any record when the transaction fails', async () => {
    // Use an invalid deck_id to trigger a rollback; verify no match row created
  });
});

// ─── PATCH /api/matches/:id ───────────────────────────────────────────────────

describe.skip('PATCH /api/matches/:id — win', () => {
  it('returns 200, sets status to "completed", creates MatchResult with winner + win_condition', async () => {});
  it('marks winner participation as "win" and all others as "lose"', async () => {});
  it('returns 400 for an invalid win_condition value', async () => {});
  it('returns 400 when winner_participation_id is not in this match', async () => {});
});

describe.skip('PATCH /api/matches/:id — draw', () => {
  it('returns 200, sets status to "completed", creates MatchResult with isDraw=true', async () => {});
  it('marks all participations as "draw"', async () => {});
});

describe.skip('PATCH /api/matches/:id — abandon', () => {
  it('returns 200, sets status to "abandoned", no MatchResult created', async () => {});
  it('leaves participation result as null', async () => {});
});

describe.skip('PATCH /api/matches/:id — guard rails', () => {
  it('returns 404 for a non-existent matchId', async () => {});
  it('returns 403 when the authenticated user does not own the match', async () => {});
  it('returns 409 when match is already completed or abandoned', async () => {});
  it('returns 401 when called without a Clerk session token', async () => {});
});

// ─── GET /api/matches/:id ────────────────────────────────────────────────────

describe.skip('GET /api/matches/:id', () => {
  it('returns 200 with match, participations (embedded player/deck/commander), and result', async () => {});
  it('returns participations with commander2: null for non-partner decks', async () => {});
  it('returns participations with both commander and commander2 for partner decks', async () => {});
  it('returns result: null for in_progress match', async () => {});
  it('returns 404 for a non-existent matchId', async () => {});
  it('returns 404 when the authenticated user does not own the match', async () => {});
  it('returns 401 when called without a Clerk session token', async () => {});
});
