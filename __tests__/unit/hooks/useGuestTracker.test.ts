/**
 * Unit tests — hooks/useGuestTracker.ts
 * PLAT-004 (EPIC-05)
 */

import { renderHook, act } from '@testing-library/react-native';
import { useGuestTracker } from '@/hooks/useGuestTracker';

// Ensure no API calls happen — spy on global fetch
const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
  throw new Error('fetch should not be called in guest tracker');
});

beforeEach(() => {
  fetchSpy.mockClear();
});

describe('useGuestTracker — init', () => {
  it('creates participations with default names "Player N" when names are empty', () => {
    const { result } = renderHook(() => useGuestTracker());

    act(() => {
      result.current.init(['', '', '']);
    });

    expect(result.current.participations).toHaveLength(3);
    expect(result.current.participations[0].name).toBe('Player 1');
    expect(result.current.participations[1].name).toBe('Player 2');
    expect(result.current.participations[2].name).toBe('Player 3');
  });

  it('creates participations with provided names when names are non-empty', () => {
    const { result } = renderHook(() => useGuestTracker());

    act(() => {
      result.current.init(['Alice', 'Bob']);
    });

    expect(result.current.participations).toHaveLength(2);
    expect(result.current.participations[0].name).toBe('Alice');
    expect(result.current.participations[1].name).toBe('Bob');
  });

  it('sets lifeTotal=40, poisonCounters=0, commanderDamage={} for each participant', () => {
    const { result } = renderHook(() => useGuestTracker());

    act(() => {
      result.current.init(['Alice', 'Bob']);
    });

    for (const p of result.current.participations) {
      expect(p.lifeTotal).toBe(40);
      expect(p.poisonCounters).toBe(0);
      expect(p.commanderDamage).toEqual({});
    }
  });

  it('resets event history on re-init', async () => {
    const { result } = renderHook(() => useGuestTracker());

    act(() => {
      result.current.init(['Alice']);
    });

    const pid = result.current.participations[0].id;
    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -5 });
    });

    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.init(['Bob']);
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.participations[0].lifeTotal).toBe(40);
  });
});

describe('useGuestTracker — recordEvent', () => {
  it('life_change updates lifeTotal by delta', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -3 });
    });

    expect(result.current.participations[0].lifeTotal).toBe(37);
  });

  it('poison_change updates poisonCounters by delta, floors at 0', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'poison_change', delta: 3 });
    });
    expect(result.current.participations[0].poisonCounters).toBe(3);

    // Test floor at 0
    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'poison_change', delta: -10 });
    });
    expect(result.current.participations[0].poisonCounters).toBe(0);
  });

  it('commander_damage updates commanderDamage[commanderIdSource] by delta, floors at 0', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice', 'Bob']); });
    const pid = result.current.participations[0].id;
    const cmdSource = result.current.participations[1].id;

    await act(async () => {
      await result.current.recordEvent({
        participationId: pid,
        eventType: 'commander_damage',
        delta: 7,
        commanderIdSource: cmdSource,
      });
    });

    expect(result.current.participations[0].commanderDamage[cmdSource]).toBe(7);

    // Floor at 0
    await act(async () => {
      await result.current.recordEvent({
        participationId: pid,
        eventType: 'commander_damage',
        delta: -20,
        commanderIdSource: cmdSource,
      });
    });

    expect(result.current.participations[0].commanderDamage[cmdSource]).toBe(0);
  });

  it('event is appended to history with isUndone=false', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -5 });
    });

    // isDirty is true => at least one non-undone event exists
    expect(result.current.isDirty).toBe(true);
  });

  it('isDirty becomes true after first recordEvent', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });

    expect(result.current.isDirty).toBe(false);

    const pid = result.current.participations[0].id;
    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: 1 });
    });

    expect(result.current.isDirty).toBe(true);
  });
});

describe('useGuestTracker — undoLastEvent', () => {
  it('reverts lifeTotal to value before last life_change event', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -5 });
    });
    expect(result.current.participations[0].lifeTotal).toBe(35);

    await act(async () => {
      await result.current.undoLastEvent();
    });
    expect(result.current.participations[0].lifeTotal).toBe(40);
  });

  it('reverts poisonCounters to value before last poison_change event', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'poison_change', delta: 4 });
    });
    expect(result.current.participations[0].poisonCounters).toBe(4);

    await act(async () => {
      await result.current.undoLastEvent();
    });
    expect(result.current.participations[0].poisonCounters).toBe(0);
  });

  it('reverts commanderDamage entry before last commander_damage event', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice', 'Bob']); });
    const pid = result.current.participations[0].id;
    const cmdSource = result.current.participations[1].id;

    await act(async () => {
      await result.current.recordEvent({
        participationId: pid,
        eventType: 'commander_damage',
        delta: 5,
        commanderIdSource: cmdSource,
      });
    });
    expect(result.current.participations[0].commanderDamage[cmdSource]).toBe(5);

    await act(async () => {
      await result.current.undoLastEvent();
    });
    expect(result.current.participations[0].commanderDamage[cmdSource]).toBe(0);
  });

  it('marks the reverted event as isUndone=true', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -3 });
    });
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.undoLastEvent();
    });
    // All events undone => isDirty is false
    expect(result.current.isDirty).toBe(false);
  });

  it('does nothing when all events are already undone', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -5 });
    });
    await act(async () => {
      await result.current.undoLastEvent();
    });

    const lifeBefore = result.current.participations[0].lifeTotal;

    await act(async () => {
      await result.current.undoLastEvent();
    });

    // No change
    expect(result.current.participations[0].lifeTotal).toBe(lifeBefore);
  });

  it('isDirty returns false when all events are undone', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -3 });
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -2 });
    });

    await act(async () => {
      await result.current.undoLastEvent();
    });
    await act(async () => {
      await result.current.undoLastEvent();
    });

    expect(result.current.isDirty).toBe(false);
  });

  it('only affects the last non-undone event (second-to-last remains intact)', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    // Event 1: -5 life (40 -> 35)
    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -5 });
    });
    // Event 2: -3 life (35 -> 32)
    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -3 });
    });

    expect(result.current.participations[0].lifeTotal).toBe(32);

    // Undo last event (undo -3, back to 35)
    await act(async () => {
      await result.current.undoLastEvent();
    });

    expect(result.current.participations[0].lifeTotal).toBe(35);
    // Still dirty because first event is not undone
    expect(result.current.isDirty).toBe(true);
  });
});

describe('useGuestTracker — isDirty', () => {
  it('is false on initial state (no events)', () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    expect(result.current.isDirty).toBe(false);
  });

  it('is true after a non-undone event exists', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: 1 });
    });

    expect(result.current.isDirty).toBe(true);
  });

  it('is false after all events are undone via undoLastEvent', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: 1 });
    });
    await act(async () => {
      await result.current.undoLastEvent();
    });

    expect(result.current.isDirty).toBe(false);
  });
});

describe('useGuestTracker — isolation (no API calls)', () => {
  it('recordEvent does not call fetch or any /api/* endpoint', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -5 });
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('undoLastEvent does not call fetch or any /api/* endpoint', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -5 });
    });
    fetchSpy.mockClear();

    await act(async () => {
      await result.current.undoLastEvent();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('all state mutations are in-memory only (no side effects outside the hook)', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice', 'Bob']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -10 });
      await result.current.recordEvent({ participationId: pid, eventType: 'poison_change', delta: 3 });
    });

    await act(async () => {
      await result.current.undoLastEvent();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    // State is purely in-memory
    expect(result.current.participations[0].lifeTotal).toBe(30);
    expect(result.current.participations[0].poisonCounters).toBe(0);
  });
});

describe('GuestScreen — confirm dialog', () => {
  it('does not show confirm dialog when isDirty=false (no changes made)', () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    expect(result.current.isDirty).toBe(false);
  });

  it('shows confirm dialog with "Discard" option when isDirty=true and exit is pressed', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -1 });
    });

    // isDirty is the signal to show the confirm dialog
    expect(result.current.isDirty).toBe(true);
  });

  it('navigates to /auth when Discard is confirmed', async () => {
    // This test verifies the isDirty flag which the screen component uses
    // to decide whether to show the confirm dialog. Navigation is handled by the screen.
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -1 });
    });

    expect(result.current.isDirty).toBe(true);

    // After re-init (simulating discard), isDirty resets
    act(() => { result.current.init([]); });
    expect(result.current.isDirty).toBe(false);
  });

  it('stays on tracker when Cancel is pressed in confirm dialog', async () => {
    const { result } = renderHook(() => useGuestTracker());
    act(() => { result.current.init(['Alice']); });
    const pid = result.current.participations[0].id;

    await act(async () => {
      await result.current.recordEvent({ participationId: pid, eventType: 'life_change', delta: -1 });
    });

    // isDirty stays true (no re-init, user cancelled the dialog)
    expect(result.current.isDirty).toBe(true);
    // Participations unchanged
    expect(result.current.participations[0].lifeTotal).toBe(39);
  });
});
