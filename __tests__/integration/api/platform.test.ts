/**
 * Integration tests — platform schema + auth/session + settings endpoints
 * Requires: DATABASE_URL in .env.test pointing to a Neon test branch.
 * PLAT-001, PLAT-002 (EPIC-05)
 */

describe.skip('group_members UNIQUE constraint', () => {
  it('prevents duplicate (group_id, user_id) pairs', async () => {
    // Insert a group_member row, then insert the same (group_id, user_id) pair
    // Expect DB to throw a unique constraint violation
  });

  it('allows the same user_id in different groups', async () => {
    // Insert user A into group 1 and group 2
    // Expect both inserts to succeed
  });
});

describe.skip('user_settings uniqueness', () => {
  it('enforces one settings row per user_id', async () => {
    // Insert user_settings for user A, then insert again with same user_id
    // Expect DB to throw a unique constraint violation
  });
});

describe.skip('GET /api/auth/session', () => {
  it('creates user_settings with defaults on first request (bootstrap)', async () => {
    // Call GET /auth/session with a valid Clerk token for a new user
    // Expect user_settings to be created with defaults (language=auto, debounce=500, life_total=40)
    // Expect response: { authenticated: true, user_id, settings, active_match: null }
  });

  it('does not duplicate user_settings on subsequent requests (upsert idempotent)', async () => {
    // Call GET /auth/session twice with the same Clerk token
    // Expect only one user_settings row in DB
  });

  it('returns { authenticated: false } when no Clerk token is present', async () => {
    // Call GET /auth/session without Authorization header
    // Expect { success: true, data: { authenticated: false } }
  });

  it('includes active_match when user has an in_progress match', async () => {
    // Seed an in_progress match owned by the test user
    // Call GET /auth/session
    // Expect active_match: { id, group_id, started_at }
  });

  it('returns active_match: null when user has no in_progress match', async () => {
    // No in_progress match for the test user
    // Call GET /auth/session
    // Expect active_match: null
  });
});

describe.skip('GET /api/settings', () => {
  it('returns user_settings for authenticated user', async () => {
    // Seed user_settings, call GET /settings with valid Clerk token
    // Expect { success: true, data: <settings row> }
  });

  it('creates settings with defaults if none exist (race condition guard)', async () => {
    // Call GET /settings for a user with no settings row
    // Expect settings to be created and returned
  });

  it('returns 401 without Clerk token', async () => {
    // Call GET /settings without Authorization header
    // Expect { success: false, code: 'UNAUTHORIZED' }
  });
});
