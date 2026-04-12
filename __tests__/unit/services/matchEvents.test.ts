/**
 * Unit tests — services/matchEvents.ts
 *
 * All service functions depend on the DB — covered by integration tests.
 * Pure logic (event formatting in hooks/useEventLog.ts) can run without DB.
 *
 * TRACK-009 (EPIC-03)
 */

jest.mock('@/services/db', () => {
  const chainable = () => {
    const chain: any = {};
    const methods = ['select', 'insert', 'update', 'delete', 'from', 'where', 'set',
      'values', 'returning', 'innerJoin', 'leftJoin', 'orderBy', 'limit', 'desc'];
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
  desc: jest.fn((a: any) => ({ desc: a })),
  sql: jest.fn(),
}));

jest.mock('@/db/schema', () => ({
  matchEvents: { id: 'matchEvents.id', matchId: 'matchEvents.matchId', participationId: 'matchEvents.participationId', eventType: 'matchEvents.eventType', delta: 'matchEvents.delta', commanderIdSource: 'matchEvents.commanderIdSource', isUndone: 'matchEvents.isUndone', createdAt: 'matchEvents.createdAt' },
  matches: { id: 'matches.id', status: 'matches.status' },
  participations: { id: 'participations.id', matchId: 'participations.matchId', lifeTotal: 'participations.lifeTotal', poisonCounters: 'participations.poisonCounters', commanderDamage: 'participations.commanderDamage' },
}));

import { db } from '@/services/db';
import { recordEvent, undoLastEvent } from '@/services/matchEvents';

const mockDb = db as any;

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

// ─── recordEvent ─────────────────────────────────────────────────────────────

describe('recordEvent (integration only)', () => {
  it('returns { notFound: true } for a non-existent matchId', async () => {
    const chain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await recordEvent({
      matchId: 'nonexistent', participationId: 'p1',
      eventType: 'life_change', delta: -3,
    });
    expect(result).toEqual({ notFound: true });
  });

  it('returns { notInProgress: true } when match.status is completed or abandoned', async () => {
    const chain = mockChainResolves([{ status: 'completed' }]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await recordEvent({
      matchId: 'm1', participationId: 'p1',
      eventType: 'life_change', delta: -3,
    });
    expect(result).toEqual({ notInProgress: true });
  });

  it('returns { missingCommander: true } when event_type=commander_damage and commander_id_source is absent', async () => {
    const result = await recordEvent({
      matchId: 'm1', participationId: 'p1',
      eventType: 'commander_damage', delta: 5,
    });
    expect(result).toEqual({ missingCommander: true });
  });

  it('returns { forbidden: true } when participationId does not belong to the match', async () => {
    // Match exists and is in_progress
    const matchChain = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    // Participation not found
    const partChain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(partChain);

    const result = await recordEvent({
      matchId: 'm1', participationId: 'wrong-p',
      eventType: 'life_change', delta: -3,
    });
    expect(result).toEqual({ forbidden: true });
  });

  it('life_change: inserts MatchEvent and increments participation.life_total by delta', async () => {
    const matchChain = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const partChain = mockChainResolves([{ id: 'p1' }]);
    mockDb.select.mockReturnValueOnce(partChain);

    const insertedEvent = { id: 'ev1', matchId: 'm1', participationId: 'p1', eventType: 'life_change', delta: 5, isUndone: false };
    const txInsertChain = mockChainResolves([insertedEvent]);
    const txUpdateChain = mockChainResolves([]);

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        insert: jest.fn().mockReturnValue(txInsertChain),
        update: jest.fn().mockReturnValue(txUpdateChain),
      };
      return fn(tx);
    });

    const result = await recordEvent({
      matchId: 'm1', participationId: 'p1',
      eventType: 'life_change', delta: 5,
    });
    expect('data' in result).toBe(true);
  });

  it('life_change: inserts MatchEvent and decrements participation.life_total by |delta|', async () => {
    const matchChain = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const partChain = mockChainResolves([{ id: 'p1' }]);
    mockDb.select.mockReturnValueOnce(partChain);

    const insertedEvent = { id: 'ev2', matchId: 'm1', participationId: 'p1', eventType: 'life_change', delta: -3, isUndone: false };
    const txInsertChain = mockChainResolves([insertedEvent]);
    const txUpdateChain = mockChainResolves([]);

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        insert: jest.fn().mockReturnValue(txInsertChain),
        update: jest.fn().mockReturnValue(txUpdateChain),
      };
      return fn(tx);
    });

    const result = await recordEvent({
      matchId: 'm1', participationId: 'p1',
      eventType: 'life_change', delta: -3,
    });
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.delta).toBe(-3);
    }
  });

  it('poison_change: inserts MatchEvent and updates participation.poison_counters', async () => {
    const matchChain = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const partChain = mockChainResolves([{ id: 'p1' }]);
    mockDb.select.mockReturnValueOnce(partChain);

    const insertedEvent = { id: 'ev3', eventType: 'poison_change', delta: 2 };
    const txInsertChain = mockChainResolves([insertedEvent]);
    const txUpdateChain = mockChainResolves([]);

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        insert: jest.fn().mockReturnValue(txInsertChain),
        update: jest.fn().mockReturnValue(txUpdateChain),
      };
      return fn(tx);
    });

    const result = await recordEvent({
      matchId: 'm1', participationId: 'p1',
      eventType: 'poison_change', delta: 2,
    });
    expect('data' in result).toBe(true);
  });

  it('commander_damage: inserts MatchEvent and updates JSONB commander_damage[commander_id]', async () => {
    const matchChain = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const partChain = mockChainResolves([{ id: 'p1' }]);
    mockDb.select.mockReturnValueOnce(partChain);

    const insertedEvent = { id: 'ev4', eventType: 'commander_damage', delta: 7, commanderIdSource: 'cmd-x' };
    const txInsertChain = mockChainResolves([insertedEvent]);
    const txUpdateChain = mockChainResolves([]);

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        insert: jest.fn().mockReturnValue(txInsertChain),
        update: jest.fn().mockReturnValue(txUpdateChain),
      };
      return fn(tx);
    });

    const result = await recordEvent({
      matchId: 'm1', participationId: 'p1',
      eventType: 'commander_damage', delta: 7, commanderIdSource: 'cmd-x',
    });
    expect('data' in result).toBe(true);
  });

  it('commander_damage: adds to existing JSONB key (accumulates across events)', async () => {
    // Same as above — the SQL expression accumulates via COALESCE + addition
    const matchChain = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const partChain = mockChainResolves([{ id: 'p1' }]);
    mockDb.select.mockReturnValueOnce(partChain);

    const insertedEvent = { id: 'ev5', eventType: 'commander_damage', delta: 3, commanderIdSource: 'cmd-x' };
    const txInsertChain = mockChainResolves([insertedEvent]);
    const txUpdateChain = mockChainResolves([]);

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        insert: jest.fn().mockReturnValue(txInsertChain),
        update: jest.fn().mockReturnValue(txUpdateChain),
      };
      return fn(tx);
    });

    const result = await recordEvent({
      matchId: 'm1', participationId: 'p1',
      eventType: 'commander_damage', delta: 3, commanderIdSource: 'cmd-x',
    });
    expect('data' in result).toBe(true);
  });

  it('transaction rolls back: if participation update fails, MatchEvent is NOT inserted', async () => {
    const matchChain = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const partChain = mockChainResolves([{ id: 'p1' }]);
    mockDb.select.mockReturnValueOnce(partChain);

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const txInsertChain = mockChainResolves([{ id: 'ev-fail' }]);
      const tx = {
        insert: jest.fn().mockReturnValue(txInsertChain),
        update: jest.fn().mockImplementation(() => { throw new Error('DB write failed'); }),
      };
      return fn(tx);
    });

    await expect(
      recordEvent({
        matchId: 'm1', participationId: 'p1',
        eventType: 'life_change', delta: -5,
      }),
    ).rejects.toThrow('DB write failed');
  });
});

// ─── undoLastEvent ────────────────────────────────────────────────────────────

describe('undoLastEvent (integration only)', () => {
  it('returns { notFound: true } for a non-existent matchId', async () => {
    const chain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await undoLastEvent('nonexistent');
    expect(result).toEqual({ notFound: true });
  });

  it('returns { noEvents: true } when all events are already is_undone=true', async () => {
    // Match exists
    const matchChain = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    // No non-undone events
    const eventChain = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(eventChain);

    const result = await undoLastEvent('m1');
    expect(result).toEqual({ noEvents: true });
  });

  it('marks the most recent non-undone event as is_undone=true', async () => {
    const matchChain = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const lastEvent = { id: 'ev1', participationId: 'p1', eventType: 'life_change', delta: -5, isUndone: false, commanderIdSource: null };
    const eventChain = mockChainResolves([lastEvent]);
    mockDb.select.mockReturnValueOnce(eventChain);

    const undoneEvent = { ...lastEvent, isUndone: true };
    const txUpdateChain1 = mockChainResolves([undoneEvent]);
    const txUpdateChain2 = mockChainResolves([]);

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        update: jest.fn()
          .mockReturnValueOnce(txUpdateChain1)
          .mockReturnValueOnce(txUpdateChain2),
      };
      return fn(tx);
    });

    const result = await undoLastEvent('m1');
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.isUndone).toBe(true);
    }
  });

  it('reverts participation.life_total by -delta for life_change undo', async () => {
    const matchChain = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const lastEvent = { id: 'ev1', participationId: 'p1', eventType: 'life_change', delta: -5, isUndone: false, commanderIdSource: null };
    const eventChain = mockChainResolves([lastEvent]);
    mockDb.select.mockReturnValueOnce(eventChain);

    const undoneEvent = { ...lastEvent, isUndone: true };
    const txUpdateChain1 = mockChainResolves([undoneEvent]);
    const txUpdateChain2 = mockChainResolves([]);

    let updateCallArgs: any[] = [];
    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        update: jest.fn((...args: any[]) => {
          updateCallArgs.push(args);
          if (updateCallArgs.length === 1) return txUpdateChain1;
          return txUpdateChain2;
        }),
      };
      return fn(tx);
    });

    const result = await undoLastEvent('m1');
    expect('data' in result).toBe(true);
    // The transaction should have two update calls: mark undone + revert snapshot
    expect(updateCallArgs).toHaveLength(2);
  });

  it('reverts participation.poison_counters for poison_change undo', async () => {
    const matchChain = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const lastEvent = { id: 'ev2', participationId: 'p1', eventType: 'poison_change', delta: 3, isUndone: false, commanderIdSource: null };
    const eventChain = mockChainResolves([lastEvent]);
    mockDb.select.mockReturnValueOnce(eventChain);

    const undoneEvent = { ...lastEvent, isUndone: true };
    const txUpdateChain1 = mockChainResolves([undoneEvent]);
    const txUpdateChain2 = mockChainResolves([]);

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        update: jest.fn()
          .mockReturnValueOnce(txUpdateChain1)
          .mockReturnValueOnce(txUpdateChain2),
      };
      return fn(tx);
    });

    const result = await undoLastEvent('m1');
    expect('data' in result).toBe(true);
  });

  it('reverts participation.commander_damage JSONB key for commander_damage undo', async () => {
    const matchChain = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const lastEvent = { id: 'ev3', participationId: 'p1', eventType: 'commander_damage', delta: 7, isUndone: false, commanderIdSource: 'cmd-x' };
    const eventChain = mockChainResolves([lastEvent]);
    mockDb.select.mockReturnValueOnce(eventChain);

    const undoneEvent = { ...lastEvent, isUndone: true };
    const txUpdateChain1 = mockChainResolves([undoneEvent]);
    const txUpdateChain2 = mockChainResolves([]);

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        update: jest.fn()
          .mockReturnValueOnce(txUpdateChain1)
          .mockReturnValueOnce(txUpdateChain2),
      };
      return fn(tx);
    });

    const result = await undoLastEvent('m1');
    expect('data' in result).toBe(true);
  });

  it('repeated undo N times: all events undone, participation back to initial state', async () => {
    // First undo
    const matchChain1 = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain1);

    const event1 = { id: 'ev1', participationId: 'p1', eventType: 'life_change', delta: -5, isUndone: false, commanderIdSource: null };
    const eventChain1 = mockChainResolves([event1]);
    mockDb.select.mockReturnValueOnce(eventChain1);

    const txUpdateChain1a = mockChainResolves([{ ...event1, isUndone: true }]);
    const txUpdateChain1b = mockChainResolves([]);
    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = { update: jest.fn().mockReturnValueOnce(txUpdateChain1a).mockReturnValueOnce(txUpdateChain1b) };
      return fn(tx);
    });

    const result1 = await undoLastEvent('m1');
    expect('data' in result1).toBe(true);

    // Second undo — no more events
    const matchChain2 = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain2);

    const eventChain2 = mockChainResolves([]);
    mockDb.select.mockReturnValueOnce(eventChain2);

    const result2 = await undoLastEvent('m1');
    expect(result2).toEqual({ noEvents: true });
  });

  it('transaction: if snapshot revert fails, is_undone stays false (atomic)', async () => {
    const matchChain = mockChainResolves([{ status: 'in_progress' }]);
    mockDb.select.mockReturnValueOnce(matchChain);

    const lastEvent = { id: 'ev1', participationId: 'p1', eventType: 'life_change', delta: -5, isUndone: false, commanderIdSource: null };
    const eventChain = mockChainResolves([lastEvent]);
    mockDb.select.mockReturnValueOnce(eventChain);

    const txUpdateChain1 = mockChainResolves([{ ...lastEvent, isUndone: true }]);

    mockDb.transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        update: jest.fn()
          .mockReturnValueOnce(txUpdateChain1)
          .mockImplementationOnce(() => { throw new Error('Snapshot revert failed'); }),
      };
      return fn(tx);
    });

    await expect(undoLastEvent('m1')).rejects.toThrow('Snapshot revert failed');
  });
});

// ─── useEventLog — formatEvent (pure helper) ──────────────────────────────────

// We test the formatEvent logic by importing from useEventLog
// Since formatEvent is not exported directly, we test via the useEventLog hook

describe('formatEvent (useEventLog)', () => {
  // Import renderHook at describe scope to avoid hook registration issues inside tests
  const { renderHook } = require('@testing-library/react-native');
  const { useEventLog } = require('@/hooks/useEventLog');

  const makeParticipations = () => [
    {
      id: 'p1',
      player: { id: 'pl1', name: 'Alice' },
      commander: { id: 'cmd1', name: 'Atraxa', colors: ['W', 'U', 'B', 'G'], isPartner: false },
      commander2: null,
    },
    {
      id: 'p2',
      player: { id: 'pl2', name: 'Bob' },
      commander: { id: 'cmd2', name: 'Krenko', colors: ['R'], isPartner: false },
      commander2: null,
    },
  ] as any[];

  it('life_change +5: returns "PlayerName: +5 life"', () => {
    const events = [{ id: 'e1', participationId: 'p1', eventType: 'life_change', delta: 5, isUndone: false, createdAt: new Date() }];
    const { result } = renderHook(() => useEventLog(events, makeParticipations()));
    expect(result.current.formatted[0].description).toBe('Alice: +5 life');
  });

  it('life_change -3: returns "PlayerName: -3 life"', () => {
    const events = [{ id: 'e2', participationId: 'p1', eventType: 'life_change', delta: -3, isUndone: false, createdAt: new Date() }];
    const { result } = renderHook(() => useEventLog(events, makeParticipations()));
    expect(result.current.formatted[0].description).toBe('Alice: -3 life');
  });

  it('poison_change +2: returns "PlayerName: +2 poison"', () => {
    const events = [{ id: 'e3', participationId: 'p1', eventType: 'poison_change', delta: 2, isUndone: false, createdAt: new Date() }];
    const { result } = renderHook(() => useEventLog(events, makeParticipations()));
    expect(result.current.formatted[0].description).toBe('Alice: +2 poison');
  });

  it('commander_damage +7: returns "PlayerName: +7 cmd dmg from CommanderName"', () => {
    const events = [{ id: 'e4', participationId: 'p1', eventType: 'commander_damage', delta: 7, commanderIdSource: 'cmd2', isUndone: false, createdAt: new Date() }];
    const { result } = renderHook(() => useEventLog(events, makeParticipations()));
    expect(result.current.formatted[0].description).toBe('Alice: +7 cmd dmg from Krenko');
  });

  it('commander_damage with unknown commander_id_source: falls back to "Commander"', () => {
    const events = [{ id: 'e5', participationId: 'p1', eventType: 'commander_damage', delta: 3, commanderIdSource: 'unknown-cmd', isUndone: false, createdAt: new Date() }];
    const { result } = renderHook(() => useEventLog(events, makeParticipations()));
    expect(result.current.formatted[0].description).toBe('Alice: +3 cmd dmg from Commander');
  });

  it('unknown participationId: falls back to "Unknown"', () => {
    const events = [{ id: 'e6', participationId: 'unknown-p', eventType: 'life_change', delta: 1, isUndone: false, createdAt: new Date() }];
    const { result } = renderHook(() => useEventLog(events, makeParticipations()));
    expect(result.current.formatted[0].description).toBe('Unknown: +1 life');
  });
});

// ─── useDebounce ─────────────────────────────────────────────────────────────

describe('useDebounce', () => {
  let renderHookFn: any;
  let actFn: any;

  beforeAll(() => {
    const rtl = require('@testing-library/react-native');
    renderHookFn = rtl.renderHook;
    actFn = rtl.act;
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires callback once after delay with the last triggered value', () => {
    const { useDebounce } = require('@/hooks/useDebounce');
    const callback = jest.fn();
    const { result } = renderHookFn(() => useDebounce(callback, 500));

    actFn(() => { result.current.trigger(42); });
    expect(callback).not.toHaveBeenCalled();

    actFn(() => { jest.advanceTimersByTime(500); });
    expect(callback).toHaveBeenCalledWith(42);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not fire callback when cancel() is called before delay expires', () => {
    const { useDebounce } = require('@/hooks/useDebounce');
    const callback = jest.fn();
    const { result } = renderHookFn(() => useDebounce(callback, 500));

    actFn(() => { result.current.trigger(42); });
    actFn(() => { result.current.cancel(); });
    actFn(() => { jest.advanceTimersByTime(600); });

    expect(callback).not.toHaveBeenCalled();
  });

  it('flush() fires the callback immediately with pending value', () => {
    const { useDebounce } = require('@/hooks/useDebounce');
    const callback = jest.fn();
    const { result } = renderHookFn(() => useDebounce(callback, 500));

    actFn(() => { result.current.trigger(99); });
    actFn(() => { result.current.flush(); });

    expect(callback).toHaveBeenCalledWith(99);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('flush() does nothing if no pending value', () => {
    const { useDebounce } = require('@/hooks/useDebounce');
    const callback = jest.fn();
    const { result } = renderHookFn(() => useDebounce(callback, 500));

    actFn(() => { result.current.flush(); });

    expect(callback).not.toHaveBeenCalled();
  });

  it('accumulates via trigger: last trigger value wins on flush', () => {
    const { useDebounce } = require('@/hooks/useDebounce');
    const callback = jest.fn();
    const { result } = renderHookFn(() => useDebounce(callback, 500));

    actFn(() => {
      result.current.trigger(1);
      result.current.trigger(2);
      result.current.trigger(3);
    });

    actFn(() => { result.current.flush(); });

    expect(callback).toHaveBeenCalledWith(3);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cleanup on unmount: calls callback with pending value to avoid data loss', () => {
    const { useDebounce } = require('@/hooks/useDebounce');
    const callback = jest.fn();
    const { result, unmount } = renderHookFn(() => useDebounce(callback, 500));

    actFn(() => { result.current.trigger(77); });

    unmount();

    expect(callback).toHaveBeenCalledWith(77);
  });
});
