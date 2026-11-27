/**
 * LABS — "Roast this match" (RCP-005): a satirical retelling written on this
 * phone with the user's own Claude key.
 *
 * The model only ever sees what the server returned for this match: the
 * visible recap and the visible log causes. The transcript never reaches the
 * phone, and flagged parts are already gone from the response, so a hidden
 * moment cannot come back through the roast.
 */
import { getAiKey } from '@/services/labs/aiKeys';
import { type AnthropicMessage, type ReportFailure, callClaude } from '@/services/labs/statsReport';
import { REPORT_MODEL, type ReportLanguage } from '@/services/labs/statsReportPrompt';
import {
  ROAST_SCHEMA,
  ROAST_SYSTEM_PROMPT,
  type RoastLogLine,
  buildRoastUserMessage,
} from '@/services/labs/roastPrompt';
import type { Narration, RoastLength } from '@/services/narration';

export type { RoastLogLine };

export const ROAST_MODEL = REPORT_MODEL;

export type RoastOutcome = { ok: true; roast: string } | { ok: false; reason: ReportFailure };

export async function runRoast(
  narration: Narration,
  log: RoastLogLine[],
  length: RoastLength,
  language: ReportLanguage,
): Promise<RoastOutcome> {
  const key = await getAiKey('anthropic');
  if (!key) return { ok: false, reason: 'no_key' };

  let res: Response;
  try {
    res = await callClaude(key, {
      system: ROAST_SYSTEM_PROMPT,
      user: buildRoastUserMessage(narration, log, length, language),
      schema: ROAST_SCHEMA,
      effort: 'low',
      maxTokens: 6000,
    });
  } catch {
    return { ok: false, reason: 'network' };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, reason: 'key_rejected' };
  if (res.status === 429) return { ok: false, reason: 'rate_limited' };
  if (!res.ok) return { ok: false, reason: res.status >= 500 ? 'network' : 'bad_answer' };

  let message: AnthropicMessage;
  try {
    message = (await res.json()) as AnthropicMessage;
  } catch {
    return { ok: false, reason: 'bad_answer' };
  }
  if (message.stop_reason === 'refusal') return { ok: false, reason: 'declined' };
  if (message.stop_reason === 'max_tokens') return { ok: false, reason: 'cut_off' };

  const text = message.content?.find((b) => b.type === 'text')?.text;
  try {
    const roast = text ? (JSON.parse(text) as { roast?: unknown }).roast : null;
    if (typeof roast === 'string' && roast.trim()) return { ok: true, roast: roast.trim() };
  } catch {
    // fall through
  }
  return { ok: false, reason: 'bad_answer' };
}

export const ROAST_FAILURE_TEXT: Record<ReportFailure, string> = {
  no_key: 'Connect a Claude key in Labs to write a roast.',
  key_rejected: 'Claude rejected the key saved in Labs. Check it there.',
  rate_limited: 'Claude is rate-limiting this key. Try again in a minute.',
  declined: 'Claude declined to write this one.',
  cut_off: 'The roast was cut off. Try the short one.',
  network: 'Could not reach Claude. Check the connection and try again.',
  bad_answer: 'Claude answered in a form the app could not read. Try again.',
};
