/**
 * setDeathKiller — the one "Killed by" write (server-only).
 *
 * Kept apart from services/deathKillers.ts (the reads) only so that
 * services/matches.ts can import the reads without an import cycle: this
 * file needs `canViewMatch` from it.
 *
 * Spec: docs/STATS_REDESIGN_SPEC.md section 1a, decision 4.
 */
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/services/db';
import { decks, matchEvents, matches, participations } from '@/db/schema';
import { isMissingKillerSchemaError } from '@/services/deathKillers';
import { canViewMatch, EDIT_WINDOW_MS } from '@/services/matches';
import {
  killerEditState,
  validateKillerSelection,
  type DeathKillerEntry,
  type KillerCandidate,
  type KillerSelection,
  type KillerValidationCode,
} from '@/services/killedBy';

export type SetDeathKillerResult =
  | { data: DeathKillerEntry }
  /** Match missing, or the caller may not see it. */
  | { notFound: true }
  /** That player has no non-undone player_died event in this match. */
  | { noDeath: true }
  /** The match is abandoned. */
  | { notEditable: true }
  /** Completed more than 15 minutes ago. */
  | { editWindowExpired: true }
  | { invalid: KillerValidationCode }
  /** The killer columns are not in this database yet (migration 0016). */
  | { unavailable: true };

/**
 * Set, switch or clear the killer of a dead player.
 *
 * Keyed by match + dead player, not by event id (decision 4): the tracker
 * only learns a death's event id when its POST returns, and other devices
 * learn of deaths through sync without any id. It is applied to that
 * player's latest non-undone `player_died` row.
 *
 * It updates that row; it never writes an event, so it is never its own
 * Undo step.
 *
 * Access: anyone who can open the match's tracker (`canViewMatch`). The
 * existing event writes only check that the caller is signed in; this is the
 * same people in practice, stated explicitly.
 *
 * Sequential queries — neon-http has no transactions. The one write is a
 * single UPDATE guarded by `is_undone = false`, so a death undone between
 * the read and the write is simply not updated (reported as `noDeath`).
 */
export async function setDeathKiller(
  userId: string,
  matchId: string,
  deadParticipationId: string,
  selection: KillerSelection,
): Promise<SetDeathKillerResult> {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);

  if (!match) return { notFound: true };
  if (!(await canViewMatch(userId, match, matchId))) return { notFound: true };

  const editState = killerEditState(match, Date.now(), EDIT_WINDOW_MS);
  if (editState === 'not_editable') return { notEditable: true };
  if (editState === 'window_expired') return { editWindowExpired: true };

  // Only columns that exist in every deployed database, so "no death" is
  // answered correctly even before the migration.
  const [death] = await db
    .select({ id: matchEvents.id })
    .from(matchEvents)
    .where(
      and(
        eq(matchEvents.matchId, matchId),
        eq(matchEvents.participationId, deadParticipationId),
        eq(matchEvents.eventType, 'player_died'),
        eq(matchEvents.isUndone, false),
      ),
    )
    .orderBy(desc(matchEvents.createdAt), desc(matchEvents.id))
    .limit(1);

  if (!death) return { noDeath: true };

  // Clearing needs no look at the other players.
  let validated = selection;
  if (selection.deathCause !== null || selection.killerParticipationId !== null || selection.killerCommanderId !== null) {
    const rows = await db
      .select({
        participationId: participations.id,
        commanderId: decks.commanderId,
        commanderId2: decks.commanderId2,
      })
      .from(participations)
      .innerJoin(decks, eq(participations.deckId, decks.id))
      .where(eq(participations.matchId, matchId));

    const participants: KillerCandidate[] = rows.map((r) => ({
      participationId: r.participationId,
      commanderIds: [r.commanderId, r.commanderId2].filter((c): c is string => !!c),
    }));

    const verdict = validateKillerSelection({ deadParticipationId, selection, participants });
    if (!verdict.ok) return { invalid: verdict.code };
    validated = verdict.selection;
  }

  try {
    const [updated] = await db
      .update(matchEvents)
      .set({
        deathCause: validated.deathCause,
        killerParticipationId: validated.killerParticipationId,
        killerCommanderId: validated.killerCommanderId,
      })
      .where(and(eq(matchEvents.id, death.id), eq(matchEvents.isUndone, false)))
      .returning({ id: matchEvents.id });

    // Undone between the read above and this write.
    if (!updated) return { noDeath: true };
  } catch (error) {
    if (isMissingKillerSchemaError(error)) return { unavailable: true };
    throw error;
  }

  return { data: { participationId: deadParticipationId, ...validated } };
}
