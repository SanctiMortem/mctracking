/**
 * Step 3 — ask Claude to map speakers to players and explain each log event.
 *
 *   npx tsx --env-file=.env 3-analyze.ts <match-id> --audio-start 2026-11-20T02:14:05Z
 *       [--model claude-opus-5-5] [--effort high] [--offset-seconds 0]
 *
 * --audio-start is the wall-clock moment the recording began (ISO, with
 * timezone). It is what lines the audio up with the match log; if omitted the
 * match start time is used, which is only right if you hit record as the
 * match started. --offset-seconds nudges the alignment if it looks shifted.
 *
 * If out/<match-id>/corrections.txt exists, its lines are given to the model as
 * facts from the players (a wrong card name, a changed result, who really said
 * something).
 *
 * Writes out/<match-id>/analysis-<model>.json, report-<model>.md (read this)
 * and review-<model>.csv (mark each row y/n, then run 4-score.ts).
 */
import fs from 'node:fs';
import path from 'node:path';

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

import {
  type MatchExport,
  type Utterance,
  clock,
  describeEvent,
  matchDir,
  parseArgs,
  readJson,
  writeJson,
} from './lib';

/** $ per million tokens (input, output) — from Anthropic's pricing, cached 2026-11-03. */
const PRICES: Record<string, [number, number]> = {
  'claude-opus-5-5': [4, 20],
  'claude-sonnet-5-5': [2, 10],
  'claude-haiku-5-5': [0.1, 0.5],
};

const Analysis = z.object({
  speakers: z.array(
    z.object({
      label: z.string().describe('Speaker label exactly as in the transcript, e.g. "spk0"'),
      player: z.string().nullable().describe('Player name from the match, or null if unknown'),
      confidence: z.number().describe('0 to 1'),
      evidence: z.string().describe('One short line: why this speaker is this player'),
    }),
  ),
  events: z.array(
    z.object({
      event_id: z.string(),
      attributed: z.boolean().describe('false when the talk does not make the cause clear'),
      source_player: z.string().nullable(),
      source_card: z.string().nullable().describe('English card name, or null'),
      damage_type: z.enum(['combat', 'commander', 'spell', 'ability', 'lifegain', 'other', 'unknown']),
      confidence: z.number().describe('0 to 1'),
      evidence_quote: z.string().describe('Short game-talk quote, obvious mishearings repaired, or empty'),
    }),
  ),
  headline: z.string(),
  narrative: z.string().describe('The match in two or three short paragraphs, 150 words at most, separated by a blank line'),
  key_moments: z.array(z.string()),
  rules_debates: z.array(z.object({ question: z.string(), outcome: z.string() })),
});
type AnalysisT = z.infer<typeof Analysis>;

const SYSTEM = `You analyse a recording of a Magic: The Gathering Commander game played in person.

You are given two things:
1. The match log from a life-tracking app. It is the source of truth for WHAT happened and WHEN: life changes, poison, commander damage, eliminations and turn passes, each with a time on the match clock. Never change, add or remove log entries.
2. A speech-to-text transcript of the table, with a speaker label per line and times on the same match clock. Speaker labels are arbitrary: they are not player names. The transcript has errors, mixes Spanish and English, and contains talk that is not about the game.

Your job is to explain WHY each log entry happened, using only what was said.

Step 1 — work out who is speaking, line by line. The speaker labels come from an automatic diarizer and are a weak hint only: one label often contains two or three people, and one person is often split across labels. The decks are the strong evidence:
- Each player's commander, deck colours (W U B R G) and full decklist are given. A card that someone casts, plays, activates, holds in hand, reveals or says they "had" belongs to the player whose decklist contains it. If it is in nobody's list, use its colours: a card can only be in a deck whose colour identity includes it.
- Also use: whose turn it is (the log says), who is addressed by name right before reacting, who reacts right after their own life total changes, and anyone who says their own name.
- When the label and the deck evidence disagree, the deck evidence wins. Never credit a player with casting or holding a card their deck's colours could not contain.
In "speakers", give the player each label MOSTLY is, with lower confidence when the label is clearly mixed, and say so in the evidence line.

Step 2 — for every life_change, poison_change, commander_damage and player_died entry in the log, find the cause in the talk from roughly 60 seconds before to 15 seconds after the entry (the app logs an entry a moment after it is announced). Give the player who caused it, the card if one is named, and the kind of damage. For commander_damage entries the log already names the commander; use the talk to confirm and to name the attacker. Skip turn_passed entries.

Reading the transcript: it is machine speech-to-text of Mexican Spanish mixed with English card names, and it mishears. Read it for meaning, not letter by letter. Repair what the context makes obvious: a word that sounds like a game term next to a matching log entry is that game term ("pierdo dos bebidas" right before a −2 life entry is "pierdo dos vidas"); a garbled name that sounds like a card in the speaker's decklist is that card. Do not repair into something the log or the decks contradict.

Rules:
- Only attribute what the transcript supports. If the cause is not clear from the talk, set attributed = false, damage_type = "unknown", and leave the rest null. A wrong guess is worse than a blank.
- Confidence is your honest estimate that the attribution is correct.
- Name a card only when it is in a decklist, or is said clearly and fits that player's colours. If you can tell what a card did but not which card it was, describe the effect ("a spell that gave the commander hexproof") and leave source_card null. Never swap in a better-known card with a similar effect.
- Before writing any statement about who cast, held or regretted not using a card, check it against that player's decklist and colours. If it does not fit, the speaker is someone else: find who, or leave the player out.
- Evidence quotes are short, about the game only, and readable: take them from the transcript but with the obvious mishearings repaired, so the quote makes sense next to the log entry. Never quote personal conversation.
- Card names are always given in English, spelled as in the decklists when the card is there.
- Ignore everything that is not about the game.
- If players argue about a rule, record the question and how it was settled. If the table's ruling disagrees with the log, the log wins.
- The narrative is short: two or three paragraphs, 150 words at most in total. Tell the arc of the game and the turning point; do not retell every play. It must read as a coherent story of this game, not as transcript fragments attached to log entries. Key moments: six at most, one line each.

The <result> block is the recorded outcome and is final: the narrative must end with that winner, even when the talk at the table sounded like someone else was winning. If a <corrections> block is present, it comes from the players after reading an earlier draft: treat every line as fact, above the transcript and above your own deductions, and make the whole answer consistent with it.

Return one entry in "events" for every non-turn log entry, using its event_id.`;

function buildUserMessage(
  match: MatchExport,
  utterances: Utterance[],
  audioStartMs: number,
  corrections: string,
): string {
  const matchStart = new Date(match.match.createdAt).getTime();
  const rel = (ms: number) => clock((ms - matchStart) / 1000);

  const players = match.players
    .map(
      (p) =>
        `- ${p.player} — deck "${p.deck}", commander ${p.commanders.join(' + ')}` +
        (p.colors ? `, colours ${p.colors.length ? p.colors.join('') : 'colourless'}` : '') +
        (p.decklist.length ? `\n  decklist: ${p.decklist.join('; ')}` : '\n  decklist: not available'),
    )
    .join('\n');

  const log = match.events
    .map((e) => `${rel(new Date(e.at).getTime())}  ${e.id}  ${e.type}  ${describeEvent(e)}`)
    .join('\n');

  const talk = utterances
    .map((u) => `${rel(audioStartMs + u.start * 1000)}  spk${u.speaker}: ${u.text}`)
    .join('\n');

  const r = match.result;
  const result = !r
    ? 'not recorded'
    : r.isDraw
      ? 'draw'
      : `${r.winner ?? 'unknown'} won (recorded as: ${r.winCondition ?? 'unknown'})`;
  const fixes = corrections.trim()
    ? `\n\n<corrections>\nFrom the players, after reading an earlier draft. These are facts.\n${corrections.trim()}\n</corrections>`
    : '';

  return `<players>\n${players}\n</players>

<result>${result}</result>${fixes}

<match_log>
Times are minutes:seconds from the start of the match.
${log}
</match_log>

<transcript>
Same clock as the match log. A negative or early time means it was said before the match started.
${talk}
</transcript>`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const matchId = args._[0];
  if (!matchId) {
    console.error('Usage: 3-analyze.ts <match-id> --audio-start <ISO time> [--model …] [--effort …]');
    process.exit(1);
  }
  const model = typeof args.model === 'string' ? args.model : 'claude-opus-5-5';
  const effort = (typeof args.effort === 'string' ? args.effort : 'high') as 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  const offset = typeof args['offset-seconds'] === 'string' ? Number(args['offset-seconds']) : 0;

  const dir = matchDir(matchId);
  const match = readJson<MatchExport>(path.join(dir, 'match.json'));
  const { utterances } = readJson<{ utterances: Utterance[] }>(path.join(dir, 'transcript.json'));

  let audioStartMs: number;
  if (typeof args['audio-start'] === 'string') {
    audioStartMs = new Date(args['audio-start']).getTime();
    if (Number.isNaN(audioStartMs)) {
      console.error(`Could not read --audio-start "${args['audio-start']}". Use ISO, e.g. 2026-11-20T20:14:05-06:00`);
      process.exit(1);
    }
  } else {
    audioStartMs = new Date(match.match.createdAt).getTime();
    console.warn('No --audio-start given: assuming the recording began exactly when the match was created.');
  }
  audioStartMs += offset * 1000;

  // Optional out/<match-id>/corrections.txt: what the players said an earlier draft got wrong.
  const correctionsFile = path.join(dir, 'corrections.txt');
  const corrections = fs.existsSync(correctionsFile) ? fs.readFileSync(correctionsFile, 'utf8') : '';
  if (corrections.trim()) console.log(`Using the players' corrections in ${correctionsFile}`);

  const gameEvents = match.events.filter((e) => e.type !== 'turn_passed');
  console.log(`${model} (effort ${effort}): ${gameEvents.length} events to explain, ${utterances.length} utterances…`);

  // Credentials resolve from ANTHROPIC_API_KEY (or an `ant auth login` profile).
  const client = new Anthropic();
  const started = Date.now();

  // Streamed because the answer is long; finalMessage() collects it.
  const stream = client.messages.stream({
    model,
    max_tokens: 64000,
    system: SYSTEM,
    output_config: { effort, format: zodOutputFormat(Analysis) },
    messages: [{ role: 'user', content: buildUserMessage(match, utterances, audioStartMs, corrections) }],
  });

  let message: Anthropic.Message;
  try {
    message = await stream.finalMessage();
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('Anthropic rejected the API key. Check ANTHROPIC_API_KEY in .env.');
    } else if (error instanceof Anthropic.RateLimitError) {
      console.error('Rate limited by Anthropic. Wait a minute and run again.');
    } else if (error instanceof Anthropic.BadRequestError) {
      console.error(`Anthropic rejected the request: ${error.message}`);
    } else if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}: ${error.message}`);
    } else {
      throw error;
    }
    process.exit(1);
  }

  if (message.stop_reason === 'refusal') {
    console.error(`The model declined the request (${message.stop_details?.category ?? 'no category'}).`);
    process.exit(1);
  }
  if (message.stop_reason === 'max_tokens') {
    console.error('The answer was cut off at max_tokens; the JSON is incomplete. Try a shorter match.');
    process.exit(1);
  }

  const text = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '';
  const analysis: AnalysisT = Analysis.parse(JSON.parse(text));

  const usage = message.usage;
  const price = PRICES[model];
  const cost = price ? (usage.input_tokens * price[0] + usage.output_tokens * price[1]) / 1e6 : null;
  const audioHours = (utterances.at(-1)?.end ?? 0) / 3600;
  const tag = model.replace(/^claude-/, '');

  writeJson(path.join(dir, `analysis-${tag}.json`), { model, effort, usage, cost_usd: cost, analysis });

  // ── Report ──
  const byId = new Map(analysis.events.map((e) => [e.event_id, e]));
  const matchStart = new Date(match.match.createdAt).getTime();
  const attributed = gameEvents.filter((e) => byId.get(e.id)?.attributed);
  const missing = gameEvents.filter((e) => !byId.has(e.id));

  const lines: string[] = [
    `# Narration spike — ${model}`,
    '',
    `- Events explained: **${attributed.length} of ${gameEvents.length}** (${Math.round((attributed.length / Math.max(gameEvents.length, 1)) * 100)}%)`,
    `- Events the model skipped entirely: ${missing.length}`,
    `- Tokens: ${usage.input_tokens} in, ${usage.output_tokens} out` +
      (cost !== null ? ` — **$${cost.toFixed(3)}** for this match` : ' — no price on file for this model') +
      (cost !== null && audioHours > 0 ? ` ($${(cost / audioHours).toFixed(3)} per hour of audio)` : ''),
    `- Took ${Math.round((Date.now() - started) / 1000)} s`,
    '',
    '## Speaker mapping',
    '',
    '| Speaker | Player | Confidence | Why |',
    '|---|---|---|---|',
    ...analysis.speakers.map(
      (s) => `| ${s.label} | ${s.player ?? '—'} | ${s.confidence.toFixed(2)} | ${s.evidence.replace(/\|/g, '/')} |`,
    ),
    '',
    `## ${analysis.headline}`,
    '',
    analysis.narrative,
    '',
    '## Key moments',
    '',
    ...analysis.key_moments.map((k) => `- ${k}`),
    '',
    '## Rules debates',
    '',
    ...(analysis.rules_debates.length
      ? analysis.rules_debates.map((d) => `- **${d.question}** → ${d.outcome}`)
      : ['- none found']),
    '',
    '## Events',
    '',
    '| Time | Log entry | Cause | Conf. | Quote |',
    '|---|---|---|---|---|',
    ...gameEvents.map((e) => {
      const a = byId.get(e.id);
      const cause = !a
        ? '(skipped)'
        : !a.attributed
          ? '—'
          : [a.source_player, a.source_card, a.damage_type].filter(Boolean).join(' · ');
      return `| ${clock((new Date(e.at).getTime() - matchStart) / 1000)} | ${describeEvent(e)} | ${cause} | ${a?.attributed ? a.confidence.toFixed(2) : ''} | ${(a?.evidence_quote ?? '').replace(/\|/g, '/')} |`;
    }),
    '',
  ];
  fs.writeFileSync(path.join(dir, `report-${tag}.md`), lines.join('\n'));

  // ── Review sheet: you mark each attribution right or wrong ──
  const csv = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [
    'event_id,time,log_entry,cause,confidence,quote,correct',
    ...attributed.map((e) => {
      const a = byId.get(e.id)!;
      return [
        e.id,
        clock((new Date(e.at).getTime() - matchStart) / 1000),
        csv(describeEvent(e)),
        csv([a.source_player, a.source_card, a.damage_type].filter(Boolean).join(' · ')),
        a.confidence.toFixed(2),
        csv(a.evidence_quote),
        '',
      ].join(',');
    }),
  ];
  fs.writeFileSync(path.join(dir, `review-${tag}.csv`), rows.join('\n') + '\n');

  console.log(`Explained ${attributed.length}/${gameEvents.length} events` + (cost !== null ? `, cost $${cost.toFixed(3)}` : ''));
  console.log(`Read:  ${path.join(dir, `report-${tag}.md`)}`);
  console.log(`Mark:  ${path.join(dir, `review-${tag}.csv`)}  (fill the "correct" column with y or n)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
