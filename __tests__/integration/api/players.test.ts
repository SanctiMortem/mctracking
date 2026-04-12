/**
 * Integration tests — /api/players
 * Requires: DATABASE_URL in .env.test pointing to a Neon test branch.
 * DATA-011 (EPIC-01)
 */

import {
  createPlayer,
  listPlayers,
  softDeletePlayer,
} from '@/services/players';
import { createMatch } from '@/services/matches';
import {
  seedTestData,
  cleanupTestData,
  TEST_USER_ID,
  TEST_USER_ID_2,
} from '../../helpers/seed';

type Seed = Awaited<ReturnType<typeof seedTestData>>;
let seed: Seed;

beforeAll(async () => {
  await cleanupTestData();
  seed = await seedTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe('POST /api/players', () => {
  it('returns 201 with created player', async () => {
    const result = await createPlayer(TEST_USER_ID, 'Nuevo Jugador');

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.name).toBe('Nuevo Jugador');
      expect(result.data.createdBy).toBe(TEST_USER_ID);
      expect(result.data.id).toBeDefined();
      expect(result.data.createdAt).toBeDefined();
      expect(result.data.deletedAt).toBeNull();
    }
  });

  it('returns 409 for duplicate name within same user', async () => {
    // seed already has "Jugador Uno" for TEST_USER_ID
    const result = await createPlayer(TEST_USER_ID, 'jugador uno');
    expect(result).toEqual({ conflict: true });
  });

  it('allows same name for different users', async () => {
    const result = await createPlayer(TEST_USER_ID_2, 'Jugador Uno');

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.name).toBe('Jugador Uno');
      expect(result.data.createdBy).toBe(TEST_USER_ID_2);
    }
  });
});

describe('GET /api/players — listPlayers', () => {
  it('returns players for the user ordered by name', async () => {
    const list = await listPlayers(TEST_USER_ID);

    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(4); // 4 from seed
    for (let i = 1; i < list.length; i++) {
      expect(list[i].name.localeCompare(list[i - 1].name)).toBeGreaterThanOrEqual(0);
    }
  });

  it('excludes soft-deleted players', async () => {
    const created = await createPlayer(TEST_USER_ID, 'Temp Player');
    expect('data' in created).toBe(true);
    if (!('data' in created)) return;

    await softDeletePlayer(TEST_USER_ID, created.data.id);
    const list = await listPlayers(TEST_USER_ID);
    expect(list.find((p) => p.id === created.data.id)).toBeUndefined();
  });
});

describe('DELETE /api/players/:id', () => {
  it('returns 400 when player has an active match', async () => {
    // Create a match with player1 + deck1, player2 + deck3 (in_progress)
    const matchResult = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck3.id },
    ]);
    expect('data' in matchResult).toBe(true);

    // Now try to delete player1 who is in an active match
    const result = await softDeletePlayer(TEST_USER_ID, seed.players.player1.id);
    expect(result).toEqual({ activeMatch: true });
  });

  it('returns 200 and soft-deletes player without active match', async () => {
    // player4 is not in any match
    const created = await createPlayer(TEST_USER_ID, 'Player To Delete');
    expect('data' in created).toBe(true);
    if (!('data' in created)) return;

    const result = await softDeletePlayer(TEST_USER_ID, created.data.id);
    expect(result).toEqual({ ok: true });

    // Verify not in list
    const list = await listPlayers(TEST_USER_ID);
    expect(list.find((p) => p.id === (created as { data: { id: string } }).data.id)).toBeUndefined();
  });

  it('returns notFound for nonexistent id', async () => {
    const result = await softDeletePlayer(TEST_USER_ID, '00000000-0000-0000-0000-000000000000');
    expect(result).toEqual({ notFound: true });
  });

  it('returns forbidden when user does not own the player', async () => {
    const result = await softDeletePlayer(TEST_USER_ID_2, seed.players.player3.id);
    expect(result).toEqual({ forbidden: true });
  });
});
