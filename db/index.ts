import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export * from './schema';

// Inferred TypeScript types for use in API routes and services
export type Commander = typeof schema.commanders.$inferSelect;
export type NewCommander = typeof schema.commanders.$inferInsert;

export type Player = typeof schema.players.$inferSelect;
export type NewPlayer = typeof schema.players.$inferInsert;

export type Deck = typeof schema.decks.$inferSelect;
export type NewDeck = typeof schema.decks.$inferInsert;

// Database client — instantiated per-request (Neon serverless / edge-safe)
export function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}
