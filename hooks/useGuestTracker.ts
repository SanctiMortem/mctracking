/**
 * useGuestTracker — in-memory state manager for SCR-019 Guest Tracker.
 *
 * Zero API calls. All state lives in memory and is discarded on unmount (BR-AUTH-01).
 * Supports unlimited undo via a local event history array.
 *
 * PLAT-004 (EPIC-05)
 */
import { useCallback, useMemo, useRef, useState } from 'react';

import type { EventType } from '@/services/matchEvents';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface GuestParticipation {
  id: string;
  name: string;
  lifeTotal: number;
  poisonCounters: number;
  /** Key = other participation id (used as commander source). */
  commanderDamage: Record<string, number>;
}

interface GuestEvent {
  id: string;
  participationId: string;
  eventType: EventType;
  delta: number;
  commanderIdSource?: string;
  isUndone: boolean;
}

export interface UseGuestTrackerReturn {
  participations: GuestParticipation[];
  /** True if any non-undone event exists — used for confirm-before-exit dialog. */
  isDirty: boolean;
  /** Initialize participations from setup phase names (empty string → "Player N"). */
  init: (names: string[]) => void;
  /** Apply a state change in-memory. Signature matches useTracker.recordEvent for component reuse. */
  recordEvent: (input: {
    participationId: string;
    eventType: EventType;
    delta: number;
    commanderIdSource?: string;
  }) => Promise<void>;
  /** Undo the last non-undone event. */
  undoLastEvent: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

let _counter = 0;
function localId(): string {
  return `g-${Date.now()}-${++_counter}`;
}

function buildParticipation(name: string, index: number): GuestParticipation {
  return {
    id: localId(),
    name: name.trim() || `Player ${index + 1}`,
    lifeTotal: 40,
    poisonCounters: 0,
    commanderDamage: {},
  };
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useGuestTracker(): UseGuestTrackerReturn {
  const [participations, setParticipations] = useState<GuestParticipation[]>([]);
  const [events, setEvents] = useState<GuestEvent[]>([]);

  // Ref for use inside async callbacks without stale closure
  const eventsRef = useRef<GuestEvent[]>([]);
  eventsRef.current = events;

  const init = useCallback((names: string[]) => {
    setParticipations(names.map(buildParticipation));
    setEvents([]);
  }, []);

  const recordEvent = useCallback(async (input: {
    participationId: string;
    eventType: EventType;
    delta: number;
    commanderIdSource?: string;
  }) => {
    const { participationId, eventType, delta, commanderIdSource } = input;

    setParticipations((parts) =>
      parts.map((p) => {
        if (p.id !== participationId) return p;
        if (eventType === 'life_change') {
          return { ...p, lifeTotal: p.lifeTotal + delta };
        }
        if (eventType === 'poison_change') {
          return { ...p, poisonCounters: Math.max(0, p.poisonCounters + delta) };
        }
        if (eventType === 'commander_damage' && commanderIdSource) {
          const current = p.commanderDamage[commanderIdSource] ?? 0;
          return {
            ...p,
            commanderDamage: {
              ...p.commanderDamage,
              [commanderIdSource]: Math.max(0, current + delta),
            },
          };
        }
        return p;
      }),
    );

    setEvents((prev) => [
      ...prev,
      {
        id: localId(),
        participationId,
        eventType,
        delta,
        commanderIdSource,
        isUndone: false,
      },
    ]);
  }, []);

  const undoLastEvent = useCallback(async () => {
    const last = [...eventsRef.current].reverse().find((e) => !e.isUndone);
    if (!last) return;

    setParticipations((parts) =>
      parts.map((p) => {
        if (p.id !== last.participationId) return p;
        if (last.eventType === 'life_change') {
          return { ...p, lifeTotal: p.lifeTotal - last.delta };
        }
        if (last.eventType === 'poison_change') {
          return { ...p, poisonCounters: Math.max(0, p.poisonCounters - last.delta) };
        }
        if (last.eventType === 'commander_damage' && last.commanderIdSource) {
          const current = p.commanderDamage[last.commanderIdSource] ?? 0;
          return {
            ...p,
            commanderDamage: {
              ...p.commanderDamage,
              [last.commanderIdSource]: Math.max(0, current - last.delta),
            },
          };
        }
        return p;
      }),
    );

    setEvents((evts) =>
      evts.map((e) => (e.id === last.id ? { ...e, isUndone: true } : e)),
    );
  }, []);

  const isDirty = useMemo(() => events.some((e) => !e.isUndone), [events]);

  return { participations, isDirty, init, recordEvent, undoLastEvent };
}
