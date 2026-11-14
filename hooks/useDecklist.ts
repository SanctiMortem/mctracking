/**
 * useDecklist — loads a deck's optional card list for the deck screen.
 *
 * GET /api/decks/:id/decklist. Editing lives in the deck form (useDecks).
 *
 * DECK-005, DECK-006 (EPIC-07)
 */
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { Decklist } from '@/services/decklists';

type ListResponse = { success: true; data: Decklist };

export type UseDecklistReturn = {
  data: Decklist | null;
  loading: boolean;
};

export function useDecklist(deckId: string): UseDecklistReturn {
  const { getToken } = useAuth();
  // Clerk's getToken identity is unstable — hold it in a ref, never in deps.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [data, setData] = useState<Decklist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getTokenRef.current();
        const res = await apiFetch<ListResponse>(
          `/api/decks/${deckId}/decklist`,
          'GET',
          undefined,
          token ?? undefined,
        );
        if (!cancelled) setData(res.data);
      } catch {
        // A missing list is not worth an error state on the deck screen — the
        // section just stays hidden (also covers an API that predates it).
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [deckId]);

  return { data, loading };
}
