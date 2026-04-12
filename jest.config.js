/**
 * Jest configuration — dual-project setup (unit + integration).
 *
 * Unit tests mock the DB; integration tests hit a real Neon test branch.
 * Run separately:
 *   pnpm test:unit
 *   pnpm test:integration
 *   pnpm test              (runs both)
 */
module.exports = {
  projects: [
    // ── Unit tests ──────────────────────────────────────────────────────
    {
      displayName: 'unit',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.ts?(x)'],
      setupFiles: ['./jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
    // ── Integration tests ───────────────────────────────────────────────
    {
      displayName: 'integration',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.ts?(x)'],
      setupFiles: ['./jest.setup.integration.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
  ],

  // ── Coverage ────────────────────────────────────────────────────────
  collectCoverageFrom: [
    'services/**/*.ts',
    'hooks/**/*.ts',
    'components/**/*.tsx',
    'app/api/**/*.ts',
    'db/**/*.ts',
    'constants/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
