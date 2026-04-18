/**
 * useGlobalStats — loads global stats dashboard data (SCR-006).
 *
 * Fetches GET /api/stats/global, which returns total_matches, total_players,
 * player_rankings, top_decks, and top_commanders.
 *
 * Pass a `groupId` to scope the stats to a specific pod. When null/undefined
 * the stats are personal (matches created by the user).
 *
 * HIST-011 (EPIC-04)
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { GlobalStats } from '@/services/stats';

export type UseGlobalStatsReturn = {
  data: GlobalStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

type ApiResponse = {
  success: true;
  data: GlobalStats;
};

export function useGlobalStats(groupId?: string | null): UseGlobalStatsReturn {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [data, setData] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    try {
      const token = await getTokenRef.current();
      const path = groupId
        ? `/api/stats/global?group_id=${encodeURIComponent(groupId)}`
        : '/api/stats/global';
      const res = await apiFetch<ApiResponse>(path, 'GET', undefined, token ?? undefined);
      if (!cancelled) {
        setData(res.data);
        setError(null);
      }
    } catch (e) {
      if (!cancelled) setError((e as Error).message ?? 'Failed to load global stats.');
    } finally {
      if (!cancelled) setLoading(false);
    }

    return () => { cancelled = true; };
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
