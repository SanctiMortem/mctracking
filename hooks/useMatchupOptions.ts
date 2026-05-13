/**
 * useMatchupOptions — populates the entity selectors on the matchup screen.
 *
 * Returns players, decks and commanders for the current scope. When scopeGroupId
 * is set the result includes every pod member's entities (BR-STATS-04).
 *
 * Backed by GET /api/stats/matchup-options.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { Commander, Deck, Player } from '@/db/index';

export type MatchupOptions = {
  players: Player[];
  decks: Deck[];
  commanders: Commander[];
};

type ApiResponse = {
  success: true;
  data: MatchupOptions;
};

const EMPTY: MatchupOptions = { players: [], decks: [], commanders: [] };

export function useMatchupOptions(scopeGroupId: string | null) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [data, setData] = useState<MatchupOptions>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
      const params = new URLSearchParams();
      if (scopeGroupId) params.set('scope_group_id', scopeGroupId);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch<ApiResponse>(
        `/api/stats/matchup-options${qs}`,
        'GET',
        undefined,
        token ?? undefined,
      );
      setData(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load matchup options.');
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [scopeGroupId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}
