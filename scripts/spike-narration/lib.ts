/**
 * Shared types and helpers for the narration spike (SPIKE-001).
 *
 * Nothing here is app code. These scripts answer one question before any
 * recording feature is built: can one phone on the table hear a pod well
 * enough for speech-to-text + an LLM to explain the match log?
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OUT_DIR = path.join(HERE, 'out');

export interface MatchExport {
  match: { id: string; createdAt: string; endedAt: string | null; status: string };
  result: { winner: string | null; winCondition: string | null; isDraw: boolean } | null;
  players: {
    participationId: string;
    player: string;
    deck: string;
    commanders: string[];
    /** Deck colour identity from its commanders: subset of W U B R G, empty = colourless. */
    colors?: string[];
    /** Card names from the deck's decklist, when it has one. */
    decklist: string[];
  }[];
  events: {
    id: string;
    /** Server timestamp of the log entry (ISO). Up to ~2 s after the tap. */
    at: string;
    type: 'life_change' | 'poison_change' | 'commander_damage' | 'player_died' | 'turn_passed';
    player: string;
    delta: number;
    /** Commander that dealt the damage, for commander_damage events. */
    sourceCommander: string | null;
    turnDurationSeconds: number | null;
  }[];
}

export interface Utterance {
  /** Seconds from the start of the audio file. */
  start: number;
  end: number;
  speaker: number;
  text: string;
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. Put it in scripts/spike-narration/.env (see README).`);
    process.exit(1);
  }
  return v;
}

/** `--flag value` and `--flag` (boolean) parser; positionals in `_`. */
export function parseArgs(argv: string[]): { _: string[]; [k: string]: string | boolean | string[] } {
  const out: { _: string[]; [k: string]: string | boolean | string[] } = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[a.slice(2)] = true;
      else {
        out[a.slice(2)] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

export function matchDir(matchId: string): string {
  const dir = path.join(OUT_DIR, matchId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function writeJson(file: string, data: unknown): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/** 3725 → "1:02:05" */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** Human-readable log line, e.g. "Gabo −8 life" or "Juan takes 5 from Atraxa". */
export function describeEvent(e: MatchExport['events'][number]): string {
  const sign = e.delta > 0 ? '+' : '−';
  const n = Math.abs(e.delta);
  switch (e.type) {
    case 'life_change':
      return `${e.player} ${sign}${n} life`;
    case 'poison_change':
      return `${e.player} ${sign}${n} poison`;
    case 'commander_damage':
      return `${e.player} takes ${n} commander damage from ${e.sourceCommander ?? 'unknown commander'}`;
    case 'player_died':
      return `${e.player} is eliminated`;
    case 'turn_passed':
      return `turn passes to ${e.player}`;
  }
}
