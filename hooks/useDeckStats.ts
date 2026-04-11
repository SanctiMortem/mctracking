/**
 * useDeckStats — loads full deck stats for SCR-013 (Deck Detail FULL).
 *
 * Fetches GET /stats/decks/:id, which returns the deck with its commander(s),
 * overall stats, and the list of players who used it.
 *
 * HIST-007 (EPIC-04)
 */
import { useEffect, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { DeckStats } from '@/services/stats';

export type UseDeckStatsReturn = {
  data: DeckStats | null;
  loading: boolean;
  error: string | null;
};

type ApiResponse = {
  success: true;
  data: DeckStats;
};

export function useDeckStats(deckId: string): UseDeckStatsReturn {
  const { getToken } = useAuth();
  const [data, setData] = useState<DeckStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = await getToken();
        const res = await apiFetch<ApiResponse>(
          `/api/stats/decks/${deckId}`,
          'GET',
          undefined,
          token ?? undefined,
        );

        if (cancelled) return;
        setData(res.data);
        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load deck stats.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [deckId, getToken]);

  return { data, loading, error };
}
