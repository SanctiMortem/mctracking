/**
 * Stats v2 — the API payloads (shape.ts) and how the ranking screens combine
 * them with the current stats (view.ts).
 *
 * The property that matters most: with no v2 data, or with a payload that
 * does not look right, the screens get the current lists back untouched.
 */
import type { PlayerRanking } from '@/services/stats';
import type { RankingListV2 } from '@/services/stats2/contract';
import type { LoadedStats } from '@/services/stats2/load';
import { headToHead } from '@/services/stats2/matchups';
import { shapeDeckColors, shapeMatchup, shapePlayerExtras, shapeRankings } from '@/services/stats2/shape';
import type { MatchInput } from '@/services/stats2/types';
import { mergePlayerRankings, orderByRanking, signedOneDecimal } from '@/services/stats2/view';

// ─── A tiny pod ──────────────────────────────────────────────────────────────

let seq = 0;

function match(players: string[], winner: string, diedFirst?: string): MatchInput {
  const id = `m${++seq}`;
  const start = new Date(Date.UTC(2026, 0, seq, 20));
  return {
    id,
    groupId: 'pod',
    createdBy: 'user',
    createdAt: start,
    endedAt: new Date(start.getTime() + 3600_000),
    isDraw: false,
    winnerParticipationId: `${id}:${winner}`,
    participations: players.map((p) => ({
      id: `${id}:${p}`,
      playerId: p,
      deckId: `deck-${p}`,
      commanderIds: [`cmdr-${p}`],
      colors: p === 'ana' ? ['W'] : ['G'],
      result: p === winner ? 'win' : 'lose',
      lifeTotal: 40,
      poisonCounters: 0,
      commanderDamage: {},
    })),
    events: diedFirst
      ? [{ participationId: `${id}:${diedFirst}`, type: 'player_died', delta: 0, at: new Date(start.getTime() + 600_000) }]
      : [],
  };
}

const trio = ['ana', 'beto', 'cata'];
const matches: MatchInput[] = [
  ...Array.from({ length: 4 }, () => match(trio, 'ana', 'cata')),
  ...Array.from({ length: 2 }, () => match(trio, 'beto', 'cata')),
  match(['ana', 'dani'], 'dani'),
  match(['ana', 'gone'], 'gone'),
];

const info = (name: string, deleted = false) => ({ name, deleted });
const loaded: LoadedStats = {
  matches,
  players: new Map([
    ['ana', { ...info('Ana'), accountUserId: 'u1' }],
    ['beto', { ...info('Beto'), accountUserId: null }],
    ['cata', { ...info('Cata'), accountUserId: null }],
    ['dani', { ...info('Dani'), accountUserId: null }],
    ['gone', { ...info('Gone', true), accountUserId: null }],
  ]),
  decks: new Map(
    ['ana', 'beto', 'cata', 'dani', 'gone'].map((p) => [
      `deck-${p}`,
      { ...info(`${p} deck`), archived: false, commanderIds: [`cmdr-${p}`], colors: p === 'ana' ? ['W'] : ['G'] },
    ]),
  ) as LoadedStats['decks'],
  commanders: new Map(
    ['ana', 'beto', 'cata', 'dani', 'gone'].map((p) => [`cmdr-${p}`, { ...info(`${p} commander`), colors: ['G'] }]),
  ) as LoadedStats['commanders'],
};

// ─── shape.ts ────────────────────────────────────────────────────────────────

describe('shapeRankings', () => {
  const rankings = shapeRankings(loaded);

  it('ranks players with enough matches and lists the rest as unranked', () => {
    expect(rankings.total_matches).toBe(8);
    expect(rankings.players.min_matches).toBe(3);
    expect(rankings.players.ranked.map((p) => [p.rank, p.name, p.matches, p.wins])).toEqual([
      [1, 'Ana', 8, 4],
      [2, 'Beto', 6, 2],
      [3, 'Cata', 6, 0],
    ]);
    // Dani won her only match: unranked, not first.
    expect(rankings.players.unranked.map((p) => [p.rank, p.name])).toEqual([[null, 'Dani']]);
  });

  it('leaves soft-deleted players out entirely', () => {
    const everyone = [...rankings.players.ranked, ...rankings.players.unranked].map((p) => p.id);
    expect(everyone).not.toContain('gone');
  });

  it('reports wins against expectation', () => {
    // Ana: 6 three-player games (2 expected) + 2 two-player games (1 expected); won 4.
    expect(rankings.players.ranked[0]).toMatchObject({ win_pct: 50, wins_vs_expected: 1, losses: 4, draws: 0 });
  });

  it('applies the deck and commander floor of 5', () => {
    expect(rankings.decks.min_matches).toBe(5);
    expect(rankings.decks.ranked.map((d) => d.id)).toEqual(['deck-ana', 'deck-beto', 'deck-cata']);
    expect(rankings.commanders.ranked.map((c) => c.name)).toEqual(['ana commander', 'beto commander', 'cata commander']);
  });
});

describe('shapeDeckColors', () => {
  it('returns snake_case rows with a sample counted in matches', () => {
    const colors = shapeDeckColors(matches, 'deck-ana');
    // Ana's deck faced green in all 8 matches: 4 wins over two green decks, 4 losses.
    expect(colors.rows).toEqual([
      { color: 'G', wins: 8, losses: 4, ties: 0, duels: 12, matches: 8, raw_pct: 66.7, adj_pct: 61.8, sample: 'early' },
    ]);
    expect(colors.strong.map((c) => c.color)).toEqual(['G']);
    expect(colors.weak).toEqual([]);
    expect(colors.by_color_count).toEqual([expect.objectContaining({ color_count: 1, matches: 8 })]);
  });
});

describe('shapeMatchup', () => {
  it('keeps wins + losses + ties equal to duels', () => {
    const m = shapeMatchup(headToHead(matches, 'player', 'ana', 'beto'));
    expect(m).toEqual({ a_wins: 4, b_wins: 2, ties: 0, duels: 6, shared_matches: 6, undecided_matches: 0 });
    expect(m.a_wins + m.b_wins + m.ties).toBe(m.duels);
  });
});

describe('shapePlayerExtras', () => {
  it('gives placement with its coverage', () => {
    const extras = shapePlayerExtras(matches, 'cata');
    // Cata tapped Dead first in all six of her matches.
    expect(extras).toEqual({
      matches: 6,
      wins: 0,
      expected_wins: 2,
      wins_vs_expected: -2,
      placement: {
        average: { value: 3, coverage: { used: 6, total: 6 } },
        top2_rate_pct: { value: 0, coverage: { used: 6, total: 6 } },
        first_out_rate_pct: { value: 100, coverage: { used: 6, total: 6 } },
      },
    });
  });

  it('shows no placement value without enough tracked games, and zeros for a stranger', () => {
    expect(shapePlayerExtras(matches, 'dani').placement.average).toEqual({ value: null, coverage: { used: 0, total: 1 } });
    expect(shapePlayerExtras(matches, 'nobody')).toMatchObject({ matches: 0, wins: 0, wins_vs_expected: 0 });
  });
});

// ─── view.ts ─────────────────────────────────────────────────────────────────

const current = (id: string, rank: number, matchesPlayed: number, wins: number): PlayerRanking =>
  ({
    player: { id, name: id } as PlayerRanking['player'],
    total_matches: matchesPlayed,
    wins,
    win_rate_pct: Math.round((wins / matchesPlayed) * 1000) / 10,
    rank,
  });

describe('mergePlayerRankings', () => {
  // Today's order: Dani (1 of 1) and the deleted player are on top.
  const today = [current('dani', 1, 1, 1), current('gone', 1, 1, 1), current('ana', 3, 8, 4), current('beto', 4, 6, 2), current('cata', 5, 6, 0)];
  const v2 = shapeRankings(loaded).players;

  it('returns the current list untouched when there is no v2 data', () => {
    for (const missing of [null, undefined]) {
      const rows = mergePlayerRankings(today, missing);
      expect(rows.map((r) => r.ranking)).toEqual(today);
      expect(rows.every((r) => r.winsVsExpected === null && !r.unranked)).toBe(true);
    }
  });

  it('returns the current list untouched when the payload is not a ranking', () => {
    const broken = { ranked: 'nope' } as unknown as RankingListV2;
    expect(mergePlayerRankings(today, broken).map((r) => r.ranking)).toEqual(today);
    const strangers: RankingListV2 = { min_matches: 3, ranked: [{ ...v2.ranked[0], id: 'someone-else' }], unranked: [] };
    expect(mergePlayerRankings(today, strangers).map((r) => r.ranking)).toEqual(today);
  });

  it('uses the v2 order and rank, keeps the current row, and puts unranked players last', () => {
    const rows = mergePlayerRankings(today, v2);
    expect(rows.map((r) => [r.ranking.player.id, r.ranking.rank, r.unranked])).toEqual([
      ['ana', 1, false],
      ['beto', 2, false],
      ['cata', 3, false],
      ['dani', 0, true],
    ]);
    expect(rows[0].ranking.total_matches).toBe(8);
    expect(rows[0].winsVsExpected).toBe(1);
  });
});

describe('orderByRanking', () => {
  const rows = [{ id: 'deck-cata' }, { id: 'deck-gone' }, { id: 'deck-ana' }, { id: 'deck-beto' }];
  const v2 = shapeRankings(loaded).decks;

  it('reorders by v2 and drops what v2 does not rank', () => {
    expect(orderByRanking(rows, (r) => r.id, v2).map((r) => r.id)).toEqual(['deck-ana', 'deck-beto', 'deck-cata']);
  });

  it('keeps the current order without usable v2 data', () => {
    expect(orderByRanking(rows, (r) => r.id, null)).toBe(rows);
    expect(orderByRanking(rows, (r) => r.id, { min_matches: 5, ranked: [], unranked: [] })).toBe(rows);
  });
});

describe('signedOneDecimal', () => {
  it('always shows the sign of a gain', () => {
    expect([8.7, -10.8, 0, 0.04, -0.04].map(signedOneDecimal)).toEqual(['+8.7', '-10.8', '0.0', '0.0', '0.0']);
  });
});
