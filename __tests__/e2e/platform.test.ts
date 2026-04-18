/**
 * E2E tests — Platform epic critical flows
 *
 * These tests require a running app + Clerk test credentials + Neon test DB.
 * All suites are skipped until the E2E harness (Detox / Maestro) is configured.
 *
 * Mock strategy:
 *   - Clerk: jest.mock('@clerk/clerk-expo', ...) — see issue for mock spec
 *   - Second user for group flows: seeded via API before test run
 */

// ─────────────────────────────────────────────
// E2E Flow 1: User Registration + Settings Bootstrap
// ─────────────────────────────────────────────

describe.skip('E2E — registration + settings bootstrap', () => {
  it('email sign-up → user_settings bootstrapped with defaults → Home screen', async () => {
    // 1. Open app (unauthenticated)
    // 2. Tap "Continue with Email"
    // 3. Enter valid email + password → tap Sign Up
    // 4. Assert: navigated to Home (index tab)
    // 5. Assert: GET /auth/session response contains user_settings with defaults
    //    (language='auto', debounce_threshold_ms=500, default_life_total=40)
    // 6. Assert: Home shows "New Match" CTA
  });

  it('second sign-in with same credentials does not duplicate user_settings', async () => {
    // 1. Sign in with existing credentials
    // 2. Assert: only one user_settings row in DB (upsert idempotent)
  });
});

// ─────────────────────────────────────────────
// E2E Flow 2: Group Creation + Invite + Join
// ─────────────────────────────────────────────

describe.skip('E2E — group lifecycle', () => {
  it('owner creates group → copies invite link → second user joins → both see shared group', async () => {
    // User A (owner):
    // 1. Navigate to Groups tab
    // 2. Tap "New Group" → enter name "Los Comandantes" → confirm
    // 3. Assert: group appears in "My Groups" with role='owner'
    // 4. Tap "Invite" → copy invite link (invite_code present in response)
    //
    // User B (mock second user seeded via API):
    // 5. Call POST /groups/join with invite_code from step 4
    // 6. Assert: 200 response with role='member'
    //
    // User A:
    // 7. Refresh Groups screen
    // 8. Assert: group shows 2 members
  });

  it('join with expired invite code shows GROUP_INVITE_EXPIRED error', async () => {
    // Seed a group with invite_expires_at in the past
    // User B taps "Join Group" and enters the expired code
    // Assert: error banner shows GROUP_INVITE_EXPIRED message
    // Assert: user B is NOT added as member
  });
});
