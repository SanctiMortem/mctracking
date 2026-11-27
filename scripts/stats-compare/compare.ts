/**
 * Stats comparison — current numbers next to stats v2, on the real matches.
 *
 * READ-ONLY. It calls the current stats functions (services/stats.ts) and the
 * new calculations (services/stats2), both of which only SELECT, and prints
 * them side by side. Nothing is written to the database.
 *
 * Run from the repo root, with DATABASE_URL pointing at the database to read:
 *
 *   npx tsx scripts/stats-compare/compare.ts                 # the pod with most matches
 *   npx tsx scripts/stats-compare/compare.ts --group <id>    # one pod
 *
 * The report is printed and saved to scripts/stats-compare/out/ (gitignored:
 * it contains player and deck names).
 *
 * Why: docs/STATS_REDESIGN_SPEC.md, "Rollout", step A — look at the numbers
 * before any screen changes.
 */
import fs from 'node:fs';
import path from 'node:path';

import { count, desc, eq } from 'drizzle-orm';

import { groups, matches } from '@/db/schema';
import { db } from '@/services/db';
import { getDeckStats, getGlobalStats, getMatchupStats } from '@/services/stats';
import { deckColorStats } from '@/services/stats2/colors';
import { buildAllDuels } from '@/services/stats2/duels';
import { type LoadedStats, loadStatsMatches } from '@/services/stats2/load';
import { bestWorstMatchups, deckMatchups, headToHead } from '@/services/stats2/matchups';
import { deathOf, derivePlacements, placementStats } from '@/services/stats2/placements';
import { rankDecks, rankPlayers } from '@/services/stats2/rankings';
import { matchOutcome } from '@/services/stats2/types';

// ─── Output ──────────────────────────────────────────────────────────────────

const lines: string[] = [];
const out = (line = '') => {
  lines.push(line);
  console.log(line);
};
const heading = (title: string) => {
  out();
  out(`━━ ${title} ${'━'.repeat(Math.max(0, 76 - title.length))}`);
};

function table(headers: string[], rows: (string | number | null)[][], rightAlign: number[] = []) {
  const cells = [headers, ...rows.map((r) => r.map((c) => (c === null ? '—' : String(c))))];
  const widths = headers.map((_, i) => Math.max(...cells.map((r) => r[i].length)));
  for (const [n, row] of cells.entries()) {
    out(
      '  ' +
        row
          .map((c, i) => (rightAlign.includes(i) ? c.padStart(widths[i]) : c.padEnd(widths[i])))
          .join('  ')
          .trimEnd(),
    );
    if (n === 0) out('  ' + widths.map((w) => '─'.repeat(w)).join('  '));
  }
}

const pctText = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}%`);
const signed = (v: number) => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1));

async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Missing DATABASE_URL.');
    process.exit(1);
  }
  const argv = process.argv.slice(2);
  const groupArg = argv.includes('--group') ? argv[argv.indexOf('--group') + 1] : null;

  // Which pod: the one asked for, or the one with the most completed matches.
  const podCounts = await db
    .select({ groupId: matches.groupId, n: count(matches.id) })
    .from(matches)
    .where(eq(matches.status, 'completed'))
    .groupBy(matches.groupId)
    .orderBy(desc(count(matches.id)));
  const groupId = groupArg ?? podCounts.find((p) => p.groupId)?.groupId ?? null;
  if (!groupId) {
    console.error('No pod with completed matches. Pass --group <id>.');
    process.exit(1);
  }
  const [pod] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!pod) {
    console.error(`No pod with id ${groupId}`);
    process.exit(1);
  }
  // The current stats functions take a viewer; the pod owner can see everything in the pod.
  const viewer = pod.ownerId;

  const endpoint = /@([a-z0-9-]+)/.exec(url)?.[1] ?? 'unknown host';
  out(`Stats comparison — current vs v2`);
  out(`Database endpoint: ${endpoint}   Pod: ${pod.name}   Run: ${new Date().toISOString()}`);
  out(`Read-only: nothing is written.`);

  const [scoped, everything] = await Promise.all([
    loadStatsMatches({ kind: 'group', groupId }),
    loadStatsMatches({ kind: 'all' }),
  ]);
  const playerName = (id: string) => scoped.players.get(id)?.name ?? everything.players.get(id)?.name ?? id.slice(0, 8);
  const deckName = (id: string) => everything.decks.get(id)?.name ?? id.slice(0, 8);

  coverageSection(scoped);
  const rankedPlayers = await rankingSection(scoped, viewer, groupId, playerName);
  await deckRankingSection(scoped, viewer, groupId, deckName);
  await headToHeadSection(scoped, viewer, groupId, rankedPlayers, playerName);
  await deckSections(scoped, everything, viewer, deckName);
  placementSection(scoped, rankedPlayers, playerName);

  const dir = path.join(path.dirname(new URL(import.meta.url).pathname), 'out');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `compare-${new Date().toISOString().slice(0, 10)}.txt`);
  fs.writeFileSync(file, lines.join('\n') + '\n');
  console.log(`\nSaved to ${path.relative(process.cwd(), file)}`);
}

// ─── 1. What the data can support ────────────────────────────────────────────

function coverageSection(data: LoadedStats) {
  heading('1. What was recorded');
  const ms = data.matches;
  const bySize = new Map<number, number>();
  let draws = 0;
  let noResult = 0;
  let withTap = 0;
  let withTurns = 0;
  let withCounters = 0;
  let winnerOnly = 0;
  let resolved = 0;
  let partly = 0;
  let taps = 0;
  let snapshotDeaths = 0;
  let untimedDeaths = 0;

  for (const m of ms) {
    bySize.set(m.participations.length, (bySize.get(m.participations.length) ?? 0) + 1);
    const outcome = matchOutcome(m);
    if (outcome.kind === 'draw') draws++;
    if (outcome.kind === 'none') noResult++;
    if (m.events.some((e) => e.type === 'player_died')) withTap++;
    if (m.events.some((e) => e.type === 'turn_passed')) withTurns++;
    if (m.events.some((e) => e.type !== 'player_died' && e.type !== 'turn_passed')) withCounters++;
    if (outcome.kind !== 'win') continue;

    const placement = derivePlacements(m);
    if (placement.source === 'winner_only') winnerOnly++;
    else if (placement.unresolvedLosers <= 1) resolved++;
    else partly++;
    for (const p of m.participations) {
      if (p.id === outcome.winnerId) continue;
      const death = deathOf(p, m);
      if (!death) continue;
      if (death.via === 'tap') taps++;
      else if (death.at === null) untimedDeaths++;
      else snapshotDeaths++;
    }
  }

  out(`  Completed matches: ${ms.length}   (${[...bySize.entries()].sort().map(([k, v]) => `${v} with ${k} players`).join(', ')})`);
  out(`  Draws: ${draws}   Without a usable result: ${noResult}`);
  out(`  With at least one Dead tap: ${withTap}   With turn tracking: ${withTurns}   With life/poison/commander taps: ${withCounters}`);
  out();
  out(`  Order of elimination (wins only):`);
  out(`    fully known ...................... ${resolved}`);
  out(`    partly known (2+ losers unclear) . ${partly}`);
  out(`    only the winner known ............ ${winnerOnly}`);
  out(`  Deaths found: ${taps} by Dead tap, ${snapshotDeaths} from final totals with a time, ${untimedDeaths} from final totals without a time`);
}

// ─── 2. Player ranking ───────────────────────────────────────────────────────

async function rankingSection(
  data: LoadedStats,
  viewer: string,
  groupId: string,
  playerName: (id: string) => string,
): Promise<string[]> {
  heading('2. Player ranking');
  const deleted = new Set([...data.players.entries()].filter(([, p]) => p.deleted).map(([id]) => id));
  const next = rankPlayers(data.matches, { exclude: deleted, nameOf: playerName });
  const { data: current } = await getGlobalStats(viewer, groupId, { limit: null });
  const oldRank = new Map(current.player_rankings.map((r) => [r.player.id, r]));

  out(`  Current: sorted by win % only, no minimum.   New: at least 3 matches, ties broken by matches, then recency.`);
  out();
  table(
    ['New', 'Now', 'Player', 'Matches', 'Wins', 'Win %', 'Wins vs expected'],
    next.ranked.map((r) => [
      r.rank,
      oldRank.get(r.id)?.rank ?? null,
      playerName(r.id),
      r.matches,
      r.wins,
      pctText(r.winPct),
      signed(r.winsVsExpected),
    ]),
    [0, 1, 3, 4, 5, 6],
  );
  if (next.unranked.length) {
    out();
    out(`  Unranked in the new list (fewer than 3 matches):`);
    table(
      ['Now', 'Player', 'Matches', 'Wins', 'Win %'],
      next.unranked.map((r) => [oldRank.get(r.id)?.rank ?? null, playerName(r.id), r.matches, r.wins, pctText(r.winPct)]),
      [0, 2, 3, 4],
    );
  }
  const gone = current.player_rankings.filter((r) => deleted.has(r.player.id));
  if (gone.length) {
    out();
    out(`  Deleted players the current list still shows: ${gone.map((r) => `${r.player.name} (#${r.rank})`).join(', ')}`);
  }
  // Sanity: both sides must agree on matches and wins.
  const mismatches = next.ranked
    .concat(next.unranked)
    .filter((r) => {
      const o = oldRank.get(r.id);
      return o && (o.total_matches !== r.matches || o.wins !== r.wins);
    });
  out();
  out(
    mismatches.length
      ? `  ⚠ Matches or wins differ for: ${mismatches.map((r) => playerName(r.id)).join(', ')}`
      : `  Check: matches and wins agree with the current stats for every player.`,
  );
  return next.ranked.map((r) => r.id);
}

// ─── 3. Top decks ────────────────────────────────────────────────────────────

async function deckRankingSection(
  data: LoadedStats,
  viewer: string,
  groupId: string,
  deckName: (id: string) => string,
) {
  heading('3. Top decks');
  const deleted = new Set([...data.decks.entries()].filter(([, d]) => d.deleted).map(([id]) => id));
  const next = rankDecks(data.matches, { exclude: deleted, nameOf: deckName });
  const { data: current } = await getGlobalStats(viewer, groupId, { limit: null });
  const oldOrder = current.top_decks.map((d) => d.deck.id);

  out(`  Both need 5 matches. New: ties broken by matches, then recency; deleted decks left out.`);
  out();
  table(
    ['New', 'Now', 'Deck', 'Matches', 'Wins', 'Win %', 'Wins vs expected'],
    next.ranked.slice(0, 15).map((r) => {
      const was = oldOrder.indexOf(r.id);
      return [r.rank, was === -1 ? null : was + 1, deckName(r.id), r.matches, r.wins, pctText(r.winPct), signed(r.winsVsExpected)];
    }),
    [0, 1, 3, 4, 5, 6],
  );
  const moved = next.ranked.filter((r, i) => oldOrder[i] !== r.id).length;
  const deletedShown = current.top_decks.filter((d) => deleted.has(d.deck.id));
  out();
  out(`  ${next.ranked.length} decks qualify (${current.top_decks.length} in the current list). ${moved} sit at a different position.`);
  if (deletedShown.length) out(`  Deleted decks the current list still shows: ${deletedShown.map((d) => d.deck.name).join(', ')}`);
}

// ─── 4. Head-to-head ─────────────────────────────────────────────────────────

async function headToHeadSection(
  data: LoadedStats,
  viewer: string,
  groupId: string,
  playerIds: string[],
  playerName: (id: string) => string,
) {
  heading('4. Head-to-head between ranked players');
  const pairs: [string, string][] = [];
  for (let i = 0; i < playerIds.length; i++) for (let j = i + 1; j < playerIds.length; j++) pairs.push([playerIds[i], playerIds[j]]);

  const rows = await inBatches(pairs, 4, async ([a, b]) => {
    const current = await getMatchupStats(viewer, 'player', a, b, 'all', groupId);
    const next = headToHead(data.matches, 'player', a, b);
    const now = 'data' in current ? current.data : null;
    const same =
      now && now.entity_a_wins === next.aWins && now.entity_b_wins === next.bWins && now.draws === next.ties && now.total_matches === next.sharedMatches;
    return {
      cells: [
        `${playerName(a)} vs ${playerName(b)}`,
        now ? `${now.entity_a_wins}–${now.entity_b_wins}` + (now.draws ? ` (${now.draws} draw)` : '') : 'n/a',
        now ? now.total_matches : null,
        `${next.aWins}–${next.bWins}` + (next.ties ? `–${next.ties}` : ''),
        next.sharedMatches,
        next.undecidedMatches,
        now ? (same ? '' : '← differs') : '',
      ] as (string | number | null)[],
      same: !!same,
      hasNow: !!now,
    };
  });

  out(`  "Neither ahead" = matches both played that a third player won. The current card shows them only as a gap.`);
  out();
  table(['Pair', 'Now W–L', 'Now shared', 'New W–L–T', 'New shared', 'Neither ahead', ''], rows.map((r) => r.cells), [2, 4, 5]);
  out();
  out(`  ${rows.filter((r) => r.same).length} of ${rows.filter((r) => r.hasNow).length} pairs have the same wins, draws and shared matches in both.`);
}

// ─── 5–6. Deck matchups and colours ──────────────────────────────────────────

async function deckSections(scoped: LoadedStats, everything: LoadedStats, viewer: string, deckName: (id: string) => string) {
  // The current deck page is unscoped (every completed match anywhere), so
  // the new numbers are computed over everything too.
  const duels = buildAllDuels(everything.matches);
  const played = new Map<string, number>();
  for (const m of everything.matches) for (const p of m.participations) played.set(p.deckId, (played.get(p.deckId) ?? 0) + 1);
  const inPod = new Set(scoped.matches.flatMap((m) => m.participations.map((p) => p.deckId)));
  const deckIds = [...inPod]
    .filter((id) => !everything.decks.get(id)?.deleted && (played.get(id) ?? 0) >= 3)
    .sort((a, b) => (played.get(b) ?? 0) - (played.get(a) ?? 0));

  const current = new Map(
    (
      await inBatches(deckIds, 4, async (id) => {
        const res = await getDeckStats(viewer, id);
        return [id, 'data' in res ? res.data : null] as const;
      })
    ).filter((entry): entry is readonly [string, NonNullable<(typeof entry)[1]>] => entry[1] !== null),
  );

  // ── Matchups
  heading('5. Deck best / worst matchups');
  const fmt = (list: { id: string; wins: number; matches: number }[]) =>
    list.map((r) => `${deckName(r.id)} ${r.wins}–${r.matches - r.wins}`).join(', ') || '—';
  let same = 0;
  const different: string[] = [];
  for (const id of deckIds) {
    const now = current.get(id);
    if (!now) continue;
    const next = bestWorstMatchups(deckMatchups(duels, id), { nameOf: deckName });
    const nowBest = now.best_matchups.map((m) => ({ id: m.deck.id, wins: m.wins, matches: m.matches }));
    const nowWorst = now.worst_matchups.map((m) => ({ id: m.deck.id, wins: m.wins, matches: m.matches }));
    const newBest = next.best.map((r) => ({ id: r.opponentDeckId, wins: r.wins, matches: r.matches }));
    const newWorst = next.worst.map((r) => ({ id: r.opponentDeckId, wins: r.wins, matches: r.matches }));
    if (JSON.stringify([nowBest, nowWorst]) === JSON.stringify([newBest, newWorst])) same++;
    else {
      different.push(`  ${deckName(id)}`);
      if (JSON.stringify(nowBest) !== JSON.stringify(newBest)) different.push(`      best   now: ${fmt(nowBest)}\n             new: ${fmt(newBest)}`);
      if (JSON.stringify(nowWorst) !== JSON.stringify(newWorst)) different.push(`      worst  now: ${fmt(nowWorst)}\n             new: ${fmt(newWorst)}`);
    }
  }
  out(`  Winner-only duels count the same thing as today's "decisive matches", so these should match.`);
  out(`  ${same} of ${current.size} decks (3+ matches) have identical best and worst matchups.`);
  for (const line of different) out(line);

  // ── Colours
  heading('6. Strong / weak colours');
  const chips = (list: { color: string }[]) => list.map((c) => c.color).join(' ') || '—';
  const colourDecks = deckIds.filter((id) => current.has(id) && (played.get(id) ?? 0) >= 5);
  let changed = 0;
  const rows: (string | number | null)[][] = [];
  for (const id of colourDecks) {
    const now = current.get(id)!;
    const next = deckColorStats(duels, id);
    const strongNow = chips(now.strong_against_colors);
    const weakNow = chips(now.weak_against_colors);
    const strongNew = next.strong.map((c) => `${c.color} ${c.adjPct.toFixed(0)}%`).join(' ') || '—';
    const weakNew = next.weak.map((c) => `${c.color} ${c.adjPct.toFixed(0)}%`).join(' ') || '—';
    const differs = strongNow !== chips(next.strong) || weakNow !== chips(next.weak);
    if (differs) changed++;
    rows.push([deckName(id), played.get(id) ?? 0, strongNow, strongNew, weakNow, weakNew, differs ? '← differs' : '']);
  }
  out(`  Current: colour(s) with the best / worst wins − losses, any sample size, symbols only.`);
  out(`  New: furthest from 50 % after pulling small samples in, and only with 5+ matches against that colour.`);
  out();
  table(['Deck', 'Matches', 'Strong now', 'Strong new', 'Weak now', 'Weak new', ''], rows, [1]);
  out();
  out(`  ${changed} of ${colourDecks.length} decks (5+ matches) show different chips.`);

  out();
  out(`  Per-colour detail for the five most played decks ("Record now" is the current Colour record, counted once per match):`);
  for (const id of colourDecks.slice(0, 5)) {
    const now = current.get(id)!;
    const next = deckColorStats(duels, id);
    const record = new Map(now.color_record.map((c) => [c.color, c]));
    out();
    out(`  ${deckName(id)} — ${played.get(id)} matches`);
    table(
      ['Colour', 'Record now', 'New W–L', 'Matches', 'Raw %', 'Adjusted %', 'Sample'],
      next.rows.map((r) => {
        const old = record.get(r.color);
        return [
          r.color,
          old ? `${old.wins}–${old.losses}` : null,
          `${r.wins}–${r.losses}` + (r.ties ? `–${r.ties}` : ''),
          r.matches,
          pctText(r.rawPct),
          `${r.adjPct.toFixed(1)}%`,
          r.sample,
        ];
      }),
      [3, 4, 5],
    );
  }
}

// ─── 7. Placement preview ────────────────────────────────────────────────────

function placementSection(data: LoadedStats, playerIds: string[], playerName: (id: string) => string) {
  heading('7. Placement (new, descriptive only)');
  out(`  Uses only wins whose order of elimination is fully known. "—" means fewer than 5 such matches.`);
  out();
  table(
    ['Player', 'Avg placement', 'Top 2', 'First out', 'Based on'],
    playerIds.map((id) => {
      const s = placementStats(data.matches, (p) => p.playerId === id);
      return [
        playerName(id),
        s.averagePlacement.value === null ? null : s.averagePlacement.value.toFixed(1),
        pctText(s.top2RatePct.value),
        pctText(s.firstOutRatePct.value),
        `${s.averagePlacement.coverage.used} of ${s.averagePlacement.coverage.total}`,
      ];
    }),
    [1, 2, 3],
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
