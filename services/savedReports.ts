/**
 * Saved AI stats report (RPT-004) — the last report a user ran for a deck or
 * for their own player profile.
 *
 * The phone writes the report with the user's own Claude key and posts the
 * result here; this service never calls an AI service and never sees the key.
 * One report per (user, kind, subject): saving again replaces it. Reports are
 * private — only the user who ran one can read it, and only for a deck they
 * own or their own profile.
 */
import { and, eq, isNull } from 'drizzle-orm';

import { decks, players, statsReports } from '@/db/schema';
import { db } from '@/services/db';
import {
  cleanReport,
  type ReportData,
  type ReportKind,
  type SavedReport,
  type StatsReport,
} from '@/services/reportShared';

export type SavedReportResult =
  | { data: SavedReport | null }
  | { notFound: true }
  | { forbidden: true }
  | { invalid: true };

/** Same rule as running a report: your own deck, or your own profile. */
async function canReport(userId: string, kind: ReportKind, subjectId: string) {
  if (kind === 'deck') {
    const [deck] = await db
      .select({ createdBy: decks.createdBy })
      .from(decks)
      .where(and(eq(decks.id, subjectId), isNull(decks.deletedAt)))
      .limit(1);
    if (!deck) return 'notFound' as const;
    return deck.createdBy === userId ? ('ok' as const) : ('forbidden' as const);
  }
  const [player] = await db
    .select({ accountUserId: players.accountUserId })
    .from(players)
    .where(and(eq(players.id, subjectId), isNull(players.deletedAt)))
    .limit(1);
  if (!player) return 'notFound' as const;
  return player.accountUserId === userId ? ('ok' as const) : ('forbidden' as const);
}

const where = (userId: string, kind: ReportKind, subjectId: string) =>
  and(
    eq(statsReports.userId, userId),
    eq(statsReports.kind, kind),
    eq(statsReports.subjectId, subjectId),
  );

export async function getSavedReport(
  userId: string,
  kind: ReportKind,
  subjectId: string,
): Promise<SavedReportResult> {
  const allowed = await canReport(userId, kind, subjectId);
  if (allowed !== 'ok') return allowed === 'notFound' ? { notFound: true } : { forbidden: true };

  const [row] = await db.select().from(statsReports).where(where(userId, kind, subjectId)).limit(1);
  if (!row) return { data: null };
  return {
    data: {
      data: row.data as ReportData,
      report: row.report as StatsReport,
      model: row.model,
      created_at: row.createdAt.toISOString(),
    },
  };
}

export async function saveReport(
  userId: string,
  kind: ReportKind,
  subjectId: string,
  input: { data: unknown; report: unknown; model: unknown },
): Promise<SavedReportResult> {
  const allowed = await canReport(userId, kind, subjectId);
  if (allowed !== 'ok') return allowed === 'notFound' ? { notFound: true } : { forbidden: true };

  const data = input.data as ReportData | null;
  if (!data || typeof data !== 'object' || data.kind !== kind || !data.overall || !Array.isArray(data.decks)) {
    return { invalid: true };
  }
  let report: StatsReport;
  try {
    // Same contract the app applies to Claude's answer.
    report = cleanReport(input.report, data);
  } catch {
    return { invalid: true };
  }
  const model = typeof input.model === 'string' ? input.model.slice(0, 100) : null;

  const [row] = await db
    .insert(statsReports)
    .values({ userId, kind, subjectId, data, report, model })
    .onConflictDoUpdate({
      target: [statsReports.userId, statsReports.kind, statsReports.subjectId],
      set: { data, report, model, createdAt: new Date() },
    })
    .returning();

  return { data: { data, report, model, created_at: row.createdAt.toISOString() } };
}
