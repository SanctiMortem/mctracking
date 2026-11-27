/**
 * Unit tests — services/deathKillers.ts and services/setDeathKiller.ts
 *
 * The database is mocked: what is tested is the decision around each query —
 * above all that a database without the "Killed by" columns (migration 0016
 * not applied) makes the feature unavailable instead of throwing.
 *
 * The selection rules themselves are tested in killedBy.test.ts.
 */

jest.mock('@/services/db', () => ({
  db: { select: jest.fn(), update: jest.fn() },
}));

jest.mock('@/services/matches', () => ({
  canViewMatch: jest.fn(),
  EDIT_WINDOW_MS: 15 * 60 * 1000,
}));

import { db } from '@/services/db';
import { canViewMatch } from '@/services/matches';
import { isMissingKillerSchemaError, loadDeathKillers } from '@/services/deathKillers';
import { setDeathKiller } from '@/services/setDeathKiller';
import { NO_KILLER, SELF_INFLICTED, type KillerSelection } from '@/services/killedBy';

const mockDb = db as unknown as { select: jest.Mock; update: jest.Mock };
const mockCanView = canViewMatch as jest.Mock;

const MATCH = '99999999-9999-4999-8999-999999999999';
const ANA = '11111111-1111-4111-8111-111111111111';
const BEN = '22222222-2222-4222-8222-222222222222';
const ATRAXA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const KRENKO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const byBen: KillerSelection = { deathCause: 'opponent', killerParticipationId: BEN, killerCommanderId: KRENKO };

/** What neon-http throws through Drizzle when a column is missing. */
function missingColumnError(column = 'killer_participation_id') {
  const cause = Object.assign(new Error(`column "${column}" does not exist`), { code: '42703' });
  return Object.assign(new Error(`Failed query: select "${column}" from "match_events"`), { cause });
}

/** A Drizzle-like chain that resolves to `rows`, or rejects with `error`. */
function chain(rows: unknown[], error?: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'orderBy', 'limit', 'innerJoin', 'set', 'returning']) {
    c[m] = jest.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    error ? Promise.reject(error).then(resolve, reject) : Promise.resolve(rows).then(resolve, reject);
  return c;
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockCanView.mockResolvedValue(true);
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  consoleError.mockRestore();
});

// ─── isMissingKillerSchemaError ───────────────────────────────────────────────

describe('isMissingKillerSchemaError', () => {
  it('recognises a missing column, wrapped by Drizzle', () => {
    expect(isMissingKillerSchemaError(missingColumnError())).toBe(true);
  });

  it('recognises the missing death_cause type', () => {
    const cause = Object.assign(new Error('type "death_cause" does not exist'), { code: '42704' });
    expect(isMissingKillerSchemaError(Object.assign(new Error('Failed query'), { cause }))).toBe(true);
  });

  it("recognises the driver's message when there is no code", () => {
    expect(isMissingKillerSchemaError(new Error('column "death_cause" does not exist'))).toBe(true);
  });

  it('does not mistake other failures for it', () => {
    expect(isMissingKillerSchemaError(new Error('fetch failed'))).toBe(false);
    expect(isMissingKillerSchemaError(Object.assign(new Error('boom'), { code: '23503' }))).toBe(false);
    // Drizzle's wrapper quotes the SQL — and so the column names — on EVERY
    // failure of these queries. That alone must not count.
    expect(
      isMissingKillerSchemaError(
        new Error('Failed query: select "killer_participation_id" from "match_events" where x does not exist'),
      ),
    ).toBe(false);
    expect(isMissingKillerSchemaError(null)).toBe(false);
    expect(isMissingKillerSchemaError('nope')).toBe(false);
  });
});

// ─── loadDeathKillers ─────────────────────────────────────────────────────────

describe('loadDeathKillers', () => {
  it('returns the rows and one entry per dead player', async () => {
    const rows = [
      {
        id: 'e1',
        participationId: ANA,
        createdAt: new Date('2026-11-27T20:01:00Z'),
        ...byBen,
      },
    ];
    mockDb.select.mockReturnValueOnce(chain(rows));

    const result = await loadDeathKillers(MATCH);

    expect(result).toEqual({ status: 'ok', rows, entries: [{ participationId: ANA, ...byBen }] });
  });

  it('answers "unavailable" — and does not throw — when the columns are not there', async () => {
    mockDb.select.mockReturnValueOnce(chain([], missingColumnError()));

    await expect(loadDeathKillers(MATCH)).resolves.toEqual({ status: 'unavailable' });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('answers "error" — and still does not throw — on any other failure', async () => {
    mockDb.select.mockReturnValueOnce(chain([], new Error('fetch failed')));

    await expect(loadDeathKillers(MATCH)).resolves.toEqual({ status: 'error' });
    expect(consoleError).toHaveBeenCalled();
  });
});

// ─── setDeathKiller ───────────────────────────────────────────────────────────

describe('setDeathKiller', () => {
  const inProgress = { id: MATCH, status: 'in_progress', endedAt: null, createdBy: 'u1', groupId: null };
  const participants = [
    { participationId: ANA, commanderId: ATRAXA, commanderId2: null },
    { participationId: BEN, commanderId: KRENKO, commanderId2: null },
  ];

  /** Queue the three reads in the order the service makes them. */
  function reads(match: unknown, death: unknown[], parts: unknown[] = participants) {
    mockDb.select
      .mockReturnValueOnce(chain(match ? [match] : []))
      .mockReturnValueOnce(chain(death))
      .mockReturnValueOnce(chain(parts));
  }

  it('saves a valid selection on the latest death and returns it', async () => {
    reads(inProgress, [{ id: 'death-1' }]);
    const update = chain([{ id: 'death-1' }]);
    mockDb.update.mockReturnValueOnce(update);

    const result = await setDeathKiller('u1', MATCH, ANA, byBen);

    expect(result).toEqual({ data: { participationId: ANA, ...byBen } });
    expect(update.set).toHaveBeenCalledWith({
      deathCause: 'opponent',
      killerParticipationId: BEN,
      killerCommanderId: KRENKO,
    });
  });

  it('saves "self" with both killer columns null', async () => {
    reads(inProgress, [{ id: 'death-1' }]);
    const update = chain([{ id: 'death-1' }]);
    mockDb.update.mockReturnValueOnce(update);

    await setDeathKiller('u1', MATCH, ANA, SELF_INFLICTED);

    expect(update.set).toHaveBeenCalledWith({
      deathCause: 'self',
      killerParticipationId: null,
      killerCommanderId: null,
    });
  });

  it('clears without looking up the other players', async () => {
    mockDb.select.mockReturnValueOnce(chain([inProgress])).mockReturnValueOnce(chain([{ id: 'death-1' }]));
    const update = chain([{ id: 'death-1' }]);
    mockDb.update.mockReturnValueOnce(update);

    const result = await setDeathKiller('u1', MATCH, ANA, NO_KILLER);

    expect(result).toEqual({ data: { participationId: ANA, ...NO_KILLER } });
    expect(mockDb.select).toHaveBeenCalledTimes(2);
    expect(update.set).toHaveBeenCalledWith({
      deathCause: null,
      killerParticipationId: null,
      killerCommanderId: null,
    });
  });

  it('is notFound for a match that does not exist', async () => {
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(setDeathKiller('u1', MATCH, ANA, byBen)).resolves.toEqual({ notFound: true });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('is notFound — not forbidden — for a match the caller may not see', async () => {
    mockDb.select.mockReturnValueOnce(chain([inProgress]));
    mockCanView.mockResolvedValueOnce(false);
    await expect(setDeathKiller('stranger', MATCH, ANA, byBen)).resolves.toEqual({ notFound: true });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('is noDeath when the player has no non-undone death', async () => {
    mockDb.select.mockReturnValueOnce(chain([inProgress])).mockReturnValueOnce(chain([]));
    await expect(setDeathKiller('u1', MATCH, ANA, byBen)).resolves.toEqual({ noDeath: true });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('is noDeath when the death is undone between the read and the write', async () => {
    reads(inProgress, [{ id: 'death-1' }]);
    mockDb.update.mockReturnValueOnce(chain([])); // UPDATE … WHERE is_undone = false matched nothing

    await expect(setDeathKiller('u1', MATCH, ANA, byBen)).resolves.toEqual({ noDeath: true });
  });

  it('rejects an invalid selection without writing', async () => {
    reads(inProgress, [{ id: 'death-1' }]);
    const ownKiller: KillerSelection = { deathCause: 'opponent', killerParticipationId: ANA, killerCommanderId: ATRAXA };

    await expect(setDeathKiller('u1', MATCH, ANA, ownKiller)).resolves.toEqual({ invalid: 'KILLER_IS_DEAD_PLAYER' });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('allows a completed match inside the 15-minute window', async () => {
    reads({ ...inProgress, status: 'completed', endedAt: new Date(Date.now() - 60_000) }, [{ id: 'death-1' }]);
    mockDb.update.mockReturnValueOnce(chain([{ id: 'death-1' }]));

    const result = await setDeathKiller('u1', MATCH, ANA, byBen);
    expect('data' in result).toBe(true);
  });

  it('refuses a completed match after the window', async () => {
    mockDb.select.mockReturnValueOnce(
      chain([{ ...inProgress, status: 'completed', endedAt: new Date(Date.now() - 16 * 60_000) }]),
    );
    await expect(setDeathKiller('u1', MATCH, ANA, byBen)).resolves.toEqual({ editWindowExpired: true });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('refuses an abandoned match', async () => {
    mockDb.select.mockReturnValueOnce(chain([{ ...inProgress, status: 'abandoned', endedAt: new Date() }]));
    await expect(setDeathKiller('u1', MATCH, ANA, byBen)).resolves.toEqual({ notEditable: true });
  });

  it('answers "unavailable" when the database does not have the columns yet', async () => {
    reads(inProgress, [{ id: 'death-1' }]);
    mockDb.update.mockReturnValueOnce(chain([], missingColumnError('death_cause')));

    await expect(setDeathKiller('u1', MATCH, ANA, byBen)).resolves.toEqual({ unavailable: true });
  });

  it('lets any other write failure through', async () => {
    reads(inProgress, [{ id: 'death-1' }]);
    mockDb.update.mockReturnValueOnce(chain([], new Error('fetch failed')));

    await expect(setDeathKiller('u1', MATCH, ANA, byBen)).rejects.toThrow('fetch failed');
  });
});
