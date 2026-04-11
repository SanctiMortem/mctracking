/**
 * Integration tests — /api/decks
 * Requires: DATABASE_URL in .env.test pointing to a Neon test branch.
 * DATA-011 (EPIC-01)
 */

describe.skip('POST /api/decks', () => {
  it('returns 201 with deck and embedded commander', async () => {});

  it('returns 400 when partner commander is missing commander_id_2', async () => {
    // Create a commander with is_partner=true, then POST deck without commander_id_2
  });

  it('returns 404 for nonexistent commander_id', async () => {});
});

describe.skip('GET /api/decks?commander_id=', () => {
  it('filters decks by primary commander', async () => {});
  it('filters decks by partner commander', async () => {});
  it('returns all decks when no filter provided', async () => {});
});
