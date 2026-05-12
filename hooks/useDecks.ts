/**
 * useDecks — fetch + mutations for /api/decks.
 * DATA-007 (EPIC-01)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
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

export function useDecks(
  commanderFilter?: string,
  options?: { includeArchived?: boolean },
) {
  const includeArchived = !!options?.includeArchived;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [decks, setDecks] = useState<DeckWithCommanders[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
      const params = new URLSearchParams();
      if (commanderFilter) params.set('commander_id', commanderFilter);
      if (includeArchived) params.set('include_archived', 'true');
      const qs = params.toString() ? `?${params.toString()}` : '';
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
  }, [commanderFilter, includeArchived]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: CreateInput): Promise<DeckWithCommanders> => {
    const token = await getTokenRef.current();
    const created = await apiFetch<DeckWithCommanders>('/api/decks', 'POST', input, token ?? undefined);
    setDecks((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, []);

  const update = useCallback(async (id: string, input: UpdateInput): Promise<DeckWithCommanders> => {
    const token = await getTokenRef.current();
    const updated = await apiFetch<DeckWithCommanders>(`/api/decks/${id}`, 'PATCH', input, token ?? undefined);
    setDecks((prev) => prev.map((d) => (d.id === id ? updated : d)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    const token = await getTokenRef.current();
    await apiFetch(`/api/decks/${id}`, 'DELETE', undefined, token ?? undefined);
    setDecks((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const setArchived = useCallback(async (id: string, archived: boolean): Promise<DeckWithCommanders> => {
    const token = await getTokenRef.current();
    const updated = await apiFetch<DeckWithCommanders>(
      `/api/decks/${id}`,
      'PATCH',
      { archived },
      token ?? undefined,
    );
    setDecks((prev) => {
      // If we're hiding archived, drop the row; otherwise update in place
      if (!includeArchived && archived) return prev.filter((d) => d.id !== id);
      return prev.map((d) => (d.id === id ? updated : d));
    });
    return updated;
  }, [includeArchived]);

  return { decks, loading, error, refresh, create, update, remove, setArchived };
}
