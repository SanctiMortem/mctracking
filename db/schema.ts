import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────────
// commanders
// E-001 · BR-ENTITY-01 · BR-ENTITY-03 · BR-DECK-03
// ─────────────────────────────────────────────
export const commanders = pgTable(
  'commanders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Case-insensitive uniqueness enforced by unique index below
    name: text('name').notNull(),
    // Valid values: W | U | B | R | G | C  (validated in API, not schema)
    colors: text('colors').array().notNull().default([]),
    isPartner: boolean('is_partner').notNull().default(false),
    createdBy: text('created_by').notNull(), // Clerk user ID
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('commanders_created_by_idx').on(table.createdBy),
    // Case-insensitive unique name: enforced via unique index on lower(name)
    // drizzle-kit generates this as a raw SQL index — see migration for exact DDL
    index('commanders_name_lower_idx').on(table.name),
  ],
);

// ─────────────────────────────────────────────
// players
// E-009 · BR-ENTITY-01 · BR-ENTITY-03
// ─────────────────────────────────────────────
export const players = pgTable(
  'players',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    createdBy: text('created_by').notNull(), // Clerk user ID
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('players_created_by_idx').on(table.createdBy)],
);

// ─────────────────────────────────────────────
// decks
// E-002 · BR-ENTITY-01 · BR-ENTITY-03 · BR-DECK-03 (partner)
// ─────────────────────────────────────────────
export const decks = pgTable(
  'decks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    commanderId: uuid('commander_id')
      .notNull()
      .references(() => commanders.id),
    // Nullable: only set when primary commander has is_partner = true
    commanderId2: uuid('commander_id_2').references(() => commanders.id),
    description: text('description'),
    createdBy: text('created_by').notNull(), // Clerk user ID
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('decks_created_by_idx').on(table.createdBy),
    index('decks_commander_id_idx').on(table.commanderId),
  ],
);
