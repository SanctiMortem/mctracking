/**
 * useGroups — fetch + mutations for /api/groups.
 * PLAT-006 (EPIC-05)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [groups, setGroups] = useState<GroupWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenRef.current();
      const res = await apiFetch<ListResponse>('/api/groups', 'GET', undefined, token ?? undefined);
      setGroups(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createGroup = useCallback(async (name: string): Promise<GroupWithRole> => {
    const token = await getTokenRef.current();
    const res = await apiFetch<CreateResponse>('/api/groups', 'POST', { name }, token ?? undefined);
    const entry: GroupWithRole = { group: res.data.group, role: 'owner' };
    setGroups((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const getInvite = useCallback(async (groupId: string): Promise<InviteData> => {
    const token = await getTokenRef.current();
    const res = await apiFetch<InviteResponse>(
      `/api/groups/${groupId}/invite`,
      'POST',
      {},
      token ?? undefined,
    );
    return res.data;
  }, []);

  const joinGroup = useCallback(async (inviteCode: string): Promise<GroupWithRole> => {
    const token = await getTokenRef.current();
    const res = await apiFetch<JoinResponse>(
      '/api/groups/join',
      'POST',
      { invite_code: inviteCode },
      token ?? undefined,
    );
    const entry: GroupWithRole = { group: res.data.group, role: 'member' };
    setGroups((prev) => [...prev, entry]);
    return entry;
  }, []);

  /** Derived: groups the user owns */
  const ownedGroups = groups.filter((g) => g.role === 'owner');

  /** Derived: groups the user is a member of (not owner) */
  const memberGroups = groups.filter((g) => g.role === 'member');

  const leaveGroup = useCallback(async (groupId: string): Promise<void> => {
    const token = await getTokenRef.current();
    await apiFetch<{ success: true }>(`/api/groups/${groupId}`, 'DELETE', undefined, token ?? undefined);
    setGroups((prev) => prev.filter((g) => g.group.id !== groupId));
  }, []);

  const archiveGroup = useCallback(async (groupId: string): Promise<void> => {
    const token = await getTokenRef.current();
    await apiFetch<{ success: true }>(`/api/groups/${groupId}`, 'PATCH', undefined, token ?? undefined);
    setGroups((prev) => prev.filter((g) => g.group.id !== groupId));
  }, []);

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
    leaveGroup,
    archiveGroup,
  };
}
