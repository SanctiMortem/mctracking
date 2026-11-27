/**
 * LABS — AI match narration: the recap, the per-event causes, and the review
 * around them (flag a part, approve the draft, roast the match).
 *
 * Visibility follows the match: a draft is for the people who can open the
 * match and took part in it or created it; a published narration is for
 * anyone who can view the match (pod members included).
 *
 * Review rules:
 *  - A flagged part is left out of every read, for everyone, at once.
 *  - Flagging clears the flagger's own approval and deletes the roast, so a
 *    hidden moment cannot live on inside it.
 *  - The draft publishes when every account player seated in the match has
 *    approved it.
 *
 * Neon HTTP has no transactions: every write here is a single statement or
 * a sequence that is safe to repeat.
 *
 * ANL-006, RCP-001, RCP-003, RCP-005 (experimental)
 */
import { and, eq } from 'drizzle-orm';

import {
  matchEventAnnotations,
  matchNarrations,
  matchRoasts,
  matches,
  narrationApprovals,
  narrationFlags,
  participations,
  players,
} from '@/db/schema';
import type { NarrationRulesDebate, NarrationSpeaker } from '@/db/schema';
import { db } from '@/services/db';
import { canViewMatch } from '@/services/matches';

export type NarrationAnnotation = {
  event_id: string;
  /** Name of the player who caused it, when identified. */
  source_player: string | null;
  source_card: string | null;
  damage_type: string;
  confidence: number;
  evidence_quote: string | null;
};

export type FlagKind = 'paragraph' | 'moment' | 'debate' | 'event';
export const FLAG_KINDS: readonly FlagKind[] = ['paragraph', 'moment', 'debate', 'event'];

export type RoastLength = 'short' | 'long';

export type NarrationRoast = {
  length: RoastLength;
  content: string;
  model: string | null;
  created_at: string;
};

export type Narration = {
  status: 'draft' | 'published';
  model: string | null;
  headline: string;
  /** Visible paragraphs joined — kept for app versions that predate `paragraphs`. */
  narrative: string;
  key_moments: string[];
  rules_debates: NarrationRulesDebate[];
  speakers: NarrationSpeaker[];
  created_at: string;
  annotations: NarrationAnnotation[];

  // ── Review (RCP-003). Ids are the keys to flag a part with. ──
  paragraphs: { id: string; text: string }[];
  moments: { id: string; text: string }[];
  debates: { id: string; question: string; outcome: string }[];
  /** Parts hidden by anyone. */
  hidden_count: number;
  /** Parts the caller hid, so they can bring them back. */
  my_flags: { kind: FlagKind; key: string }[];
  /** Caller sat in the match (or created it): may flag, approve and unflag. */
  can_review: boolean;
  /** One entry per account player seated in the match. */
  approvals: { player: string; approved: boolean }[];
  i_approved: boolean;
  roast: NarrationRoast | null;
};

export type GetNarrationResult = { data: Narration | null } | { notFound: true };

export type NarrationWriteResult =
  | { data: Narration }
  | { notFound: true }
  | { forbidden: true }
  | { invalid: string };

const splitParagraphs = (narrative: string) =>
  narrative
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

type Flag = { kind: string; key: string; createdBy: string };

/**
 * The parts of a stored narration that nobody has flagged, each with the id
 * to flag it by. Pure, so it can be checked without a database.
 */
export function visibleParts(
  stored: { narrative: string; keyMoments: string[]; rulesDebates: NarrationRulesDebate[] },
  flags: Pick<Flag, 'kind' | 'key'>[],
) {
  const hidden = new Set(flags.map((f) => `${f.kind}:${f.key}`));
  const keep = (kind: FlagKind, i: number) => !hidden.has(`${kind}:${i}`);
  return {
    paragraphs: splitParagraphs(stored.narrative)
      .map((text, i) => ({ id: String(i), text }))
      .filter((p) => keep('paragraph', Number(p.id))),
    moments: stored.keyMoments
      .map((text, i) => ({ id: String(i), text }))
      .filter((m) => keep('moment', Number(m.id))),
    debates: stored.rulesDebates
      .map((d, i) => ({ id: String(i), question: d.question, outcome: d.outcome }))
      .filter((d) => keep('debate', Number(d.id))),
    isEventHidden: (eventId: string) => hidden.has(`event:${eventId}`),
  };
}

/** Account players seated in the match: the people who review a draft. */
async function seatedAccounts(matchId: string): Promise<{ userId: string; name: string }[]> {
  const rows = await db
    .select({ userId: players.accountUserId, name: players.name })
    .from(participations)
    .innerJoin(players, eq(participations.playerId, players.id))
    .where(eq(participations.matchId, matchId));
  const seen = new Set<string>();
  const out: { userId: string; name: string }[] = [];
  for (const r of rows) {
    if (!r.userId || seen.has(r.userId)) continue;
    seen.add(r.userId);
    out.push({ userId: r.userId, name: r.name });
  }
  return out;
}

type Access =
  | { notFound: true }
  | { narration: typeof matchNarrations.$inferSelect | null; canReview: boolean; seats: { userId: string; name: string }[] };

/** Match + narration + what the caller may do. `narration` is null when none is visible to them. */
async function loadAccess(userId: string, matchId: string): Promise<Access> {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  // Same answer for "no such match" and "not yours" — do not leak existence.
  if (!match || !(await canViewMatch(userId, match, matchId))) return { notFound: true };

  const seats = await seatedAccounts(matchId);
  const canReview = match.createdBy === userId || seats.some((s) => s.userId === userId);

  const [narration] = await db
    .select()
    .from(matchNarrations)
    .where(eq(matchNarrations.matchId, matchId))
    .limit(1);
  // Draft: only the match creator and account players who sat in the match.
  const visible = narration && (narration.status === 'published' || canReview) ? narration : null;
  return { narration: visible, canReview, seats };
}

async function buildNarration(
  userId: string,
  matchId: string,
  access: Exclude<Access, { notFound: true }>,
): Promise<Narration | null> {
  const narration = access.narration;
  if (!narration) return null;

  const [rows, flags, approvals, roastRows] = await Promise.all([
    db
      .select({
        eventId: matchEventAnnotations.eventId,
        sourceCard: matchEventAnnotations.sourceCard,
        damageType: matchEventAnnotations.damageType,
        confidence: matchEventAnnotations.confidence,
        evidenceQuote: matchEventAnnotations.evidenceQuote,
        sourcePlayer: players.name,
      })
      .from(matchEventAnnotations)
      .leftJoin(participations, eq(matchEventAnnotations.sourceParticipationId, participations.id))
      .leftJoin(players, eq(participations.playerId, players.id))
      .where(eq(matchEventAnnotations.matchId, matchId)),
    db
      .select({ kind: narrationFlags.kind, key: narrationFlags.key, createdBy: narrationFlags.createdBy })
      .from(narrationFlags)
      .where(eq(narrationFlags.matchId, matchId)),
    db
      .select({ userId: narrationApprovals.userId })
      .from(narrationApprovals)
      .where(eq(narrationApprovals.matchId, matchId)),
    db.select().from(matchRoasts).where(eq(matchRoasts.matchId, matchId)).limit(1),
  ]);

  const parts = visibleParts(narration, flags);
  const approved = new Set(approvals.map((a) => a.userId));
  const roast = roastRows[0];

  return {
    status: narration.status === 'published' ? 'published' : 'draft',
    model: narration.model,
    headline: narration.headline,
    narrative: parts.paragraphs.map((p) => p.text).join('\n\n'),
    key_moments: parts.moments.map((m) => m.text),
    rules_debates: parts.debates.map((d) => ({ question: d.question, outcome: d.outcome })),
    speakers: narration.speakers,
    created_at: narration.createdAt.toISOString(),
    annotations: rows
      .filter((r) => !parts.isEventHidden(r.eventId))
      .map((r) => ({
        event_id: r.eventId,
        source_player: r.sourcePlayer ?? null,
        source_card: r.sourceCard,
        damage_type: r.damageType,
        confidence: r.confidence,
        evidence_quote: r.evidenceQuote,
      })),
    paragraphs: parts.paragraphs,
    moments: parts.moments,
    debates: parts.debates,
    hidden_count: flags.length,
    my_flags: flags
      .filter((f) => f.createdBy === userId)
      .map((f) => ({ kind: f.kind as FlagKind, key: f.key })),
    can_review: access.canReview,
    approvals: access.seats.map((s) => ({ player: s.name, approved: approved.has(s.userId) })),
    i_approved: approved.has(userId),
    roast: roast
      ? {
          length: roast.length === 'long' ? 'long' : 'short',
          content: roast.content,
          model: roast.model,
          created_at: roast.createdAt.toISOString(),
        }
      : null,
  };
}

export async function getNarration(userId: string, matchId: string): Promise<GetNarrationResult> {
  const access = await loadAccess(userId, matchId);
  if ('notFound' in access) return { notFound: true };
  return { data: await buildNarration(userId, matchId, access) };
}

/** Shared tail of every write: re-read and return what the caller now sees. */
async function fresh(userId: string, matchId: string): Promise<NarrationWriteResult> {
  const access = await loadAccess(userId, matchId);
  if ('notFound' in access) return { notFound: true };
  const data = await buildNarration(userId, matchId, access);
  return data ? { data } : { notFound: true };
}

/** Hide a part for everyone. Clears the caller's approval and deletes the roast. */
export async function flagNarrationPart(
  userId: string,
  matchId: string,
  kind: FlagKind,
  key: string,
): Promise<NarrationWriteResult> {
  const access = await loadAccess(userId, matchId);
  if ('notFound' in access || !access.narration) return { notFound: true };
  if (!access.canReview) return { forbidden: true };

  await db.insert(narrationFlags).values({ matchId, kind, key, createdBy: userId }).onConflictDoNothing();
  await db
    .delete(narrationApprovals)
    .where(and(eq(narrationApprovals.matchId, matchId), eq(narrationApprovals.userId, userId)));
  await db.delete(matchRoasts).where(eq(matchRoasts.matchId, matchId));
  return fresh(userId, matchId);
}

/** Bring back the parts the caller hid (only their own). */
export async function unflagMyNarrationParts(userId: string, matchId: string): Promise<NarrationWriteResult> {
  const access = await loadAccess(userId, matchId);
  if ('notFound' in access || !access.narration) return { notFound: true };
  if (!access.canReview) return { forbidden: true };

  await db
    .delete(narrationFlags)
    .where(and(eq(narrationFlags.matchId, matchId), eq(narrationFlags.createdBy, userId)));
  return fresh(userId, matchId);
}

/** Approve (or take back approval of) the draft; publishes once everyone seated has approved. */
export async function setNarrationApproval(
  userId: string,
  matchId: string,
  approved: boolean,
): Promise<NarrationWriteResult> {
  const access = await loadAccess(userId, matchId);
  if ('notFound' in access || !access.narration) return { notFound: true };
  // Only account players seated in the match approve; a creator who did not play has no vote.
  if (!access.seats.some((s) => s.userId === userId)) return { forbidden: true };

  if (approved) {
    await db.insert(narrationApprovals).values({ matchId, userId }).onConflictDoNothing();
    const rows = await db
      .select({ userId: narrationApprovals.userId })
      .from(narrationApprovals)
      .where(eq(narrationApprovals.matchId, matchId));
    const have = new Set(rows.map((r) => r.userId));
    if (access.seats.every((s) => have.has(s.userId))) {
      await db
        .update(matchNarrations)
        .set({ status: 'published', updatedAt: new Date() })
        .where(eq(matchNarrations.matchId, matchId));
    }
  } else {
    await db
      .delete(narrationApprovals)
      .where(and(eq(narrationApprovals.matchId, matchId), eq(narrationApprovals.userId, userId)));
  }
  return fresh(userId, matchId);
}

const MAX_ROAST_CHARS = 8000;

/** Store the roast a phone just wrote. Anyone who can see the narration may roast it. */
export async function saveRoast(
  userId: string,
  matchId: string,
  input: { length: RoastLength; content: string; model: string | null },
): Promise<NarrationWriteResult> {
  const content = input.content.trim();
  if (!content) return { invalid: 'content is empty' };
  if (content.length > MAX_ROAST_CHARS) return { invalid: `content is over ${MAX_ROAST_CHARS} characters` };

  const access = await loadAccess(userId, matchId);
  if ('notFound' in access || !access.narration) return { notFound: true };

  await db
    .insert(matchRoasts)
    .values({ matchId, length: input.length, content, model: input.model, createdBy: userId })
    .onConflictDoUpdate({
      target: matchRoasts.matchId,
      set: { length: input.length, content, model: input.model, createdBy: userId, createdAt: new Date() },
    });
  return fresh(userId, matchId);
}

/** Delete the roast: the match's players, or whoever wrote it. */
export async function deleteRoast(userId: string, matchId: string): Promise<NarrationWriteResult> {
  const access = await loadAccess(userId, matchId);
  if ('notFound' in access || !access.narration) return { notFound: true };

  const [roast] = await db.select().from(matchRoasts).where(eq(matchRoasts.matchId, matchId)).limit(1);
  if (roast) {
    if (!access.canReview && roast.createdBy !== userId) return { forbidden: true };
    await db.delete(matchRoasts).where(eq(matchRoasts.matchId, matchId));
  }
  return fresh(userId, matchId);
}
