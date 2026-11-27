/**
 * Unit tests — db/matchEventsCore.ts
 *
 * The promise this file guards: the tracker's hot paths (write an event,
 * Undo, open a match) never name the "Killed by" columns, so they keep
 * working on a database that has not had migration 0016 applied.
 *
 * Uses the real Drizzle query builder against a driver that is never called
 * (`.toSQL()` only builds the statement), so what is checked is the SQL text
 * that would be sent.
 */
import { getTableColumns } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pg-proxy';

import { matchEventsCore, withNoKiller } from '@/db/matchEventsCore';
import { matchEvents } from '@/db/schema';

const db = drizzle(async () => ({ rows: [] }));

const KILLER_COLUMNS = ['killer_participation_id', 'killer_commander_id', 'death_cause'];
const expectNoKillerColumns = (sql: string) => {
  for (const column of KILLER_COLUMNS) expect(sql).not.toContain(column);
};

describe('matchEventsCore — the SQL the tracker sends', () => {
  it('INSERT (recordEvent) names no killer column, in the column list or in RETURNING', () => {
    const { sql } = db
      .insert(matchEventsCore)
      .values({
        matchId: '99999999-9999-4999-8999-999999999999',
        participationId: '11111111-1111-4111-8111-111111111111',
        eventType: 'player_died',
        delta: 0,
        commanderIdSource: null,
        isUndone: false,
        turnDurationSeconds: null,
      })
      .returning()
      .toSQL();

    expect(sql).toContain('insert into "match_events"');
    expectNoKillerColumns(sql);
  });

  it('SELECT * (undo, getMatchById) names no killer column', () => {
    const { sql } = db.select().from(matchEventsCore).toSQL();
    expect(sql).toContain('from "match_events"');
    expectNoKillerColumns(sql);
  });

  it('UPDATE … RETURNING (undo) names no killer column', () => {
    const { sql } = db.update(matchEventsCore).set({ isUndone: true }).returning().toSQL();
    expect(sql).toContain('update "match_events"');
    expectNoKillerColumns(sql);
  });

  it('is the control: the same INSERT through matchEvents DOES name them', () => {
    // If this ever stops being true, Drizzle changed and the narrow table may
    // no longer be needed — but until then it is what protects the tracker.
    const { sql } = db
      .insert(matchEvents)
      .values({
        matchId: '99999999-9999-4999-8999-999999999999',
        participationId: '11111111-1111-4111-8111-111111111111',
        eventType: 'player_died',
        delta: 0,
      })
      .toSQL();
    for (const column of KILLER_COLUMNS) expect(sql).toContain(column);
  });
});

describe('matchEventsCore — stays in step with matchEvents', () => {
  it('has every column of matchEvents except the three killer columns', () => {
    const full = Object.entries(getTableColumns(matchEvents)).map(([key, col]) => `${key}:${col.name}`);
    const core = Object.entries(getTableColumns(matchEventsCore)).map(([key, col]) => `${key}:${col.name}`);

    expect(full.filter((c) => !core.includes(c)).sort()).toEqual([
      'deathCause:death_cause',
      'killerCommanderId:killer_commander_id',
      'killerParticipationId:killer_participation_id',
    ]);
    expect(core.filter((c) => !full.includes(c))).toEqual([]);
  });

  it('withNoKiller completes a core row into a MatchEvent with no killer', () => {
    const row = {
      id: 'e1',
      matchId: 'm1',
      participationId: 'p1',
      eventType: 'player_died' as const,
      delta: 0,
      commanderIdSource: null,
      isUndone: false,
      turnDurationSeconds: null,
      createdAt: new Date('2026-11-27T20:00:00Z'),
    };
    expect(withNoKiller(row)).toEqual({
      ...row,
      killerParticipationId: null,
      killerCommanderId: null,
      deathCause: null,
    });
  });
});
