/**
 * Groups service — Drizzle queries for groups and group_members tables.
 * Implements Friend Groups (FT-017, PLAT-005).
 *
 * Business rules enforced:
 *   BR-GROUP-01 — unlimited group memberships per user
 *   BR-GROUP-02 — history preserved on member exit
 *   BR-GROUP-04 — archive (soft-delete), never hard-delete
 *   BR-GROUP-05 — invite link with 7-day expiration
 */
import { randomBytes } from 'crypto';

import { and, eq, isNull, ne } from 'drizzle-orm';

import { db } from '@/services/db';
import { groups, groupMembers } from '@/db/schema';
import type { Group, GroupMember } from '@/db/index';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type GroupWithRole = {
  group: Group;
  role: 'owner' | 'member';
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function generateInviteCode(): string {
  return randomBytes(6).toString('base64url'); // ~8 chars, URL-safe
}

function inviteExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7); // BR-GROUP-05: 7-day expiration
  return d;
}

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

/**
 * List all active groups the user belongs to (owner or member).
 * Archived groups excluded by default (BR-GROUP-04).
 * Ordered by created_at DESC.
 */
export async function listGroups(userId: string): Promise<GroupWithRole[]> {
  const rows = await db
    .select({
      group: groups,
      role: groupMembers.role,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(
      and(
        eq(groupMembers.userId, userId),
        isNull(groups.archivedAt),
      ),
    )
    .orderBy(groups.createdAt);

  return rows as GroupWithRole[];
}

/**
 * Get membership record for a user in a group.
 * Returns null if user is not a member.
 */
export async function getMembership(
  groupId: string,
  userId: string,
): Promise<GroupMember | null> {
  const [row] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Get a group by ID. Returns null if not found or archived.
 */
export async function getGroupById(id: string): Promise<Group | null> {
  const [row] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, id), isNull(groups.archivedAt)))
    .limit(1);
  return row ?? null;
}

// ─────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────

/**
 * Create a new group.
 * Side effects:
 *   - Creates Group with owner_id = userId
 *   - Creates GroupMembership(role='owner')
 *   - Generates invite_code + invite_expires_at (BR-GROUP-05)
 */
export async function createGroup(
  userId: string,
  name: string,
): Promise<{ data: { group: Group; membership: GroupMember } }> {
  const [group] = await db
    .insert(groups)
    .values({
      name: name.trim(),
      ownerId: userId,
      inviteCode: generateInviteCode(),
      inviteExpiresAt: inviteExpiresAt(),
    })
    .returning();

  const [membership] = await db
    .insert(groupMembers)
    .values({
      groupId: group.id,
      userId,
      role: 'owner',
    })
    .returning();

  return { data: { group, membership } };
}

/**
 * Archive a group (soft-delete). Only the group owner can archive.
 * BR-GROUP-04: sets archived_at, never hard-deletes.
 */
export async function archiveGroup(
  userId: string,
  groupId: string,
): Promise<
  | { data: { group: Group } }
  | { notFound: true }
  | { forbidden: true }
> {
  const group = await getGroupById(groupId);
  if (!group) return { notFound: true };
  if (group.ownerId !== userId) return { forbidden: true };

  const [updated] = await db
    .update(groups)
    .set({ archivedAt: new Date() })
    .where(eq(groups.id, groupId))
    .returning();

  return { data: { group: updated } };
}

/**
 * Get or regenerate the invite code for a group.
 * Only the group owner can call this (BR-GROUP-04).
 * BR-GROUP-05:
 *   - If code exists and hasn't expired → return as-is
 *   - If expired or force=true → generate new code + new expiration
 */
export async function getOrRegenerateInvite(
  userId: string,
  groupId: string,
  force = false,
): Promise<
  | { data: { invite_code: string; invite_expires_at: Date } }
  | { notFound: true }
  | { forbidden: true }
> {
  const group = await getGroupById(groupId);
  if (!group) return { notFound: true };
  if (group.ownerId !== userId) return { forbidden: true };

  const isExpired =
    !group.inviteExpiresAt || group.inviteExpiresAt < new Date();

  if (!isExpired && !force) {
    return {
      data: {
        invite_code: group.inviteCode,
        invite_expires_at: group.inviteExpiresAt!,
      },
    };
  }

  // Regenerate
  const newCode = generateInviteCode();
  const newExpiry = inviteExpiresAt();

  await db
    .update(groups)
    .set({ inviteCode: newCode, inviteExpiresAt: newExpiry })
    .where(eq(groups.id, groupId));

  return { data: { invite_code: newCode, invite_expires_at: newExpiry } };
}

/**
 * Join a group via invite code.
 * BR-GROUP-05: validates expiration.
 * BR-GROUP-02: preserves history on exit (no cascade logic here).
 */
export async function joinGroup(
  userId: string,
  inviteCode: string,
): Promise<
  | { data: { group: Group; membership: GroupMember } }
  | { notFound: true }
  | { expired: true }
  | { alreadyMember: true }
> {
  // Find group by invite code (including archived — code must still work for lookup)
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, inviteCode))
    .limit(1);

  if (!group) return { notFound: true };

  if (!group.inviteExpiresAt || group.inviteExpiresAt < new Date()) {
    return { expired: true };
  }

  const existing = await getMembership(group.id, userId);
  if (existing) return { alreadyMember: true };

  const [membership] = await db
    .insert(groupMembers)
    .values({ groupId: group.id, userId, role: 'member' })
    .returning();

  return { data: { group, membership } };
}

/**
 * Leave a group. Owners cannot leave — they must archive instead.
 * Deletes the group_members row (BR-GROUP-02: history is preserved in match data).
 */
export async function leaveGroup(
  userId: string,
  groupId: string,
): Promise<
  | { ok: true }
  | { notMember: true }
  | { ownerCannotLeave: true }
> {
  const membership = await getMembership(groupId, userId);
  if (!membership) return { notMember: true };

  if (membership.role === 'owner') return { ownerCannotLeave: true };

  await db
    .delete(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId),
      ),
    );

  return { ok: true };
}
