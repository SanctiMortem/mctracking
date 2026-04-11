/**
 * usePlayers — fetch + mutations for /api/players.
 * DATA-006 (EPIC-01)
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { Player } from '@/db/index';

export function usePlayers() {
  const { getToken } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const data = await apiFetch<Player[]>('/api/players', 'GET', undefined, token ?? undefined);
      setPlayers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (name: string): Promise<Player> => {
    const token = await getToken();
    const created = await apiFetch<Player>('/api/players', 'POST', { name }, token ?? undefined);
    setPlayers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, [getToken]);

  const update = useCallback(async (id: string, name: string): Promise<Player> => {
    const token = await getToken();
    const updated = await apiFetch<Player>(`/api/players/${id}`, 'PATCH', { name }, token ?? undefined);
    setPlayers((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, [getToken]);

  const remove = useCallback(async (id: string): Promise<void> => {
    const token = await getToken();
    await apiFetch(`/api/players/${id}`, 'DELETE', undefined, token ?? undefined);
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, [getToken]);

  return { players, loading, error, refresh, create, update, remove };
}
