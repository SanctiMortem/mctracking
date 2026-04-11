/**
 * Unit tests — services/players.ts
 * DATA-011 (EPIC-01)
 */

// All player service functions depend on the DB — covered by integration tests.
// This file documents the expected behavior as todos for when .env.test is set up.

describe('createPlayer (integration only)', () => {
  it.todo('creates player scoped to userId');
  it.todo('returns { conflict: true } for duplicate name within same user (case-insensitive)');
  it.todo('allows same name across different users');
});

describe('updatePlayer (integration only)', () => {
  it.todo('renames player and returns updated row');
  it.todo('returns { conflict: true } for name collision within same user');
  it.todo('returns { forbidden: true } when userId does not own the player');
});

describe('softDeletePlayer (integration only)', () => {
  it.todo('sets deleted_at without physically deleting');
  it.todo('returns { activeMatch: true } when player is in an in_progress match');
  it.todo('returns { notFound: true } for nonexistent or already-deleted id');
});

describe('listPlayers (integration only)', () => {
  it.todo('returns only active (deleted_at IS NULL) players for userId');
  it.todo('returns empty array when user has no players');
});
