/**
 * usePlayerStats — loads full player stats for SCR-012 (Player Profile FULL).
 *
 * Fetches GET /stats/players/:id, which returns player + aggregated stats
 * + favorite_decks (with commanders) + favorite_commanders.
 *
 * HIST-005 (EPIC-04)
 */
import { useEffect, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { PlayerStats } from '@/services/stats';

export type UsePlayerStatsReturn = {
  data: PlayerStats | null;
  loading: boolean;
  error: string | null;
};

type ApiResponse = {
  success: true;
  data: PlayerStats;
};

export function usePlayerStats(playerId: string): UsePlayerStatsReturn {
  const { getToken } = useAuth();
  const [data, setData] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = await getToken();
        const res = await apiFetch<ApiResponse>(
          `/api/stats/players/${playerId}`,
          'GET',
          undefined,
          token ?? undefined,
        );

        if (cancelled) return;
        setData(res.data);
        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load player stats.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [playerId, getToken]);

  return { data, loading, error };
}
