/**
 * useStatsHighlights — fetches the Stats-screen carousel data.
 *
 *  - `scopeGroupId = null` → personal scope (matches.createdBy = userId)
 *  - `scopeGroupId = "<uuid>"` → pod-scoped
 *
 * Returns null fields for any highlight that doesn't have enough data yet
 * (e.g. top winner needs ≥3 matches per player) — the carousel just skips
 * those slides.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { PodHighlights } from '@/services/stats';

export type StatsHighlights = PodHighlights;

type ApiResponse = {
  success: true;
  data: PodHighlights;
};

export function useStatsHighlights(scopeGroupId: string | null) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [data, setData] = useState<PodHighlights | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
      const qs = scopeGroupId ? `?group_id=${encodeURIComponent(scopeGroupId)}` : '';
      const res = await apiFetch<ApiResponse>(
        `/api/stats/pod-highlights${qs}`,
        'GET',
        undefined,
        token ?? undefined,
      );
      setData(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load highlights.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [scopeGroupId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}
