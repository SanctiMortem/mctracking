/**
 * usePodMembers — fetch pod members (account players) for a group.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { GroupMember, Player } from '@/db/index';

export type PodMemberData = {
  member: GroupMember;
  player: Player;
};

export function usePodMembers(groupId: string | null) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [members, setMembers] = useState<PodMemberData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId) { setMembers([]); return; }
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
      const res = await apiFetch<{ success: boolean; data: PodMemberData[] }>(
        `/api/groups/${groupId}/members`,
        'GET',
        undefined,
        token ?? undefined,
      );
      setMembers(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { members, loading, error, refresh };
}
