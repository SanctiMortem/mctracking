/**
 * LABS — stats v2 on this device.
 *
 * `useNewStatsEnabled` reads the Labs "New stats" switch. The other hooks
 * fetch /api/stats/v2/* only when it is on. Every one of them fails soft:
 * on any error `data` stays null and the screen keeps showing the current
 * stats, so a broken v2 route can never take a stats screen down.
 */
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import { isNewStatsEnabled } from '@/services/labs/aiKeys';
import type { DeckColorsV2, MatchupV2, PlayerExtrasV2, RankingsV2 } from '@/services/stats2/contract';

/** False until the switch has been read, and whenever it is off. */
export function useNewStatsEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let cancelled = false;
    isNewStatsEnabled().then((on) => {
      if (!cancelled) setEnabled(on);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return enabled;
}

export interface StatsV2State<T> {
  data: T | null;
  loading: boolean;
  /** The request failed; the caller shows the current stats instead. */
  failed: boolean;
}

/**
 * GET `path` (a `{ success, data }` route) once per distinct path. A null
 * path means "do not fetch". The result is tied to the path it was fetched
 * for, so a stale answer is never shown for a newer request.
 */
export function useStatsV2<T>(path: string | null): StatsV2State<T> {
  // Clerk's getToken identity is unstable: hold it in a ref, never in deps.
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [state, setState] = useState<{ path: string | null; data: T | null; failed: boolean }>({
    path: null,
    data: null,
    failed: false,
  });

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getTokenRef.current();
        const res = await apiFetch<{ success: true; data: T }>(path, 'GET', undefined, token ?? undefined);
        if (cancelled) return;
        if (res?.data && typeof res.data === 'object') setState({ path, data: res.data, failed: false });
        else setState({ path, data: null, failed: true });
      } catch {
        if (!cancelled) setState({ path, data: null, failed: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!path) return { data: null, loading: false, failed: false };
  if (state.path !== path) return { data: null, loading: true, failed: false };
  return { data: state.data, loading: false, failed: state.failed };
}

// ─── One hook per route ──────────────────────────────────────────────────────

export function useRankingsV2(groupId: string | null, enabled: boolean): StatsV2State<RankingsV2> {
  const qs = groupId ? `?group_id=${encodeURIComponent(groupId)}` : '';
  return useStatsV2<RankingsV2>(enabled ? `/api/stats/v2/rankings${qs}` : null);
}

export function useDeckColorsV2(deckId: string | null | undefined, enabled: boolean): StatsV2State<DeckColorsV2> {
  return useStatsV2<DeckColorsV2>(enabled && deckId ? `/api/stats/v2/decks/${deckId}` : null);
}

export function usePlayerExtrasV2(playerId: string | null | undefined, enabled: boolean): StatsV2State<PlayerExtrasV2> {
  return useStatsV2<PlayerExtrasV2>(enabled && playerId ? `/api/stats/v2/players/${playerId}` : null);
}

export function useMatchupV2(
  entityType: 'player' | 'deck' | 'commander',
  entityAId: string | null,
  entityBId: string | null,
  scope: 'all' | '1v1',
  scopeGroupId: string | null | undefined,
  enabled: boolean,
): StatsV2State<MatchupV2> {
  let path: string | null = null;
  if (enabled && entityAId && entityBId && entityAId !== entityBId) {
    const params = new URLSearchParams({
      entity_type: entityType,
      entity_a_id: entityAId,
      entity_b_id: entityBId,
      scope,
    });
    if (scopeGroupId) params.set('scope_group_id', scopeGroupId);
    path = `/api/stats/v2/matchup?${params.toString()}`;
  }
  return useStatsV2<MatchupV2>(path);
}

/** Path of the CURRENT global stats with every ranked deck and commander (their full objects). */
export function fullGlobalStatsPath(groupId: string | null): string {
  const params = new URLSearchParams({ limit: 'all' });
  if (groupId) params.set('group_id', groupId);
  return `/api/stats/global?${params.toString()}`;
}
