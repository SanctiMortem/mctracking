/**
 * useDecks — fetch + mutations for /api/decks.
 * DATA-007 (EPIC-01)
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { DeckWithCommanders } from '@/services/decks';

type CreateInput = {
  name: string;
  commander_id: string;
  commander_id_2?: string | null;
  description?: string | null;
};

type UpdateInput = Partial<CreateInput>;

export function useDecks(commanderFilter?: string) {
  const { getToken } = useAuth();
  const [decks, setDecks] = useState<DeckWithCommanders[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const qs = commanderFilter ? `?commander_id=${commanderFilter}` : '';
      const data = await apiFetch<DeckWithCommanders[]>(
        `/api/decks${qs}`,
        'GET',
        undefined,
        token ?? undefined,
      );
      setDecks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [getToken, commanderFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: CreateInput): Promise<DeckWithCommanders> => {
    const token = await getToken();
    const created = await apiFetch<DeckWithCommanders>('/api/decks', 'POST', input, token ?? undefined);
    setDecks((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, [getToken]);

  const update = useCallback(async (id: string, input: UpdateInput): Promise<DeckWithCommanders> => {
    const token = await getToken();
    const updated = await apiFetch<DeckWithCommanders>(`/api/decks/${id}`, 'PATCH', input, token ?? undefined);
    setDecks((prev) => prev.map((d) => (d.id === id ? updated : d)));
    return updated;
  }, [getToken]);

  const remove = useCallback(async (id: string): Promise<void> => {
    const token = await getToken();
    await apiFetch(`/api/decks/${id}`, 'DELETE', undefined, token ?? undefined);
    setDecks((prev) => prev.filter((d) => d.id !== id));
  }, [getToken]);

  return { decks, loading, error, refresh, create, update, remove };
}
