/**
 * matchEvents service — recordEvent + undoLastEvent.
 *
 * ADR-002 (Option A): participations.commander_damage is the source of truth.
 * ADR-003 (Option A): participations.life_total is the source of truth.
 *
 * Both are updated sequentially (neon-http does not support transactions).
 * Undo marks the event as is_undone=true and reverts the participation snapshot.
 *
 * TRACK-002 (EPIC-03)
 */
import { and, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/services/db';
import { matchEvents, matches, participations } from '@/db/schema';
import type { MatchEvent } from '@/db/index';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type EventType = 'life_change' | 'poison_change' | 'commander_damage';

export type RecordEventInput = {
  matchId: string;
  participationId: string;
  eventType: EventType;
  delta: number;
  commanderIdSource?: string; // required when eventType = 'commander_damage'
};

export type RecordEventResult =
  | { data: MatchEvent }
  | { notFound: true }         // match not found
  | { notInProgress: true }    // match is not in_progress
  | { missingCommander: true } // commander_damage without commanderIdSource
  | { forbidden: true };       // participationId not in this match

export type UndoResult =
  | { data: MatchEvent }   // the event that was undone
  | { noEvents: true }     // no non-undone events to undo
  | { notFound: true };    // match not found

// ─────────────────────────────────────────────
// recordEvent
// ─────────────────────────────────────────────

/**
 * Records a tracker state change:
 *  1. Inserts a MatchEvent into match_events
 *  2. Updates the participation snapshot (life_total | poison_counters | commander_damage JSONB)
 *
 * The API client sends the debounce-accumulated delta — no debounce logic here.
 */
export async function recordEvent(input: RecordEventInput): Promise<RecordEventResult> {
  const { matchId, participationId, eventType, delta, commanderIdSource } = input;

  // Validate: commander_damage requires commanderIdSource
  if (eventType === 'commander_damage' && !commanderIdSource) {
    return { missingCommander: true };
  }

  // Fetch match — verify it exists and is in_progress
  const [match] = await db
    .select({ status: matches.status })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!match) return { notFound: true };
  if (match.status !== 'in_progress') return { notInProgress: true };

  // Verify participation belongs to this match
  const [part] = await db
    .select({ id: participations.id })
    .from(participations)
    .where(and(eq(participations.id, participationId), eq(participations.matchId, matchId)))
    .limit(1);

  if (!part) return { forbidden: true };

  // 1. Insert MatchEvent
  const [inserted] = await db
    .insert(matchEvents)
    .values({
      matchId,
      participationId,
      eventType,
      delta,
      commanderIdSource: commanderIdSource ?? null,
      isUndone: false,
    })
    .returning();

  // 2. Update participation snapshot
  if (eventType === 'life_change') {
    await db
      .update(participations)
      .set({ lifeTotal: sql`life_total + ${delta}` })
      .where(eq(participations.id, participationId));
  } else if (eventType === 'poison_change') {
    await db
      .update(participations)
      .set({ poisonCounters: sql`poison_counters + ${delta}` })
      .where(eq(participations.id, participationId));
  } else if (eventType === 'commander_damage' && commanderIdSource) {
    await db
      .update(participations)
      .set({
        commanderDamage: sql`commander_damage || jsonb_build_object(
          ${commanderIdSource}::text,
          (COALESCE((commander_damage->>cast(${commanderIdSource} as text))::int, 0) + ${delta})
        )`,
      })
      .where(eq(participations.id, participationId));
  }

  return { data: inserted };
}

// ─────────────────────────────────────────────
// undoLastEvent
// ─────────────────────────────────────────────

/**
 * Marks the most recent non-undone MatchEvent for the given match as is_undone=true
 * and reverts the participation snapshot.
 *
 * Undo is soft — the event remains in the log (BR-TRACK-11).
 */
export async function undoLastEvent(matchId: string): Promise<UndoResult> {
  // Verify match exists
  const [match] = await db
    .select({ status: matches.status })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!match) return { notFound: true };

  // Find the last non-undone event
  const [lastEvent] = await db
    .select()
    .from(matchEvents)
    .where(and(eq(matchEvents.matchId, matchId), eq(matchEvents.isUndone, false)))
    .orderBy(desc(matchEvents.createdAt))
    .limit(1);

  if (!lastEvent) return { noEvents: true };

  // Mark event as undone
  const [updated] = await db
    .update(matchEvents)
    .set({ isUndone: true })
    .where(eq(matchEvents.id, lastEvent.id))
    .returning();

  // Revert participation snapshot (apply inverse delta)
  const inverseDelta = -lastEvent.delta;

  if (lastEvent.eventType === 'life_change') {
    await db
      .update(participations)
      .set({ lifeTotal: sql`life_total + ${inverseDelta}` })
      .where(eq(participations.id, lastEvent.participationId));
  } else if (lastEvent.eventType === 'poison_change') {
    await db
      .update(participations)
      .set({ poisonCounters: sql`poison_counters + ${inverseDelta}` })
      .where(eq(participations.id, lastEvent.participationId));
  } else if (lastEvent.eventType === 'commander_damage' && lastEvent.commanderIdSource) {
    await db
      .update(participations)
      .set({
        commanderDamage: sql`commander_damage || jsonb_build_object(
          ${lastEvent.commanderIdSource}::text,
          (COALESCE((commander_damage->>cast(${lastEvent.commanderIdSource} as text))::int, 0) + ${inverseDelta})
        )`,
      })
      .where(eq(participations.id, lastEvent.participationId));
  }

  return { data: updated };
}
