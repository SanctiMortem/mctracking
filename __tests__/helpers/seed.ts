/**
 * Test seed data — creates a baseline dataset for integration tests.
 * Matches fixtures in docs/planning/11_TEST_STRATEGY.md §8.
 *
 * Usage:
 *   import { seedTestData, TEST_USER_ID, TEST_USER_ID_2 } from '../helpers/seed';
 *   const seed = await seedTestData();
 */
import { db } from '@/services/db';
import {
  commanders,
  players,
  decks,
  matches,
  participations,
  matchEvents,
  matchResults,
  groups,
  groupMembers,
  userSettings,
} from '@/db/schema';

// ── Stable test identifiers ─────────────────────────────────────────────────
export const TEST_USER_ID = 'clerk_test_user_1';
export const TEST_USER_ID_2 = 'clerk_test_user_2';

// ── Seed function ───────────────────────────────────────────────────────────

export async function seedTestData() {
  // ── Commanders ──────────────────────────────────────────────────────────
  const [cmd1] = await db
    .insert(commanders)
    .values({
      name: 'Atraxa, Praetors Voice',
      colors: ['W', 'U', 'B', 'G'],
      isPartner: false,
      createdBy: TEST_USER_ID,
    })
    .returning();

  const [cmd2] = await db
    .insert(commanders)
    .values({
      name: 'Thrasios, Triton Hero',
      colors: ['U', 'G'],
      isPartner: true,
      createdBy: TEST_USER_ID,
    })
    .returning();

  const [cmd3] = await db
    .insert(commanders)
    .values({
      name: 'Tymna the Weaver',
      colors: ['W', 'B'],
      isPartner: true,
      createdBy: TEST_USER_ID,
    })
    .returning();

  const [cmd4] = await db
    .insert(commanders)
    .values({
      name: 'Kenrith, the Returned King',
      colors: ['W', 'U', 'B', 'R', 'G'],
      isPartner: false,
      createdBy: TEST_USER_ID,
    })
    .returning();

  // ── Players ─────────────────────────────────────────────────────────────
  const [player1] = await db
    .insert(players)
    .values({ name: 'Jugador Uno', createdBy: TEST_USER_ID })
    .returning();

  const [player2] = await db
    .insert(players)
    .values({ name: 'Jugador Dos', createdBy: TEST_USER_ID })
    .returning();

  const [player3] = await db
    .insert(players)
    .values({ name: 'Jugador Tres', createdBy: TEST_USER_ID })
    .returning();

  const [player4] = await db
    .insert(players)
    .values({ name: 'Jugador Cuatro', createdBy: TEST_USER_ID })
    .returning();

  // ── Decks ───────────────────────────────────────────────────────────────
  const [deck1] = await db
    .insert(decks)
    .values({
      name: 'Atraxa Superfriends',
      commanderId: cmd1.id,
      createdBy: TEST_USER_ID,
    })
    .returning();

  const [deck2] = await db
    .insert(decks)
    .values({
      name: 'Thrasios + Tymna',
      commanderId: cmd2.id,
      commanderId2: cmd3.id,
      createdBy: TEST_USER_ID,
    })
    .returning();

  const [deck3] = await db
    .insert(decks)
    .values({
      name: 'Kenrith Politics',
      commanderId: cmd4.id,
      createdBy: TEST_USER_ID,
    })
    .returning();

  const [deck4] = await db
    .insert(decks)
    .values({
      name: 'Atraxa Infect',
      commanderId: cmd1.id,
      createdBy: TEST_USER_ID,
    })
    .returning();

  // ── User Settings ───────────────────────────────────────────────────────
  const [settings1] = await db
    .insert(userSettings)
    .values({ userId: TEST_USER_ID })
    .returning();

  // ── Groups ──────────────────────────────────────────────────────────────
  const [group1] = await db
    .insert(groups)
    .values({
      name: 'Los Comandantes',
      ownerId: TEST_USER_ID,
      inviteCode: 'TEST_INVITE_001',
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    .returning();

  await db.insert(groupMembers).values({
    groupId: group1.id,
    userId: TEST_USER_ID,
    role: 'owner',
  });

  return {
    commanders: { cmd1, cmd2, cmd3, cmd4 },
    players: { player1, player2, player3, player4 },
    decks: { deck1, deck2, deck3, deck4 },
    settings: settings1,
    group: group1,
  };
}

/**
 * Truncate all test tables in dependency order.
 * Call in afterAll() to leave the DB clean.
 */
export async function cleanupTestData() {
  // Delete in reverse-FK order
  await db.delete(matchEvents);
  await db.delete(matchResults);
  await db.delete(participations);
  await db.delete(matches);
  await db.delete(decks);
  await db.delete(commanders);
  await db.delete(players);
  await db.delete(groupMembers);
  await db.delete(groups);
  await db.delete(userSettings);
}
