/**
 * useKilledBy — LABS. Who killed each dead player, for the account tracker.
 *
 * Holds this device's view of every dead player's selection, saves a tap to
 * the server, and folds in what other devices chose. The rules it applies
 * (tap = select / switch / clear, how a poll is merged, who was alive when a
 * player died) are pure functions in services/killedBy.ts; this file is the
 * timing around them.
 *
 * Guarantees the tracker relies on:
 *
 *   NEVER BLOCKS       Nothing here is awaited by the tracker. A tap updates
 *                      the screen at once and the save runs in the
 *                      background; a failed save shows no dialog.
 *   NEVER AN UNDO STEP A selection updates the death's own row on the
 *                      server. It writes no event and never touches the
 *                      tracker's event log.
 *   DIES WITH THE      When a player comes back to life (Undo here or on
 *   DEATH              another device) their selection is dropped.
 *   A TAP IS NOT LOST  A tap made while the death itself is still being
 *                      saved waits for that save, then is sent. Taps made
 *                      while a save is in flight are sent after it, last
 *                      one wins.
 *   A POLL NEVER       A sync snapshot is ignored for a player whose tap is
 *   REWINDS A TAP      waiting or in flight, or whose save came back after
 *                      the poll was sent (`mergeRemoteKillers`).
 *   FAILS SOFT         If the server cannot store killers (older server, or
 *                      a database without migration 0016), `available` is
 *                      false and the tracker shows no panel.
 *
 * Spec: docs/STATS_REDESIGN_SPEC.md section 1a.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import {
  NO_KILLER,
  effectiveDeathOrder,
  killerMapFromEntries,
  mergeRemoteKillers,
  type DeathKillerEntry,
  type KillerSelection,
} from '@/services/killedBy';
import type { MatchSyncState } from '@/services/matches';

export type UseKilledByInput = {
  matchId: string;
  /** The Labs switch on this device. */
  enabled: boolean;
  /** The tracker is still loading the match. */
  loading: boolean;
  /** `useTracker().initialDeathKillers`. */
  initialDeathKillers: DeathKillerEntry[] | null | undefined;
  /** `useTracker().remoteSync`. */
  remoteSync: MatchSyncState | null;
  /** `useTracker().remoteSyncRequestedAtMs`. */
  remoteSyncRequestedAtMs: number;
  /** Participations the tracker currently shows as dead. */
  deadIds: ReadonlySet<string>;
};

export type UseKilledByReturn = {
  /** Show the panel: the Labs switch is on and the server can store a killer. */
  available: boolean;
  /** dead participationId → selection. No entry = nothing selected. */
  selections: Readonly<Record<string, KillerSelection>>;
  /** The dead players, in the order they died. */
  deathOrder: string[];
  /** Set, switch or clear (pass NO_KILLER) a dead player's selection. */
  select: (deadParticipationId: string, selection: KillerSelection) => void;
  /**
   * Hand over the promise of a death this device has just recorded, so a
   * killer tapped before that save comes back is sent after it.
   */
  trackDeathWrite: (participationId: string, write: Promise<unknown>) => void;
};

/** One dead player's save loop. */
type Writer = {
  /** The loop is running. */
  running: boolean;
  /** A tap has not been sent yet. */
  dirty: boolean;
  /** Bumped when the player comes back to life: anything queued is void. */
  epoch: number;
  /** Device clock (ms) when the loop last finished. */
  settledAtMs: number;
};

type SaveOutcome = 'saved' | 'unavailable' | 'rejected' | 'failed' | 'cancelled';

/** Waits before each attempt. Mirrors the tracker's own event writes. */
const SAVE_BACKOFF_MS = [0, 500, 1500];

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function useKilledBy(input: UseKilledByInput): UseKilledByReturn {
  const { matchId, enabled, loading, initialDeathKillers, remoteSync, remoteSyncRequestedAtMs, deadIds } = input;

  // Clerk's `getToken` is a new function on every render — hold it in a ref
  // and never list it as a dependency (see hooks/useTracker.ts).
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const matchIdRef = useRef(matchId);
  matchIdRef.current = matchId;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  /** The server has told us it can store killers. */
  const [serverReady, setServerReady] = useState(false);

  // `selectionsRef` is written in the same breath as the state, so the save
  // loop and the poll merge always read the latest taps without waiting for
  // a render.
  const [selections, setSelections] = useState<Record<string, KillerSelection>>({});
  const selectionsRef = useRef(selections);
  const commit = useCallback((next: Record<string, KillerSelection>) => {
    if (next === selectionsRef.current) return;
    selectionsRef.current = next;
    setSelections(next);
  }, []);

  /** Death order as the server last reported it. */
  const [serverOrder, setServerOrder] = useState<string[]>([]);
  /** Order this device saw players die in. */
  const [localOrder, setLocalOrder] = useState<string[]>([]);

  const writersRef = useRef(new Map<string, Writer>());
  /** Deaths recorded here whose POST has not come back. */
  const deathWritesRef = useRef(new Map<string, Promise<unknown>>());

  // ── Initial state, from the match load ─────────────────────────────────
  // Skipped if a poll has already been merged: the poll is newer.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || loading) return;
    seededRef.current = true;
    if (!Array.isArray(initialDeathKillers)) return;
    setServerReady(true);
    setServerOrder(initialDeathKillers.map((e) => e.participationId));
    commit(killerMapFromEntries(initialDeathKillers));
  }, [loading, initialDeathKillers, commit]);

  // ── Live sync ──────────────────────────────────────────────────────────
  // `remoteSyncRequestedAtMs` always changes together with `remoteSync`.
  useEffect(() => {
    const entries = remoteSync?.deathKillers;
    // Left out: not asked for (switch off, or read before the switch was
    // known), a server that predates the feature, or a read that failed this
    // once. None of those says anything new — keep what we have.
    if (entries === undefined) return;
    if (entries === null) {
      setServerReady(false);
      return;
    }
    seededRef.current = true;
    setServerReady(true);
    const order = entries.map((e) => e.participationId);
    setServerOrder((prev) => (sameOrder(prev, order) ? prev : order));
    commit(
      mergeRemoteKillers({
        local: selectionsRef.current,
        remote: killerMapFromEntries(entries),
        requestedAtMs: remoteSyncRequestedAtMs,
        writeState: (pid) => {
          const w = writersRef.current.get(pid);
          return w ? { busy: w.running || w.dirty, settledAtMs: w.settledAtMs } : undefined;
        },
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteSync]);

  // ── Deaths and revivals ────────────────────────────────────────────────
  const prevDeadRef = useRef<ReadonlySet<string>>(new Set());
  useEffect(() => {
    const prev = prevDeadRef.current;
    prevDeadRef.current = deadIds;
    const died = [...deadIds].filter((pid) => !prev.has(pid));
    const revived = [...prev].filter((pid) => !deadIds.has(pid));
    if (died.length === 0 && revived.length === 0) return;

    setLocalOrder((order) => [
      ...order.filter((pid) => deadIds.has(pid)),
      ...died.filter((pid) => !order.includes(pid)),
    ]);

    let next: Record<string, KillerSelection> | null = null;
    for (const pid of revived) {
      // The tracker can show a player it has just marked dead as alive again
      // for one poll, when a snapshot built before the death was saved comes
      // in. That is not a revival: the death is still on its way, and a
      // killer tapped for it must survive.
      if (deathWritesRef.current.has(pid)) continue;

      // A real revival (Undo, here or on another device): the selection goes
      // with the death, and anything still queued for it is void.
      const w = writersRef.current.get(pid);
      if (w) {
        w.epoch += 1;
        w.dirty = false;
      }
      if (pid in selectionsRef.current) {
        next = next ?? { ...selectionsRef.current };
        delete next[pid];
      }
    }
    if (next) commit(next);
  }, [deadIds, commit]);

  // ── Saving ─────────────────────────────────────────────────────────────
  const save = useCallback(
    async (pid: string, selection: KillerSelection, w: Writer, epoch: number): Promise<SaveOutcome> => {
      let noDeathSeen = false;
      for (let attempt = 0; attempt < SAVE_BACKOFF_MS.length; attempt++) {
        if (SAVE_BACKOFF_MS[attempt] > 0) {
          await new Promise((r) => setTimeout(r, SAVE_BACKOFF_MS[attempt]));
        }
        if (w.epoch !== epoch) return 'cancelled';
        try {
          const token = await getTokenRef.current();
          await apiFetch(
            `/api/matches/${matchIdRef.current}/deaths/${pid}/killer`,
            'PATCH',
            {
              death_cause: selection.deathCause,
              killer_participation_id: selection.killerParticipationId,
              killer_commander_id: selection.killerCommanderId,
            },
            token ?? undefined,
          );
          return 'saved';
        } catch (e) {
          const { status, code } = e as { status?: number; code?: string };
          if (status === 503 && code === 'KILLED_BY_UNAVAILABLE') return 'unavailable';
          if (status === 404 && code === 'NO_DEATH') {
            // The server has no death for this player. One more try covers a
            // death that is a moment behind; after that it was undone, or
            // never saved, and the next poll will bring the player back.
            if (noDeathSeen) return 'rejected';
            noDeathSeen = true;
            continue;
          }
          // A 404 that is not ours: the route does not exist on this server.
          if (status === 404 && code !== 'NOT_FOUND') return 'unavailable';
          // Refused (validation, edit window, no access): retrying cannot help.
          if (typeof status === 'number' && status >= 400 && status < 500) return 'rejected';
          // Network error or 5xx: try again.
        }
      }
      return 'failed';
    },
    [],
  );

  const runWriter = useCallback(
    async (pid: string, w: Writer) => {
      w.running = true;
      try {
        while (w.dirty) {
          const epoch = w.epoch;
          // A death recorded on this device may still be on its way to the
          // server; the killer can only be attached once it is there.
          const death = deathWritesRef.current.get(pid);
          if (death) await death.catch(() => undefined);
          // Revived while waiting: `dirty` was cleared with it, unless the
          // player died again and was tapped again — then go round once more.
          if (w.epoch !== epoch) continue;

          // Read the selection only now, so every tap made while waiting is
          // already in it and one request carries the latest choice.
          w.dirty = false;
          const desired = selectionsRef.current[pid] ?? NO_KILLER;
          const outcome = await save(pid, desired, w, epoch);
          if (outcome === 'unavailable') setServerReady(false);
          // 'rejected' / 'failed': nothing to do here. The selection stays on
          // screen until the next poll, which shows what the server really
          // holds — the same "server wins once it has spoken" rule as the
          // rest of the tracker.
        }
      } finally {
        w.running = false;
        w.settledAtMs = Date.now();
      }
    },
    [save],
  );

  const select = useCallback(
    (pid: string, selection: KillerSelection) => {
      if (!enabledRef.current) return;

      const next = { ...selectionsRef.current };
      if (selection.deathCause === null) delete next[pid];
      else next[pid] = selection;
      commit(next);

      let w = writersRef.current.get(pid);
      if (!w) {
        w = { running: false, dirty: false, epoch: 0, settledAtMs: 0 };
        writersRef.current.set(pid, w);
      }
      w.dirty = true;
      if (!w.running) void runWriter(pid, w);
    },
    [commit, runWriter],
  );

  const trackDeathWrite = useCallback((pid: string, write: Promise<unknown>) => {
    deathWritesRef.current.set(pid, write);
    const done = () => {
      if (deathWritesRef.current.get(pid) === write) deathWritesRef.current.delete(pid);
    };
    write.then(done, done);
  }, []);

  const deathOrder = useMemo(
    () => effectiveDeathOrder(serverOrder, localOrder, deadIds),
    [serverOrder, localOrder, deadIds],
  );

  return {
    available: enabled && serverReady,
    selections,
    deathOrder,
    select,
    trackDeathWrite,
  };
}
