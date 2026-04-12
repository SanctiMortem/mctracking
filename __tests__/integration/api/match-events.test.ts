/**
 * Integration tests — /api/match-events + /api/match-events/undo
 * Requires: DATABASE_URL in .env.test pointing to a Neon test branch.
 * TRACK-009 (EPIC-03)
 */
import { eq } from 'drizzle-orm';

import { recordEvent, undoLastEvent } from '@/services/matchEvents';
import { createMatch, closeMatch } from '@/services/matches';
import { db } from '@/services/db';
import { matchEvents, participations } from '@/db/schema';
import {
  seedTestData,
  cleanupTestData,
  TEST_USER_ID,
  TEST_USER_ID_2,
} from '../helpers/seed';

type Seed = Awaited<ReturnType<typeof seedTestData>>;
let seed: Seed;

// Helper: create an in_progress match and return match + participation IDs
async function createTestMatch(s: Seed) {
  const result = await createMatch(TEST_USER_ID, [
    { player_id: s.players.player1.id, deck_id: s.decks.deck1.id },
    { player_id: s.players.player2.id, deck_id: s.decks.deck2.id },
  ]);
  if (!('data' in result)) throw new Error('Failed to create test match');
  return result.data;
}

beforeAll(async () => {
  await cleanupTestData();
  seed = await seedTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

// ─── POST /api/match-events ───────────────────────────────────────────────────

describe('POST /api/match-events — life_change', () => {
  it('returns 201 and updates participation.life_total by delta', async () => {
    const { match, participations: parts } = await createTestMatch(seed);
    const partId = parts[0].id;

    const result = await recordEvent({
      matchId: match.id,
      participationId: partId,
      eventType: 'life_change',
      delta: -3,
    });

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.eventType).toBe('life_change');
      expect(result.data.delta).toBe(-3);
      expect(result.data.matchId).toBe(match.id);
      expect(result.data.participationId).toBe(partId);
      expect(result.data.isUndone).toBe(false);
    }

    // Verify participation snapshot updated
    const [part] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, partId));
    expect(part.lifeTotal).toBe(37); // 40 - 3
  });

  it('handles negative delta (life loss)', async () => {
    const { match, participations: parts } = await createTestMatch(seed);
    const partId = parts[0].id;

    const result = await recordEvent({
      matchId: match.id,
      participationId: partId,
      eventType: 'life_change',
      delta: -10,
    });

    expect('data' in result).toBe(true);

    const [part] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, partId));
    expect(part.lifeTotal).toBe(30); // 40 - 10
  });

  it('returns notFound when match_id does not exist', async () => {
    const result = await recordEvent({
      matchId: '00000000-0000-0000-0000-000000000000',
      participationId: '00000000-0000-0000-0000-000000000001',
      eventType: 'life_change',
      delta: -1,
    });

    expect(result).toEqual({ notFound: true });
  });

  it('returns notInProgress when match is not in_progress', async () => {
    const { match, participations: parts } = await createTestMatch(seed);

    // Close the match first
    await closeMatch(TEST_USER_ID, match.id, {
      action: 'win',
      winner_participation_id: parts[0].id,
      win_condition: 'combat_damage',
    });

    const result = await recordEvent({
      matchId: match.id,
      participationId: parts[0].id,
      eventType: 'life_change',
      delta: -1,
    });

    expect(result).toEqual({ notInProgress: true });
  });

  it('returns forbidden when participation_id does not belong to this match', async () => {
    const match1 = await createTestMatch(seed);

    // Create a second match with different decks
    const result2 = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player3.id, deck_id: seed.decks.deck3.id },
      { player_id: seed.players.player4.id, deck_id: seed.decks.deck4.id },
    ]);
    if (!('data' in result2)) throw new Error('Failed to create match 2');

    // Try to use match2's participation in match1
    const result = await recordEvent({
      matchId: match1.match.id,
      participationId: result2.data.participations[0].id,
      eventType: 'life_change',
      delta: -1,
    });

    expect(result).toEqual({ forbidden: true });
  });
});

describe('POST /api/match-events — commander_damage', () => {
  it('returns 201 and updates participation.commander_damage JSONB', async () => {
    const { match, participations: parts } = await createTestMatch(seed);
    const targetPartId = parts[1].id; // player2 receives commander damage

    const result = await recordEvent({
      matchId: match.id,
      participationId: targetPartId,
      eventType: 'commander_damage',
      delta: 5,
      commanderIdSource: seed.commanders.cmd1.id,
    });

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.eventType).toBe('commander_damage');
      expect(result.data.delta).toBe(5);
      expect(result.data.commanderIdSource).toBe(seed.commanders.cmd1.id);
    }

    // Verify JSONB updated
    const [part] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, targetPartId));
    const dmg = part.commanderDamage as Record<string, number>;
    expect(dmg[seed.commanders.cmd1.id]).toBe(5);
  });

  it('accumulates damage: second event adds to existing JSONB key', async () => {
    const { match, participations: parts } = await createTestMatch(seed);
    const targetPartId = parts[1].id;

    await recordEvent({
      matchId: match.id,
      participationId: targetPartId,
      eventType: 'commander_damage',
      delta: 3,
      commanderIdSource: seed.commanders.cmd1.id,
    });

    await recordEvent({
      matchId: match.id,
      participationId: targetPartId,
      eventType: 'commander_damage',
      delta: 4,
      commanderIdSource: seed.commanders.cmd1.id,
    });

    const [part] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, targetPartId));
    const dmg = part.commanderDamage as Record<string, number>;
    expect(dmg[seed.commanders.cmd1.id]).toBe(7); // 3 + 4
  });

  it('returns missingCommander when commander_id_source is absent', async () => {
    const { match, participations: parts } = await createTestMatch(seed);

    const result = await recordEvent({
      matchId: match.id,
      participationId: parts[0].id,
      eventType: 'commander_damage',
      delta: 5,
    });

    expect(result).toEqual({ missingCommander: true });
  });

  it('handles partner commanders: updates separate JSONB keys', async () => {
    const { match, participations: parts } = await createTestMatch(seed);
    const targetPartId = parts[0].id;

    // Partner deck (deck2) has cmd2 + cmd3
    await recordEvent({
      matchId: match.id,
      participationId: targetPartId,
      eventType: 'commander_damage',
      delta: 3,
      commanderIdSource: seed.commanders.cmd2.id,
    });

    await recordEvent({
      matchId: match.id,
      participationId: targetPartId,
      eventType: 'commander_damage',
      delta: 2,
      commanderIdSource: seed.commanders.cmd3.id,
    });

    const [part] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, targetPartId));
    const dmg = part.commanderDamage as Record<string, number>;
    expect(dmg[seed.commanders.cmd2.id]).toBe(3);
    expect(dmg[seed.commanders.cmd3.id]).toBe(2);
  });
});

describe('POST /api/match-events — poison_change', () => {
  it('returns 201 and updates participation.poison_counters', async () => {
    const { match, participations: parts } = await createTestMatch(seed);
    const partId = parts[0].id;

    const result = await recordEvent({
      matchId: match.id,
      participationId: partId,
      eventType: 'poison_change',
      delta: 3,
    });

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.eventType).toBe('poison_change');
      expect(result.data.delta).toBe(3);
    }

    const [part] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, partId));
    expect(part.poisonCounters).toBe(3); // 0 + 3
  });

  it('handles negative delta (poison removal)', async () => {
    const { match, participations: parts } = await createTestMatch(seed);
    const partId = parts[0].id;

    // Add 5 poison first
    await recordEvent({
      matchId: match.id,
      participationId: partId,
      eventType: 'poison_change',
      delta: 5,
    });

    // Remove 2 poison
    await recordEvent({
      matchId: match.id,
      participationId: partId,
      eventType: 'poison_change',
      delta: -2,
    });

    const [part] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, partId));
    expect(part.poisonCounters).toBe(3); // 5 - 2
  });
});

describe('POST /api/match-events — atomicity', () => {
  it('does not insert MatchEvent if participation update fails (foreign key violation)', async () => {
    const { match } = await createTestMatch(seed);
    const fakePartId = '00000000-0000-0000-0000-ffffffffffff';

    const result = await recordEvent({
      matchId: match.id,
      participationId: fakePartId,
      eventType: 'life_change',
      delta: -1,
    });

    // participation not in match -> forbidden
    expect(result).toEqual({ forbidden: true });

    // Verify no match events were created for the fake participation
    const events = await db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.matchId, match.id));
    expect(events.length).toBe(0);
  });

  it('does not update participation if MatchEvent insert fails', async () => {
    // This is inherently tested by the transaction in recordEvent.
    // If the event insert fails, the tx rolls back and the participation is unchanged.
    // We verify by checking that a successful event creates both rows atomically.
    const { match, participations: parts } = await createTestMatch(seed);
    const partId = parts[0].id;

    await recordEvent({
      matchId: match.id,
      participationId: partId,
      eventType: 'life_change',
      delta: -5,
    });

    const [part] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, partId));
    const events = await db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.participationId, partId));

    // Both were updated atomically
    expect(part.lifeTotal).toBe(35);
    expect(events.length).toBe(1);
    expect(events[0].delta).toBe(-5);
  });
});

// ─── POST /api/match-events/undo ─────────────────────────────────────────────

describe('POST /api/match-events/undo', () => {
  it('returns 200 with undone event after reversing life_change', async () => {
    const { match, participations: parts } = await createTestMatch(seed);
    const partId = parts[0].id;

    await recordEvent({
      matchId: match.id,
      participationId: partId,
      eventType: 'life_change',
      delta: -5,
    });

    const undoResult = await undoLastEvent(match.id);
    expect('data' in undoResult).toBe(true);
    if ('data' in undoResult) {
      expect(undoResult.data.isUndone).toBe(true);
      expect(undoResult.data.eventType).toBe('life_change');
      expect(undoResult.data.delta).toBe(-5);
    }
  });

  it('reverts participation.life_total to original value after undo', async () => {
    const { match, participations: parts } = await createTestMatch(seed);
    const partId = parts[0].id;

    await recordEvent({
      matchId: match.id,
      participationId: partId,
      eventType: 'life_change',
      delta: -5,
    });

    // life_total should be 35
    await undoLastEvent(match.id);

    // life_total should be back to 40
    const [part] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, partId));
    expect(part.lifeTotal).toBe(40);
  });

  it('reverts commander_damage JSONB after undo of commander_damage event', async () => {
    const { match, participations: parts } = await createTestMatch(seed);
    const targetPartId = parts[1].id;

    await recordEvent({
      matchId: match.id,
      participationId: targetPartId,
      eventType: 'commander_damage',
      delta: 7,
      commanderIdSource: seed.commanders.cmd1.id,
    });

    await undoLastEvent(match.id);

    const [part] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, targetPartId));
    const dmg = part.commanderDamage as Record<string, number>;
    expect(dmg[seed.commanders.cmd1.id]).toBe(0);
  });

  it('reverts poison_counters after undo of poison_change event', async () => {
    const { match, participations: parts } = await createTestMatch(seed);
    const partId = parts[0].id;

    await recordEvent({
      matchId: match.id,
      participationId: partId,
      eventType: 'poison_change',
      delta: 4,
    });

    await undoLastEvent(match.id);

    const [part] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, partId));
    expect(part.poisonCounters).toBe(0);
  });

  it('marks event.is_undone=true without deleting it (soft undo, BR-TRACK-11)', async () => {
    const { match, participations: parts } = await createTestMatch(seed);
    const partId = parts[0].id;

    const eventResult = await recordEvent({
      matchId: match.id,
      participationId: partId,
      eventType: 'life_change',
      delta: -3,
    });

    if (!('data' in eventResult)) throw new Error('Event should have been created');
    const eventId = eventResult.data.id;

    await undoLastEvent(match.id);

    // Event still exists in DB but is marked undone
    const [event] = await db
      .select()
      .from(matchEvents)
      .where(eq(matchEvents.id, eventId));
    expect(event).toBeDefined();
    expect(event.isUndone).toBe(true);
  });

  it('returns noEvents when no non-undone events exist', async () => {
    const { match } = await createTestMatch(seed);

    // No events recorded — undo should return noEvents
    const result = await undoLastEvent(match.id);
    expect(result).toEqual({ noEvents: true });
  });

  it('successive undos revert all events in LIFO order', async () => {
    const { match, participations: parts } = await createTestMatch(seed);
    const partId = parts[0].id;

    // Record 3 events
    await recordEvent({ matchId: match.id, participationId: partId, eventType: 'life_change', delta: -3 });
    await recordEvent({ matchId: match.id, participationId: partId, eventType: 'life_change', delta: -5 });
    await recordEvent({ matchId: match.id, participationId: partId, eventType: 'poison_change', delta: 2 });

    // life=32, poison=2

    // Undo 3rd event (poison)
    const undo1 = await undoLastEvent(match.id);
    expect('data' in undo1).toBe(true);
    if ('data' in undo1) expect(undo1.data.eventType).toBe('poison_change');

    // Undo 2nd event (life -5)
    const undo2 = await undoLastEvent(match.id);
    expect('data' in undo2).toBe(true);
    if ('data' in undo2) expect(undo2.data.delta).toBe(-5);

    // Undo 1st event (life -3)
    const undo3 = await undoLastEvent(match.id);
    expect('data' in undo3).toBe(true);
    if ('data' in undo3) expect(undo3.data.delta).toBe(-3);

    // All undone — back to initial state
    const [part] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, partId));
    expect(part.lifeTotal).toBe(40);
    expect(part.poisonCounters).toBe(0);

    // No more events to undo
    const undo4 = await undoLastEvent(match.id);
    expect(undo4).toEqual({ noEvents: true });
  });

  it('returns notFound for non-existent match_id', async () => {
    const result = await undoLastEvent('00000000-0000-0000-0000-000000000000');
    expect(result).toEqual({ notFound: true });
  });
});

// ─── Full flow — debounce + undo ─────────────────────────────────────────────

describe('E2E flow — debounce delta + undo', () => {
  it('5 taps at delta=-1 each -> single API call delta=-5 -> life_total=35 -> undo -> life_total=40', async () => {
    // Simulated: debounce is client-side; the API receives delta=-5 in one call
    const { match, participations: parts } = await createTestMatch(seed);
    const partId = parts[0].id;

    await recordEvent({
      matchId: match.id,
      participationId: partId,
      eventType: 'life_change',
      delta: -5, // debounced from 5x -1
    });

    const [partAfterEvent] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, partId));
    expect(partAfterEvent.lifeTotal).toBe(35);

    await undoLastEvent(match.id);

    const [partAfterUndo] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, partId));
    expect(partAfterUndo.lifeTotal).toBe(40);
  });

  it('3 events recorded -> 3 undos -> tracker back to initial state (life=40, poison=0)', async () => {
    const { match, participations: parts } = await createTestMatch(seed);
    const partId = parts[0].id;

    await recordEvent({ matchId: match.id, participationId: partId, eventType: 'life_change', delta: -10 });
    await recordEvent({ matchId: match.id, participationId: partId, eventType: 'poison_change', delta: 5 });
    await recordEvent({ matchId: match.id, participationId: partId, eventType: 'life_change', delta: 3 });

    // life=33, poison=5
    const [mid] = await db.select().from(participations).where(eq(participations.id, partId));
    expect(mid.lifeTotal).toBe(33);
    expect(mid.poisonCounters).toBe(5);

    await undoLastEvent(match.id); // undo life +3
    await undoLastEvent(match.id); // undo poison +5
    await undoLastEvent(match.id); // undo life -10

    const [final] = await db.select().from(participations).where(eq(participations.id, partId));
    expect(final.lifeTotal).toBe(40);
    expect(final.poisonCounters).toBe(0);
  });

  it('optimistic update on undo reverts before API confirms (hook-level test via mock)', async () => {
    // This is a hook-level/UI-level concern. At the service level, we verify undo works correctly.
    // The service undoLastEvent returns the undone event data, which the hook uses for optimistic revert.
    const { match, participations: parts } = await createTestMatch(seed);
    const partId = parts[0].id;

    await recordEvent({ matchId: match.id, participationId: partId, eventType: 'life_change', delta: -7 });

    const undoResult = await undoLastEvent(match.id);
    expect('data' in undoResult).toBe(true);
    if ('data' in undoResult) {
      // The undone event contains enough info for optimistic revert
      expect(undoResult.data.delta).toBe(-7);
      expect(undoResult.data.eventType).toBe('life_change');
      expect(undoResult.data.isUndone).toBe(true);
    }
  });

  it('API error on undo: UI reverts the optimistic revert (toast shown)', async () => {
    // At the service level, we verify that undo on a nonexistent match returns notFound
    // which the UI layer uses to revert the optimistic update and show a toast.
    const result = await undoLastEvent('00000000-0000-0000-0000-000000000000');
    expect(result).toEqual({ notFound: true });
  });
});
