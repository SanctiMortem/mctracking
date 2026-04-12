/**
 * Unit tests — hooks/useGuestTracker.ts
 * PLAT-004 (EPIC-05)
 */

describe('useGuestTracker — init', () => {
  it.todo('creates participations with default names "Player N" when names are empty');
  it.todo('creates participations with provided names when names are non-empty');
  it.todo('sets lifeTotal=40, poisonCounters=0, commanderDamage={} for each participant');
  it.todo('resets event history on re-init');
});

describe('useGuestTracker — recordEvent', () => {
  it.todo('life_change updates lifeTotal by delta');
  it.todo('poison_change updates poisonCounters by delta, floors at 0');
  it.todo('commander_damage updates commanderDamage[commanderIdSource] by delta, floors at 0');
  it.todo('event is appended to history with isUndone=false');
  it.todo('isDirty becomes true after first recordEvent');
});

describe('useGuestTracker — undoLastEvent', () => {
  it.todo('reverts lifeTotal to value before last life_change event');
  it.todo('reverts poisonCounters to value before last poison_change event');
  it.todo('reverts commanderDamage entry before last commander_damage event');
  it.todo('marks the reverted event as isUndone=true');
  it.todo('does nothing when all events are already undone');
  it.todo('isDirty returns false when all events are undone');
  it.todo('only affects the last non-undone event (second-to-last remains intact)');
});

describe('useGuestTracker — isDirty', () => {
  it.todo('is false on initial state (no events)');
  it.todo('is true after a non-undone event exists');
  it.todo('is false after all events are undone via undoLastEvent');
});

describe('useGuestTracker — isolation (no API calls)', () => {
  it.todo('recordEvent does not call fetch or any /api/* endpoint');
  it.todo('undoLastEvent does not call fetch or any /api/* endpoint');
  it.todo('all state mutations are in-memory only (no side effects outside the hook)');
});

describe('GuestScreen — confirm dialog', () => {
  it.todo('does not show confirm dialog when isDirty=false (no changes made)');
  it.todo('shows confirm dialog with "Discard" option when isDirty=true and exit is pressed');
  it.todo('navigates to /auth when Discard is confirmed');
  it.todo('stays on tracker when Cancel is pressed in confirm dialog');
});
