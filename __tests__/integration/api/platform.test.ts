/**
 * Integration tests — platform schema + auth/session + settings + groups endpoints
 * Requires: DATABASE_URL in .env.test pointing to a Neon test branch.
 * PLAT-001, PLAT-002, PLAT-005 (EPIC-05)
 */
import { eq, and } from 'drizzle-orm';

import { getOrCreateSettings, updateSettings } from '@/services/settings';
import {
  listGroups,
  createGroup,
  archiveGroup,
  getOrRegenerateInvite,
  joinGroup,
} from '@/services/groups';
import { setPremiumTrue } from '@/services/purchases';
import { db } from '@/services/db';
import { groupMembers, groups, userSettings } from '@/db/schema';
import {
  seedTestData,
  cleanupTestData,
  TEST_USER_ID,
  TEST_USER_ID_2,
} from '../../helpers/seed';

type Seed = Awaited<ReturnType<typeof seedTestData>>;
let seed: Seed;

beforeAll(async () => {
  await cleanupTestData();
  seed = await seedTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe('group_members UNIQUE constraint', () => {
  it('prevents duplicate (group_id, user_id) pairs', async () => {
    // TEST_USER_ID is already owner member of seed.group via seedTestData
    await expect(
      db.insert(groupMembers).values({
        groupId: seed.group.id,
        userId: TEST_USER_ID,
        role: 'member',
      }),
    ).rejects.toThrow(); // unique constraint violation
  });

  it('allows the same user_id in different groups', async () => {
    // Create a second group
    const result = await createGroup(TEST_USER_ID, 'Second Group');
    const group2 = result.data.group;

    // TEST_USER_ID is now in both groups — this should have succeeded
    const userGroups = await listGroups(TEST_USER_ID);
    const groupIds = userGroups.map((g) => g.group.id);
    expect(groupIds).toContain(seed.group.id);
    expect(groupIds).toContain(group2.id);
  });
});

describe('user_settings uniqueness', () => {
  it('enforces one settings row per user_id', async () => {
    // seed already created settings for TEST_USER_ID
    await expect(
      db.insert(userSettings).values({ userId: TEST_USER_ID }),
    ).rejects.toThrow(); // unique constraint violation
  });
});

describe('GET /api/auth/session', () => {
  it('creates user_settings with defaults on first request (bootstrap)', async () => {
    // Use a brand new user ID
    const newUserId = 'clerk_test_user_bootstrap';
    const settings = await getOrCreateSettings(newUserId);

    expect(settings.userId).toBe(newUserId);
    expect(settings.language).toBe('auto');
    expect(settings.debounceThresholdMs).toBe(500);
    expect(settings.defaultLifeTotal).toBe(40);
    expect(settings.premium).toBe(false);
    expect(settings.swipeGesturesEnabled).toBe(true);
    expect(settings.requireCommander).toBe(true);

    // Cleanup
    await db.delete(userSettings).where(eq(userSettings.userId, newUserId));
  });

  it('does not duplicate user_settings on subsequent requests (upsert idempotent)', async () => {
    const newUserId = 'clerk_test_user_idempotent';

    await getOrCreateSettings(newUserId);
    await getOrCreateSettings(newUserId);

    const rows = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, newUserId));
    expect(rows.length).toBe(1);

    // Cleanup
    await db.delete(userSettings).where(eq(userSettings.userId, newUserId));
  });
});

describe('GET /api/settings', () => {
  it('returns user_settings for authenticated user', async () => {
    const settings = await getOrCreateSettings(TEST_USER_ID);

    expect(settings).toBeDefined();
    expect(settings.userId).toBe(TEST_USER_ID);
    expect(settings.id).toBeDefined();
  });

  it('creates settings with defaults if none exist (race condition guard)', async () => {
    const newUserId = 'clerk_test_user_race_guard';
    const settings = await getOrCreateSettings(newUserId);

    expect(settings.userId).toBe(newUserId);
    expect(settings.language).toBe('auto');

    // Cleanup
    await db.delete(userSettings).where(eq(userSettings.userId, newUserId));
  });
});

// ─────────────────────────────────────────────
// PLAT-007: Settings PATCH
// ─────────────────────────────────────────────

describe('PATCH /api/settings', () => {
  it('updates language field', async () => {
    const result = await updateSettings(TEST_USER_ID, { language: 'es' });
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.language).toBe('es');
    }

    // Reset
    await updateSettings(TEST_USER_ID, { language: 'auto' });
  });

  it('updates debounce_threshold_ms within valid range', async () => {
    const result = await updateSettings(TEST_USER_ID, { debounce_threshold_ms: 1000 });
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.debounceThresholdMs).toBe(1000);
      expect(result.data.updatedAt).toBeDefined();
    }

    // Reset
    await updateSettings(TEST_USER_ID, { debounce_threshold_ms: 500 });
  });

  it('returns debounceOutOfRange when debounce > 2000 (BR-TRACK-10)', async () => {
    const result = await updateSettings(TEST_USER_ID, { debounce_threshold_ms: 2500 });
    expect(result).toEqual({ debounceOutOfRange: true });
  });

  it('returns debounceOutOfRange when debounce < 200 (BR-TRACK-10)', async () => {
    const result = await updateSettings(TEST_USER_ID, { debounce_threshold_ms: 100 });
    expect(result).toEqual({ debounceOutOfRange: true });
  });

  it('updates default_life_total within valid range', async () => {
    const result = await updateSettings(TEST_USER_ID, { default_life_total: 30 });
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.defaultLifeTotal).toBe(30);
    }

    // Reset
    await updateSettings(TEST_USER_ID, { default_life_total: 40 });
  });

  it('returns lifeTotalOutOfRange when default_life_total out of range [1, 999]', async () => {
    const resultLow = await updateSettings(TEST_USER_ID, { default_life_total: 0 });
    expect(resultLow).toEqual({ lifeTotalOutOfRange: true });

    const resultHigh = await updateSettings(TEST_USER_ID, { default_life_total: 1000 });
    expect(resultHigh).toEqual({ lifeTotalOutOfRange: true });
  });

  it('updates multiple fields in one call', async () => {
    const result = await updateSettings(TEST_USER_ID, {
      language: 'en',
      require_commander: false,
      swipe_gestures_enabled: false,
    });
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.language).toBe('en');
      expect(result.data.requireCommander).toBe(false);
      expect(result.data.swipeGesturesEnabled).toBe(false);
    }

    // Reset
    await updateSettings(TEST_USER_ID, {
      language: 'auto',
      require_commander: true,
      swipe_gestures_enabled: true,
    });
  });

  it('returns notFound when settings row does not exist', async () => {
    const result = await updateSettings('nonexistent_user_id', { language: 'es' });
    expect(result).toEqual({ notFound: true });
  });
});

// ─────────────────────────────────────────────
// PLAT-005: Groups CRUD
// ─────────────────────────────────────────────

describe('GET /api/groups', () => {
  it('returns groups where user is owner', async () => {
    const userGroups = await listGroups(TEST_USER_ID);
    const ownedGroups = userGroups.filter((g) => g.role === 'owner');

    expect(ownedGroups.length).toBeGreaterThanOrEqual(1);
    const seedGroup = ownedGroups.find((g) => g.group.id === seed.group.id);
    expect(seedGroup).toBeDefined();
    expect(seedGroup!.role).toBe('owner');
  });

  it('returns groups where user is member', async () => {
    // Add TEST_USER_ID_2 as member to seed.group
    const joinResult = await joinGroup(TEST_USER_ID_2, seed.group.inviteCode);
    expect('data' in joinResult || 'alreadyMember' in joinResult).toBe(true);

    const user2Groups = await listGroups(TEST_USER_ID_2);
    const memberGroup = user2Groups.find((g) => g.group.id === seed.group.id);
    expect(memberGroup).toBeDefined();
    expect(memberGroup!.role).toBe('member');
  });

  it('excludes archived groups', async () => {
    // Create and archive a group
    const { data } = await createGroup(TEST_USER_ID, 'Group To Archive');
    await archiveGroup(TEST_USER_ID, data.group.id);

    const userGroups = await listGroups(TEST_USER_ID);
    const archivedFound = userGroups.find((g) => g.group.id === data.group.id);
    expect(archivedFound).toBeUndefined();
  });
});

describe('POST /api/groups', () => {
  it('creates group with owner membership and invite code', async () => {
    const result = await createGroup(TEST_USER_ID, 'Los Nuevos Comandantes');

    expect(result.data.group.name).toBe('Los Nuevos Comandantes');
    expect(result.data.group.ownerId).toBe(TEST_USER_ID);
    expect(result.data.group.inviteCode).toBeDefined();
    expect(result.data.group.inviteCode.length).toBeGreaterThan(0);
    expect(result.data.group.inviteExpiresAt).toBeDefined();

    expect(result.data.membership.role).toBe('owner');
    expect(result.data.membership.groupId).toBe(result.data.group.id);
    expect(result.data.membership.userId).toBe(TEST_USER_ID);
  });

  it('allows same name for different owners (BR-GROUP-01)', async () => {
    // Ensure TEST_USER_ID_2 has settings (required for some tests)
    await getOrCreateSettings(TEST_USER_ID_2);

    const result1 = await createGroup(TEST_USER_ID, 'Shared Name Group');
    const result2 = await createGroup(TEST_USER_ID_2, 'Shared Name Group');

    expect(result1.data.group.name).toBe('Shared Name Group');
    expect(result2.data.group.name).toBe('Shared Name Group');
    expect(result1.data.group.id).not.toBe(result2.data.group.id);
  });
});

describe('PATCH /api/groups/:id', () => {
  it('archives group when called by owner', async () => {
    const { data } = await createGroup(TEST_USER_ID, 'To Be Archived');

    const archiveResult = await archiveGroup(TEST_USER_ID, data.group.id);
    expect('data' in archiveResult).toBe(true);
    if ('data' in archiveResult) {
      expect(archiveResult.data.group.archivedAt).toBeDefined();
      expect(archiveResult.data.group.archivedAt).not.toBeNull();
    }

    // Should not appear in list
    const userGroups = await listGroups(TEST_USER_ID);
    const found = userGroups.find((g) => g.group.id === data.group.id);
    expect(found).toBeUndefined();
  });

  it('returns forbidden when called by a member (BR-GROUP-04)', async () => {
    // Create a group owned by TEST_USER_ID
    const { data } = await createGroup(TEST_USER_ID, 'Owner Only Archive');

    // Try to archive as TEST_USER_ID_2 (not owner)
    const result = await archiveGroup(TEST_USER_ID_2, data.group.id);
    expect(result).toEqual({ forbidden: true });
  });

  it('returns notFound for unknown group id', async () => {
    const result = await archiveGroup(TEST_USER_ID, '00000000-0000-0000-0000-000000000000');
    expect(result).toEqual({ notFound: true });
  });
});

describe('POST /api/groups/:id/invite', () => {
  it('returns existing invite code if not expired', async () => {
    const { data } = await createGroup(TEST_USER_ID, 'Invite Test Group');
    const originalCode = data.group.inviteCode;

    const inviteResult = await getOrRegenerateInvite(TEST_USER_ID, data.group.id);
    expect('data' in inviteResult).toBe(true);
    if ('data' in inviteResult) {
      expect(inviteResult.data.invite_code).toBe(originalCode);
    }
  });

  it('regenerates invite code when expired', async () => {
    const { data } = await createGroup(TEST_USER_ID, 'Expired Invite Group');
    const originalCode = data.group.inviteCode;

    // Manually set invite_expires_at to the past
    await db
      .update(groups)
      .set({ inviteExpiresAt: new Date('2020-01-01') })
      .where(eq(groups.id, data.group.id));

    const inviteResult = await getOrRegenerateInvite(TEST_USER_ID, data.group.id);
    expect('data' in inviteResult).toBe(true);
    if ('data' in inviteResult) {
      expect(inviteResult.data.invite_code).not.toBe(originalCode);
      expect(new Date(inviteResult.data.invite_expires_at).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('returns forbidden when called by a non-owner', async () => {
    const { data } = await createGroup(TEST_USER_ID, 'Forbidden Invite Group');

    const result = await getOrRegenerateInvite(TEST_USER_ID_2, data.group.id);
    expect(result).toEqual({ forbidden: true });
  });
});

describe('POST /api/groups/join', () => {
  it('creates membership with role=member for valid invite code', async () => {
    const { data } = await createGroup(TEST_USER_ID, 'Join Test Group');

    // Ensure TEST_USER_ID_2 has settings
    await getOrCreateSettings(TEST_USER_ID_2);

    const joinResult = await joinGroup(TEST_USER_ID_2, data.group.inviteCode);
    expect('data' in joinResult).toBe(true);
    if ('data' in joinResult) {
      expect(joinResult.data.membership.role).toBe('member');
      expect(joinResult.data.membership.userId).toBe(TEST_USER_ID_2);
      expect(joinResult.data.group.id).toBe(data.group.id);
    }
  });

  it('returns expired for expired code (BR-GROUP-05)', async () => {
    const { data } = await createGroup(TEST_USER_ID, 'Expired Code Group');

    // Expire the invite
    await db
      .update(groups)
      .set({ inviteExpiresAt: new Date('2020-01-01') })
      .where(eq(groups.id, data.group.id));

    const result = await joinGroup(TEST_USER_ID_2, data.group.inviteCode);
    expect(result).toEqual({ expired: true });
  });

  it('returns alreadyMember on duplicate join', async () => {
    const { data } = await createGroup(TEST_USER_ID, 'Duplicate Join Group');

    // First join
    await joinGroup(TEST_USER_ID_2, data.group.inviteCode);

    // Second join
    const result = await joinGroup(TEST_USER_ID_2, data.group.inviteCode);
    expect(result).toEqual({ alreadyMember: true });
  });

  it('returns notFound for non-existent invite code', async () => {
    const result = await joinGroup(TEST_USER_ID_2, 'NONEXISTENT_CODE_XYZ');
    expect(result).toEqual({ notFound: true });
  });
});

// ─────────────────────────────────────────────
// PLAT-012: POST /purchases/verify
// ─────────────────────────────────────────────

describe('POST /api/purchases/verify', () => {
  it('setPremiumTrue sets premium=true in user_settings (BR-AUTH-04)', async () => {
    // Ensure settings exist
    await getOrCreateSettings(TEST_USER_ID);

    const result = await setPremiumTrue(TEST_USER_ID);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.premium).toBe(true);
    }

    // Verify in DB
    const [row] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, TEST_USER_ID));
    expect(row.premium).toBe(true);
  });

  it('is idempotent — returns premium=true without error when user is already premium', async () => {
    // Already premium from previous test
    const result = await setPremiumTrue(TEST_USER_ID);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.premium).toBe(true);
    }

    // Only one row exists
    const rows = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, TEST_USER_ID));
    expect(rows.length).toBe(1);
  });

  it('returns notFound when no user_settings row exists', async () => {
    const result = await setPremiumTrue('nonexistent_user_xyz');
    expect(result).toEqual({ notFound: true });
  });

  it('premium field cannot be changed via updateSettings (ADR-007)', async () => {
    // The SettingsPatch type does not include `premium`, so TypeScript prevents it.
    // We verify that updating settings does not touch the premium field.
    await getOrCreateSettings(TEST_USER_ID);
    await setPremiumTrue(TEST_USER_ID);

    // Update a different field
    const result = await updateSettings(TEST_USER_ID, { language: 'es' });
    expect('data' in result).toBe(true);
    if ('data' in result) {
      // Premium should still be true — updateSettings does not modify it
      expect(result.data.premium).toBe(true);
      expect(result.data.language).toBe('es');
    }

    // Reset
    await updateSettings(TEST_USER_ID, { language: 'auto' });
  });
});
