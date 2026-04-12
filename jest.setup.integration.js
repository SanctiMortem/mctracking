// Integration test setup — loads .env.test for real Neon test branch
const { resolve } = require('path');

require('dotenv').config({ path: resolve(__dirname, '.env.test') });

// Ensure DATABASE_URL is set (integration tests require a real database)
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost')) {
  console.warn(
    '\n⚠️  DATABASE_URL points to localhost — integration tests require a Neon test branch.\n' +
    '   Update .env.test with your Neon test branch URL to run integration tests.\n'
  );
}
