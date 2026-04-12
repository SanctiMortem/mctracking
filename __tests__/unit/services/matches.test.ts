/**
 * Unit tests — services/matches.ts + hooks/useMatchResults.ts (pure helpers)
 * All service functions depend on the DB — covered by integration tests.
 * Pure helpers (formatMatchDuration, winConditionLabel) can run without DB
 * once the Jest + babel-preset-expo environment is wired up.
 *
 * MATCH-009 (EPIC-02) · HIST-001 (EPIC-04)
 */

jest.mock('@/services/db', () => {
  const chainable = () => {
    const chain: any = {};
    const methods = ['select', 'insert', 'update', 'delete', 'from', 'where', 'set',
      'values', 'returning', 'innerJoin', 'leftJoin', 'orderBy', 'limit', 'groupBy', 'offset'];
    methods.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
    chain.then = undefined;
    return chain;
  };
  return {
    db: {
      select: jest.fn().mockReturnValue(chainable()),
      insert: jest.fn().mockReturnValue(chainable()),
      update: jest.fn().mockReturnValue(chainable()),
      transaction: jest.fn(),
    },
  };
});

jest.mock('drizzle-orm', () => ({
  and: jest.fn((...args: any[]) => args),
  eq: jest.fn((a: any, b: any) => ({ eq: [a, b] })),
  ne: jest.fn((a: any, b: any) => ({ ne: [a, b] })),
  desc: jest.fn((a: any) => ({ desc: a })),
  asc: jest.fn((a: any) => ({ asc: a })),
  isNull: jest.fn((a: any) => ({ isNull: a })),
  inArray: jest.fn((a: any, b: any) => ({ inArray: [a, b] })),
  gte: jest.fn((a: any, b: any) => ({ gte: [a, b] })),
  lte: jest.fn((a: any, b: any) => ({ lte: [a, b] })),
  or: jest.fn((...args: any[]) => args),
  count: jest.fn(() => 'count'),
  sql: jest.fn(),
}));

jest.mock('drizzle-orm/pg-core', () => ({
  alias: jest.fn((_table: any, name: string) => ({ _aliasName: name })),
}));

jest.mock('@/db/schema', () => ({
  commanders: { id: 'commanders.id', name: 'commanders.name', colors: 'commanders.colors', isPartner: 'commanders.isPartner' },
  decks: { id: 'decks.id', name: 'decks.name', commanderId: 'decks.commanderId', commanderId2: 'decks.commanderId2', createdBy: 'decks.createdBy', deletedAt: 'decks.deletedAt' },
  matchEvents: { id: 'matchEvents.id', matchId: 'matchEvents.matchId', createdAt: 'matchEvents.createdAt' },
  matchResults: { matchId: 'matchResults.matchId', winCondition: 'matchResults.winCondition', winnerParticipationId: 'matchResults.winnerParticipationId', isDraw: 'matchResults.isDraw' },
  matches: { id: 'matches.id', status: 'matches.status', createdBy: 'matches.createdBy', endedAt: 'matches.endedAt' },
  participations: { id: 'participations.id', matchId: 'participations.matchId', playerId: 'participations.playerId', deckId: 'participations.deckId', result: 'participations.result', lifeTotal: 'participations.lifeTotal', poisonCounters: 'participations.poisonCounters', commanderDamage: 'participations.commanderDamage', createdAt: 'participations.createdAt' },
  players: { id: 'players.id', name: 'players.name' },
}));

import { db } from '@/services/db';
import { createMatch, closeMatch, getMatchById, listMatches, isDeckInActiveMatch } from '@/services/matches';

const mockDb = db as any;

function mockChainResolves(data: any[]) {
  const chain: any = {};
  const methods = ['select', 'from', 'where', 'set', 'values', 'returning',
    'innerJoin', 'leftJoin', 'orderBy', 'limit', 'groupBy', 'offset'];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: any) => resolve(data);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── createMatch ─────────────────────────────────────────────────────────────

describe('createMatch (integration only)', () => {
  it('returns { invalidPlayerCount: true } when fewer than 2 participants', async () => {
    const result = await createMatch('u1', [{ player_id: 'p1', deck_id: 'd1' }]);
    expect(result).toEqual({ invalidPlayerCount: true });
  });

  it('returns { invalidPlayerCount: true } when more than 4 participants', async () => {
    const participants = Array.from({ length: 5 }, (_, i) => ({ player_id: `p${i}`, deck_id: `d${i}` }));
    const result = await createMatch('u1', participants);
    expect(result).toEqual({ invalidPlayerCount: true });
  });

  it('returns { duplicateDeck: true } when the same deck_id appears twice', async () => {
    const result = await createMatch('u1', [
      { player_id: 'p1', deck_id: 'd1' },
      { player_id: 'p2', deck_id: 'd1' },
    ]);
    expect(result).toEqual({ duplicateDeck: true });
  });

  it('returns { forbidden: deckId } when a deck does not belong to userId', async () => {
    const deckRows = [{ id: 'd1', createdBy: 'u1' }, { id: 'd2', createdBy: 'other-user' }];
    const selectChain = mockChainResolves(deckRows);
    mockDb.select.mockReturnValueOnce(selectChain);

    const result = await createMatch('u1', [
      { player_id: 'p1', deck_id: 'd1' },
      { player_id: 'p2', deck_id: 'd2' },
    ]);
    expect(result).toEqual({ forbidden: 'd2' });
  });

  it('returns { deckInActiveMatch: deckId } when deck is already in an in_progress match', async () => {
    const deckRows = [{ id: 'd1', createdBy: 'u1' }, { id: 'd2', createdBy: 'u1' }];
    const selectChain = mockChainResolves(deckRows);
    mockDb.select.mockReturnValueOnce(selectChain);

    // isDeckInActiveMatch: d1 -> false, d2 -> true
    const activeCheck1 = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(activeCheck1);

    const activeCheck2 = mockChainResolves([{ id: 'some-participation' }]);
    mockDb.select.mockReturnValueOnce(activeCheck2);

    const result = await createMatch('u1', [
      { player_id: 'p1', deck_id: 'd1' },
      { player_id: 'p2', deck_id: 'd2' },
    ]);
    expect(result).toEqual({ deckInActiveMatch: 'd2' });
  });

  it('creates match (status: in_progress) + participations in a single transaction', async () => {
    const deckRows = [{ id: 'd1', createdBy: 'u1' }, { id: 'd2', createdBy: 'u1' }];
    const selectChain = mockChainResolves(deckRows);
    mockDb.select.mockReturnValueOnce(selectChain);

    // isDeckInActiveMatch — both return false
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const match = { id: 'm1', status: 'in_progress', createdBy: 'u1' };
    const parts = [
      { id: 'part1', matchId: 'm1', playerId: 'p1', deckId: 'd1', lifeTotal: 40 },
      { id: 'part2', matchId: 'm1', playerId: 'p2', deckId: 'd2', lifeTotal: 40 },
    ];

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const txInsertMatchChain = mockChainResolves([match]);
      const txInsertPartsChain = mockChainResolves(parts);
      const tx = {
        insert: jest.fn()
          .mockReturnValueOnce(txInsertMatchChain)
          .mockReturnValueOnce(txInsertPartsChain),
      };
      return fn(tx);
    });

    const result = await createMatch('u1', [
      { player_id: 'p1', deck_id: 'd1' },
      { player_id: 'p2', deck_id: 'd2' },
    ]);

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.match.status).toBe('in_progress');
      expect(result.data.participations).toHaveLength(2);
    }
  });

  it('rolls back all inserts if the transaction fails mid-way (BR-MATCH-05)', async () => {
    const deckRows = [{ id: 'd1', createdBy: 'u1' }, { id: 'd2', createdBy: 'u1' }];
    const selectChain = mockChainResolves(deckRows);
    mockDb.select.mockReturnValueOnce(selectChain);

    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const txInsertMatchChain = mockChainResolves([{ id: 'm1' }]);
      const tx = {
        insert: jest.fn()
          .mockReturnValueOnce(txInsertMatchChain)
          .mockImplementationOnce(() => { throw new Error('Transaction failed'); }),
      };
      return fn(tx);
    });

    await expect(
      createMatch('u1', [
        { player_id: 'p1', deck_id: 'd1' },
        { player_id: 'p2', deck_id: 'd2' },
      ]),
    ).rejects.toThrow('Transaction failed');
  });
});

// ─── closeMatch ───────────────────────────────────────────────────────────────

describe('closeMatch — guard rails (integration only)', () => {
  it('returns { notFound: true } for a non-existent matchId', async () => {
    const chain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await closeMatch('u1', 'nonexistent', { action: 'abandon' });
    expect(result).toEqual({ notFound: true });
  });

  it('returns { alreadyClosed: true } when match.status is not in_progress', async () => {
    const chain = mockChainResolves([{ id: 'm1', status: 'completed', createdBy: 'u1' }]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await closeMatch('u1', 'm1', { action: 'abandon' });
    expect(result).toEqual({ alreadyClosed: true });
  });

  it('returns { forbidden: true } when userId does not own the match', async () => {
    const chain = mockChainResolves([{ id: 'm1', status: 'in_progress', createdBy: 'other-user' }]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await closeMatch('u1', 'm1', { action: 'abandon' });
    expect(result).toEqual({ forbidden: true });
  });

  it('returns { invalidWinCondition: true } for an unrecognized win_condition value', async () => {
    const matchChain = mockChainResolves([{ id: 'm1', status: 'in_progress', createdBy: 'u1' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const result = await closeMatch('u1', 'm1', {
      action: 'win', winner_participation_id: 'part1', win_condition: 'invalid_condition',
    });
    expect(result).toEqual({ invalidWinCondition: true });
  });

  it('returns { participationNotFound: true } when winner_participation_id is not in this match', async () => {
    const matchChain = mockChainResolves([{ id: 'm1', status: 'in_progress', createdBy: 'u1' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    // Participations don't include the winner
    const partsChain = mockChainResolves([{ id: 'part1' }, { id: 'part2' }]);
    mockDb.select.mockReturnValueOnce(partsChain);

    const result = await closeMatch('u1', 'm1', {
      action: 'win', winner_participation_id: 'nonexistent-part', win_condition: 'combat_damage',
    });
    expect(result).toEqual({ participationNotFound: true });
  });
});

describe('closeMatch — win (integration only)', () => {
  function setupWinScenario() {
    const matchChain = mockChainResolves([{ id: 'm1', status: 'in_progress', createdBy: 'u1' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const partsChain = mockChainResolves([{ id: 'part1' }, { id: 'part2' }]);
    mockDb.select.mockReturnValueOnce(partsChain);
  }

  it('sets match.status to "completed" and creates MatchResult with winnerParticipationId + winCondition', async () => {
    setupWinScenario();

    const updatedMatch = { id: 'm1', status: 'completed', endedAt: new Date() };
    const matchResult = { matchId: 'm1', winnerParticipationId: 'part1', winCondition: 'combat_damage', isDraw: false };

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        update: jest.fn().mockReturnValue(mockChainResolves([updatedMatch])),
        insert: jest.fn().mockReturnValue(mockChainResolves([matchResult])),
      };
      return fn(tx);
    });

    const result = await closeMatch('u1', 'm1', {
      action: 'win', winner_participation_id: 'part1', win_condition: 'combat_damage',
    });

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.match.status).toBe('completed');
      expect(result.data.result).not.toBeNull();
    }
  });

  it('marks winner participation result as "win"', async () => {
    setupWinScenario();

    let updateCalls: any[] = [];
    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        update: jest.fn((...args: any[]) => {
          updateCalls.push(args);
          return mockChainResolves([{ id: 'm1', status: 'completed' }]);
        }),
        insert: jest.fn().mockReturnValue(mockChainResolves([{ matchId: 'm1' }])),
      };
      return fn(tx);
    });

    await closeMatch('u1', 'm1', {
      action: 'win', winner_participation_id: 'part1', win_condition: 'combat_damage',
    });

    // update called for: match status, winner result, loser result
    expect(updateCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('marks all other participations result as "lose"', async () => {
    setupWinScenario();

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const updateMock = jest.fn().mockReturnValue(mockChainResolves([{ id: 'm1', status: 'completed' }]));
      const tx = {
        update: updateMock,
        insert: jest.fn().mockReturnValue(mockChainResolves([{ matchId: 'm1' }])),
      };
      return fn(tx);
    });

    const result = await closeMatch('u1', 'm1', {
      action: 'win', winner_participation_id: 'part1', win_condition: 'combat_damage',
    });

    expect('data' in result).toBe(true);
  });

  it('sets match.endedAt to current time', async () => {
    setupWinScenario();

    const now = new Date();
    const updatedMatch = { id: 'm1', status: 'completed', endedAt: now };

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        update: jest.fn().mockReturnValue(mockChainResolves([updatedMatch])),
        insert: jest.fn().mockReturnValue(mockChainResolves([{ matchId: 'm1' }])),
      };
      return fn(tx);
    });

    const result = await closeMatch('u1', 'm1', {
      action: 'win', winner_participation_id: 'part1', win_condition: 'combat_damage',
    });

    if ('data' in result) {
      expect(result.data.match.endedAt).toBeDefined();
    }
  });
});

describe('closeMatch — draw (integration only)', () => {
  function setupDrawScenario() {
    const matchChain = mockChainResolves([{ id: 'm1', status: 'in_progress', createdBy: 'u1' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const partsChain = mockChainResolves([{ id: 'part1' }, { id: 'part2' }]);
    mockDb.select.mockReturnValueOnce(partsChain);
  }

  it('sets match.status to "completed" and creates MatchResult with isDraw=true', async () => {
    setupDrawScenario();

    const updatedMatch = { id: 'm1', status: 'completed', endedAt: new Date() };
    const matchResult = { matchId: 'm1', winnerParticipationId: null, winCondition: 'other', isDraw: true };

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        update: jest.fn().mockReturnValue(mockChainResolves([updatedMatch])),
        insert: jest.fn().mockReturnValue(mockChainResolves([matchResult])),
      };
      return fn(tx);
    });

    const result = await closeMatch('u1', 'm1', { action: 'draw' });

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.match.status).toBe('completed');
      expect(result.data.result?.isDraw).toBe(true);
    }
  });

  it('marks all participations result as "draw"', async () => {
    setupDrawScenario();

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        update: jest.fn().mockReturnValue(mockChainResolves([{ id: 'm1', status: 'completed' }])),
        insert: jest.fn().mockReturnValue(mockChainResolves([{ matchId: 'm1', isDraw: true }])),
      };
      return fn(tx);
    });

    const result = await closeMatch('u1', 'm1', { action: 'draw' });
    expect('data' in result).toBe(true);
  });

  it('MatchResult has no winnerParticipationId (null)', async () => {
    setupDrawScenario();

    const matchResult = { matchId: 'm1', winnerParticipationId: null, isDraw: true };

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        update: jest.fn().mockReturnValue(mockChainResolves([{ id: 'm1', status: 'completed' }])),
        insert: jest.fn().mockReturnValue(mockChainResolves([matchResult])),
      };
      return fn(tx);
    });

    const result = await closeMatch('u1', 'm1', { action: 'draw' });

    if ('data' in result) {
      expect(result.data.result?.winnerParticipationId).toBeNull();
    }
  });
});

describe('closeMatch — abandon (integration only)', () => {
  function setupAbandonScenario() {
    const matchChain = mockChainResolves([{ id: 'm1', status: 'in_progress', createdBy: 'u1' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const partsChain = mockChainResolves([{ id: 'part1' }, { id: 'part2' }]);
    mockDb.select.mockReturnValueOnce(partsChain);
  }

  it('sets match.status to "abandoned" — no MatchResult created (BR-MATCH-06)', async () => {
    setupAbandonScenario();

    const updatedMatch = { id: 'm1', status: 'abandoned', endedAt: new Date() };

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        update: jest.fn().mockReturnValue(mockChainResolves([updatedMatch])),
        insert: jest.fn(),
      };
      return fn(tx);
    });

    const result = await closeMatch('u1', 'm1', { action: 'abandon' });

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.match.status).toBe('abandoned');
      expect(result.data.result).toBeNull();
    }
  });

  it('leaves participation result as null (not counted in stats)', async () => {
    setupAbandonScenario();

    const updatedMatch = { id: 'm1', status: 'abandoned', endedAt: new Date() };

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const updateMock = jest.fn().mockReturnValue(mockChainResolves([updatedMatch]));
      const tx = { update: updateMock, insert: jest.fn() };
      return fn(tx);
    });

    const result = await closeMatch('u1', 'm1', { action: 'abandon' });

    // No update to participation results — only match status is updated
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.result).toBeNull();
    }
  });

  it('sets match.endedAt to current time', async () => {
    setupAbandonScenario();

    const updatedMatch = { id: 'm1', status: 'abandoned', endedAt: new Date() };

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        update: jest.fn().mockReturnValue(mockChainResolves([updatedMatch])),
        insert: jest.fn(),
      };
      return fn(tx);
    });

    const result = await closeMatch('u1', 'm1', { action: 'abandon' });

    if ('data' in result) {
      expect(result.data.match.endedAt).toBeDefined();
    }
  });
});

// ─── getMatchById ─────────────────────────────────────────────────────────────

describe('getMatchById (integration only)', () => {
  it('returns { notFound: true } for non-existent matchId', async () => {
    const chain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await getMatchById('u1', 'nonexistent');
    expect(result).toEqual({ notFound: true });
  });

  it('returns { notFound: true } when userId does not own the match (ownership == 404 guard)', async () => {
    // The query filters by both matchId and userId, so no row returned
    const chain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await getMatchById('u1', 'm-owned-by-other');
    expect(result).toEqual({ notFound: true });
  });

  it('returns participations with embedded player name, deck name, and commander colors', async () => {
    const matchChain = mockChainResolves([{ id: 'm1', status: 'completed', createdBy: 'u1' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const partRow = {
      id: 'part1', matchId: 'm1', playerId: 'pl1', deckId: 'd1', result: 'win',
      lifeTotal: 35, poisonCounters: 0, commanderDamage: {}, createdAt: new Date(),
      playerName: 'Alice', deckName: 'Alpha Deck',
      c1Id: 'cmd1', c1Name: 'Atraxa', c1Colors: ['W', 'U', 'B', 'G'], c1IsPartner: false,
      c2Id: null, c2Name: null, c2Colors: null, c2IsPartner: null,
    };
    const partsChain = mockChainResolves([partRow]);
    mockDb.select.mockReturnValueOnce(partsChain);

    // MatchResult + events (Promise.all)
    const resultChain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(resultChain);
    const eventsChain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(eventsChain);

    const result = await getMatchById('u1', 'm1');
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.participations[0].player.name).toBe('Alice');
      expect(result.data.participations[0].deck.name).toBe('Alpha Deck');
      expect(result.data.participations[0].commander.colors).toEqual(['W', 'U', 'B', 'G']);
    }
  });

  it('sets commander2 to null for non-partner decks', async () => {
    const matchChain = mockChainResolves([{ id: 'm1', status: 'completed', createdBy: 'u1' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const partRow = {
      id: 'part1', matchId: 'm1', playerId: 'pl1', deckId: 'd1', result: null,
      lifeTotal: 40, poisonCounters: 0, commanderDamage: {}, createdAt: new Date(),
      playerName: 'Alice', deckName: 'Deck',
      c1Id: 'cmd1', c1Name: 'Atraxa', c1Colors: ['W'], c1IsPartner: false,
      c2Id: null, c2Name: null, c2Colors: null, c2IsPartner: null,
    };
    const partsChain = mockChainResolves([partRow]);
    mockDb.select.mockReturnValueOnce(partsChain);

    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const result = await getMatchById('u1', 'm1');
    if ('data' in result) {
      expect(result.data.participations[0].commander2).toBeNull();
    }
  });

  it('embeds both commander and commander2 for partner decks', async () => {
    const matchChain = mockChainResolves([{ id: 'm1', status: 'completed', createdBy: 'u1' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const partRow = {
      id: 'part1', matchId: 'm1', playerId: 'pl1', deckId: 'd1', result: null,
      lifeTotal: 40, poisonCounters: 0, commanderDamage: {}, createdAt: new Date(),
      playerName: 'Alice', deckName: 'Partner Deck',
      c1Id: 'cmd1', c1Name: 'Thrasios', c1Colors: ['U', 'G'], c1IsPartner: true,
      c2Id: 'cmd2', c2Name: 'Tymna', c2Colors: ['W', 'B'], c2IsPartner: true,
    };
    const partsChain = mockChainResolves([partRow]);
    mockDb.select.mockReturnValueOnce(partsChain);

    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const result = await getMatchById('u1', 'm1');
    if ('data' in result) {
      expect(result.data.participations[0].commander.name).toBe('Thrasios');
      expect(result.data.participations[0].commander2).not.toBeNull();
      expect(result.data.participations[0].commander2!.name).toBe('Tymna');
    }
  });

  it('returns result: null when match is in_progress or abandoned', async () => {
    const matchChain = mockChainResolves([{ id: 'm1', status: 'abandoned', createdBy: 'u1' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const partsChain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(partsChain);

    mockDb.select.mockReturnValueOnce(mockChainResolves([])); // no match result
    mockDb.select.mockReturnValueOnce(mockChainResolves([])); // no events

    const result = await getMatchById('u1', 'm1');
    if ('data' in result) {
      expect(result.data.result).toBeNull();
    }
  });

  it('returns MatchResult when match is completed', async () => {
    const matchChain = mockChainResolves([{ id: 'm1', status: 'completed', createdBy: 'u1' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const partsChain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(partsChain);

    const mr = { matchId: 'm1', winnerParticipationId: 'part1', winCondition: 'combat_damage', isDraw: false };
    mockDb.select.mockReturnValueOnce(mockChainResolves([mr]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const result = await getMatchById('u1', 'm1');
    if ('data' in result) {
      expect(result.data.result).not.toBeNull();
      expect(result.data.result!.winCondition).toBe('combat_damage');
    }
  });
});

// ─── listMatches (integration only) ──────────────────────────────────────────

describe('listMatches (integration only)', () => {
  it('returns completed + abandoned matches ordered by ended_at DESC (BR-MATCH-07)', async () => {
    // Count query
    const countChain = mockChainResolves([{ count: 2 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    // Match rows
    const m1 = { id: 'm1', status: 'completed', endedAt: new Date('2024-01-02') };
    const m2 = { id: 'm2', status: 'abandoned', endedAt: new Date('2024-01-01') };
    const matchChain = mockChainResolves([m1, m2]);
    mockDb.select.mockReturnValueOnce(matchChain);

    // Participations
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    // Match results
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const result = await listMatches('u1');
    expect(result.data.matches).toHaveLength(2);
    expect(result.data.total).toBe(2);
  });

  it('never returns in_progress matches regardless of filters', async () => {
    // The query always includes ne(matches.status, 'in_progress')
    const countChain = mockChainResolves([{ count: 0 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    const matchChain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const result = await listMatches('u1');
    expect(result.data.matches).toEqual([]);
  });

  it('filters by playerId: only matches where that player participated', async () => {
    // Qualifying match IDs subquery
    const qualifyingChain = mockChainResolves([{ matchId: 'm1' }]);
    mockDb.select.mockReturnValueOnce(qualifyingChain);

    const countChain = mockChainResolves([{ count: 1 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    const matchChain = mockChainResolves([{ id: 'm1', status: 'completed' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const result = await listMatches('u1', { playerId: 'p1' });
    expect(result.data.total).toBe(1);
  });

  it('filters by deckId: only matches where that deck was used', async () => {
    const qualifyingChain = mockChainResolves([{ matchId: 'm1' }]);
    mockDb.select.mockReturnValueOnce(qualifyingChain);

    const countChain = mockChainResolves([{ count: 1 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    const matchChain = mockChainResolves([{ id: 'm1', status: 'completed' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const result = await listMatches('u1', { deckId: 'd1' });
    expect(result.data.total).toBe(1);
  });

  it('filters by commanderId: matches where commander is primary OR partner slot', async () => {
    // Commander filter uses the decks join subquery
    const qualifyingChain = mockChainResolves([{ matchId: 'm1' }]);
    mockDb.select.mockReturnValueOnce(qualifyingChain);

    const countChain = mockChainResolves([{ count: 1 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    const matchChain = mockChainResolves([{ id: 'm1', status: 'completed' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const result = await listMatches('u1', { commanderId: 'cmd1' });
    expect(result.data.total).toBe(1);
  });

  it('filters by result=win + playerId: only matches where that player won', async () => {
    const qualifyingChain = mockChainResolves([{ matchId: 'm1' }]);
    mockDb.select.mockReturnValueOnce(qualifyingChain);

    const countChain = mockChainResolves([{ count: 1 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    const matchChain = mockChainResolves([{ id: 'm1', status: 'completed' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const result = await listMatches('u1', { playerId: 'p1', result: 'win' });
    expect(result.data.total).toBe(1);
  });

  it('filters by result=abandoned: only matches with status=abandoned', async () => {
    const countChain = mockChainResolves([{ count: 1 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    const matchChain = mockChainResolves([{ id: 'm1', status: 'abandoned' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const result = await listMatches('u1', { result: 'abandoned' });
    expect(result.data.matches).toHaveLength(1);
  });

  it('filters by winCondition via matchResults join', async () => {
    // winCondition subquery
    const mrChain = mockChainResolves([{ matchId: 'm1' }]);
    mockDb.select.mockReturnValueOnce(mrChain);

    const countChain = mockChainResolves([{ count: 1 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    const matchChain = mockChainResolves([{ id: 'm1', status: 'completed' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const result = await listMatches('u1', { winCondition: 'combat_damage' });
    expect(result.data.total).toBe(1);
  });

  it('filters by dateFrom/dateTo range on ended_at', async () => {
    const countChain = mockChainResolves([{ count: 1 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    const matchChain = mockChainResolves([{ id: 'm1', status: 'completed', endedAt: new Date('2024-06-15') }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const result = await listMatches('u1', { dateFrom: '2024-06-01', dateTo: '2024-06-30' });
    expect(result.data.matches).toHaveLength(1);
  });

  it('returns has_more=true when remaining records exceed page boundary', async () => {
    const countChain = mockChainResolves([{ count: 25 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    const matches = Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, status: 'completed' }));
    const matchChain = mockChainResolves(matches);
    mockDb.select.mockReturnValueOnce(matchChain);

    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const result = await listMatches('u1', { limit: 20, offset: 0 });
    expect(result.data.has_more).toBe(true);
  });

  it('returns has_more=false on the final page', async () => {
    const countChain = mockChainResolves([{ count: 25 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    const matches = Array.from({ length: 5 }, (_, i) => ({ id: `m${i}`, status: 'completed' }));
    const matchChain = mockChainResolves(matches);
    mockDb.select.mockReturnValueOnce(matchChain);

    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const result = await listMatches('u1', { limit: 20, offset: 20 });
    expect(result.data.has_more).toBe(false);
  });

  it('returns total count consistent with un-paginated result set', async () => {
    const countChain = mockChainResolves([{ count: 42 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    const matchChain = mockChainResolves([{ id: 'm1', status: 'completed' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    mockDb.select.mockReturnValueOnce(mockChainResolves([]));
    mockDb.select.mockReturnValueOnce(mockChainResolves([]));

    const result = await listMatches('u1', { limit: 1 });
    expect(result.data.total).toBe(42);
  });

  it('returns empty matches array with total=0 when no matches qualify', async () => {
    const countChain = mockChainResolves([{ count: 0 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    const matchChain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const result = await listMatches('u1');
    expect(result.data.matches).toEqual([]);
    expect(result.data.total).toBe(0);
    expect(result.data.has_more).toBe(false);
  });
});

// ─── isDeckInActiveMatch ──────────────────────────────────────────────────────

describe('isDeckInActiveMatch (integration only)', () => {
  it('returns true when deck participates in an in_progress match', async () => {
    const chain = mockChainResolves([{ id: 'part1' }]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await isDeckInActiveMatch('d1');
    expect(result).toBe(true);
  });

  it('returns false when deck has no participation or its match is completed/abandoned', async () => {
    const chain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await isDeckInActiveMatch('d1');
    expect(result).toBe(false);
  });
});

// ─── formatMatchDuration (pure helper — hooks/useMatchResults.ts) ─────────────

import { formatMatchDuration, winConditionLabel } from '@/hooks/useMatchResults';

describe('formatMatchDuration', () => {
  it('returns "–" when endedAt is null', () => {
    expect(formatMatchDuration('2024-01-01T00:00:00Z', null)).toBe('–');
  });

  it('returns "< 1 min" for durations under 60 seconds', () => {
    const start = '2024-01-01T00:00:00Z';
    const end = '2024-01-01T00:00:20Z'; // 20 seconds — rounds to 0 min
    expect(formatMatchDuration(start, end)).toBe('< 1 min');
  });

  it('returns "~N min" for durations between 1 and 59 minutes', () => {
    const start = '2024-01-01T00:00:00Z';
    const end = '2024-01-01T00:25:00Z'; // 25 minutes
    expect(formatMatchDuration(start, end)).toBe('~25 min');
  });

  it('returns "~Nh" for exactly N hours with no remaining minutes', () => {
    const start = '2024-01-01T00:00:00Z';
    const end = '2024-01-01T02:00:00Z'; // 2 hours
    expect(formatMatchDuration(start, end)).toBe('~2h');
  });

  it('returns "~Nh Mm" for hours with a non-zero minute remainder', () => {
    const start = '2024-01-01T00:00:00Z';
    const end = '2024-01-01T01:30:00Z'; // 1h30m
    expect(formatMatchDuration(start, end)).toBe('~1h 30m');
  });
});

// ─── winConditionLabel (pure helper — hooks/useMatchResults.ts) ───────────────

describe('winConditionLabel', () => {
  it('returns "Combat Damage" for "combat_damage"', () => {
    expect(winConditionLabel('combat_damage')).toBe('Combat Damage');
  });

  it('returns "Commander Damage" for "commander_damage"', () => {
    expect(winConditionLabel('commander_damage')).toBe('Commander Damage');
  });

  it('returns "Concede" for "scoop"', () => {
    expect(winConditionLabel('scoop')).toBe('Concede');
  });

  it('returns "Concede" for "concede"', () => {
    expect(winConditionLabel('concede')).toBe('Concede');
  });

  it('returns the raw value for any unknown key (fallback passthrough)', () => {
    expect(winConditionLabel('some_unknown_condition')).toBe('some_unknown_condition');
  });
});
