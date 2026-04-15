/**
 * Pod service — queries for pod members and shared decks.
 *
 * A "pod" is a group where members share their decks and match history.
 * Pod members are users who have created an account player (accountUserId set).
 */
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { db } from '@/services/db';
import { commanders, decks, groupMembers, players } from '@/db/schema';
import type { Commander, Deck, GroupMember, Player } from '@/db/index';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type PodMember = {
  member: GroupMember;
  player: Player;
};

export type PodDeck = Deck & {
  commander: Commander;
  commander2: Commander | null;
  ownerName: string;
  ownerUserId: string;
};

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

/**
 * List all pod members with their account players.
 * Only includes members who have set up an account player.
 */
export async function listPodMembers(groupId: string): Promise<PodMember[]> {
  const rows = await db
    .select({
      member: groupMembers,
      player: players,
    })
    .from(groupMembers)
    .innerJoin(
      players,
      and(
        eq(groupMembers.userId, players.accountUserId),
        isNull(players.deletedAt),
      ),
    )
    .where(eq(groupMembers.groupId, groupId));

  return rows;
}

/**
 * Get all Clerk user IDs for members of a group.
 */
export async function getPodMemberUserIds(groupId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  return rows.map((r) => r.userId);
}

/**
 * List all decks from all pod members, with owner name labels.
 * Returns decks grouped by owner for the UI.
 */
export async function listPodDecks(groupId: string): Promise<PodDeck[]> {
  // 1. Get all member userIds
  const memberUserIds = await getPodMemberUserIds(groupId);
  if (memberUserIds.length === 0) return [];

  // 2. Fetch all decks from all members with commander joins
  const cmd1 = alias(commanders, 'cmd1');
  const cmd2 = alias(commanders, 'cmd2');

  const rows = await db
    .select({
      // Deck columns
      id: decks.id,
      name: decks.name,
      commanderId: decks.commanderId,
      commanderId2: decks.commanderId2,
      groupId: decks.groupId,
      description: decks.description,
      createdBy: decks.createdBy,
      deletedAt: decks.deletedAt,
      createdAt: decks.createdAt,
      // Commander 1
      c1Id: cmd1.id,
      c1Name: cmd1.name,
      c1Colors: cmd1.colors,
      c1IsPartner: cmd1.isPartner,
      c1CreatedBy: cmd1.createdBy,
      c1DeletedAt: cmd1.deletedAt,
      c1CreatedAt: cmd1.createdAt,
      // Commander 2
      c2Id: cmd2.id,
      c2Name: cmd2.name,
      c2Colors: cmd2.colors,
      c2IsPartner: cmd2.isPartner,
      c2CreatedBy: cmd2.createdBy,
      c2DeletedAt: cmd2.deletedAt,
      c2CreatedAt: cmd2.createdAt,
      // Owner name from account player
      ownerName: players.name,
      ownerUserId: decks.createdBy,
    })
    .from(decks)
    .innerJoin(cmd1, eq(decks.commanderId, cmd1.id))
    .leftJoin(cmd2, eq(decks.commanderId2, cmd2.id))
    .leftJoin(
      players,
      and(
        eq(decks.createdBy, players.accountUserId),
        isNull(players.deletedAt),
      ),
    )
    .where(
      and(
        inArray(decks.createdBy, memberUserIds),
        isNull(decks.deletedAt),
      ),
    )
    .orderBy(players.name, decks.name);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    commanderId: row.commanderId,
    commanderId2: row.commanderId2,
    groupId: row.groupId,
    description: row.description,
    createdBy: row.createdBy,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    commander: {
      id: row.c1Id,
      name: row.c1Name,
      colors: row.c1Colors,
      isPartner: row.c1IsPartner,
      createdBy: row.c1CreatedBy,
      deletedAt: row.c1DeletedAt,
      createdAt: row.c1CreatedAt,
    } as Commander,
    commander2: row.c2Id
      ? ({
          id: row.c2Id,
          name: row.c2Name!,
          colors: row.c2Colors!,
          isPartner: row.c2IsPartner!,
          createdBy: row.c2CreatedBy!,
          deletedAt: row.c2DeletedAt,
          createdAt: row.c2CreatedAt!,
        } as Commander)
      : null,
    ownerName: row.ownerName ?? 'Unknown',
    ownerUserId: row.ownerUserId,
  }));
}
