/**
 * useGuestTracker — in-memory state manager for SCR-019 Guest Tracker.
 *
 * Zero API calls. All state lives in memory and is discarded on unmount (BR-AUTH-01).
 * Supports unlimited undo via a local event history array.
 *
 * PLAT-004 (EPIC-05)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { EventType } from '@/services/matchEvents';

const COMMIT_DEBOUNCE_MS = 600;

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
  /** Apply a life delta instantly; log entry batched per 600ms burst. */
  applyLifeChange: (participationId: string, delta: number) => void;
  /** Apply a poison delta instantly; log entry batched per 600ms burst. */
  applyPoisonChange: (participationId: string, delta: number) => void;
  /** Apply commander damage instantly (reduces life + increments source); batched per 600ms burst. */
  applyCommanderDamage: (
    participationId: string,
    commanderIdSource: string,
    delta: number,
  ) => void;
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

  // ── Batched per-tap apply (parity with useTracker) ──────────────────
  type PendingCommit = {
    life: number;
    poison: number;
    cmdDamage: Map<string, number>;
    timer: ReturnType<typeof setTimeout> | null;
  };
  const pendingRef = useRef<Map<string, PendingCommit>>(new Map());

  const getPending = useCallback((pid: string): PendingCommit => {
    let p = pendingRef.current.get(pid);
    if (!p) {
      p = { life: 0, poison: 0, cmdDamage: new Map(), timer: null };
      pendingRef.current.set(pid, p);
    }
    return p;
  }, []);

  const flushPending = useCallback((pid: string) => {
    const p = pendingRef.current.get(pid);
    if (!p) return;
    if (p.timer) {
      clearTimeout(p.timer);
      p.timer = null;
    }
    const lifeDelta = p.life;
    const poisonDelta = p.poison;
    const cmdEntries = Array.from(p.cmdDamage.entries()).filter(
      ([, v]) => v !== 0,
    );
    p.life = 0;
    p.poison = 0;
    p.cmdDamage.clear();

    // Record one log entry per counter-type burst.
    const newEntries: GuestEvent[] = [];
    if (lifeDelta !== 0) {
      newEntries.push({
        id: localId(),
        participationId: pid,
        eventType: 'life_change',
        delta: lifeDelta,
        isUndone: false,
      });
    }
    if (poisonDelta !== 0) {
      newEntries.push({
        id: localId(),
        participationId: pid,
        eventType: 'poison_change',
        delta: poisonDelta,
        isUndone: false,
      });
    }
    for (const [cmdId, delta] of cmdEntries) {
      newEntries.push({
        id: localId(),
        participationId: pid,
        eventType: 'commander_damage',
        delta,
        commanderIdSource: cmdId,
        isUndone: false,
      });
    }
    if (newEntries.length > 0) {
      setEvents((prev) => [...prev, ...newEntries]);
    }
  }, []);

  const scheduleCommit = useCallback(
    (pid: string) => {
      const p = getPending(pid);
      if (p.timer) clearTimeout(p.timer);
      p.timer = setTimeout(() => flushPending(pid), COMMIT_DEBOUNCE_MS);
    },
    [getPending, flushPending],
  );

  const applyLifeChange = useCallback(
    (pid: string, delta: number) => {
      if (delta === 0) return;
      setParticipations((parts) =>
        parts.map((p) =>
          p.id === pid ? { ...p, lifeTotal: p.lifeTotal + delta } : p,
        ),
      );
      const pend = getPending(pid);
      pend.life += delta;
      scheduleCommit(pid);
    },
    [getPending, scheduleCommit],
  );

  const applyPoisonChange = useCallback(
    (pid: string, delta: number) => {
      if (delta === 0) return;
      let appliedDelta = delta;
      setParticipations((parts) =>
        parts.map((p) => {
          if (p.id !== pid) return p;
          const next = Math.max(0, p.poisonCounters + delta);
          appliedDelta = next - p.poisonCounters;
          return { ...p, poisonCounters: next };
        }),
      );
      queueMicrotask(() => {
        if (appliedDelta === 0) return;
        const pend = getPending(pid);
        pend.poison += appliedDelta;
        scheduleCommit(pid);
      });
    },
    [getPending, scheduleCommit],
  );

  const applyCommanderDamage = useCallback(
    (pid: string, commanderIdSource: string, delta: number) => {
      if (delta === 0) return;
      setParticipations((parts) =>
        parts.map((p) => {
          if (p.id !== pid) return p;
          const current = p.commanderDamage[commanderIdSource] ?? 0;
          const nextCmd = Math.max(0, current + delta);
          const appliedCmdDelta = nextCmd - current;
          return {
            ...p,
            commanderDamage: { ...p.commanderDamage, [commanderIdSource]: nextCmd },
            // Only reduce life by the actual applied delta (prevents negative-damage underflow).
            lifeTotal: p.lifeTotal - appliedCmdDelta,
          };
        }),
      );
      const pend = getPending(pid);
      pend.cmdDamage.set(
        commanderIdSource,
        (pend.cmdDamage.get(commanderIdSource) ?? 0) + delta,
      );
      scheduleCommit(pid);
    },
    [getPending, scheduleCommit],
  );

  // Flush on unmount so the last burst makes it into the log.
  useEffect(() => {
    const map = pendingRef.current;
    return () => {
      for (const pid of map.keys()) flushPending(pid);
    };
  }, [flushPending]);

  const isDirty = useMemo(() => events.some((e) => !e.isUndone), [events]);

  return {
    participations,
    isDirty,
    init,
    recordEvent,
    applyLifeChange,
    applyPoisonChange,
    applyCommanderDamage,
    undoLastEvent,
  };
}
