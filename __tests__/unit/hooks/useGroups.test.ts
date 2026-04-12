/**
 * Unit tests — hooks/useGroups.ts
 * Verifies derived grouping logic: ownedGroups vs memberGroups split.
 * PLAT-006 (EPIC-05)
 */

describe('useGroups — derived group sections', () => {
  it.todo('ownedGroups contains only groups where role === "owner"');
  it.todo('memberGroups contains only groups where role === "member"');
  it.todo('ownedGroups and memberGroups are mutually exclusive');
  it.todo('both arrays are empty when groups is empty');
  it.todo('a user with only owned groups has empty memberGroups');
  it.todo('a user with only memberships has empty ownedGroups');
});

describe('useGroups — createGroup', () => {
  it.todo('adds the new group at the top of the list with role="owner"');
  it.todo('throws on API error and does not mutate state');
});

describe('useGroups — joinGroup', () => {
  it.todo('appends the joined group at the end of the list with role="member"');
  it.todo('throws with code GROUP_INVITE_EXPIRED when invite is expired');
  it.todo('throws with code ALREADY_A_MEMBER when already joined');
});
