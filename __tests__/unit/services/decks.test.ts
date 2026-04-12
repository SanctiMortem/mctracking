/**
 * Unit tests — services/decks.ts
 * DATA-011 (EPIC-01)
 *
 * Mocks the db layer to test service logic without a real database.
 */

// Mock DB before importing services
jest.mock('@/services/db', () => {
  const chainable = () => {
    const chain: any = {};
    const methods = ['select', 'insert', 'update', 'delete', 'from', 'where', 'set',
      'values', 'returning', 'innerJoin', 'leftJoin', 'orderBy', 'limit', 'groupBy'];
    methods.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
    chain.then = undefined; // prevent Promise detection
    return chain;
  };
  return {
    db: {
      select: jest.fn().mockReturnValue(chainable()),
      insert: jest.fn().mockReturnValue(chainable()),
      update: jest.fn().mockReturnValue(chainable()),
      delete: jest.fn().mockReturnValue(chainable()),
      transaction: jest.fn(),
    },
  };
});

jest.mock('@/services/matches', () => ({
  isDeckInActiveMatch: jest.fn(),
}));

jest.mock('drizzle-orm', () => ({
  and: jest.fn((...args: any[]) => args),
  eq: jest.fn((a: any, b: any) => ({ eq: [a, b] })),
  isNull: jest.fn((a: any) => ({ isNull: a })),
  sql: jest.fn(),
}));

jest.mock('drizzle-orm/pg-core', () => ({
  alias: jest.fn((_table: any, name: string) => ({ _aliasName: name })),
}));

jest.mock('@/db/schema', () => ({
  commanders: { id: 'commanders.id', name: 'commanders.name', colors: 'commanders.colors', isPartner: 'commanders.isPartner', createdBy: 'commanders.createdBy', deletedAt: 'commanders.deletedAt', createdAt: 'commanders.createdAt' },
  decks: { id: 'decks.id', name: 'decks.name', commanderId: 'decks.commanderId', commanderId2: 'decks.commanderId2', groupId: 'decks.groupId', description: 'decks.description', createdBy: 'decks.createdBy', deletedAt: 'decks.deletedAt', createdAt: 'decks.createdAt' },
}));

import { db } from '@/services/db';
import { isDeckInActiveMatch } from '@/services/matches';
import { createDeck, listDecks, softDeleteDeck, getDeckById } from '@/services/decks';

const mockDb = db as any;
const mockIsDeckInActiveMatch = isDeckInActiveMatch as jest.Mock;

// Helper to set up the chain mock to resolve with specific data
function mockChainResolves(data: any[]) {
  const chain: any = {};
  const methods = ['select', 'from', 'where', 'set', 'values', 'returning',
    'innerJoin', 'leftJoin', 'orderBy', 'limit', 'groupBy'];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  // Make it thenable (resolvable via await)
  chain.then = (resolve: any) => resolve(data);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createDeck (integration only)', () => {
  it('creates deck with valid commander_id', async () => {
    const commander = { id: 'cmd-1', name: 'Atraxa', isPartner: false, deletedAt: null };
    const createdDeck = { id: 'deck-1', name: 'My Deck', commanderId: 'cmd-1', commanderId2: null, createdBy: 'u1' };
    const deckWithCommanders = { ...createdDeck, commander: commander, commander2: null };

    // Mock: validate commander exists
    const selectChain = mockChainResolves([commander]);
    mockDb.select.mockReturnValueOnce(selectChain);

    // Mock: insert deck
    const insertChain = mockChainResolves([createdDeck]);
    mockDb.insert.mockReturnValueOnce(insertChain);

    // Mock: getDeckById (re-fetch with joins)
    const getDeckChain = mockChainResolves([{
      ...createdDeck,
      commander: commander,
      commander2: { id: null },
    }]);
    mockDb.select.mockReturnValueOnce(getDeckChain);

    const result = await createDeck('u1', { name: 'My Deck', commanderId: 'cmd-1' });
    expect('data' in result).toBe(true);
  });

  it('returns { partnerRequired: true } when commander has is_partner=true and commander_id_2 is missing', async () => {
    const partnerCommander = { id: 'cmd-p', name: 'Thrasios', isPartner: true, deletedAt: null };
    const selectChain = mockChainResolves([partnerCommander]);
    mockDb.select.mockReturnValueOnce(selectChain);

    const result = await createDeck('u1', { name: 'Partner Deck', commanderId: 'cmd-p' });
    expect(result).toEqual({ partnerRequired: true });
  });

  it('returns { commanderNotFound: true } for nonexistent commander_id', async () => {
    const selectChain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(selectChain);

    const result = await createDeck('u1', { name: 'Bad Deck', commanderId: 'nonexistent' });
    expect(result).toEqual({ commanderNotFound: true });
  });

  it('returns { commander2NotFound: true } for nonexistent commander_id_2', async () => {
    const commander = { id: 'cmd-1', name: 'Atraxa', isPartner: false, deletedAt: null };
    const selectChain1 = mockChainResolves([commander]);
    mockDb.select.mockReturnValueOnce(selectChain1);

    const selectChain2 = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(selectChain2);

    const result = await createDeck('u1', {
      name: 'Bad Partner',
      commanderId: 'cmd-1',
      commanderId2: 'nonexistent-2',
    });
    expect(result).toEqual({ commander2NotFound: true });
  });

  it('creates deck with partner — both commander_id and commander_id_2 set', async () => {
    const cmd1 = { id: 'cmd-p1', name: 'Thrasios', isPartner: true, deletedAt: null };
    const cmd2 = { id: 'cmd-p2', name: 'Tymna', isPartner: true, deletedAt: null };

    const selectChain1 = mockChainResolves([cmd1]);
    mockDb.select.mockReturnValueOnce(selectChain1);

    const selectChain2 = mockChainResolves([cmd2]);
    mockDb.select.mockReturnValueOnce(selectChain2);

    const createdDeck = { id: 'deck-2', name: 'Partner Deck', commanderId: 'cmd-p1', commanderId2: 'cmd-p2', createdBy: 'u1' };
    const insertChain = mockChainResolves([createdDeck]);
    mockDb.insert.mockReturnValueOnce(insertChain);

    const getDeckChain = mockChainResolves([{
      ...createdDeck,
      commander: cmd1,
      commander2: cmd2,
    }]);
    mockDb.select.mockReturnValueOnce(getDeckChain);

    const result = await createDeck('u1', {
      name: 'Partner Deck',
      commanderId: 'cmd-p1',
      commanderId2: 'cmd-p2',
    });
    expect('data' in result).toBe(true);
  });
});

describe('listDecks (integration only)', () => {
  it('returns decks sorted by name for the given userId', async () => {
    const rows = [
      { id: 'd1', name: 'Alpha', commander: { id: 'c1' }, commander2: { id: null } },
      { id: 'd2', name: 'Beta', commander: { id: 'c2' }, commander2: { id: null } },
    ];
    const chain = mockChainResolves(rows);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await listDecks('u1');
    expect(result).toHaveLength(2);
    expect(chain.orderBy).toHaveBeenCalled();
  });

  it('filters by commander_id when provided (matches primary or partner)', async () => {
    const rows = [{ id: 'd1', name: 'Filtered', commander: { id: 'c1' }, commander2: { id: null } }];
    const chain = mockChainResolves(rows);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await listDecks('u1', { commanderId: 'c1' });
    expect(result).toHaveLength(1);
    expect(chain.where).toHaveBeenCalled();
  });

  it('excludes soft-deleted decks', async () => {
    const chain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await listDecks('u1');
    expect(result).toEqual([]);
    // The where clause includes isNull(deletedAt)
    expect(chain.where).toHaveBeenCalled();
  });
});

describe('softDeleteDeck (integration only)', () => {
  it('sets deleted_at without physically deleting', async () => {
    const row = { id: 'deck-1', createdBy: 'u1', deletedAt: null };

    // getDeckRaw
    const selectChain = mockChainResolves([row]);
    mockDb.select.mockReturnValueOnce(selectChain);

    mockIsDeckInActiveMatch.mockResolvedValueOnce(false);

    const updateChain = mockChainResolves([]);
    mockDb.update.mockReturnValueOnce(updateChain);

    const result = await softDeleteDeck('u1', 'deck-1');
    expect(result).toEqual({ ok: true });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('returns { activeMatch: true } when deck is in an in_progress match', async () => {
    const row = { id: 'deck-1', createdBy: 'u1', deletedAt: null };
    const selectChain = mockChainResolves([row]);
    mockDb.select.mockReturnValueOnce(selectChain);

    mockIsDeckInActiveMatch.mockResolvedValueOnce(true);

    const result = await softDeleteDeck('u1', 'deck-1');
    expect(result).toEqual({ activeMatch: true });
  });

  it('returns { forbidden: true } when userId does not own the deck', async () => {
    const row = { id: 'deck-1', createdBy: 'other-user', deletedAt: null };
    const selectChain = mockChainResolves([row]);
    mockDb.select.mockReturnValueOnce(selectChain);

    const result = await softDeleteDeck('u1', 'deck-1');
    expect(result).toEqual({ forbidden: true });
  });
});

describe('getDeckById (integration only)', () => {
  it('returns deck with embedded commander and null commander2 for non-partner', async () => {
    const row = {
      id: 'd1', name: 'Deck', commanderId: 'c1', commanderId2: null,
      commander: { id: 'c1', name: 'Cmd1' },
      commander2: { id: null },
    };
    const chain = mockChainResolves([row]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await getDeckById('d1');
    expect(result).not.toBeNull();
    expect(result!.commander2).toBeNull();
  });

  it('returns deck with both commanders embedded for partner decks', async () => {
    const row = {
      id: 'd2', name: 'Partner Deck', commanderId: 'c1', commanderId2: 'c2',
      commander: { id: 'c1', name: 'Thrasios' },
      commander2: { id: 'c2', name: 'Tymna' },
    };
    const chain = mockChainResolves([row]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await getDeckById('d2');
    expect(result).not.toBeNull();
    expect(result!.commander2).not.toBeNull();
    expect(result!.commander2!.id).toBe('c2');
  });

  it('returns null for soft-deleted deck', async () => {
    const chain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await getDeckById('deleted-deck');
    expect(result).toBeNull();
  });
});
