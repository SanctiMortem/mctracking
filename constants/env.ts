/**
 * Environment variable validation module.
 * Fails fast in development if a required server-side variable is missing.
 *
 * ⚠️ Import this ONLY from Expo API Routes (app/api/).
 *    Never import from client components — DATABASE_URL must never reach the RN bundle.
 */
function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

// Server-only variables
export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  CLERK_SECRET_KEY: requireEnv('CLERK_SECRET_KEY'),
  GOOGLE_CLIENT_ID: requireEnv('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: requireEnv('GOOGLE_CLIENT_SECRET'),
} as const;

// Client-safe variables (EXPO_PUBLIC_ prefix, can be used in components)
export const publicEnv = {
  CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
} as const;
