/**
 * Integration tests — /api/players
 * Requires: DATABASE_URL in .env.test pointing to a Neon test branch.
 * DATA-011 (EPIC-01)
 */

describe.skip('POST /api/players', () => {
  it('returns 201 with created player', async () => {});
  it('returns 409 for duplicate name within same user', async () => {});
  it('allows same name for different users', async () => {});
});

describe.skip('DELETE /api/players/:id', () => {
  it('returns 400 when player has an active match', async () => {
    // Blocked by MATCH-001 — hasActiveMatch stub always returns false until then
  });
  it('returns 200 and soft-deletes player without active match', async () => {});
});
