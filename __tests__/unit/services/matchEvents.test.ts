/**
 * Unit tests — services/matchEvents.ts
 *
 * All service functions depend on the DB — covered by integration tests.
 * Pure logic (event formatting in hooks/useEventLog.ts) can run without DB.
 *
 * TRACK-009 (EPIC-03)
 */

// ─── recordEvent ─────────────────────────────────────────────────────────────

describe('recordEvent (integration only)', () => {
  it.todo('returns { notFound: true } for a non-existent matchId');
  it.todo('returns { notInProgress: true } when match.status is completed or abandoned');
  it.todo('returns { missingCommander: true } when event_type=commander_damage and commander_id_source is absent');
  it.todo('returns { forbidden: true } when participationId does not belong to the match');
  it.todo('life_change: inserts MatchEvent and increments participation.life_total by delta');
  it.todo('life_change: inserts MatchEvent and decrements participation.life_total by |delta|');
  it.todo('poison_change: inserts MatchEvent and updates participation.poison_counters');
  it.todo('commander_damage: inserts MatchEvent and updates JSONB commander_damage[commander_id]');
  it.todo('commander_damage: adds to existing JSONB key (accumulates across events)');
  it.todo('transaction rolls back: if participation update fails, MatchEvent is NOT inserted');
});

// ─── undoLastEvent ────────────────────────────────────────────────────────────

describe('undoLastEvent (integration only)', () => {
  it.todo('returns { notFound: true } for a non-existent matchId');
  it.todo('returns { noEvents: true } when all events are already is_undone=true');
  it.todo('marks the most recent non-undone event as is_undone=true');
  it.todo('reverts participation.life_total by -delta for life_change undo');
  it.todo('reverts participation.poison_counters for poison_change undo');
  it.todo('reverts participation.commander_damage JSONB key for commander_damage undo');
  it.todo('repeated undo N times: all events undone, participation back to initial state');
  it.todo('transaction: if snapshot revert fails, is_undone stays false (atomic)');
});

// ─── useEventLog — formatEvent (pure helper) ──────────────────────────────────

describe('formatEvent (useEventLog)', () => {
  it.todo('life_change +5: returns "PlayerName: +5 life"');
  it.todo('life_change -3: returns "PlayerName: -3 life"');
  it.todo('poison_change +2: returns "PlayerName: +2 poison"');
  it.todo('commander_damage +7: returns "PlayerName: +7 cmd dmg from CommanderName"');
  it.todo('commander_damage with unknown commander_id_source: falls back to "Commander"');
  it.todo('unknown participationId: falls back to "Unknown"');
});

// ─── useDebounce ─────────────────────────────────────────────────────────────

describe('useDebounce', () => {
  it.todo('fires callback once after delay with the last triggered value');
  it.todo('does not fire callback when cancel() is called before delay expires');
  it.todo('flush() fires the callback immediately with pending value');
  it.todo('flush() does nothing if no pending value');
  it.todo('accumulates via trigger: last trigger value wins on flush');
  it.todo('cleanup on unmount: calls callback with pending value to avoid data loss');
});
