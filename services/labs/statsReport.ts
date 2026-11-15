/**
 * LABS — runs the AI stats report from the phone (RPT-002).
 *
 * 1. Fetch the data package from our API (records, deck shape, card lists).
 * 2. Send it to Claude with the user's own key, straight from the phone —
 *    the key never reaches our backend (ADR-009).
 * 3. Clean the answer against the data package and hand it to the screen.
 *
 * Nothing is saved: the report lives in screen state and is gone on close.
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
  CHECKUP_AREAS,
  MAX_FINDINGS,
  MAX_SUGGESTIONS,
  allStats,
  type ReportCheckup,
  type ReportData,
  type ReportFinding,
  type ReportKind,
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

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/**
 * Hold the answer to the contract: known areas once each and in order, a
 * finding's stat_id must exist in the data package, and the caps apply. The
 * schema already guarantees the shape; this guards the meaning.
 */
export function cleanReport(raw: unknown, data: ReportData): StatsReport {
  const r = (raw ?? {}) as Record<string, unknown>;
  const statIds = new Set(allStats(data).map((s) => s.id));
  const hasList = data.kind === 'deck' && (data.decks[0]?.cards.length ?? 0) > 0;

  const rawCheckups = Array.isArray(r.checkups) ? (r.checkups as Record<string, unknown>[]) : [];
  const checkups: ReportCheckup[] = hasList
    ? CHECKUP_AREAS.flatMap((area) => {
        const c = rawCheckups.find((x) => x?.area === area);
        if (!c || !['low', 'fine', 'high'].includes(c.level as string)) return [];
        return [{
          area,
          level: c.level as ReportCheckup['level'],
          cards: Array.isArray(c.cards) ? c.cards.map(str).filter(Boolean) : [],
          note: str(c.note),
        }];
      })
    : [];

  const rawFindings = Array.isArray(r.findings) ? (r.findings as Record<string, unknown>[]) : [];
  const findings: ReportFinding[] = rawFindings
    .filter((f) => str(f?.title) && str(f?.detail))
    .slice(0, MAX_FINDINGS)
    .map((f) => {
      const statId = typeof f.stat_id === 'string' && statIds.has(f.stat_id) ? f.stat_id : null;
      const basis = ['results', 'decklist', 'both'].includes(f.based_on as string)
        ? (f.based_on as ReportFinding['based_on'])
        : 'decklist';
      return { title: str(f.title), detail: str(f.detail), based_on: basis, stat_id: statId };
    });

  const rawSuggestions = Array.isArray(r.suggestions) ? (r.suggestions as Record<string, unknown>[]) : [];
  const suggestions = rawSuggestions
    .filter((s) => str(s?.title) && str(s?.detail))
    .slice(0, MAX_SUGGESTIONS)
    .map((s) => ({ title: str(s.title), detail: str(s.detail) }));

  const headline = str(r.headline);
  if (!headline && findings.length === 0) throw new Error('empty report');
  return { headline, checkups, findings, suggestions };
}
