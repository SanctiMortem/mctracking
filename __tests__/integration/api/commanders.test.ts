/**
 * Integration tests — /api/commanders
 * Requires: DATABASE_URL in .env.test pointing to a Neon test branch.
 * DATA-011 (EPIC-01)
 *
 * Run with: DATABASE_URL=<test-url> pnpm test __tests__/integration
 */

import {
  createCommander,
  listCommanders,
  softDeleteCommander,
  validateColors,
} from '@/services/commanders';
import {
  seedTestData,
  cleanupTestData,
  TEST_USER_ID,
  TEST_USER_ID_2,
} from '../helpers/seed';

type Seed = Awaited<ReturnType<typeof seedTestData>>;
let seed: Seed;

beforeAll(async () => {
  await cleanupTestData();
  seed = await seedTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe('POST /api/commanders', () => {
  it('returns 201 with created commander on valid input', async () => {
    const result = await createCommander(TEST_USER_ID, {
      name: 'Muldrotha, the Gravetide',
      colors: ['B', 'G', 'U'],
      isPartner: false,
    });

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.name).toBe('Muldrotha, the Gravetide');
      expect(result.data.colors).toEqual(['B', 'G', 'U']);
      expect(result.data.isPartner).toBe(false);
      expect(result.data.createdBy).toBe(TEST_USER_ID);
      expect(result.data.id).toBeDefined();
      expect(result.data.createdAt).toBeDefined();
      expect(result.data.deletedAt).toBeNull();
    }
  });

  it('returns 409 for case-insensitive duplicate name', async () => {
    // seed already has "Atraxa, Praetors Voice"
    const result = await createCommander(TEST_USER_ID, {
      name: 'atraxa, praetors voice',
      colors: ['W', 'U', 'B', 'G'],
      isPartner: false,
    });

    expect(result).toEqual({ conflict: true });
  });

  it('returns 400 for invalid color code', () => {
    // validateColors is a sync helper used by the API route before calling createCommander
    expect(validateColors(['X'])).toBe(false);
    expect(validateColors(['W', 'Z'])).toBe(false);
    expect(validateColors('not-an-array')).toBe(false);
    expect(validateColors(null)).toBe(false);
  });

  it('validates valid color codes', () => {
    expect(validateColors(['W', 'U', 'B', 'R', 'G'])).toBe(true);
    expect(validateColors(['C'])).toBe(true);
    expect(validateColors([])).toBe(true);
  });
});

describe('GET /api/commanders — listCommanders', () => {
  it('returns commanders for the authenticated user ordered by name', async () => {
    const list = await listCommanders(TEST_USER_ID);

    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(4); // 4 from seed + 1 created above
    // Verify alphabetical order
    for (let i = 1; i < list.length; i++) {
      expect(list[i].name.localeCompare(list[i - 1].name)).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns empty array for a user with no commanders', async () => {
    const list = await listCommanders(TEST_USER_ID_2);
    expect(list).toEqual([]);
  });

  it('excludes soft-deleted commanders', async () => {
    // Create then delete
    const created = await createCommander(TEST_USER_ID, {
      name: 'Temporary Commander',
      colors: ['R'],
      isPartner: false,
    });
    expect('data' in created).toBe(true);
    if (!('data' in created)) return;

    await softDeleteCommander(TEST_USER_ID, created.data.id);

    const list = await listCommanders(TEST_USER_ID);
    const found = list.find((c) => c.id === created.data.id);
    expect(found).toBeUndefined();
  });
});

describe('DELETE /api/commanders/:id', () => {
  it('returns ok and sets deleted_at', async () => {
    const created = await createCommander(TEST_USER_ID, {
      name: 'Commander To Delete',
      colors: ['G'],
      isPartner: false,
    });
    expect('data' in created).toBe(true);
    if (!('data' in created)) return;

    const result = await softDeleteCommander(TEST_USER_ID, created.data.id);
    expect(result).toEqual({ ok: true });

    // Verify it no longer appears in list
    const list = await listCommanders(TEST_USER_ID);
    expect(list.find((c) => c.id === created.data.id)).toBeUndefined();
  });

  it('returns forbidden when user does not own the commander', async () => {
    const result = await softDeleteCommander(TEST_USER_ID_2, seed.commanders.cmd1.id);
    expect(result).toEqual({ forbidden: true });
  });

  it('returns notFound for nonexistent id', async () => {
    const result = await softDeleteCommander(TEST_USER_ID, '00000000-0000-0000-0000-000000000000');
    expect(result).toEqual({ notFound: true });
  });
});
