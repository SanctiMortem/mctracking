/**
 * matchEventsCore — the match_events table WITHOUT the "Killed by" columns.
 *
 * Same physical table as `matchEvents` in db/schema.ts, built from the same
 * column definitions (`matchEventCoreColumns`), minus the three columns that
 * migration 0016 adds.
 *
 * WHY IT EXISTS
 *   Drizzle names every column of a table in each INSERT, in every
 *   `select()` without a column list and in every `.returning()`. Writing an
 *   event, Undo and opening a match all did one of those against
 *   `matchEvents`, so adding the killer columns there would have made all
 *   three fail with "column does not exist" on any database that has not had
 *   migration 0016 applied — a deploy landing before the migration would
 *   have stopped every tracker write.
 *
 *   Those code paths use this table instead, so the SQL they send is exactly
 *   what it was before "Killed by". Only the feature's own queries
 *   (services/deathKillers.ts) name the new columns, and they fail soft.
 *
 * It lives outside db/schema.ts on purpose: drizzle-kit reads only that
 * file, and must never see two tables called match_events.
 *
 * Once migration 0016 is applied everywhere this could be folded back into
 * `matchEvents`; keeping it costs nothing.
 */
import { pgTable } from 'drizzle-orm/pg-core';

import { matchEventCoreColumns } from './schema';
import type { MatchEvent } from './index';

export const matchEventsCore = pgTable('match_events', { ...matchEventCoreColumns });

export type MatchEventCore = typeof matchEventsCore.$inferSelect;

/**
 * A core row as a full MatchEvent, with no killer. True by construction for
 * the rows this is used on: a freshly inserted event, and an undone one (an
 * undone death has no killer — see the rule on `matchEvents`).
 */
export function withNoKiller(row: MatchEventCore): MatchEvent {
  return { ...row, killerParticipationId: null, killerCommanderId: null, deathCause: null };
}
