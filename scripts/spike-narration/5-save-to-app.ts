/**
 * Step 5 — save an analysis onto the match so it shows in the app (Labs).
 *
 *   npx tsx --env-file=.env 5-save-to-app.ts <match-id> [--model claude-opus-5-5]
 *       [--min-confidence 0.6] [--publish] [--remove]
 *
 * Writes to the database in DATABASE_URL: one recap row for the match and one
 * row per explained log entry. Running it again replaces what was saved for
 * that match. --remove deletes the saved narration instead.
 *
 * Until the phone can record and analyse by itself, this is how a narration
 * reaches the app. It is saved as a draft (visible to the match's players)
 * unless --publish is given (visible to the pod).
 */
import path from 'node:path';

import { neon } from '@neondatabase/serverless';

import { type MatchExport, matchDir, parseArgs, readJson, requireEnv } from './lib';

interface SavedAnalysis {
  model: string;
  analysis: {
    speakers: { label: string; player: string | null; confidence: number; evidence: string }[];
    events: {
      event_id: string;
      attributed: boolean;
      source_player: string | null;
      source_card: string | null;
      damage_type: string;
      confidence: number;
      evidence_quote: string;
    }[];
    headline: string;
    narrative: string;
    key_moments: string[];
    rules_debates: { question: string; outcome: string }[];
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const matchId = args._[0];
  if (!matchId) {
    console.error('Usage: 5-save-to-app.ts <match-id> [--model …] [--min-confidence 0.6] [--publish] [--remove]');
    process.exit(1);
  }
  const sql = neon(requireEnv('DATABASE_URL'));

  const [match] = (await sql.query(`select id, created_by from matches where id = $1`, [matchId])) as any[];
  if (!match) {
    console.error(`No match with id ${matchId} in this database.`);
    process.exit(1);
  }

  // Flags point at parts of the saved narration by position, approvals are for
  // that exact text, and the roast was written from it — so all three go
  // whenever the narration is removed or replaced.
  for (const table of ['match_roasts', 'narration_approvals', 'narration_flags']) {
    await sql.query(`delete from ${table} where match_id = $1`, [matchId]);
  }

  if (args.remove) {
    await sql.query(`delete from match_event_annotations where match_id = $1`, [matchId]);
    await sql.query(`delete from match_narrations where match_id = $1`, [matchId]);
    console.log('Removed the saved narration for this match.');
    return;
  }

  const model = typeof args.model === 'string' ? args.model : 'claude-opus-5-5';
  const minConfidence = typeof args['min-confidence'] === 'string' ? Number(args['min-confidence']) : 0.6;
  const dir = matchDir(matchId);
  const exported = readJson<MatchExport>(path.join(dir, 'match.json'));
  const saved = readJson<SavedAnalysis>(path.join(dir, `analysis-${model.replace(/^claude-/, '')}.json`));
  const a = saved.analysis;

  // Only annotate entries that exist in this match's log, are attributed, and clear the bar.
  const knownEvents = new Set(exported.events.map((e) => e.id));
  const participationByPlayer = new Map(exported.players.map((p) => [p.player.toLowerCase(), p.participationId]));
  const rows = a.events.filter(
    (e) => e.attributed && e.confidence >= minConfidence && knownEvents.has(e.event_id) && e.damage_type !== 'unknown',
  );

  // No transactions on Neon HTTP: every step is safe to run again.
  await sql.query(`delete from match_event_annotations where match_id = $1`, [matchId]);
  for (const e of rows) {
    await sql.query(
      `insert into match_event_annotations
         (match_id, event_id, source_participation_id, source_card, damage_type, confidence, evidence_quote)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (event_id) do update set
         source_participation_id = excluded.source_participation_id,
         source_card = excluded.source_card,
         damage_type = excluded.damage_type,
         confidence = excluded.confidence,
         evidence_quote = excluded.evidence_quote`,
      [
        matchId,
        e.event_id,
        e.source_player ? (participationByPlayer.get(e.source_player.toLowerCase()) ?? null) : null,
        e.source_card,
        e.damage_type,
        e.confidence,
        e.evidence_quote || null,
      ],
    );
  }

  await sql.query(
    `insert into match_narrations
       (match_id, status, model, headline, narrative, key_moments, rules_debates, speakers, created_by)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9)
     on conflict (match_id) do update set
       status = excluded.status, model = excluded.model, headline = excluded.headline,
       narrative = excluded.narrative, key_moments = excluded.key_moments,
       rules_debates = excluded.rules_debates, speakers = excluded.speakers, updated_at = now()`,
    [
      matchId,
      args.publish ? 'published' : 'draft',
      saved.model,
      a.headline,
      a.narrative,
      JSON.stringify(a.key_moments),
      JSON.stringify(a.rules_debates),
      JSON.stringify(a.speakers),
      match.created_by,
    ],
  );

  const skipped = a.events.filter((e) => e.attributed).length - rows.length;
  console.log(
    `Saved the recap and ${rows.length} explained entries as a ${args.publish ? 'published narration' : 'draft'}.` +
      (skipped > 0 ? ` ${skipped} below confidence ${minConfidence} were left out.` : ''),
  );
  console.log('Open the match in the app (Labs switched on) to see it.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
