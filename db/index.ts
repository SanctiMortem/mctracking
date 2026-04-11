import * as schema from './schema';

// Re-export table definitions
export * from './schema';

// Inferred TypeScript types for use in API routes and services
export type Commander = typeof schema.commanders.$inferSelect;
export type NewCommander = typeof schema.commanders.$inferInsert;

export type Player = typeof schema.players.$inferSelect;
export type NewPlayer = typeof schema.players.$inferInsert;

export type Deck = typeof schema.decks.$inferSelect;
export type NewDeck = typeof schema.decks.$inferInsert;
