/**
 * Integration tests — /api/commanders
 * Requires: DATABASE_URL in .env.test pointing to a Neon test branch.
 * DATA-011 (EPIC-01)
 *
 * Run with: DATABASE_URL=<test-url> pnpm test __tests__/integration
 */

// All tests skipped until .env.test with Neon test branch is configured.
// To activate: remove `.skip` and add jest.setup.ts that loads .env.test.

describe.skip('POST /api/commanders', () => {
  it('returns 201 with created commander on valid input', async () => {
    // TODO: call handler directly with mock Request + assert response
  });

  it('returns 409 for case-insensitive duplicate name', async () => {
    // Create "Atraxa", then try to create "atraxa"
  });

  it('returns 400 for invalid color code', async () => {
    // POST with colors: ["X"]
  });

  it('returns 401 without auth token', async () => {
    // POST without Authorization header
  });
});

describe.skip('DELETE /api/commanders/:id', () => {
  it('returns 200 and sets deleted_at', async () => {});
  it('returns 403 when user does not own the commander', async () => {});
  it('returns 404 for nonexistent id', async () => {});
});
