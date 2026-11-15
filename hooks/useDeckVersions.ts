/**
 * useDeckVersions — loads a deck's list history for the deck screen.
 *
 * GET /api/decks/:id/versions. Only fetches once `enabled` is true, so the
 * history costs nothing until the user opens it.
 *
 * DECK-007 (EPIC-07)
 */
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { DeckVersionHistory } from '@/services/decklists';

type HistoryResponse = { success: true; data: DeckVersionHistory };

export type UseDeckVersionsReturn = {
  data: DeckVersionHistory | null;
  loading: boolean;
  error: boolean;
};

export function useDeckVersions(deckId: string, enabled: boolean): UseDeckVersionsReturn {
  const { getToken } = useAuth();
  // Clerk's getToken identity is unstable — hold it in a ref, never in deps.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [data, setData] = useState<DeckVersionHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const token = await getTokenRef.current();
        const res = await apiFetch<HistoryResponse>(
          `/api/decks/${deckId}/versions`,
          'GET',
          undefined,
          token ?? undefined,
        );
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [deckId, enabled]);

  return { data, loading, error };
}
