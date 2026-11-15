/**
 * LABS — runs the AI stats report from the phone (RPT-002).
 *
 * 1. Fetch the data package from our API (records, deck shape, card lists).
 * 2. Send it to Claude with the user's own key, straight from the phone —
 *    the key never reaches our backend (ADR-009).
 * 3. Clean the answer against the data package and hand it to the screen.
 *
 * The finished report is then saved on our server (words and numbers, never
 * the key) so it can be reopened without paying for a new one; re-analysing
 * replaces it.
 *
 * Anthropic is called over plain HTTP on purpose: the official TypeScript
 * SDK does not support React Native (see aiKeys.ts).
 */
import { apiFetch } from '@/services/api';
import { getAiKey } from '@/services/labs/aiKeys';
import {
  REPORT_MODEL,
  REPORT_OUTPUT_SCHEMA,
  REPORT_SYSTEM_PROMPT,
  buildReportUserMessage,
  type ReportLanguage,
} from '@/services/labs/statsReportPrompt';
import {
  cleanReport,
  type ReportData,
  type ReportKind,
  type SavedReport,
  type StatsReport,
} from '@/services/reportShared';

export type ReportFailure =
  | 'no_key'       // no Claude key saved in Labs
  | 'key_rejected' // Anthropic said 401/403
  | 'rate_limited'
  | 'declined'     // the model declined to answer
  | 'cut_off'      // answer hit max_tokens
  | 'network'
  | 'bad_answer';  // not the JSON we asked for

export type ReportOutcome =
  | { ok: true; report: StatsReport }
  | { ok: false; reason: ReportFailure };

/** Thinking plus a short JSON answer; generous so it is never cut off. */
const MAX_TOKENS = 16000;
/** No streaming in React Native fetch, so one long request. */
const TIMEOUT_MS = 180_000;
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export async function fetchReportData(
  kind: ReportKind,
  id: string,
  token: string | undefined,
): Promise<ReportData> {
  const path = kind === 'deck' ? `/api/stats/decks/${id}/report` : `/api/stats/players/${id}/report`;
  const res = await apiFetch<{ success: true; data: ReportData }>(path, 'GET', undefined, token);
  return res.data;
}

type AnthropicMessage = {
  stop_reason?: string;
  content?: { type: string; text?: string }[];
};

async function callClaude(
  key: string,
  data: ReportData,
  language: ReportLanguage,
  withFallback: boolean,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2026-10-21',
        ...(withFallback ? { 'anthropic-beta': FALLBACK_BETA } : {}),
      },
      body: JSON.stringify({
        model: REPORT_MODEL,
        max_tokens: MAX_TOKENS,
        system: REPORT_SYSTEM_PROMPT,
        // Thinking is always on for this model; effort is the only depth control.
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: REPORT_OUTPUT_SCHEMA },
        },
        // If a safety classifier declines by mistake, let the API retry on
        // another model inside the same call.
        ...(withFallback ? { fallbacks: 'default' } : {}),
        messages: [{ role: 'user', content: buildReportUserMessage(data, language) }],
      }),
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function runStatsReport(
  data: ReportData,
  language: ReportLanguage,
): Promise<ReportOutcome> {
  const key = await getAiKey('anthropic');
  if (!key) return { ok: false, reason: 'no_key' };

  let res: Response;
  try {
    res = await callClaude(key, data, language, true);
    // The fallback option is a beta; if this account or model rejects it,
    // the report itself should still work.
    if (res.status === 400) res = await callClaude(key, data, language, false);
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
  if (!text) return { ok: false, reason: 'bad_answer' };
  try {
    return { ok: true, report: cleanReport(JSON.parse(text), data) };
  } catch {
    return { ok: false, reason: 'bad_answer' };
  }
}

// ─── Saved report (RPT-004) ───────────────────────────────────────────────────

/** The last saved report for this subject, or null when there is none. */
export async function fetchSavedReport(
  kind: ReportKind,
  id: string,
  token: string | undefined,
): Promise<SavedReport | null> {
  const res = await apiFetch<{ success: true; data: SavedReport | null }>(
    `/api/reports?kind=${kind}&id=${id}`,
    'GET',
    undefined,
    token,
  );
  return res.data;
}

/**
 * Save the report with the data it was written from. Rules text is dropped
 * first: the screen only needs card names and counts, and it is most of the
 * package's size.
 */
export async function saveReport(
  kind: ReportKind,
  id: string,
  data: ReportData,
  report: StatsReport,
  token: string | undefined,
): Promise<SavedReport> {
  const slim: ReportData = {
    ...data,
    decks: data.decks.map((d) => ({
      ...d,
      cards: d.cards.map((c) => ({ ...c, oracle_text: null })),
    })),
  };
  const res = await apiFetch<{ success: true; data: SavedReport }>(
    `/api/reports?kind=${kind}&id=${id}`,
    'POST',
    { data: slim, report, model: REPORT_MODEL },
    token,
  );
  return res.data;
}
