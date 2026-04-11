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

export type Match = typeof schema.matches.$inferSelect;
export type NewMatch = typeof schema.matches.$inferInsert;

export type Participation = typeof schema.participations.$inferSelect;
export type NewParticipation = typeof schema.participations.$inferInsert;

export type MatchResult = typeof schema.matchResults.$inferSelect;
export type NewMatchResult = typeof schema.matchResults.$inferInsert;

export type MatchEvent = typeof schema.matchEvents.$inferSelect;
export type NewMatchEvent = typeof schema.matchEvents.$inferInsert;

export type Group = typeof schema.groups.$inferSelect;
export type NewGroup = typeof schema.groups.$inferInsert;

export type GroupMember = typeof schema.groupMembers.$inferSelect;
export type NewGroupMember = typeof schema.groupMembers.$inferInsert;

export type UserSettings = typeof schema.userSettings.$inferSelect;
export type NewUserSettings = typeof schema.userSettings.$inferInsert;
