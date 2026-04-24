/**
 * Account deletion — App Store Guideline 5.1.1(v) compliance.
 *
 * Deletes the authenticated user's data from the database, then deletes
 * the user from Clerk so the same credentials can no longer sign in.
 *
 * Strategy:
 *  - Personal data (matches with no group): hard delete + dependents
 *  - Pod-shared data (matches in groups): leave intact for other members
 *  - Decks/players created by user: soft delete (deletedAt)
 *  - Account player: anonymize to "Former player" so historical match
 *    references remain consistent for other pod members
 *  - Owned groups: archive (other members keep history, no new activity)
 *  - Group memberships, user_settings: hard delete
 *  - Clerk user: delete via Backend API (last step)
 *
 * Privacy Policy section 4 explicitly documents this behavior.
 *
 * Sequential queries — Neon HTTP does not support transactions.
 */
import { sql } from 'drizzle-orm';
import { db } from './db';

export async function deleteAccount(userId: string): Promise<void> {
  // 1. Hard-delete personal matches (no group) and dependent rows in FK order
  await db.execute(sql`
    DELETE FROM match_results
    WHERE match_id IN (
      SELECT id FROM matches WHERE created_by = ${userId} AND group_id IS NULL
    )
  `);
  await db.execute(sql`
    DELETE FROM match_events
    WHERE match_id IN (
      SELECT id FROM matches WHERE created_by = ${userId} AND group_id IS NULL
    )
  `);
  await db.execute(sql`
    DELETE FROM participations
    WHERE match_id IN (
      SELECT id FROM matches WHERE created_by = ${userId} AND group_id IS NULL
    )
  `);
  await db.execute(sql`
    DELETE FROM matches WHERE created_by = ${userId} AND group_id IS NULL
  `);

  // 2. Soft-delete decks created by user
  await db.execute(sql`
    UPDATE decks SET deleted_at = NOW()
    WHERE created_by = ${userId} AND deleted_at IS NULL
  `);

  // 3. Anonymize the account player so pod history shows "Former player"
  await db.execute(sql`
    UPDATE players
    SET name = 'Former player', account_user_id = NULL, deleted_at = NOW()
    WHERE account_user_id = ${userId}
  `);

  // 4. Soft-delete other (non-account) players the user created
  await db.execute(sql`
    UPDATE players SET deleted_at = NOW()
    WHERE created_by = ${userId}
      AND deleted_at IS NULL
      AND account_user_id IS NULL
  `);

  // 5. Archive groups owned by the user (preserves history for other members)
  await db.execute(sql`
    UPDATE groups SET archived_at = NOW()
    WHERE owner_id = ${userId} AND archived_at IS NULL
  `);

  // 6. Remove user from all group memberships
  await db.execute(sql`DELETE FROM group_members WHERE user_id = ${userId}`);

  // 7. Delete user_settings
  await db.execute(sql`DELETE FROM user_settings WHERE user_id = ${userId}`);

  // 8. Delete the Clerk user — must succeed for credentials to be invalidated
  await deleteClerkUser(userId);
}

async function deleteClerkUser(userId: string): Promise<void> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error('CLERK_SECRET_KEY is not configured');
  }
  const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Clerk user delete failed: ${res.status} ${text}`);
  }
}
