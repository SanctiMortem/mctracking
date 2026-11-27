/**
 * LABS — prompt for "Roast this match" (RCP-005). Pure text building, no
 * device imports, so it can be exercised outside the app.
 */
import type { ReportLanguage } from '@/services/labs/statsReportPrompt';
import type { Narration, RoastLength } from '@/services/narration';

export const ROAST_SCHEMA = {
  type: 'object',
  properties: { roast: { type: 'string' } },
  required: ['roast'],
  additionalProperties: false,
} as const;

export const ROAST_SYSTEM_PROMPT = `You write a comedy roast of one game of Magic: The Gathering (Commander) for the friends who played it. They asked for it and will read it together.

Rules:
- Use only the facts in the recap and the annotated log you are given. Never invent a play, a card, a number, a quote or an outcome. If something is not there, it did not happen.
- Roast the plays, the decks, the decisions and the luck — never the people. Nothing about anyone's looks, intelligence, body, family, job, money, or anything outside the game.
- Everyone gets teased, the winner included. Keep it affectionate: the tone of friends at the table, not an insult comic.
- No slurs, nothing sexual, no profanity stronger than what a mild table joke needs.
- Keep card names in English exactly as given. Use the players' names as given.
- Plain prose paragraphs separated by a blank line. No headings, no bullet lists, no emoji.`;

/** One line per log entry that has a visible cause; `description` is the log line as the app shows it. */
export type RoastLogLine = { description: string; cause: string };

export function buildRoastUserMessage(
  narration: Narration,
  log: RoastLogLine[],
  length: RoastLength,
  language: ReportLanguage,
): string {
  const lines = [
    `Write the roast in ${language === 'es' ? 'Spanish (Mexican, casual)' : 'English'}.`,
    length === 'short'
      ? 'Length: short — two paragraphs, about 120 words in total.'
      : 'Length: long — five or six paragraphs, about 400 words in total.',
    '',
    '# Recap',
    narration.headline,
    '',
    ...narration.paragraphs.map((p) => p.text),
  ];
  if (narration.moments.length) {
    lines.push('', '# Key moments', ...narration.moments.map((m) => `- ${m.text}`));
  }
  if (narration.debates.length) {
    lines.push('', '# Rules debates', ...narration.debates.map((d) => `- ${d.question} → ${d.outcome}`));
  }
  if (log.length) {
    lines.push('', '# Annotated log (in order)', ...log.map((l) => `- ${l.description} — ${l.cause}`));
  }
  return lines.join('\n');
}
