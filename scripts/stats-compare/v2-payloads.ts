/**
 * Stats v2 — print what the /api/stats/v2/* routes would send to the phone.
 *
 * READ-ONLY. Calls the same functions the routes call (services/stats2/api),
 * as the owner of the pod with the most matches, and prints each payload with
 * how long it took. Use it to check a change without deploying.
 *
 *   npx tsx scripts/stats-compare/v2-payloads.ts
 */
import { count, desc, eq } from 'drizzle-orm';

import { groups, matches } from '@/db/schema';
import { db } from '@/services/db';
import { getDeckColorsV2, getMatchupV2, getPlayerExtrasV2, getRankingsV2 } from '@/services/stats2/api';

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  const result = await fn();
  console.log(`\n── ${label}  (${Date.now() - start} ms)`);
  return result;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL.');
    process.exit(1);
  }
  const [top] = await db
    .select({ groupId: matches.groupId, n: count(matches.id) })
    .from(matches)
    .where(eq(matches.status, 'completed'))
    .groupBy(matches.groupId)
    .orderBy(desc(count(matches.id)))
    .limit(1);
  if (!top?.groupId) {
    console.error('No pod with completed matches.');
    process.exit(1);
  }
  const [pod] = await db.select().from(groups).where(eq(groups.id, top.groupId)).limit(1);
  const viewer = pod.ownerId;
  console.log(`Pod: ${pod.name} — as its owner`);

  const rankings = await timed('GET /api/stats/v2/rankings?group_id=…', () => getRankingsV2(viewer, pod.id));
  const { players, decks, commanders } = rankings.data;
  console.log(`total_matches ${rankings.data.total_matches}`);
  console.log('players.ranked  ', players.ranked.map((p) => `${p.rank}. ${p.name} ${p.win_pct}% (${p.wins_vs_expected >= 0 ? '+' : ''}${p.wins_vs_expected})`).join(' | '));
  console.log('players.unranked', players.unranked.map((p) => `${p.name} (${p.matches})`).join(' | ') || '—');
  console.log(`decks: ${decks.ranked.length} ranked, ${decks.unranked.length} unranked; top 5: ${decks.ranked.slice(0, 5).map((d) => d.name).join(', ')}`);
  console.log(`commanders: ${commanders.ranked.length} ranked, ${commanders.unranked.length} unranked; top 5: ${commanders.ranked.slice(0, 5).map((d) => d.name).join(', ')}`);

  const personal = await timed('GET /api/stats/v2/rankings  (all my matches)', () => getRankingsV2(viewer, null));
  console.log(`total_matches ${personal.data.total_matches}, players ranked ${personal.data.players.ranked.length}`);

  const mostPlayed = [...decks.ranked].sort((a, b) => b.matches - a.matches)[0];
  if (mostPlayed) {
    const colors = await timed(`GET /api/stats/v2/decks/:id  (${mostPlayed.name})`, () => getDeckColorsV2(viewer, mostPlayed.id));
    console.log(JSON.stringify(colors, null, 2));
  }

  const [a, b] = players.ranked;
  if (a && b) {
    const all = await timed(`GET /api/stats/v2/matchup  (${a.name} vs ${b.name}, pod)`, () =>
      getMatchupV2(viewer, 'player', a.id, b.id, false, pod.id));
    console.log(JSON.stringify(all.data));
    const duel = await timed(`GET /api/stats/v2/matchup  (${a.name} vs ${b.name}, 1v1)`, () =>
      getMatchupV2(viewer, 'player', a.id, b.id, true, pod.id));
    console.log(JSON.stringify(duel.data));
    const extras = await timed(`GET /api/stats/v2/players/:id  (${a.name})`, () => getPlayerExtrasV2(viewer, a.id));
    console.log(JSON.stringify(extras, null, 2));
  }

  const missing = await timed('GET /api/stats/v2/decks/:id  (unknown id)', () =>
    getDeckColorsV2(viewer, '00000000-0000-4000-8000-000000000000'));
  console.log(JSON.stringify(missing));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
