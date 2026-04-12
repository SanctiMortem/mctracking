/**
 * usePlayers — fetch + mutations for /api/players.
 * DATA-006 (EPIC-01)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { Player } from '@/db/index';

export function usePlayers() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
      const data = await apiFetch<Player[]>('/api/players', 'GET', undefined, token ?? undefined);
      setPlayers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (name: string): Promise<Player> => {
    const token = await getTokenRef.current();
    const created = await apiFetch<Player>('/api/players', 'POST', { name }, token ?? undefined);
    setPlayers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, []);

  const update = useCallback(async (id: string, name: string): Promise<Player> => {
    const token = await getTokenRef.current();
    const updated = await apiFetch<Player>(`/api/players/${id}`, 'PATCH', { name }, token ?? undefined);
    setPlayers((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    const token = await getTokenRef.current();
    await apiFetch(`/api/players/${id}`, 'DELETE', undefined, token ?? undefined);
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { players, loading, error, refresh, create, update, remove };
}
