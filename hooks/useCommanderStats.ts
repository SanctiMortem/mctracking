/**
 * useCommanderStats — loads full commander stats for SCR-014 (Commander Detail FULL).
 *
 * Fetches GET /stats/commanders/:id, which returns commander info,
 * overall stats, decks using it, and players who piloted it.
 *
 * HIST-009 (EPIC-04)
 */
import { useEffect, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { CommanderStats } from '@/services/stats';

export type UseCommanderStatsReturn = {
  data: CommanderStats | null;
  loading: boolean;
  error: string | null;
};

type ApiResponse = {
  success: true;
  data: CommanderStats;
};

export function useCommanderStats(commanderId: string): UseCommanderStatsReturn {
  const { getToken } = useAuth();
  const [data, setData] = useState<CommanderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = await getToken();
        const res = await apiFetch<ApiResponse>(
          `/api/stats/commanders/${commanderId}`,
          'GET',
          undefined,
          token ?? undefined,
        );

        if (cancelled) return;
        setData(res.data);
        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load commander stats.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [commanderId, getToken]);

  return { data, loading, error };
}
