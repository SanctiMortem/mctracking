/**
 * useCommanders — fetch + mutations for /api/commanders.
 * DATA-005 (EPIC-01)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { Commander } from '@/db/index';

type CreateInput = { name: string; colors: string[]; isPartner: boolean };
type UpdateInput = Partial<CreateInput>;

export function useCommanders() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [commanders, setCommanders] = useState<Commander[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
      const data = await apiFetch<Commander[]>('/api/commanders', 'GET', undefined, token ?? undefined);
      setCommanders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = useCallback(async (input: CreateInput): Promise<Commander> => {
    const token = await getTokenRef.current();
    const created = await apiFetch<Commander>('/api/commanders', 'POST', input, token ?? undefined);
    setCommanders((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, []);

  const update = useCallback(async (id: string, input: UpdateInput): Promise<Commander> => {
    const token = await getTokenRef.current();
    const updated = await apiFetch<Commander>(`/api/commanders/${id}`, 'PATCH', input, token ?? undefined);
    setCommanders((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    const token = await getTokenRef.current();
    await apiFetch(`/api/commanders/${id}`, 'DELETE', undefined, token ?? undefined);
    setCommanders((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { commanders, loading, error, refresh: fetch, create, update, remove };
}
