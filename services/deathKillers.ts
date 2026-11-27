/**
 * deathKillers service — "Killed by" reads (server-only).
 *
 * The killer of a dead player lives on that player's `player_died` row in
 * match_events (columns added by migration 0016). This file and
 * services/setDeathKiller.ts hold the ONLY queries in the codebase that name
 * those columns, and every one of them fails soft: on a database that has
 * not had the migration, reads answer "unavailable" and the write answers
 * `{ unavailable: true }` — nothing else is affected.
 *
 * Rule for every reader: a killer counts only on a player_died row that is
 * not undone. Undo does not clear the columns; it just makes the row stop
 * counting, here as everywhere else.
 *
 * The rules themselves (what a valid selection is, the edit window) are pure
 * functions in services/killedBy.ts.
 *
 * Spec: docs/STATS_REDESIGN_SPEC.md section 1a, decision 4.
 */
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/services/db';
import { matchEvents } from '@/db/schema';
import {
  latestDeathPerParticipation,
  type DeathCause,
  type DeathKillerEntry,
} from '@/services/killedBy';

// ─────────────────────────────────────────────
// "The migration has not been applied" detection
// ─────────────────────────────────────────────

/** Postgres: undefined_column, undefined_object (the death_cause enum). */
const MISSING_SCHEMA_CODES = new Set(['42703', '42704']);

/**
 * True when a query failed because the killer columns (or the death_cause
 * type) do not exist yet. Drizzle wraps the driver's error, so the Postgres
 * code is looked for on the error and on its causes.
 */
export function isMissingKillerSchemaError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    const { code, message, cause } = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (typeof code === 'string' && MISSING_SCHEMA_CODES.has(code)) return true;
    if (
      typeof message === 'string' &&
      /does not exist/i.test(message) &&
      /killer_participation_id|killer_commander_id|death_cause/i.test(message) &&
      // The driver's own message, not Drizzle's "Failed query: <sql>" wrapper,
      // which quotes the column names on every failure of these queries.
      !/^Failed query/i.test(message)
    ) {
      return true;
    }
    current = cause;
  }
  return false;
}

// ─────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────

export type DeathKillerRow = {
  /** The player_died event's id. */
  id: string;
  participationId: string;
  createdAt: Date;
  deathCause: DeathCause | null;
  killerParticipationId: string | null;
  killerCommanderId: string | null;
};

export type LoadDeathKillersResult =
  /** `rows`: every non-undone death of the match, oldest first. */
  | { status: 'ok'; rows: DeathKillerRow[]; entries: DeathKillerEntry[] }
  /** The killer columns are not in this database yet. */
  | { status: 'unavailable' }
  /** The query failed for another reason; already logged. */
  | { status: 'error' };

/**
 * The current killer selection of each dead player of a match.
 *
 * Never throws: it is called next to the queries that load a match and build
 * the live-sync snapshot, and must not be able to take either of them down.
 */
export async function loadDeathKillers(matchId: string): Promise<LoadDeathKillersResult> {
  try {
    const rows = await db
      .select({
        id: matchEvents.id,
        participationId: matchEvents.participationId,
        createdAt: matchEvents.createdAt,
        deathCause: matchEvents.deathCause,
        killerParticipationId: matchEvents.killerParticipationId,
        killerCommanderId: matchEvents.killerCommanderId,
      })
      .from(matchEvents)
      .where(
        and(
          eq(matchEvents.matchId, matchId),
          eq(matchEvents.eventType, 'player_died'),
          eq(matchEvents.isUndone, false),
        ),
      )
      .orderBy(asc(matchEvents.createdAt), asc(matchEvents.id));

    return { status: 'ok', rows, entries: latestDeathPerParticipation(rows) };
  } catch (error) {
    if (isMissingKillerSchemaError(error)) return { status: 'unavailable' };
    console.error('[deathKillers] loadDeathKillers failed', error);
    return { status: 'error' };
  }
}
