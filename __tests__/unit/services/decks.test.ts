/**
 * Unit tests — services/decks.ts
 * DATA-011 (EPIC-01)
 */

describe('createDeck (integration only)', () => {
  it.todo('creates deck with valid commander_id');
  it.todo('returns { partnerRequired: true } when commander has is_partner=true and commander_id_2 is missing');
  it.todo('returns { commanderNotFound: true } for nonexistent commander_id');
  it.todo('returns { commander2NotFound: true } for nonexistent commander_id_2');
  it.todo('creates deck with partner — both commander_id and commander_id_2 set');
});

describe('listDecks (integration only)', () => {
  it.todo('returns decks sorted by name for the given userId');
  it.todo('filters by commander_id when provided (matches primary or partner)');
  it.todo('excludes soft-deleted decks');
});

describe('softDeleteDeck (integration only)', () => {
  it.todo('sets deleted_at without physically deleting');
  it.todo('returns { activeMatch: true } when deck is in an in_progress match');
  it.todo('returns { forbidden: true } when userId does not own the deck');
});

describe('getDeckById (integration only)', () => {
  it.todo('returns deck with embedded commander and null commander2 for non-partner');
  it.todo('returns deck with both commanders embedded for partner decks');
  it.todo('returns null for soft-deleted deck');
});
