/**
 * Unit tests — services/players.ts
 * DATA-011 (EPIC-01)
 *
 * Mocks the db layer to test service logic without a real database.
 */

jest.mock('@/services/db', () => {
  const chainable = () => {
    const chain: any = {};
    const methods = ['select', 'insert', 'update', 'delete', 'from', 'where', 'set',
      'values', 'returning', 'innerJoin', 'leftJoin', 'orderBy', 'limit'];
    methods.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
    chain.then = undefined;
    return chain;
  };
  return {
    db: {
      select: jest.fn().mockReturnValue(chainable()),
      insert: jest.fn().mockReturnValue(chainable()),
      update: jest.fn().mockReturnValue(chainable()),
      delete: jest.fn().mockReturnValue(chainable()),
    },
  };
});

jest.mock('@/services/matches', () => ({
  isPlayerInActiveMatch: jest.fn(),
}));

jest.mock('drizzle-orm', () => ({
  and: jest.fn((...args: any[]) => args),
  eq: jest.fn((a: any, b: any) => ({ eq: [a, b] })),
  isNull: jest.fn((a: any) => ({ isNull: a })),
  ne: jest.fn((a: any, b: any) => ({ ne: [a, b] })),
  sql: jest.fn(),
}));

jest.mock('@/db/schema', () => ({
  players: {
    id: 'players.id', name: 'players.name', createdBy: 'players.createdBy',
    deletedAt: 'players.deletedAt', createdAt: 'players.createdAt',
  },
}));

import { db } from '@/services/db';
import { isPlayerInActiveMatch } from '@/services/matches';
import { createPlayer, updatePlayer, softDeletePlayer, listPlayers } from '@/services/players';

const mockDb = db as any;
const mockIsPlayerInActiveMatch = isPlayerInActiveMatch as jest.Mock;

function mockChainResolves(data: any[]) {
  const chain: any = {};
  const methods = ['select', 'from', 'where', 'set', 'values', 'returning',
    'innerJoin', 'leftJoin', 'orderBy', 'limit'];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: any) => resolve(data);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createPlayer (integration only)', () => {
  it('creates player scoped to userId', async () => {
    // Dupe check returns empty
    const dupeChain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(dupeChain);

    // Insert returns created row
    const created = { id: 'p1', name: 'Alice', createdBy: 'u1', deletedAt: null, createdAt: new Date() };
    const insertChain = mockChainResolves([created]);
    mockDb.insert.mockReturnValueOnce(insertChain);

    const result = await createPlayer('u1', 'Alice');
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.name).toBe('Alice');
      expect(result.data.createdBy).toBe('u1');
    }
  });

  it('returns { conflict: true } for duplicate name within same user (case-insensitive)', async () => {
    // Dupe check returns a match
    const dupeChain = mockChainResolves([{ id: 'existing' }]);
    mockDb.select.mockReturnValueOnce(dupeChain);

    const result = await createPlayer('u1', 'Alice');
    expect(result).toEqual({ conflict: true });
  });

  it('allows same name across different users', async () => {
    // Dupe check for user 2 returns empty
    const dupeChain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(dupeChain);

    const created = { id: 'p2', name: 'Alice', createdBy: 'u2', deletedAt: null, createdAt: new Date() };
    const insertChain = mockChainResolves([created]);
    mockDb.insert.mockReturnValueOnce(insertChain);

    const result = await createPlayer('u2', 'Alice');
    expect('data' in result).toBe(true);
  });
});

describe('updatePlayer (integration only)', () => {
  it('renames player and returns updated row', async () => {
    const existing = { id: 'p1', name: 'Alice', createdBy: 'u1', deletedAt: null, createdAt: new Date() };

    // getPlayerById
    const getChain = mockChainResolves([existing]);
    mockDb.select.mockReturnValueOnce(getChain);

    // Dupe check
    const dupeChain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(dupeChain);

    // Update
    const updated = { ...existing, name: 'Bob' };
    const updateChain = mockChainResolves([updated]);
    mockDb.update.mockReturnValueOnce(updateChain);

    const result = await updatePlayer('u1', 'p1', 'Bob');
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.name).toBe('Bob');
    }
  });

  it('returns { conflict: true } for name collision within same user', async () => {
    const existing = { id: 'p1', name: 'Alice', createdBy: 'u1', deletedAt: null, createdAt: new Date() };

    // getPlayerById
    const getChain = mockChainResolves([existing]);
    mockDb.select.mockReturnValueOnce(getChain);

    // Dupe check returns a match
    const dupeChain = mockChainResolves([{ id: 'other-player' }]);
    mockDb.select.mockReturnValueOnce(dupeChain);

    const result = await updatePlayer('u1', 'p1', 'Bob');
    expect(result).toEqual({ conflict: true });
  });

  it('returns { forbidden: true } when userId does not own the player', async () => {
    const existing = { id: 'p1', name: 'Alice', createdBy: 'other-user', deletedAt: null, createdAt: new Date() };

    const getChain = mockChainResolves([existing]);
    mockDb.select.mockReturnValueOnce(getChain);

    const result = await updatePlayer('u1', 'p1', 'Bob');
    expect(result).toEqual({ forbidden: true });
  });
});

describe('softDeletePlayer (integration only)', () => {
  it('sets deleted_at without physically deleting', async () => {
    const existing = { id: 'p1', name: 'Alice', createdBy: 'u1', deletedAt: null, createdAt: new Date() };

    const getChain = mockChainResolves([existing]);
    mockDb.select.mockReturnValueOnce(getChain);

    mockIsPlayerInActiveMatch.mockResolvedValueOnce(false);

    const updateChain = mockChainResolves([]);
    mockDb.update.mockReturnValueOnce(updateChain);

    const result = await softDeletePlayer('u1', 'p1');
    expect(result).toEqual({ ok: true });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('returns { activeMatch: true } when player is in an in_progress match', async () => {
    const existing = { id: 'p1', name: 'Alice', createdBy: 'u1', deletedAt: null, createdAt: new Date() };

    const getChain = mockChainResolves([existing]);
    mockDb.select.mockReturnValueOnce(getChain);

    mockIsPlayerInActiveMatch.mockResolvedValueOnce(true);

    const result = await softDeletePlayer('u1', 'p1');
    expect(result).toEqual({ activeMatch: true });
  });

  it('returns { notFound: true } for nonexistent or already-deleted id', async () => {
    const getChain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(getChain);

    const result = await softDeletePlayer('u1', 'nonexistent');
    expect(result).toEqual({ notFound: true });
  });
});

describe('listPlayers (integration only)', () => {
  it('returns only active (deleted_at IS NULL) players for userId', async () => {
    const players = [
      { id: 'p1', name: 'Alice', createdBy: 'u1', deletedAt: null },
      { id: 'p2', name: 'Bob', createdBy: 'u1', deletedAt: null },
    ];
    const chain = mockChainResolves(players);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await listPlayers('u1');
    expect(result).toHaveLength(2);
    expect(chain.where).toHaveBeenCalled();
  });

  it('returns empty array when user has no players', async () => {
    const chain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await listPlayers('u1');
    expect(result).toEqual([]);
  });
});
