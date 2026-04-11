/**
 * Neon database client (server-only).
 *
 * ⚠️ Import ONLY from Expo API Routes (app/api/).
 *    DATABASE_URL must never reach the React Native bundle.
 *
 * Full domain schema added in DATA-001 (EPIC-01).
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import { env } from '@/constants/env';

const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql);
