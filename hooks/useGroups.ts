/**
 * useGroups — fetch + mutations for /api/groups.
 * PLAT-006 (EPIC-05)
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { Group, GroupMember } from '@/db/index';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type GroupWithRole = {
  group: Group;
  role: 'owner' | 'member';
};

export type InviteData = {
  invite_code: string;
  invite_expires_at: string;
};

type ListResponse = { success: true; data: GroupWithRole[] };
type CreateResponse = { success: true; data: { group: Group; membership: GroupMember } };
type InviteResponse = { success: true; data: InviteData };
type JoinResponse = { success: true; data: { group: Group; membership: GroupMember } };

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useGroups() {
  const { getToken } = useAuth();
  const [groups, setGroups] = useState<GroupWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await apiFetch<ListResponse>('/api/groups', 'GET', undefined, token ?? undefined);
      setGroups(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { refresh(); }, [refresh]);

  /** Create a new group. Adds it to the top of the list as owner. */
  const createGroup = useCallback(async (name: string): Promise<GroupWithRole> => {
    const token = await getToken();
    const res = await apiFetch<CreateResponse>('/api/groups', 'POST', { name }, token ?? undefined);
    const entry: GroupWithRole = { group: res.data.group, role: 'owner' };
    setGroups((prev) => [entry, ...prev]);
    return entry;
  }, [getToken]);

  /**
   * Get (or regenerate) the invite code for a group.
   * Only callable by the group owner.
   */
  const getInvite = useCallback(async (groupId: string): Promise<InviteData> => {
    const token = await getToken();
    const res = await apiFetch<InviteResponse>(
      `/api/groups/${groupId}/invite`,
      'POST',
      {},
      token ?? undefined,
    );
    return res.data;
  }, [getToken]);

  /** Join a group by invite code. Appends group to the list as member. */
  const joinGroup = useCallback(async (inviteCode: string): Promise<GroupWithRole> => {
    const token = await getToken();
    const res = await apiFetch<JoinResponse>(
      '/api/groups/join',
      'POST',
      { invite_code: inviteCode },
      token ?? undefined,
    );
    const entry: GroupWithRole = { group: res.data.group, role: 'member' };
    setGroups((prev) => [...prev, entry]);
    return entry;
  }, [getToken]);

  /** Derived: groups the user owns */
  const ownedGroups = groups.filter((g) => g.role === 'owner');

  /** Derived: groups the user is a member of (not owner) */
  const memberGroups = groups.filter((g) => g.role === 'member');

  return {
    groups,
    ownedGroups,
    memberGroups,
    loading,
    error,
    refresh,
    createGroup,
    getInvite,
    joinGroup,
  };
}
