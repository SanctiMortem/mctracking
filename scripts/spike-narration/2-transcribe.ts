/**
 * Step 2 — send the recording to Deepgram.
 *
 *   npx tsx --env-file=.env 2-transcribe.ts <match-id> <audio-file>
 *
 * Uses pre-recorded Nova-3 multilingual with speaker diarization and keyterm
 * prompting (commander names, player names, then card names from the
 * decklists). Writes out/<match-id>/deepgram.json (raw response),
 * transcript.json (utterances) and transcript.txt (readable).
 *
 * The audio goes from this Mac straight to Deepgram with your own key.
 */
import fs from 'node:fs';
import path from 'node:path';

import { type MatchExport, type Utterance, clock, matchDir, parseArgs, readJson, requireEnv, writeJson } from './lib';

const CONTENT_TYPES: Record<string, string> = {
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.aac': 'audio/aac',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm',
};

/** Deepgram caps keyterms at 500 tokens per request and recommends 20–50 terms. */
const MAX_KEYTERMS = 90;
const MAX_KEYTERM_TOKENS = 450;
/** Rough token estimate — the real tokenizer is Deepgram's; stay well under the cap. */
// Worst case, one token per character: Deepgram rejected both length/3 (78
// terms) and length/2 (52 terms) as over its 500-token cap.
const estimateTokens = (term: string) => term.length;

function interleave(lists: string[][]): string[] {
  const out: string[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

function buildKeyterms(match: MatchExport): string[] {
  const ordered = [
    ...match.players.flatMap((p) => p.commanders),
    ...match.players.map((p) => p.player),
    // Card names last: they are the bulk and the first to be cut. Taken one
    // deck at a time in turn, so the cut does not fall on a single player.
    ...interleave(match.players.map((p) => p.decklist)),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  let tokens = 0;
  for (const raw of ordered) {
    // "Fire // Ice" → "Fire"; people say the front face.
    const term = raw.split('//')[0].trim();
    const key = term.toLowerCase();
    // Basic lands and one-word common nouns add noise, not signal.
    if (!term || seen.has(key) || /^(plains|island|swamp|mountain|forest)$/i.test(term)) continue;
    const cost = estimateTokens(term);
    if (out.length >= MAX_KEYTERMS) break;
    if (tokens + cost > MAX_KEYTERM_TOKENS) continue;
    seen.add(key);
    out.push(term);
    tokens += cost;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [matchId, audioFile] = args._;
  if (!matchId || !audioFile) {
    console.error('Usage: 2-transcribe.ts <match-id> <audio-file>');
    process.exit(1);
  }
  const apiKey = requireEnv('DEEPGRAM_API_KEY');
  const dir = matchDir(matchId);
  const match = readJson<MatchExport>(path.join(dir, 'match.json'));

  const ext = path.extname(audioFile).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    console.error(`Unsupported audio extension ${ext}. Supported: ${Object.keys(CONTENT_TYPES).join(' ')}`);
    process.exit(1);
  }

  const keyterms = buildKeyterms(match);
  const params = new URLSearchParams({
    model: 'nova-3',
    language: 'multi', // Spanish + English mixed
    // Classic diarizer. `diarize_model: 'latest'` (v2) put a whole 3-player
    // table on one speaker in the 2026-11-26 test; this one split it 20/24/11 min.
    diarize: 'true',
    utterances: 'true',
    punctuate: 'true',
    smart_format: 'true',
  });
  for (const k of keyterms) params.append('keyterm', k);

  const audio = fs.readFileSync(audioFile);
  console.log(`Sending ${(audio.length / 1e6).toFixed(1)} MB with ${keyterms.length} keyterms to Deepgram…`);

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: 'POST',
    headers: { Authorization: `Token ${apiKey}`, 'Content-Type': contentType },
    body: audio,
  });
  if (!res.ok) {
    console.error(`Deepgram returned HTTP ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const data = (await res.json()) as any;
  writeJson(path.join(dir, 'deepgram.json'), data);

  if (!data.metadata?.diarize_info) {
    console.warn('WARNING: no diarize_info in the response — the diarizer did not run; speakers will all be 0.');
  }

  const utterances: Utterance[] = (data.results?.utterances ?? []).map((u: any) => ({
    start: u.start,
    end: u.end,
    speaker: u.speaker ?? 0,
    text: u.transcript,
  }));
  writeJson(path.join(dir, 'transcript.json'), { keyterms, utterances });
  fs.writeFileSync(
    path.join(dir, 'transcript.txt'),
    utterances.map((u) => `[${clock(u.start)}] spk${u.speaker}: ${u.text}`).join('\n') + '\n',
  );

  const duration = data.metadata?.duration ?? utterances.at(-1)?.end ?? 0;
  const talk = new Map<number, number>();
  for (const u of utterances) talk.set(u.speaker, (talk.get(u.speaker) ?? 0) + (u.end - u.start));
  console.log(`Audio length ${clock(duration)}, ${utterances.length} utterances, ${talk.size} speakers detected`);
  for (const [spk, secs] of [...talk].sort((a, b) => b[1] - a[1])) {
    console.log(`  spk${spk}: ${clock(secs)} of speech`);
  }
  console.log(`A pod of ${match.players.length} should show about ${match.players.length} speakers.`);
  console.log(`Read ${path.join(dir, 'transcript.txt')} to judge the transcription by eye.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
