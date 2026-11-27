/**
 * Stats v2 — the pure calculations in services/stats2.
 *
 * The four data-coverage cases the spec asks for (section 7) come first:
 * winner only, deaths but no turns, turns but no deaths, everything recorded.
 * Nothing may throw or produce NaN on partial data.
 */
import { deckColorStats } from '@/services/stats2/colors';
import { buildAllDuels, buildDuels } from '@/services/stats2/duels';
import { bestWorstMatchups, deckMatchups, headToHead } from '@/services/stats2/matchups';
import { derivePlacements, placementStats } from '@/services/stats2/placements';
import { rankPlayers } from '@/services/stats2/rankings';
import type { Color, EventInput, EventKind, MatchInput, ParticipationInput } from '@/services/stats2/types';

// ─── Builders ────────────────────────────────────────────────────────────────

let matchSeq = 0;

interface Seat {
  player: string;
  deck?: string;
  commanders?: string[];
  colors?: Color[];
  life?: number;
  poison?: number;
  commanderDamage?: Record<string, number>;
}

interface MatchSpec {
  seats: Seat[];
  /** Player name of the winner; 'draw'; or null for a match with no usable result. */
  winner: string | 'draw' | null;
  /** [player, kind, second-of-match, delta?] */
  events?: [string, EventKind, number, number?][];
  day?: number;
}

function match(spec: MatchSpec): MatchInput {
  const id = `m${++matchSeq}`;
  const start = new Date(Date.UTC(2026, 0, spec.day ?? matchSeq, 20, 0, 0));
  const pid = (player: string) => `${id}:${player}`;
  const isDraw = spec.winner === 'draw';
  const participations: ParticipationInput[] = spec.seats.map((s) => ({
    id: pid(s.player),
    playerId: s.player,
    deckId: s.deck ?? `${s.player}-deck`,
    commanderIds: s.commanders ?? [`${s.deck ?? `${s.player}-deck`}-cmdr`],
    colors: s.colors ?? ['G'],
    result: spec.winner === null ? null : isDraw ? 'draw' : s.player === spec.winner ? 'win' : 'lose',
    lifeTotal: s.life ?? 40,
    poisonCounters: s.poison ?? 0,
    commanderDamage: s.commanderDamage ?? {},
  }));
  const events: EventInput[] = (spec.events ?? []).map(([player, type, second, delta]) => ({
    participationId: pid(player),
    type,
    delta: delta ?? 0,
    at: new Date(start.getTime() + second * 1000),
  }));
  return {
    id,
    groupId: 'pod',
    createdBy: 'user',
    createdAt: start,
    endedAt: new Date(start.getTime() + 3600_000),
    isDraw,
    winnerParticipationId: spec.winner && !isDraw ? pid(spec.winner) : null,
    participations,
    events,
  };
}

const four = (): Seat[] => [{ player: 'A' }, { player: 'B' }, { player: 'C' }, { player: 'D' }];

/** player → placement, for readable assertions. */
function placementsByPlayer(m: MatchInput): Record<string, number> {
  const result = derivePlacements(m);
  return Object.fromEntries(m.participations.map((p) => [p.playerId, result.placements.get(p.id)!]));
}

function expectAllFinite(value: unknown) {
  JSON.stringify(value, (_k, v) => {
    if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
    return v;
  });
}

// ─── The four coverage cases ─────────────────────────────────────────────────

describe('coverage case 1 — winner only', () => {
  const m = match({ seats: four(), winner: 'A' });

  it('places the winner first and ties everyone else', () => {
    expect(placementsByPlayer(m)).toEqual({ A: 1, B: 2, C: 2, D: 2 });
    const result = derivePlacements(m);
    expect(result.source).toBe('winner_only');
    expect(result.unresolvedLosers).toBe(3);
  });

  it('gives three duels in both modes — losers never beat each other', () => {
    expect(buildDuels(m)).toHaveLength(3);
    expect(buildDuels(m, 'placement')).toHaveLength(3);
  });

  it('feeds winner-based stats and nothing that needs more', () => {
    expect(rankPlayers([m], { minMatches: 1 }).ranked.map((r) => [r.id, r.wins])).toEqual(
      expect.arrayContaining([['A', 1], ['B', 0]]),
    );
    const stats = placementStats([m], (p) => p.playerId === 'A');
    expect(stats.averagePlacement).toEqual({ value: null, coverage: { used: 0, total: 1 } });
    expect(stats.firstOutRatePct.value).toBeNull();
  });
});

describe('coverage case 2 — deaths but no turns', () => {
  // D taps Dead first, then C. B never does: B was the last opponent standing.
  const m = match({
    seats: four(),
    winner: 'A',
    events: [['D', 'player_died', 600], ['C', 'player_died', 1500]],
  });

  it('orders the dead from last to die to first', () => {
    expect(placementsByPlayer(m)).toEqual({ A: 1, B: 2, C: 3, D: 4 });
    const result = derivePlacements(m);
    expect(result.source).toBe('derived');
    expect(result.unresolvedLosers).toBe(1);
  });

  it('gives six duels in placement mode and still three in winner-only mode', () => {
    expect(buildDuels(m, 'placement')).toHaveLength(6);
    expect(buildDuels(m)).toHaveLength(3);
  });
});

describe('coverage case 3 — turns but no deaths', () => {
  const m = match({
    seats: four(),
    winner: 'B',
    events: [['A', 'turn_passed', 0], ['B', 'turn_passed', 120], ['C', 'turn_passed', 300], ['D', 'turn_passed', 420]],
  });

  it('does not treat turn events as evidence of anything', () => {
    expect(placementsByPlayer(m)).toEqual({ A: 2, B: 1, C: 2, D: 2 });
    expect(derivePlacements(m).source).toBe('winner_only');
  });
});

describe('coverage case 4 — everything recorded', () => {
  // D taps Dead at 10:00. C never taps but ends at -2 life; C's last life
  // event (25:00) is the time of death. B survives to the end.
  const m = match({
    seats: [{ player: 'A' }, { player: 'B', life: 12 }, { player: 'C', life: -2 }, { player: 'D', life: 3 }],
    winner: 'A',
    events: [
      ['A', 'turn_passed', 0],
      ['C', 'life_change', 300, -20],
      ['D', 'player_died', 600],
      ['B', 'turn_passed', 700],
      ['C', 'life_change', 1500, -22],
      ['B', 'life_change', 1600, -28],
    ],
  });

  it('combines the Dead tap with the final life totals', () => {
    expect(placementsByPlayer(m)).toEqual({ A: 1, B: 2, C: 3, D: 4 });
    expect(derivePlacements(m).unresolvedLosers).toBe(1);
  });

  it('counts the match in placement stats once enough matches exist', () => {
    const five = Array.from({ length: 5 }, () => m);
    const d = placementStats(five, (p) => p.playerId === 'D');
    expect(d.averagePlacement).toEqual({ value: 4, coverage: { used: 5, total: 5 } });
    expect(d.firstOutRatePct.value).toBe(100);
    expect(d.top2RatePct.value).toBe(0);
    expect(placementStats(five, (p) => p.playerId === 'B').top2RatePct.value).toBe(100);
  });
});

// ─── Placement details ───────────────────────────────────────────────────────

describe('derivePlacements', () => {
  it('reads lethal poison and lethal commander damage as dead', () => {
    const m = match({
      seats: [
        { player: 'A' },
        { player: 'B', poison: 10 },
        { player: 'C', commanderDamage: { x: 9, y: 21 } },
        { player: 'D', commanderDamage: { x: 20, y: 20 } },
      ],
      winner: 'A',
      events: [['B', 'poison_change', 900, 10], ['C', 'commander_damage', 400, 21]],
    });
    // D has 40 damage in total but under 21 from any one commander: alive.
    expect(placementsByPlayer(m)).toEqual({ A: 1, D: 2, B: 3, C: 4 });
  });

  it('puts players who are dead at an unknown time last, tied', () => {
    const m = match({
      seats: [{ player: 'A' }, { player: 'B', life: 0 }, { player: 'C', life: -5 }, { player: 'D' }],
      winner: 'A',
      events: [['D', 'player_died', 100]],
    });
    expect(placementsByPlayer(m)).toEqual({ A: 1, D: 2, B: 3, C: 3 });
  });

  it('never marks the winner as dead', () => {
    const m = match({ seats: [{ player: 'A', life: -3 }, { player: 'B' }], winner: 'A' });
    expect(placementsByPlayer(m)).toEqual({ A: 1, B: 2 });
  });

  it('gives everyone first place in a draw', () => {
    const m = match({ seats: four(), winner: 'draw' });
    expect(placementsByPlayer(m)).toEqual({ A: 1, B: 1, C: 1, D: 1 });
    expect(buildDuels(m).every((d) => d.outcome === 'tie')).toBe(true);
    expect(buildDuels(m)).toHaveLength(6);
  });

  it('returns nothing, without throwing, for a match with no usable result', () => {
    const m = match({ seats: four(), winner: null });
    expect(derivePlacements(m).placements.size).toBe(0);
    expect(buildDuels(m)).toEqual([]);
    expect(buildDuels(m, 'placement')).toEqual([]);
    expect(rankPlayers([m], { minMatches: 1 })).toEqual({ ranked: [], unranked: [] });
  });

  it('leaves out of placement stats a match where two losers have no evidence', () => {
    const m = match({ seats: four(), winner: 'A', events: [['D', 'player_died', 100]] });
    expect(derivePlacements(m).unresolvedLosers).toBe(2);
    const stats = placementStats(Array.from({ length: 6 }, () => m), (p) => p.playerId === 'D');
    expect(stats.firstOutRatePct).toEqual({ value: null, coverage: { used: 0, total: 6 } });
  });
});

// ─── Head-to-head ────────────────────────────────────────────────────────────

describe('headToHead', () => {
  const seats = (): Seat[] => [{ player: 'A' }, { player: 'B' }, { player: 'C' }];
  const matches = [
    match({ seats: seats(), winner: 'A' }),
    match({ seats: seats(), winner: 'B' }),
    match({ seats: seats(), winner: 'C' }),
    match({ seats: seats(), winner: 'draw' }),
    match({ seats: [{ player: 'A' }, { player: 'B' }], winner: 'B' }),
  ];

  it('adds up, and reports the matches a third player won separately', () => {
    const h = headToHead(matches, 'player', 'A', 'B');
    expect(h).toEqual({ aWins: 1, bWins: 2, ties: 1, duels: 4, sharedMatches: 5, undecidedMatches: 1 });
    expect(h.aWins + h.bWins + h.ties).toBe(h.duels);
  });

  it('keeps only two-player matches with the 1v1 filter', () => {
    expect(headToHead(matches, 'player', 'A', 'B', { oneVsOne: true })).toEqual({
      aWins: 0, bWins: 1, ties: 0, duels: 1, sharedMatches: 1, undecidedMatches: 0,
    });
  });

  it('is symmetric', () => {
    const ab = headToHead(matches, 'player', 'A', 'B');
    const ba = headToHead(matches, 'player', 'B', 'A');
    expect([ba.aWins, ba.bWins, ba.ties, ba.duels]).toEqual([ab.bWins, ab.aWins, ab.ties, ab.duels]);
  });

  it('counts a commander win by the second player running it', () => {
    // Two players run commander X; the second one in seat order wins.
    const m = match({
      seats: [
        { player: 'A', deck: 'a', commanders: ['X'] },
        { player: 'B', deck: 'b', commanders: ['Y'] },
        { player: 'C', deck: 'c', commanders: ['X'] },
      ],
      winner: 'C',
    });
    expect(headToHead([m], 'commander', 'X', 'Y')).toMatchObject({ aWins: 1, bWins: 0, duels: 1 });
  });

  it('does not count a partner deck holding both commanders as a meeting', () => {
    const m = match({
      seats: [{ player: 'A', deck: 'a', commanders: ['X', 'Y'] }, { player: 'B', deck: 'b', commanders: ['Z'] }],
      winner: 'A',
    });
    expect(headToHead([m], 'commander', 'X', 'Y')).toEqual({
      aWins: 0, bWins: 0, ties: 0, duels: 0, sharedMatches: 0, undecidedMatches: 0,
    });
  });
});

// ─── Deck matchups ───────────────────────────────────────────────────────────

describe('deckMatchups', () => {
  const seats = (): Seat[] => [
    { player: 'A', deck: 'slivers' },
    { player: 'B', deck: 'goblins' },
    { player: 'C', deck: 'elves' },
  ];
  const matches = [
    match({ seats: seats(), winner: 'A' }),
    match({ seats: seats(), winner: 'A' }),
    match({ seats: seats(), winner: 'B' }),
    match({ seats: seats(), winner: 'C' }),
    match({ seats: seats(), winner: 'C' }),
  ];
  const records = deckMatchups(buildAllDuels(matches), 'slivers');
  const byDeck = Object.fromEntries(records.map((r) => [r.opponentDeckId, r]));

  it('counts only matches one of the two decks won', () => {
    expect(byDeck.goblins).toMatchObject({ wins: 2, losses: 1, matches: 3, winPct: 66.7 });
    expect(byDeck.elves).toMatchObject({ wins: 2, losses: 2, matches: 4, winPct: 50 });
  });

  it('lists an opponent as best or worst only off 50 % and with enough matches', () => {
    const { best, worst } = bestWorstMatchups(records);
    expect(best.map((r) => r.opponentDeckId)).toEqual(['goblins']);
    expect(worst).toEqual([]);
    expect(bestWorstMatchups(records, { minMatches: 4 }).best).toEqual([]);
  });

  it('ignores a mirror — the same deck on both sides', () => {
    const mirror = match({
      seats: [{ player: 'A', deck: 'slivers' }, { player: 'B', deck: 'slivers' }, { player: 'C', deck: 'elves' }],
      winner: 'A',
    });
    const mirrored = deckMatchups(buildDuels(mirror), 'slivers');
    expect(mirrored.map((r) => r.opponentDeckId)).toEqual(['elves']);
    expect(mirrored[0]).toMatchObject({ wins: 1, losses: 0 });
  });
});

// ─── Colours ─────────────────────────────────────────────────────────────────

describe('deckColorStats', () => {
  const table = (): Seat[] => [
    { player: 'A', deck: 'mine', colors: ['W'] },
    { player: 'B', deck: 'b', colors: ['G'] },
    { player: 'C', deck: 'c', colors: ['G', 'U'] },
    { player: 'D', deck: 'd', colors: ['C'] },
  ];

  it('labels the sample by matches, not duels', () => {
    const three = Array.from({ length: 3 }, () => match({ seats: table(), winner: 'A' }));
    const stats = deckColorStats(buildAllDuels(three), 'mine');
    const green = stats.rows.find((r) => r.color === 'G')!;
    // Three wins against two green decks: 6 duels, but only 3 games.
    expect(green).toMatchObject({ wins: 6, losses: 0, duels: 6, matches: 3, rawPct: 100, sample: 'few' });
    expect(stats.strong).toEqual([]);
  });

  it('names a strong and a weak colour once the sample is real', () => {
    const matches = [
      ...Array.from({ length: 4 }, () => match({ seats: table(), winner: 'A' })),
      ...Array.from({ length: 6 }, () => match({ seats: table(), winner: 'D' })),
    ];
    const stats = deckColorStats(buildAllDuels(matches), 'mine');
    const byColor = Object.fromEntries(stats.rows.map((r) => [r.color, r]));
    expect(stats.rows.map((r) => r.color)).toEqual(['U', 'G', 'C']);
    expect(byColor.G).toMatchObject({ wins: 8, losses: 0, matches: 4, sample: 'few' });
    expect(byColor.C).toMatchObject({ wins: 4, losses: 6, matches: 10, rawPct: 40, sample: 'solid' });
    expect(byColor.C.adjPct).toBeCloseTo(43.3, 1);
    expect(stats.weak.map((r) => r.color)).toEqual(['C']);
    expect(stats.strong).toEqual([]);
    expect(stats.byColorCount.map((r) => [r.colorCount, r.wins, r.losses])).toEqual([
      [0, 4, 6], [1, 4, 0], [2, 4, 0],
    ]);
    expectAllFinite(stats);
  });

  it('is empty, not broken, for a deck that never played', () => {
    expect(deckColorStats([], 'mine')).toEqual({ rows: [], strong: [], weak: [], byColorCount: [] });
  });
});

// ─── Rankings ────────────────────────────────────────────────────────────────

describe('rankPlayers', () => {
  const pod = (winner: string) => match({ seats: [{ player: 'A' }, { player: 'B' }, { player: 'C' }], winner });
  const matches = [
    ...Array.from({ length: 6 }, () => pod('A')),
    ...Array.from({ length: 3 }, () => pod('B')),
    pod('C'),
    // A newcomer who played once and won.
    match({ seats: [{ player: 'Z' }, { player: 'A' }], winner: 'Z' }),
  ];
  const ranking = rankPlayers(matches);

  it('keeps a 1-for-1 player out of first place', () => {
    expect(ranking.ranked.map((r) => r.id)).toEqual(['A', 'B', 'C']);
    expect(ranking.ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(ranking.unranked.map((r) => [r.id, r.matches, r.rank])).toEqual([['Z', 1, null]]);
  });

  it('reports wins against what an average player would have won', () => {
    const a = ranking.ranked[0];
    // 10 three-player games (3.33 expected) + 1 two-player game (0.5).
    expect(a).toMatchObject({ matches: 11, wins: 6, losses: 5, winPct: 54.5, expectedWins: 3.83, winsVsExpected: 2.2 });
    expectAllFinite(ranking);
  });

  it('breaks a win-rate tie by matches played', () => {
    const tie = [pod('A'), pod('A'), pod('B'), pod('B'), match({ seats: [{ player: 'A' }, { player: 'C' }], winner: 'A' }),
      match({ seats: [{ player: 'A' }, { player: 'C' }], winner: 'C' })];
    // A: 3 of 6. B: 2 of 4. Same 50 %; A has more matches.
    expect(rankPlayers(tie).ranked.slice(0, 2).map((r) => r.id)).toEqual(['A', 'B']);
  });

  it('leaves out excluded (soft-deleted) players', () => {
    const ids = rankPlayers(matches, { exclude: new Set(['B']) }).ranked.map((r) => r.id);
    expect(ids).toEqual(['A', 'C']);
  });
});
