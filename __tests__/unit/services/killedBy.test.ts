/**
 * Unit tests — services/killedBy.ts ("Killed by" rules, no database).
 *
 * docs/STATS_REDESIGN_SPEC.md section 1a.
 */
import {
  NO_KILLER,
  SELF_INFLICTED,
  deadBefore,
  effectiveDeathOrder,
  isOptionSelected,
  killerEditState,
  killerMapFromEntries,
  killerOptionsForDeath,
  latestDeathPerParticipation,
  mergeRemoteKillers,
  parseKillerBody,
  parseKillerRoutePath,
  sameKillerSelection,
  selectionForOption,
  toggleKillerSelection,
  validateKillerSelection,
  type KillerCandidate,
  type KillerParticipant,
  type KillerSelection,
} from '@/services/killedBy';

// Participations
const ANA = '11111111-1111-4111-8111-111111111111';
const BEN = '22222222-2222-4222-8222-222222222222';
const CAT = '33333333-3333-4333-8333-333333333333';
const DAN = '44444444-4444-4444-8444-444444444444';
// Commanders
const ATRAXA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const KRENKO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TYMNA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const THRASIOS = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const EDGAR = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const MATCH = '99999999-9999-4999-8999-999999999999';

const opponent = (participation: string, commander: string | null): KillerSelection => ({
  deathCause: 'opponent',
  killerParticipationId: participation,
  killerCommanderId: commander,
});

// ─── parseKillerRoutePath ─────────────────────────────────────────────────────

describe('parseKillerRoutePath', () => {
  it('reads the match and the dead participation, in that order', () => {
    expect(parseKillerRoutePath(`/api/matches/${MATCH}/deaths/${ANA}/killer`)).toEqual({
      matchId: MATCH,
      participationId: ANA,
    });
  });

  it('accepts a trailing slash', () => {
    expect(parseKillerRoutePath(`/api/matches/${MATCH}/deaths/${ANA}/killer/`)).not.toBeNull();
  });

  it('rejects ids that are not uuids', () => {
    expect(parseKillerRoutePath(`/api/matches/abc/deaths/${ANA}/killer`)).toBeNull();
    expect(parseKillerRoutePath(`/api/matches/${MATCH}/deaths/1/killer`)).toBeNull();
  });

  it('rejects other paths', () => {
    expect(parseKillerRoutePath(`/api/matches/${MATCH}/sync`)).toBeNull();
    expect(parseKillerRoutePath(`/api/matches/${MATCH}/deaths/${ANA}`)).toBeNull();
  });
});

// ─── parseKillerBody ──────────────────────────────────────────────────────────

describe('parseKillerBody', () => {
  it('reads an opponent selection', () => {
    expect(
      parseKillerBody({ death_cause: 'opponent', killer_participation_id: BEN, killer_commander_id: KRENKO }),
    ).toEqual({ ok: true, selection: opponent(BEN, KRENKO) });
  });

  it('reads "self"', () => {
    expect(
      parseKillerBody({ death_cause: 'self', killer_participation_id: null, killer_commander_id: null }),
    ).toEqual({ ok: true, selection: SELF_INFLICTED });
  });

  it('treats all-null and an empty object as "clear"', () => {
    const cleared = { ok: true, selection: NO_KILLER };
    expect(parseKillerBody({ death_cause: null, killer_participation_id: null, killer_commander_id: null })).toEqual(
      cleared,
    );
    expect(parseKillerBody({})).toEqual(cleared);
  });

  it('rejects a body that is not an object', () => {
    expect(parseKillerBody(null).ok).toBe(false);
    expect(parseKillerBody('self').ok).toBe(false);
    expect(parseKillerBody([]).ok).toBe(false);
  });

  it('rejects an unknown death_cause', () => {
    expect(parseKillerBody({ death_cause: 'combat' }).ok).toBe(false);
    expect(parseKillerBody({ death_cause: 1 }).ok).toBe(false);
  });

  it('rejects ids that are not uuids, so they never reach the database', () => {
    expect(parseKillerBody({ death_cause: 'opponent', killer_participation_id: 'ben' }).ok).toBe(false);
    expect(
      parseKillerBody({ death_cause: 'opponent', killer_participation_id: BEN, killer_commander_id: 42 }).ok,
    ).toBe(false);
  });
});

// ─── validateKillerSelection ──────────────────────────────────────────────────

describe('validateKillerSelection', () => {
  // Ana is dead. Ben plays Krenko, Cat plays the partners Tymna + Thrasios.
  const participants: KillerCandidate[] = [
    { participationId: ANA, commanderIds: [ATRAXA] },
    { participationId: BEN, commanderIds: [KRENKO] },
    { participationId: CAT, commanderIds: [TYMNA, THRASIOS] },
  ];
  const check = (selection: KillerSelection) =>
    validateKillerSelection({ deadParticipationId: ANA, selection, participants });

  it('accepts an opponent with one of their commanders', () => {
    expect(check(opponent(BEN, KRENKO))).toEqual({ ok: true, selection: opponent(BEN, KRENKO) });
  });

  it('accepts either commander of a partner deck', () => {
    expect(check(opponent(CAT, TYMNA)).ok).toBe(true);
    expect(check(opponent(CAT, THRASIOS)).ok).toBe(true);
  });

  it('accepts an opponent with no commander named', () => {
    expect(check(opponent(BEN, null))).toEqual({ ok: true, selection: opponent(BEN, null) });
  });

  it('accepts "self" and "clear"', () => {
    expect(check(SELF_INFLICTED)).toEqual({ ok: true, selection: SELF_INFLICTED });
    expect(check(NO_KILLER)).toEqual({ ok: true, selection: NO_KILLER });
  });

  it('rejects a killer who is not in the match', () => {
    expect(check(opponent(DAN, null))).toEqual({ ok: false, code: 'KILLER_NOT_IN_MATCH' });
  });

  it('rejects the dead player as their own killer', () => {
    expect(check(opponent(ANA, ATRAXA))).toEqual({ ok: false, code: 'KILLER_IS_DEAD_PLAYER' });
  });

  it("rejects a commander that is not on the killer's deck", () => {
    // Krenko is Ben's, not Cat's.
    expect(check(opponent(CAT, KRENKO))).toEqual({ ok: false, code: 'COMMANDER_NOT_ON_KILLER_DECK' });
    // Not anyone's.
    expect(check(opponent(BEN, EDGAR))).toEqual({ ok: false, code: 'COMMANDER_NOT_ON_KILLER_DECK' });
  });

  it('rejects "self" that carries a killer', () => {
    expect(check({ deathCause: 'self', killerParticipationId: BEN, killerCommanderId: null })).toEqual({
      ok: false,
      code: 'SELF_WITH_KILLER',
    });
    expect(check({ deathCause: 'self', killerParticipationId: null, killerCommanderId: KRENKO })).toEqual({
      ok: false,
      code: 'SELF_WITH_KILLER',
    });
  });

  it('rejects "opponent" that does not say who', () => {
    expect(check({ deathCause: 'opponent', killerParticipationId: null, killerCommanderId: null })).toEqual({
      ok: false,
      code: 'OPPONENT_WITHOUT_KILLER',
    });
  });

  it('rejects a killer sent without a cause', () => {
    expect(check({ deathCause: null, killerParticipationId: BEN, killerCommanderId: null })).toEqual({
      ok: false,
      code: 'KILLER_WITHOUT_CAUSE',
    });
  });
});

// ─── killerEditState ──────────────────────────────────────────────────────────

describe('killerEditState', () => {
  const WINDOW = 15 * 60 * 1000;
  const NOW = Date.parse('2026-11-27T20:00:00Z');
  const minutesAgo = (m: number) => new Date(NOW - m * 60 * 1000);

  it('is editable while the match is in progress', () => {
    expect(killerEditState({ status: 'in_progress', endedAt: null }, NOW, WINDOW)).toBe('editable');
  });

  it('is editable for 15 minutes after a completed match ended', () => {
    expect(killerEditState({ status: 'completed', endedAt: minutesAgo(1) }, NOW, WINDOW)).toBe('editable');
    expect(killerEditState({ status: 'completed', endedAt: minutesAgo(15) }, NOW, WINDOW)).toBe('editable');
  });

  it('expires after the window', () => {
    expect(killerEditState({ status: 'completed', endedAt: minutesAgo(16) }, NOW, WINDOW)).toBe('window_expired');
  });

  it('accepts endedAt as an ISO string', () => {
    expect(killerEditState({ status: 'completed', endedAt: minutesAgo(2).toISOString() }, NOW, WINDOW)).toBe(
      'editable',
    );
  });

  it('treats a completed match with no end time as expired', () => {
    expect(killerEditState({ status: 'completed', endedAt: null }, NOW, WINDOW)).toBe('window_expired');
  });

  it('never allows an abandoned match', () => {
    expect(killerEditState({ status: 'abandoned', endedAt: minutesAgo(1) }, NOW, WINDOW)).toBe('not_editable');
  });
});

// ─── latestDeathPerParticipation / killerMapFromEntries ───────────────────────

describe('latestDeathPerParticipation', () => {
  const row = (participationId: string, minute: number, selection: KillerSelection = NO_KILLER) => ({
    participationId,
    createdAt: new Date(Date.UTC(2026, 10, 27, 20, minute)),
    ...selection,
  });

  it('returns one entry per dead player, oldest death first', () => {
    const entries = latestDeathPerParticipation([row(BEN, 1, opponent(CAT, TYMNA)), row(ANA, 5)]);
    expect(entries).toEqual([
      { participationId: BEN, ...opponent(CAT, TYMNA) },
      { participationId: ANA, ...NO_KILLER },
    ]);
  });

  it('uses the latest death of a player marked dead twice, for both the selection and the order', () => {
    // Ben was marked dead by two devices (minute 1 and minute 6); Ana died in between.
    const entries = latestDeathPerParticipation([
      row(BEN, 1, opponent(CAT, TYMNA)),
      row(ANA, 5, SELF_INFLICTED),
      row(BEN, 6, opponent(ANA, ATRAXA)),
    ]);
    expect(entries.map((e) => e.participationId)).toEqual([ANA, BEN]);
    expect(entries[1]).toEqual({ participationId: BEN, ...opponent(ANA, ATRAXA) });
  });

  it('returns nothing for a match with no deaths', () => {
    expect(latestDeathPerParticipation([])).toEqual([]);
  });
});

describe('killerMapFromEntries', () => {
  it('keeps only deaths that have something selected', () => {
    expect(
      killerMapFromEntries([
        { participationId: ANA, ...NO_KILLER },
        { participationId: BEN, ...opponent(CAT, TYMNA) },
        { participationId: CAT, ...SELF_INFLICTED },
      ]),
    ).toEqual({ [BEN]: opponent(CAT, TYMNA), [CAT]: SELF_INFLICTED });
  });
});

// ─── effectiveDeathOrder / deadBefore ─────────────────────────────────────────

describe('effectiveDeathOrder', () => {
  it("uses the server's order for the deaths it knows", () => {
    expect(effectiveDeathOrder([BEN, ANA], [ANA, BEN], new Set([ANA, BEN]))).toEqual([BEN, ANA]);
  });

  it('puts a death the server has not reported yet last', () => {
    expect(effectiveDeathOrder([BEN], [CAT, BEN], new Set([BEN, CAT]))).toEqual([BEN, CAT]);
  });

  it('leaves out players who are no longer dead', () => {
    expect(effectiveDeathOrder([BEN, ANA], [BEN, ANA], new Set([ANA]))).toEqual([ANA]);
  });

  it('includes a dead player neither list mentions yet', () => {
    expect(effectiveDeathOrder([], [], new Set([ANA]))).toEqual([ANA]);
  });
});

describe('deadBefore', () => {
  it('lists the players who died earlier', () => {
    expect(deadBefore([BEN, ANA, CAT], CAT)).toEqual([BEN, ANA]);
    expect(deadBefore([BEN, ANA, CAT], BEN)).toEqual([]);
  });

  it('is empty for a player who is not in the order', () => {
    expect(deadBefore([BEN], ANA)).toEqual([]);
  });
});

// ─── killerOptionsForDeath ────────────────────────────────────────────────────

describe('killerOptionsForDeath', () => {
  // Seat order: Ana, Ben, Cat (partners), Dan.
  const participants: KillerParticipant[] = [
    { participationId: ANA, playerName: 'Ana', commanders: [{ id: ATRAXA, name: "Atraxa, Praetors' Voice" }] },
    { participationId: BEN, playerName: 'Ben', commanders: [{ id: KRENKO, name: 'Krenko, Mob Boss' }] },
    {
      participationId: CAT,
      playerName: 'Cat',
      commanders: [
        { id: TYMNA, name: 'Tymna the Weaver' },
        { id: THRASIOS, name: 'Thrasios, Triton Hero' },
      ],
    },
    { participationId: DAN, playerName: 'Dan', commanders: [{ id: EDGAR, name: 'Edgar Markov' }] },
  ];

  it("offers every opposing commander, in seat order, never the dead player's own", () => {
    const options = killerOptionsForDeath({ deadParticipationId: ANA, participants, deadBefore: [] });
    expect(options.map((o) => o.commanderName)).toEqual([
      'Krenko, Mob Boss',
      'Tymna the Weaver',
      'Thrasios, Triton Hero',
      'Edgar Markov',
    ]);
    expect(options.some((o) => o.participationId === ANA)).toBe(false);
  });

  it('gives a partner deck one button per commander, both under the same player', () => {
    const cats = killerOptionsForDeath({ deadParticipationId: ANA, participants, deadBefore: [] }).filter(
      (o) => o.participationId === CAT,
    );
    expect(cats).toEqual([
      { key: `${CAT}:${TYMNA}`, participationId: CAT, commanderId: TYMNA, commanderName: 'Tymna the Weaver', playerName: 'Cat' },
      {
        key: `${CAT}:${THRASIOS}`,
        participationId: CAT,
        commanderId: THRASIOS,
        commanderName: 'Thrasios, Triton Hero',
        playerName: 'Cat',
      },
    ]);
  });

  it('leaves out players who were already dead when this player died', () => {
    // Ben died first, then Ana.
    const options = killerOptionsForDeath({ deadParticipationId: ANA, participants, deadBefore: [BEN] });
    expect(options.map((o) => o.playerName)).toEqual(['Cat', 'Cat', 'Dan']);
  });

  it('still offers a player who died AFTER this one', () => {
    // Ben died first: Ana (who died later) was alive then, so she is offered to Ben.
    const options = killerOptionsForDeath({ deadParticipationId: BEN, participants, deadBefore: [] });
    expect(options.map((o) => o.playerName)).toEqual(['Ana', 'Cat', 'Cat', 'Dan']);
  });

  it('keeps the selected killer on offer even if the rule would leave them out', () => {
    const options = killerOptionsForDeath({
      deadParticipationId: ANA,
      participants,
      deadBefore: [BEN],
      selection: opponent(BEN, KRENKO),
    });
    expect(options.map((o) => o.playerName)).toEqual(['Ben', 'Cat', 'Cat', 'Dan']);
  });

  it('offers nobody when everyone else was already dead', () => {
    expect(killerOptionsForDeath({ deadParticipationId: ANA, participants, deadBefore: [BEN, CAT, DAN] })).toEqual([]);
  });

  it('has unique keys', () => {
    const keys = killerOptionsForDeath({ deadParticipationId: ANA, participants, deadBefore: [] }).map((o) => o.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ─── tap rule ─────────────────────────────────────────────────────────────────

describe('toggleKillerSelection', () => {
  it('selects when nothing is selected', () => {
    expect(toggleKillerSelection(undefined, opponent(BEN, KRENKO))).toEqual(opponent(BEN, KRENKO));
    expect(toggleKillerSelection(NO_KILLER, SELF_INFLICTED)).toEqual(SELF_INFLICTED);
  });

  it('switches when another option is tapped', () => {
    expect(toggleKillerSelection(opponent(BEN, KRENKO), opponent(CAT, TYMNA))).toEqual(opponent(CAT, TYMNA));
    expect(toggleKillerSelection(opponent(BEN, KRENKO), SELF_INFLICTED)).toEqual(SELF_INFLICTED);
    // The other partner of the same player is a different option.
    expect(toggleKillerSelection(opponent(CAT, TYMNA), opponent(CAT, THRASIOS))).toEqual(opponent(CAT, THRASIOS));
  });

  it('clears when the selected option is tapped again', () => {
    expect(toggleKillerSelection(opponent(BEN, KRENKO), opponent(BEN, KRENKO))).toEqual(NO_KILLER);
    expect(toggleKillerSelection(SELF_INFLICTED, SELF_INFLICTED)).toEqual(NO_KILLER);
  });
});

describe('isOptionSelected / selectionForOption', () => {
  const tymna = { key: 'k1', participationId: CAT, commanderId: TYMNA, commanderName: 'Tymna', playerName: 'Cat' };
  const thrasios = { key: 'k2', participationId: CAT, commanderId: THRASIOS, commanderName: 'Thrasios', playerName: 'Cat' };

  it('an option selects its own player and commander', () => {
    expect(selectionForOption(tymna)).toEqual(opponent(CAT, TYMNA));
  });

  it('lights up only the selected commander of a partner deck', () => {
    expect(isOptionSelected(opponent(CAT, TYMNA), tymna)).toBe(true);
    expect(isOptionSelected(opponent(CAT, TYMNA), thrasios)).toBe(false);
  });

  it('lights up nothing for "self", "clear" or another player', () => {
    expect(isOptionSelected(SELF_INFLICTED, tymna)).toBe(false);
    expect(isOptionSelected(NO_KILLER, tymna)).toBe(false);
    expect(isOptionSelected(undefined, tymna)).toBe(false);
    expect(isOptionSelected(opponent(BEN, KRENKO), tymna)).toBe(false);
  });

  it("lights up all of a player's commanders when no commander was named", () => {
    expect(isOptionSelected(opponent(CAT, null), tymna)).toBe(true);
    expect(isOptionSelected(opponent(CAT, null), thrasios)).toBe(true);
  });
});

describe('sameKillerSelection', () => {
  it('treats undefined, null and NO_KILLER as the same', () => {
    expect(sameKillerSelection(undefined, NO_KILLER)).toBe(true);
    expect(sameKillerSelection(null, undefined)).toBe(true);
  });
});

// ─── mergeRemoteKillers ───────────────────────────────────────────────────────

describe('mergeRemoteKillers', () => {
  const noWrites = () => undefined;

  it("adopts another device's selection", () => {
    const local = {};
    const merged = mergeRemoteKillers({
      local,
      remote: { [ANA]: opponent(BEN, KRENKO) },
      requestedAtMs: 1000,
      writeState: noWrites,
    });
    expect(merged).toEqual({ [ANA]: opponent(BEN, KRENKO) });
  });

  it("adopts another device's change and its clearing", () => {
    const local = { [ANA]: opponent(BEN, KRENKO), [CAT]: SELF_INFLICTED };
    const merged = mergeRemoteKillers({
      local,
      remote: { [ANA]: opponent(CAT, TYMNA) }, // Ana switched, Cat cleared
      requestedAtMs: 1000,
      writeState: noWrites,
    });
    expect(merged).toEqual({ [ANA]: opponent(CAT, TYMNA) });
  });

  it('keeps a local choice whose save is waiting or in flight', () => {
    const local = { [ANA]: opponent(BEN, KRENKO) };
    const merged = mergeRemoteKillers({
      local,
      remote: {}, // the server has not seen it yet
      requestedAtMs: 5000,
      writeState: (pid) => (pid === ANA ? { busy: true, settledAtMs: 0 } : undefined),
    });
    expect(merged).toBe(local);
  });

  it('keeps a local choice against a poll that was sent before the save came back', () => {
    const local = { [ANA]: opponent(BEN, KRENKO) };
    const merged = mergeRemoteKillers({
      local,
      remote: { [ANA]: opponent(CAT, TYMNA) }, // stale: built before our write
      requestedAtMs: 1000,
      writeState: () => ({ busy: false, settledAtMs: 1500 }),
    });
    expect(merged).toBe(local);
  });

  it('keeps a local CLEAR against a stale poll that still has the old selection', () => {
    const local = {};
    const merged = mergeRemoteKillers({
      local,
      remote: { [ANA]: opponent(BEN, KRENKO) },
      requestedAtMs: 1000,
      writeState: () => ({ busy: false, settledAtMs: 1500 }),
    });
    expect(merged).toBe(local);
  });

  it('lets the server speak again once a poll was sent after the save came back', () => {
    const local = { [ANA]: opponent(BEN, KRENKO) };
    const merged = mergeRemoteKillers({
      local,
      remote: { [ANA]: opponent(CAT, TYMNA) }, // another device chose after us
      requestedAtMs: 2000,
      writeState: () => ({ busy: false, settledAtMs: 1500 }),
    });
    expect(merged).toEqual({ [ANA]: opponent(CAT, TYMNA) });
  });

  it('drops a local choice the server never got, once the save has given up', () => {
    const local = { [ANA]: opponent(BEN, KRENKO) };
    const merged = mergeRemoteKillers({
      local,
      remote: {},
      requestedAtMs: 2000,
      writeState: () => ({ busy: false, settledAtMs: 1500 }),
    });
    expect(merged).toEqual({});
  });

  it('decides player by player', () => {
    const local = { [ANA]: opponent(BEN, KRENKO), [CAT]: SELF_INFLICTED };
    const merged = mergeRemoteKillers({
      local,
      remote: { [ANA]: opponent(DAN, EDGAR), [CAT]: opponent(DAN, EDGAR) },
      requestedAtMs: 1000,
      // Ana's save is in flight; nobody here touched Cat.
      writeState: (pid) => (pid === ANA ? { busy: true, settledAtMs: 0 } : undefined),
    });
    expect(merged).toEqual({ [ANA]: opponent(BEN, KRENKO), [CAT]: opponent(DAN, EDGAR) });
  });

  it('returns the same object when nothing changed, so a quiet poll re-renders nothing', () => {
    const local = { [ANA]: opponent(BEN, KRENKO) };
    const merged = mergeRemoteKillers({
      local,
      remote: { [ANA]: opponent(BEN, KRENKO) },
      requestedAtMs: 1000,
      writeState: noWrites,
    });
    expect(merged).toBe(local);
  });
});
