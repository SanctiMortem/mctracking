/**
 * LABS — read side of AI match narration: the recap and the per-event causes.
 *
 * Visibility follows the match: a draft is for the people who can open the
 * match and took part in it or created it; a published narration is for
 * anyone who can view the match (pod members included).
 *
 * ANL-006, RCP-001 (experimental)
 */
import { and, eq } from 'drizzle-orm';

import { matchEventAnnotations, matchNarrations, matches, participations, players } from '@/db/schema';
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

export type Narration = {
  status: 'draft' | 'published';
  model: string | null;
  headline: string;
  narrative: string;
  key_moments: string[];
  rules_debates: NarrationRulesDebate[];
  speakers: NarrationSpeaker[];
  created_at: string;
  annotations: NarrationAnnotation[];
};

export type GetNarrationResult = { data: Narration | null } | { notFound: true };

export async function getNarration(userId: string, matchId: string): Promise<GetNarrationResult> {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  // Same answer for "no such match" and "not yours" — do not leak existence.
  if (!match || !(await canViewMatch(userId, match, matchId))) return { notFound: true };

  const [narration] = await db
    .select()
    .from(matchNarrations)
    .where(eq(matchNarrations.matchId, matchId))
    .limit(1);
  if (!narration) return { data: null };

  if (narration.status !== 'published') {
    // Draft: only the match creator and account players who sat in the match.
    const isCreator = match.createdBy === userId;
    const [seat] = isCreator
      ? [null]
      : await db
          .select({ id: participations.id })
          .from(participations)
          .innerJoin(players, eq(participations.playerId, players.id))
          .where(and(eq(participations.matchId, matchId), eq(players.accountUserId, userId)))
          .limit(1);
    if (!isCreator && !seat) return { data: null };
  }

  const rows = await db
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
    .where(eq(matchEventAnnotations.matchId, matchId));

  return {
    data: {
      status: narration.status === 'published' ? 'published' : 'draft',
      model: narration.model,
      headline: narration.headline,
      narrative: narration.narrative,
      key_moments: narration.keyMoments,
      rules_debates: narration.rulesDebates,
      speakers: narration.speakers,
      created_at: narration.createdAt.toISOString(),
      annotations: rows.map((r) => ({
        event_id: r.eventId,
        source_player: r.sourcePlayer ?? null,
        source_card: r.sourceCard,
        damage_type: r.damageType,
        confidence: r.confidence,
        evidence_quote: r.evidenceQuote,
      })),
    },
  };
}
