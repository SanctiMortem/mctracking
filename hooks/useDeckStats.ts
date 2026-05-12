/**
 * useDeckStats — loads full deck stats for SCR-013 (Deck Detail FULL).
 *
 * Fetches GET /stats/decks/:id, which returns the deck with its commander(s),
 * overall stats, and the list of players who used it.
 *
 * HIST-007 (EPIC-04)
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { DeckWithCommanders as DeckApiResponse } from '@/services/decks';
import type { DeckStats, DeckWithCommanders } from '@/services/stats';

export type UseDeckStatsReturn = {
  data: DeckStats | null;
  loading: boolean;
  error: string | null;
  setArchived: (archived: boolean) => Promise<void>;
};

type ApiResponse = {
  success: true;
  data: DeckStats;
};

export function useDeckStats(deckId: string): UseDeckStatsReturn {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [data, setData] = useState<DeckStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = await getTokenRef.current();
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
  }, [deckId]);

  const setArchived = useCallback(async (archived: boolean) => {
    const token = await getTokenRef.current();
    const updated = await apiFetch<DeckApiResponse>(
      `/api/decks/${deckId}`,
      'PATCH',
      { archived },
      token ?? undefined,
    );
    const normalized: DeckWithCommanders = {
      ...updated,
      commander2: updated.commander2 ?? undefined,
    };
    setData((prev) => (prev ? { ...prev, deck: normalized } : prev));
  }, [deckId]);

  return { data, loading, error, setArchived };
}
