/**
 * usePodHighlights — fetches the Stats-screen carousel data for a pod.
 *
 * Returns null fields for any highlight that doesn't have enough data yet
 * (e.g. top winner needs ≥3 matches per player) — the carousel just skips
 * those slides.
 *
 * Disabled when groupId is null (personal scope).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { PodHighlights } from '@/services/stats';

type ApiResponse = {
  success: true;
  data: PodHighlights;
};

export function usePodHighlights(groupId: string | null) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [data, setData] = useState<PodHighlights | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
      const res = await apiFetch<ApiResponse>(
        `/api/stats/pod-highlights?group_id=${encodeURIComponent(groupId)}`,
        'GET',
        undefined,
        token ?? undefined,
      );
      setData(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pod highlights.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}
