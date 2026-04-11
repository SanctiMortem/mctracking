import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────────
// enums
// E-005 · E-007 · E-008
// ─────────────────────────────────────────────
export const matchStatusEnum = pgEnum('match_status', [
  'in_progress',
  'completed',
  'abandoned',
]);

// NULL in DB means abandoned or in_progress (BR-MATCH-06)
export const participationResultEnum = pgEnum('participation_result', [
  'win',
  'lose',
  'draw',
]);

// BR-MATCH-09
export const winConditionEnum = pgEnum('win_condition', [
  'combat_damage',
  'commander_damage',
  'infect',
  'combo',
  'mill',
  'scoop',
  'concede',
  'other',
]);

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

// ─────────────────────────────────────────────
// matches
// E-005 · BR-MATCH-01 · BR-MATCH-06
// ─────────────────────────────────────────────
export const matches = pgTable('matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: matchStatusEnum('status').notNull().default('in_progress'),
  createdBy: text('created_by').notNull(), // Clerk user ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // Set when match transitions to completed or abandoned
  endedAt: timestamp('ended_at'),
});

// ─────────────────────────────────────────────
// participations
// E-008 · ADR-002 · ADR-003 · BR-TRACK-02 · BR-TRACK-05
// life_total + commander_damage are the source of truth (ADR-002, ADR-003 Option A)
// ─────────────────────────────────────────────
export const participations = pgTable(
  'participations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    matchId: uuid('match_id').notNull().references(() => matches.id),
    playerId: uuid('player_id').notNull().references(() => players.id),
    deckId: uuid('deck_id').notNull().references(() => decks.id),
    // NULL means match is in_progress or abandoned (BR-MATCH-06)
    result: participationResultEnum('result'),
    lifeTotal: integer('life_total').notNull().default(40),
    poisonCounters: integer('poison_counters').notNull().default(0),
    // Structure: { [commander_id: string]: number } — validated in API
    // Partners have separate counters per commander_id (BR-TRACK-03)
    commanderDamage: jsonb('commander_damage').notNull().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('participations_match_id_idx').on(table.matchId),
    index('participations_player_id_idx').on(table.playerId),
    index('participations_deck_id_idx').on(table.deckId),
  ],
);

// ─────────────────────────────────────────────
// match_results
// E-007 · BR-MATCH-08 · BR-MATCH-09
// ─────────────────────────────────────────────
export const matchResults = pgTable(
  'match_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // One result per match — enforced by unique index below
    matchId: uuid('match_id').notNull().references(() => matches.id),
    // NULL when is_draw=true (BR-MATCH-08) — result is set on all Participations instead
    winnerParticipationId: uuid('winner_participation_id').references(
      () => participations.id,
    ),
    winCondition: winConditionEnum('win_condition').notNull(),
    isDraw: boolean('is_draw').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('match_results_match_id_unique_idx').on(table.matchId)],
);
