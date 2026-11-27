/**
 * Step 1 — export a match's log from the database (READ-ONLY).
 *
 *   npx tsx --env-file=.env 1-export-match.ts --list          # recent matches
 *   npx tsx --env-file=.env 1-export-match.ts <match-id>
 *
 * Writes out/<match-id>/match.json: players, decks, commanders, decklists and
 * every non-undone log event with its timestamp. Only SELECTs are issued.
 *
 * The timestamp columns are `timestamp` (no zone) holding UTC; they are read
 * `at time zone 'utc'` so the driver does not reinterpret them as local time.
 */
import path from 'node:path';

import { neon } from '@neondatabase/serverless';

import { type MatchExport, matchDir, parseArgs, requireEnv, writeJson } from './lib';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sql = neon(requireEnv('DATABASE_URL'));

  if (args.list) {
    const rows = (await sql.query(
      `select m.id, m.created_at at time zone 'utc' as created_at, m.ended_at, m.status,
              (select count(*) from match_events e where e.match_id = m.id and not e.is_undone)::int as events,
              (select string_agg(p.name, ', ' order by p.name)
                 from participations pa join players p on p.id = pa.player_id
                where pa.match_id = m.id) as players
         from matches m
        order by m.created_at desc
        limit 15`,
    )) as any[];
    for (const r of rows) {
      console.log(
        `${r.id}  ${new Date(r.created_at).toLocaleString()}  ${r.status.padEnd(11)} ${String(r.events).padStart(4)} events  ${r.players ?? ''}`,
      );
    }
    return;
  }

  const matchId = args._[0];
  if (!matchId) {
    console.error('Usage: 1-export-match.ts <match-id>   (or --list)');
    process.exit(1);
  }

  const [match] = (await sql.query(
    `select id, created_at at time zone 'utc' as created_at, ended_at at time zone 'utc' as ended_at, status from matches where id = $1`,
    [matchId],
  )) as any[];
  if (!match) {
    console.error(`No match with id ${matchId}`);
    process.exit(1);
  }

  const parts = (await sql.query(
    `select pa.id as participation_id, pa.deck_id, p.name as player, d.name as deck,
            c1.name as commander1, c2.name as commander2
       from participations pa
       join players p on p.id = pa.player_id
       join decks d on d.id = pa.deck_id
       join commanders c1 on c1.id = d.commander_id
       left join commanders c2 on c2.id = d.commander_id_2
      where pa.match_id = $1
      order by pa.created_at`,
    [matchId],
  )) as any[];

  const deckIds = parts.map((p) => p.deck_id);
  const cardRows = (await sql.query(
    `select dc.deck_id, coalesce(c.name, dc.raw_name) as name
       from deck_cards dc left join cards c on c.id = dc.card_id
      where dc.deck_id = any($1::uuid[])`,
    [deckIds],
  )) as any[];
  const cardsByDeck = new Map<string, string[]>();
  for (const r of cardRows) cardsByDeck.set(r.deck_id, [...(cardsByDeck.get(r.deck_id) ?? []), r.name]);

  const playerByParticipation = new Map(parts.map((p) => [p.participation_id, p.player]));

  const eventRows = (await sql.query(
    `select e.id, e.created_at at time zone 'utc' as created_at, e.event_type, e.participation_id, e.delta,
            e.turn_duration_seconds, c.name as source_commander
       from match_events e
       left join commanders c on c.id = e.commander_id_source
      where e.match_id = $1 and not e.is_undone
      order by e.created_at, e.id`,
    [matchId],
  )) as any[];

  const [res] = (await sql.query(
    `select r.win_condition, r.is_draw, p.name as winner
       from match_results r
       left join participations pa on pa.id = r.winner_participation_id
       left join players p on p.id = pa.player_id
      where r.match_id = $1`,
    [matchId],
  )) as any[];

  const out: MatchExport = {
    match: {
      id: match.id,
      createdAt: new Date(match.created_at).toISOString(),
      endedAt: match.ended_at ? new Date(match.ended_at).toISOString() : null,
      status: match.status,
    },
    result: res ? { winner: res.winner ?? null, winCondition: res.win_condition, isDraw: res.is_draw } : null,
    players: parts.map((p) => ({
      participationId: p.participation_id,
      player: p.player,
      deck: p.deck,
      commanders: [p.commander1, p.commander2].filter(Boolean),
      decklist: cardsByDeck.get(p.deck_id) ?? [],
    })),
    events: eventRows.map((e) => ({
      id: e.id,
      at: new Date(e.created_at).toISOString(),
      type: e.event_type,
      player: playerByParticipation.get(e.participation_id) ?? 'unknown',
      delta: e.delta,
      sourceCommander: e.source_commander ?? null,
      turnDurationSeconds: e.turn_duration_seconds ?? null,
    })),
  };

  const file = path.join(matchDir(matchId), 'match.json');
  writeJson(file, out);

  const noList = out.players.filter((p) => p.decklist.length === 0).map((p) => `${p.player} (${p.deck})`);
  console.log(`Wrote ${file}`);
  console.log(`  ${out.players.length} players, ${out.events.length} log events`);
  console.log(`  started ${out.match.createdAt}${out.match.endedAt ? `, ended ${out.match.endedAt}` : ''}`);
  if (noList.length) {
    console.log(`  No decklist for: ${noList.join(', ')} — card names for those decks will not be hinted.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
