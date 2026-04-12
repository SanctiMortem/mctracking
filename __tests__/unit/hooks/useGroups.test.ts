/**
 * Unit tests — hooks/useGroups.ts
 * Verifies derived grouping logic: ownedGroups vs memberGroups split.
 * PLAT-006 (EPIC-05)
 */

const mockGetToken = jest.fn();
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.mock('@/services/api', () => ({
  apiFetch: jest.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useGroups, type GroupWithRole } from '@/hooks/useGroups';
import { apiFetch } from '@/services/api';

const mockApiFetch = apiFetch as jest.Mock;

function makeGroup(id: string, name: string): any {
  return { id, name, ownerId: 'u1', createdAt: new Date().toISOString() };
}

function makeGroupWithRole(id: string, name: string, role: 'owner' | 'member'): GroupWithRole {
  return { group: makeGroup(id, name), role };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue('mock-token');
});

describe('useGroups — derived group sections', () => {
  it('ownedGroups contains only groups where role === "owner"', async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: [
        makeGroupWithRole('g1', 'Owned Group', 'owner'),
        makeGroupWithRole('g2', 'Member Group', 'member'),
      ],
    });

    const { result } = renderHook(() => useGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.ownedGroups).toHaveLength(1);
    expect(result.current.ownedGroups[0].group.id).toBe('g1');
    expect(result.current.ownedGroups[0].role).toBe('owner');
  });

  it('memberGroups contains only groups where role === "member"', async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: [
        makeGroupWithRole('g1', 'Owned Group', 'owner'),
        makeGroupWithRole('g2', 'Member Group', 'member'),
      ],
    });

    const { result } = renderHook(() => useGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.memberGroups).toHaveLength(1);
    expect(result.current.memberGroups[0].group.id).toBe('g2');
    expect(result.current.memberGroups[0].role).toBe('member');
  });

  it('ownedGroups and memberGroups are mutually exclusive', async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: [
        makeGroupWithRole('g1', 'A', 'owner'),
        makeGroupWithRole('g2', 'B', 'member'),
        makeGroupWithRole('g3', 'C', 'owner'),
        makeGroupWithRole('g4', 'D', 'member'),
      ],
    });

    const { result } = renderHook(() => useGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const ownedIds = result.current.ownedGroups.map((g) => g.group.id);
    const memberIds = result.current.memberGroups.map((g) => g.group.id);
    const overlap = ownedIds.filter((id) => memberIds.includes(id));
    expect(overlap).toHaveLength(0);
    expect(ownedIds.length + memberIds.length).toBe(result.current.groups.length);
  });

  it('both arrays are empty when groups is empty', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.ownedGroups).toEqual([]);
    expect(result.current.memberGroups).toEqual([]);
  });

  it('a user with only owned groups has empty memberGroups', async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: [
        makeGroupWithRole('g1', 'Owned1', 'owner'),
        makeGroupWithRole('g2', 'Owned2', 'owner'),
      ],
    });

    const { result } = renderHook(() => useGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.ownedGroups).toHaveLength(2);
    expect(result.current.memberGroups).toEqual([]);
  });

  it('a user with only memberships has empty ownedGroups', async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: [
        makeGroupWithRole('g1', 'Member1', 'member'),
        makeGroupWithRole('g2', 'Member2', 'member'),
      ],
    });

    const { result } = renderHook(() => useGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.ownedGroups).toEqual([]);
    expect(result.current.memberGroups).toHaveLength(2);
  });
});

describe('useGroups — createGroup', () => {
  it('adds the new group at the top of the list with role="owner"', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [makeGroupWithRole('g1', 'Existing', 'member')] })
      .mockResolvedValueOnce({
        data: {
          group: makeGroup('g-new', 'New Group'),
          membership: { id: 'm1', groupId: 'g-new', userId: 'u1', role: 'owner' },
        },
      });

    const { result } = renderHook(() => useGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: GroupWithRole;
    await act(async () => {
      created = await result.current.createGroup('New Group');
    });

    expect(created!.role).toBe('owner');
    expect(result.current.groups[0].group.id).toBe('g-new');
    expect(result.current.groups[0].role).toBe('owner');
  });

  it('throws on API error and does not mutate state', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [makeGroupWithRole('g1', 'Existing', 'member')] })
      .mockRejectedValueOnce(new Error('Server Error'));

    const { result } = renderHook(() => useGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const groupsBefore = result.current.groups;

    await act(async () => {
      await expect(result.current.createGroup('Fail')).rejects.toThrow('Server Error');
    });

    expect(result.current.groups).toEqual(groupsBefore);
  });
});

describe('useGroups — joinGroup', () => {
  it('appends the joined group at the end of the list with role="member"', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [makeGroupWithRole('g1', 'Existing', 'owner')] })
      .mockResolvedValueOnce({
        data: {
          group: makeGroup('g-joined', 'Joined Group'),
          membership: { id: 'm2', groupId: 'g-joined', userId: 'u1', role: 'member' },
        },
      });

    const { result } = renderHook(() => useGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.joinGroup('invite-code-123');
    });

    const lastGroup = result.current.groups[result.current.groups.length - 1];
    expect(lastGroup.group.id).toBe('g-joined');
    expect(lastGroup.role).toBe('member');
  });

  it('propagates API errors from joinGroup', async () => {
    const apiError = Object.assign(new Error('Invite expired'), {
      status: 409,
      code: 'GROUP_INVITE_EXPIRED',
    });
    mockApiFetch
      .mockResolvedValueOnce({ data: [] })
      .mockRejectedValueOnce(apiError);

    const { result } = renderHook(() => useGroups());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(() => result.current.joinGroup('expired-code')),
    ).rejects.toThrow('Invite expired');
  });
});
