/**
 * usePodDecks — fetch all decks from all pod members for a group.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { PodDeck } from '@/services/pods';

export function usePodDecks(groupId: string | null) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [podDecks, setPodDecks] = useState<PodDeck[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId) { setPodDecks([]); return; }
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
      const res = await apiFetch<{ success: boolean; data: PodDeck[] }>(
        `/api/groups/${groupId}/decks`,
        'GET',
        undefined,
        token ?? undefined,
      );
      setPodDecks(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { podDecks, loading, error, refresh };
}
