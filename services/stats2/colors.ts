/**
 * Colour stats — how a deck does against each colour, from duels.
 *
 * One source for the whole deck page (replaces both the Strong / Weak chips
 * and the separate Colour record, which could disagree — #15).
 *
 * For a deck and a colour X: the deck's duels against opponents whose
 * identity includes X. A three-colour opponent counts toward all three.
 *
 *   rawPct = wins ÷ (wins + losses)            ties shown, not counted
 *   adjPct = (wins + 2.5) ÷ (wins + losses + 5)  pulls small samples to 50 %
 *
 * The sample label is counted in MATCHES, not duels (spec decision 1): one
 * 4-player win is three duels, so three such wins read 9–0 from three games.
 * Strong / weak chips only consider colours at "early" (5 matches) or better.
 */
import { type Duel, viewDuels } from './duels';
import { type SampleLevel, sampleLevel } from '@/services/reportShared';
import { COLOR_ORDER, type Color, pct } from './types';

export interface ColorRow {
  wins: number;
  losses: number;
  ties: number;
  duels: number;
  /** Distinct matches behind those duels — what the sample label counts. */
  matches: number;
  rawPct: number | null;
  adjPct: number;
  sample: SampleLevel;
}

export interface ColorStat extends ColorRow {
  color: Color;
}

export interface ColorCountStat extends ColorRow {
  /** Colours in the opponent's identity: 0 = colourless, 1 = mono … 5. */
  colorCount: number;
}

export interface DeckColorStats {
  /** Colours faced, in WUBRG order then colourless. */
  rows: ColorStat[];
  /** The colour(s) furthest above 50 % (adjusted). Empty when none qualifies. */
  strong: ColorStat[];
  /** The colour(s) furthest below 50 % (adjusted). Empty when none qualifies. */
  weak: ColorStat[];
  byColorCount: ColorCountStat[];
}

class Tally {
  wins = 0;
  losses = 0;
  ties = 0;
  matchIds = new Set<string>();

  add(result: 'win' | 'loss' | 'tie', matchId: string) {
    if (result === 'win') this.wins++;
    else if (result === 'loss') this.losses++;
    else this.ties++;
    this.matchIds.add(matchId);
  }

  row(): ColorRow {
    const decisive = this.wins + this.losses;
    return {
      wins: this.wins,
      losses: this.losses,
      ties: this.ties,
      duels: decisive + this.ties,
      matches: this.matchIds.size,
      rawPct: pct(this.wins, decisive),
      adjPct: Math.round(((this.wins + 2.5) / (decisive + 5)) * 1000) / 10,
      sample: sampleLevel(this.matchIds.size),
    };
  }
}

export function deckColorStats(duels: Duel[], deckId: string): DeckColorStats {
  const byColor = new Map<Color, Tally>();
  const byCount = new Map<number, Tally>();

  for (const v of viewDuels(duels, (s) => s.deckId === deckId)) {
    const colors = v.opponent.colors.length ? v.opponent.colors : (['C'] as Color[]);
    for (const color of new Set(colors)) {
      let tally = byColor.get(color);
      if (!tally) byColor.set(color, (tally = new Tally()));
      tally.add(v.result, v.duel.matchId);
    }
    const count = colors.filter((c) => c !== 'C').length;
    let countTally = byCount.get(count);
    if (!countTally) byCount.set(count, (countTally = new Tally()));
    countTally.add(v.result, v.duel.matchId);
  }

  const rows: ColorStat[] = COLOR_ORDER.filter((c) => byColor.has(c)).map((color) => ({
    color,
    ...byColor.get(color)!.row(),
  }));

  // Chips: largest gap from 50 % among colours with a real sample.
  const eligible = rows.filter((r) => r.sample === 'solid' || r.sample === 'early');
  const best = Math.max(0, ...eligible.map((r) => r.adjPct - 50));
  const worst = Math.min(0, ...eligible.map((r) => r.adjPct - 50));
  const strong = best > 0 ? eligible.filter((r) => r.adjPct - 50 === best) : [];
  const weak = worst < 0 ? eligible.filter((r) => r.adjPct - 50 === worst) : [];

  const byColorCount: ColorCountStat[] = [...byCount.entries()]
    .sort(([x], [y]) => x - y)
    .map(([colorCount, tally]) => ({ colorCount, ...tally.row() }));

  return { rows, strong, weak, byColorCount };
}
