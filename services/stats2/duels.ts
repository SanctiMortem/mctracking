/**
 * Duel engine — one result model for matchups, head-to-head and colours.
 *
 * A duel is one pair of participations in one match, with an outcome for
 * that pair. Every stat that asks "how does X do against Y" counts duels, so
 * those stats cannot disagree with each other.
 *
 * Two modes (spec decision 2):
 *
 *   'winner_only'  (default — used by every stat today)
 *       The winner beats each loser. Two losers emit no duel: neither beat
 *       the other. In a draw every pair is a tie. A 4-player win is 3 duels.
 *       This is the same counting as the old "decisive matches" rule.
 *
 *   'placement'    (available, not used by any stat yet)
 *       Uses derivePlacements: the better placement wins the pair. Two
 *       losers with the same placement emit no duel. A fully resolved
 *       4-player match is 6 duels.
 *
 * Either way an average player sits at 50 %, whatever the pod size: in a
 * 4-player pod one win is three duel wins and each loss is one duel loss.
 * The catch is that one match can produce several duels, so SAMPLE SIZES
 * ARE COUNTED IN MATCHES, never in duels (spec decision 1).
 */
import { derivePlacements } from './placements';
import { type Color, type MatchInput, type ParticipationInput, matchOutcome, playedAt } from './types';

export interface DuelSide {
  participationId: string;
  playerId: string;
  deckId: string;
  commanderIds: string[];
  colors: Color[];
}

export interface Duel {
  matchId: string;
  a: DuelSide;
  b: DuelSide;
  outcome: 'a' | 'b' | 'tie';
  podSize: number;
  groupId: string | null;
  playedAt: Date;
}

export type DuelMode = 'winner_only' | 'placement';

function side(p: ParticipationInput): DuelSide {
  return {
    participationId: p.id,
    playerId: p.playerId,
    deckId: p.deckId,
    commanderIds: p.commanderIds,
    colors: p.colors,
  };
}

export function buildDuels(match: MatchInput, mode: DuelMode = 'winner_only'): Duel[] {
  const outcome = matchOutcome(match);
  if (outcome.kind === 'none') return [];

  const parts = match.participations;
  const base = {
    matchId: match.id,
    podSize: parts.length,
    groupId: match.groupId,
    playedAt: playedAt(match),
  };
  const duels: Duel[] = [];
  const placements = mode === 'placement' && outcome.kind === 'win' ? derivePlacements(match).placements : null;

  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i];
      const b = parts[j];
      let result: Duel['outcome'] | null = null;

      if (outcome.kind === 'draw') {
        result = 'tie';
      } else if (placements) {
        const pa = placements.get(a.id);
        const pb = placements.get(b.id);
        if (pa !== undefined && pb !== undefined && pa !== pb) result = pa < pb ? 'a' : 'b';
      } else if (a.id === outcome.winnerId) {
        result = 'a';
      } else if (b.id === outcome.winnerId) {
        result = 'b';
      }

      if (result) duels.push({ ...base, a: side(a), b: side(b), outcome: result });
    }
  }
  return duels;
}

export function buildAllDuels(matches: MatchInput[], mode: DuelMode = 'winner_only'): Duel[] {
  return matches.flatMap((m) => buildDuels(m, mode));
}

/**
 * A duel seen from one side. `me` is the side picked by `isMe`; duels where
 * neither or both sides match are skipped (both = a mirror, which says
 * nothing about the entity itself).
 */
export interface DuelView {
  duel: Duel;
  me: DuelSide;
  opponent: DuelSide;
  result: 'win' | 'loss' | 'tie';
}

export function viewDuels(duels: Duel[], isMe: (s: DuelSide) => boolean): DuelView[] {
  const views: DuelView[] = [];
  for (const duel of duels) {
    const aMine = isMe(duel.a);
    const bMine = isMe(duel.b);
    if (aMine === bMine) continue;
    const me = aMine ? duel.a : duel.b;
    const opponent = aMine ? duel.b : duel.a;
    const result = duel.outcome === 'tie' ? 'tie' : (duel.outcome === 'a') === aMine ? 'win' : 'loss';
    views.push({ duel, me, opponent, result });
  }
  return views;
}
