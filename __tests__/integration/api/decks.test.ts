/**
 * Integration tests — /api/decks
 * Requires: DATABASE_URL in .env.test pointing to a Neon test branch.
 * DATA-011 (EPIC-01)
 */

import {
  createDeck,
  listDecks,
  softDeleteDeck,
} from '@/services/decks';
import { createCommander } from '@/services/commanders';
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

describe('POST /api/decks', () => {
  it('returns 201 with deck and embedded commander', async () => {
    const result = await createDeck(TEST_USER_ID, {
      name: 'New Atraxa Deck',
      commanderId: seed.commanders.cmd1.id,
      description: 'A test deck',
    });

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.name).toBe('New Atraxa Deck');
      expect(result.data.commanderId).toBe(seed.commanders.cmd1.id);
      expect(result.data.description).toBe('A test deck');
      expect(result.data.createdBy).toBe(TEST_USER_ID);
      expect(result.data.deletedAt).toBeNull();
      // Embedded commander
      expect(result.data.commander).toBeDefined();
      expect(result.data.commander.id).toBe(seed.commanders.cmd1.id);
      expect(result.data.commander.name).toBe('Atraxa, Praetors Voice');
      expect(result.data.commander2).toBeNull();
    }
  });

  it('returns 201 with partner commanders', async () => {
    const result = await createDeck(TEST_USER_ID, {
      name: 'Partner Deck Test',
      commanderId: seed.commanders.cmd2.id,
      commanderId2: seed.commanders.cmd3.id,
    });

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.commanderId).toBe(seed.commanders.cmd2.id);
      expect(result.data.commanderId2).toBe(seed.commanders.cmd3.id);
      expect(result.data.commander.id).toBe(seed.commanders.cmd2.id);
      expect(result.data.commander2).not.toBeNull();
      expect(result.data.commander2!.id).toBe(seed.commanders.cmd3.id);
    }
  });

  it('returns partnerRequired when partner commander is missing commander_id_2', async () => {
    // cmd2 (Thrasios) has isPartner=true, so requires commanderId2
    const result = await createDeck(TEST_USER_ID, {
      name: 'Missing Partner Deck',
      commanderId: seed.commanders.cmd2.id,
    });

    expect(result).toEqual({ partnerRequired: true });
  });

  it('returns commanderNotFound for nonexistent commander_id', async () => {
    const result = await createDeck(TEST_USER_ID, {
      name: 'Bad Commander Deck',
      commanderId: '00000000-0000-0000-0000-000000000000',
    });

    expect(result).toEqual({ commanderNotFound: true });
  });

  it('returns commander2NotFound for nonexistent partner commander_id', async () => {
    const result = await createDeck(TEST_USER_ID, {
      name: 'Bad Partner Deck',
      commanderId: seed.commanders.cmd2.id,
      commanderId2: '00000000-0000-0000-0000-000000000000',
    });

    expect(result).toEqual({ commander2NotFound: true });
  });
});

describe('GET /api/decks?commander_id=', () => {
  it('filters decks by primary commander', async () => {
    const list = await listDecks(TEST_USER_ID, { commanderId: seed.commanders.cmd1.id });

    expect(list.length).toBeGreaterThanOrEqual(2); // deck1 + deck4 use cmd1 as primary
    for (const deck of list) {
      // cmd1 should appear as either primary or partner
      const matchesPrimary = deck.commanderId === seed.commanders.cmd1.id;
      const matchesPartner = deck.commanderId2 === seed.commanders.cmd1.id;
      expect(matchesPrimary || matchesPartner).toBe(true);
    }
  });

  it('filters decks by partner commander', async () => {
    // cmd3 (Tymna) is used as partner in deck2
    const list = await listDecks(TEST_USER_ID, { commanderId: seed.commanders.cmd3.id });

    expect(list.length).toBeGreaterThanOrEqual(1);
    const hasCmd3 = list.some(
      (d) => d.commanderId === seed.commanders.cmd3.id || d.commanderId2 === seed.commanders.cmd3.id,
    );
    expect(hasCmd3).toBe(true);
  });

  it('returns all decks when no filter provided', async () => {
    const allDecks = await listDecks(TEST_USER_ID);

    // At least the 4 from seed + extras created in this describe
    expect(allDecks.length).toBeGreaterThanOrEqual(4);
  });

  it('returns decks ordered by name', async () => {
    const allDecks = await listDecks(TEST_USER_ID);

    for (let i = 1; i < allDecks.length; i++) {
      expect(allDecks[i].name.localeCompare(allDecks[i - 1].name)).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns empty array for user with no decks', async () => {
    const list = await listDecks(TEST_USER_ID_2);
    expect(list).toEqual([]);
  });
});

describe('DELETE /api/decks/:id — softDeleteDeck', () => {
  it('returns ok and soft-deletes the deck', async () => {
    const created = await createDeck(TEST_USER_ID, {
      name: 'Deck To Delete',
      commanderId: seed.commanders.cmd4.id,
    });
    expect('data' in created).toBe(true);
    if (!('data' in created)) return;

    const result = await softDeleteDeck(TEST_USER_ID, created.data.id);
    expect(result).toEqual({ ok: true });

    // Verify excluded from list
    const list = await listDecks(TEST_USER_ID);
    expect(list.find((d) => d.id === created.data.id)).toBeUndefined();
  });

  it('returns notFound for nonexistent id', async () => {
    const result = await softDeleteDeck(TEST_USER_ID, '00000000-0000-0000-0000-000000000000');
    expect(result).toEqual({ notFound: true });
  });

  it('returns forbidden when user does not own the deck', async () => {
    const result = await softDeleteDeck(TEST_USER_ID_2, seed.decks.deck1.id);
    expect(result).toEqual({ forbidden: true });
  });
});
