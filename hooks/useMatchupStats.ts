/**
 * useMatchupStats — loads head-to-head stats for SCR-015 (Matchup Stats).
 *
 * Auto-fetches when both entityAId and entityBId are non-null.
 * Passes `scope` to GET /api/stats/matchup (BR-STATS-06).
 *
 * HIST-011 (EPIC-04)
 */
import { useEffect, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { MatchupResult } from '@/services/stats';

export type UseMatchupStatsReturn = {
  data: MatchupResult | null;
  loading: boolean;
  error: string | null;
};

type ApiResponse = {
  success: true;
  data: MatchupResult;
};

export function useMatchupStats(
  entityType: 'player' | 'deck' | 'commander',
  entityAId: string | null,
  entityBId: string | null,
  scope: 'all' | '1v1',
): UseMatchupStatsReturn {
  const { getToken } = useAuth();
  const [data, setData] = useState<MatchupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch when both IDs are set and distinct
    if (!entityAId || !entityBId || entityAId === entityBId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const token = await getToken();
        const params = new URLSearchParams({
          entity_type: entityType,
          entity_a_id: entityAId!,
          entity_b_id: entityBId!,
          scope,
        });
        const res = await apiFetch<ApiResponse>(
          `/api/stats/matchup?${params.toString()}`,
          'GET',
          undefined,
          token ?? undefined,
        );
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load matchup stats.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [entityType, entityAId, entityBId, scope, getToken]);

  return { data, loading, error };
}
