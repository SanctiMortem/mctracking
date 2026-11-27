/**
 * Unit tests — hooks/useKilledBy.ts
 *
 * The timing around a "Killed by" tap: what is sent and when, and what a
 * sync poll may and may not overwrite. The network is mocked; requests are
 * held open with deferred promises so each test decides the order things
 * come back in.
 */

const mockGetToken = jest.fn();
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.mock('@/services/api', () => ({
  apiFetch: jest.fn(),
}));

import { act, renderHook } from '@testing-library/react-native';

import { useKilledBy, type UseKilledByInput } from '@/hooks/useKilledBy';
import { apiFetch } from '@/services/api';
import { NO_KILLER, SELF_INFLICTED, type DeathKillerEntry, type KillerSelection } from '@/services/killedBy';
import type { MatchSyncState } from '@/services/matches';

const mockApiFetch = apiFetch as jest.Mock;

const MATCH = '99999999-9999-4999-8999-999999999999';
const ANA = '11111111-1111-4111-8111-111111111111';
const BEN = '22222222-2222-4222-8222-222222222222';
const CAT = '33333333-3333-4333-8333-333333333333';
const KRENKO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TYMNA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const byBen: KillerSelection = { deathCause: 'opponent', killerParticipationId: BEN, killerCommanderId: KRENKO };
const byCat: KillerSelection = { deathCause: 'opponent', killerParticipationId: CAT, killerCommanderId: TYMNA };

const bodyOf = (s: KillerSelection) => ({
  death_cause: s.deathCause,
  killer_participation_id: s.killerParticipationId,
  killer_commander_id: s.killerCommanderId,
});

function deferred<T = unknown>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Let pending promise callbacks and the effects they trigger run. */
async function settle() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

/** A sync snapshot carrying the given killer list (`undefined` = left out). */
function snapshot(deathKillers: DeathKillerEntry[] | null | undefined): MatchSyncState {
  return {
    status: 'in_progress',
    participations: [],
    turnCounts: {},
    elapsed: {},
    lastActorId: null,
    lastTurnPassedAt: null,
    deadParticipationIds: [],
    undoableEventCount: 0,
    syncedAt: new Date().toISOString(),
    ...(deathKillers === undefined ? {} : { deathKillers }),
  };
}

const entry = (participationId: string, s: KillerSelection = NO_KILLER): DeathKillerEntry => ({
  participationId,
  ...s,
});

/** Ana is dead, nothing selected, the server can store killers. */
const base: UseKilledByInput = {
  matchId: MATCH,
  enabled: true,
  loading: false,
  initialDeathKillers: [entry(ANA)],
  remoteSync: null,
  remoteSyncRequestedAtMs: 0,
  deadIds: new Set([ANA]),
};

const render = (props: Partial<UseKilledByInput> = {}) =>
  renderHook((p: UseKilledByInput) => useKilledBy(p), { initialProps: { ...base, ...props } });

const patchCalls = () => mockApiFetch.mock.calls.filter((c) => c[1] === 'PATCH');

let now = 1_000_000;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue('token');
  mockApiFetch.mockResolvedValue({ success: true });
  now = 1_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── Availability ─────────────────────────────────────────────────────────────

describe('useKilledBy — when the panel is available', () => {
  it('is available when the switch is on and the load returned a killer list', async () => {
    const { result } = render();
    await settle();
    expect(result.current.available).toBe(true);
  });

  it('is not available with the Labs switch off, and a tap then does nothing', async () => {
    const { result } = render({ enabled: false });
    await settle();
    expect(result.current.available).toBe(false);

    act(() => result.current.select(ANA, byBen));
    await settle();

    expect(result.current.selections).toEqual({});
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('is not available when the database has no killer columns (load says null)', async () => {
    const { result } = render({ initialDeathKillers: null });
    await settle();
    expect(result.current.available).toBe(false);
  });

  it('is not available against a server that predates the feature (load says nothing)', async () => {
    const { result } = render({ initialDeathKillers: undefined });
    await settle();
    expect(result.current.available).toBe(false);
  });

  it('follows the sync poll: null turns it off, a list turns it back on, "left out" changes nothing', async () => {
    const { result, rerender } = render();
    await settle();

    rerender({ ...base, remoteSync: snapshot(null), remoteSyncRequestedAtMs: 1 });
    await settle();
    expect(result.current.available).toBe(false);

    rerender({ ...base, remoteSync: snapshot(undefined), remoteSyncRequestedAtMs: 2 });
    await settle();
    expect(result.current.available).toBe(false);

    rerender({ ...base, remoteSync: snapshot([entry(ANA)]), remoteSyncRequestedAtMs: 3 });
    await settle();
    expect(result.current.available).toBe(true);
  });

  it('turns itself off when the save answers 503 KILLED_BY_UNAVAILABLE', async () => {
    mockApiFetch.mockRejectedValueOnce(Object.assign(new Error('nope'), { status: 503, code: 'KILLED_BY_UNAVAILABLE' }));
    const { result } = render();
    await settle();

    act(() => result.current.select(ANA, byBen));
    await settle();

    expect(result.current.available).toBe(false);
    expect(patchCalls()).toHaveLength(1); // not retried
  });
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('useKilledBy — initial state', () => {
  it('starts from the selections and death order of the match load', async () => {
    const { result } = render({
      initialDeathKillers: [entry(BEN, SELF_INFLICTED), entry(ANA, byCat)],
      deadIds: new Set([ANA, BEN]),
    });
    await settle();

    expect(result.current.selections).toEqual({ [BEN]: SELF_INFLICTED, [ANA]: byCat });
    expect(result.current.deathOrder).toEqual([BEN, ANA]);
  });
});

// ─── Saving a tap ─────────────────────────────────────────────────────────────

describe('useKilledBy — saving a tap', () => {
  it('shows the selection at once and saves it, keyed by match and dead player', async () => {
    const { result } = render();
    await settle();

    act(() => result.current.select(ANA, byBen));
    expect(result.current.selections).toEqual({ [ANA]: byBen });
    await settle();

    expect(patchCalls()).toEqual([
      [`/api/matches/${MATCH}/deaths/${ANA}/killer`, 'PATCH', bodyOf(byBen), 'token'],
    ]);
  });

  it('clearing removes the selection and saves all-null', async () => {
    const { result } = render({ initialDeathKillers: [entry(ANA, byBen)] });
    await settle();

    act(() => result.current.select(ANA, NO_KILLER));
    expect(result.current.selections).toEqual({});
    await settle();

    expect(patchCalls()[0][2]).toEqual(bodyOf(NO_KILLER));
  });

  it('a tap made before the death itself is saved waits for it, then is sent', async () => {
    const { result } = render();
    await settle();
    const death = deferred();

    act(() => {
      result.current.trackDeathWrite(ANA, death.promise);
      result.current.select(ANA, byBen);
    });
    await settle();
    expect(result.current.selections).toEqual({ [ANA]: byBen });
    expect(patchCalls()).toHaveLength(0); // the death is not on the server yet

    death.resolve(undefined);
    await settle();

    expect(patchCalls()).toHaveLength(1);
    expect(patchCalls()[0][2]).toEqual(bodyOf(byBen));
  });

  it('several taps while waiting for the death are sent as one request with the last choice', async () => {
    const { result } = render();
    await settle();
    const death = deferred();

    act(() => {
      result.current.trackDeathWrite(ANA, death.promise);
      result.current.select(ANA, byBen);
    });
    act(() => result.current.select(ANA, byCat));
    act(() => result.current.select(ANA, SELF_INFLICTED));
    death.resolve(undefined);
    await settle();

    expect(patchCalls()).toHaveLength(1);
    expect(patchCalls()[0][2]).toEqual(bodyOf(SELF_INFLICTED));
  });

  it('a tap made while a save is in flight is sent after it', async () => {
    const first = deferred();
    mockApiFetch.mockReturnValueOnce(first.promise);
    const { result } = render();
    await settle();

    act(() => result.current.select(ANA, byBen));
    await settle();
    act(() => result.current.select(ANA, byCat));
    await settle();
    expect(patchCalls()).toHaveLength(1); // still waiting on the first

    first.resolve({ success: true });
    await settle();

    expect(patchCalls().map((c) => c[2])).toEqual([bodyOf(byBen), bodyOf(byCat)]);
    expect(result.current.selections).toEqual({ [ANA]: byCat });
  });
});

// ─── Live sync ────────────────────────────────────────────────────────────────

describe('useKilledBy — live sync', () => {
  it("shows another device's selection", async () => {
    const { result, rerender } = render();
    await settle();

    rerender({ ...base, remoteSync: snapshot([entry(ANA, byCat)]), remoteSyncRequestedAtMs: now });
    await settle();

    expect(result.current.selections).toEqual({ [ANA]: byCat });
    expect(mockApiFetch).not.toHaveBeenCalled(); // adopting is not a write
  });

  it('a poll never overwrites a choice whose save is still in flight', async () => {
    const save = deferred();
    mockApiFetch.mockReturnValueOnce(save.promise);
    const { result, rerender } = render();
    await settle();

    act(() => result.current.select(ANA, byBen));
    await settle();

    // The server has not seen the tap: its snapshot still says "nothing".
    rerender({ ...base, remoteSync: snapshot([entry(ANA)]), remoteSyncRequestedAtMs: now });
    await settle();
    expect(result.current.selections).toEqual({ [ANA]: byBen });

    save.resolve({ success: true });
    await settle();
    expect(result.current.selections).toEqual({ [ANA]: byBen });
  });

  it('ignores a poll that was sent before the save came back, and accepts the next one', async () => {
    const save = deferred();
    mockApiFetch.mockReturnValueOnce(save.promise);
    const { result, rerender } = render();
    await settle();

    const pollSentAt = now; // the poll leaves…
    act(() => result.current.select(ANA, byBen)); // …then the tap
    await settle();
    now += 400;
    save.resolve({ success: true }); // the save comes back
    await settle();

    // The slow poll finally lands, built before the save: still "nothing".
    now += 100;
    rerender({ ...base, remoteSync: snapshot([entry(ANA)]), remoteSyncRequestedAtMs: pollSentAt });
    await settle();
    expect(result.current.selections).toEqual({ [ANA]: byBen });

    // A poll sent after the save came back is the server's real word.
    now += 4000;
    rerender({ ...base, remoteSync: snapshot([entry(ANA, byCat)]), remoteSyncRequestedAtMs: now });
    await settle();
    expect(result.current.selections).toEqual({ [ANA]: byCat });
  });

  it("uses the server's death order once it reports one", async () => {
    const { result, rerender } = render({ initialDeathKillers: [], deadIds: new Set() });
    await settle();

    // This device saw Ana die, then Ben.
    rerender({ ...base, initialDeathKillers: [], deadIds: new Set([ANA]) });
    rerender({ ...base, initialDeathKillers: [], deadIds: new Set([ANA, BEN]) });
    await settle();
    expect(result.current.deathOrder).toEqual([ANA, BEN]);

    // The server recorded Ben first.
    rerender({
      ...base,
      initialDeathKillers: [],
      deadIds: new Set([ANA, BEN]),
      remoteSync: snapshot([entry(BEN), entry(ANA)]),
      remoteSyncRequestedAtMs: now,
    });
    await settle();
    expect(result.current.deathOrder).toEqual([BEN, ANA]);
  });
});

// ─── Revival ──────────────────────────────────────────────────────────────────

describe('useKilledBy — when a dead player comes back', () => {
  it('drops the selection with the death (Undo)', async () => {
    const { result, rerender } = render({ initialDeathKillers: [entry(ANA, byBen)] });
    await settle();
    expect(result.current.selections).toEqual({ [ANA]: byBen });

    rerender({ ...base, initialDeathKillers: [entry(ANA, byBen)], deadIds: new Set() });
    await settle();

    expect(result.current.selections).toEqual({});
    expect(result.current.deathOrder).toEqual([]);
    expect(mockApiFetch).not.toHaveBeenCalled(); // reviving sends nothing from here
  });

  it('a player who dies again starts with nothing selected', async () => {
    const { result, rerender } = render({ initialDeathKillers: [entry(ANA, byBen)] });
    await settle();

    rerender({ ...base, deadIds: new Set() });
    await settle();
    rerender({ ...base, deadIds: new Set([ANA]) });
    await settle();

    expect(result.current.selections).toEqual({});
  });

  it('keeps a tap when the player only flickers alive while the death is still being saved', async () => {
    // A poll built before the death reached the server makes the tracker show
    // the player alive for a moment. That is not an Undo.
    const { result, rerender } = render();
    await settle();
    const death = deferred();

    act(() => {
      result.current.trackDeathWrite(ANA, death.promise);
      result.current.select(ANA, byBen);
    });
    await settle();

    rerender({ ...base, deadIds: new Set() }); // flicker: alive
    await settle();
    expect(result.current.selections).toEqual({ [ANA]: byBen });

    death.resolve(undefined);
    await settle();
    expect(patchCalls()).toHaveLength(1);
    expect(patchCalls()[0][2]).toEqual(bodyOf(byBen));

    rerender({ ...base, deadIds: new Set([ANA]) }); // next poll: dead again
    await settle();
    expect(result.current.selections).toEqual({ [ANA]: byBen });
  });
});
