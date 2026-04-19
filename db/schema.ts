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
// enums — EPIC-03
// E-006 · TRACK-001
// ─────────────────────────────────────────────
export const eventTypeEnum = pgEnum('event_type', [
  'life_change',
  'poison_change',
  'commander_damage',
  'player_died',
  'turn_passed',
]);

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
// enums — EPIC-05
// E-003 · E-011 · PLAT-001
// ─────────────────────────────────────────────
export const groupRoleEnum = pgEnum('group_role', ['owner', 'member']);

export const languageEnum = pgEnum('language', ['en', 'es', 'auto']);

// ─────────────────────────────────────────────
// groups
// E-003 · BR-GROUP-04 · BR-GROUP-05 · PLAT-001
// Defined before players/decks/matches (FK source)
// ─────────────────────────────────────────────
export const groups = pgTable(
  'groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    ownerId: text('owner_id').notNull(), // Clerk user ID
    // BR-GROUP-05: unique invite link with expiration
    inviteCode: text('invite_code').notNull(),
    inviteExpiresAt: timestamp('invite_expires_at'),
    // null = active; non-null = archived (BR-GROUP-04)
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('groups_invite_code_unique').on(table.inviteCode),
    index('groups_owner_id_idx').on(table.ownerId),
  ],
);

// ─────────────────────────────────────────────
// commanders
// E-001 · BR-ENTITY-01 · BR-ENTITY-03 · BR-DECK-03
// Commanders are pulled from Scryfall — scryfallId is the stable source of truth.
// ─────────────────────────────────────────────
export const commanders = pgTable(
  'commanders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Scryfall card UUID — globally unique across users
    scryfallId: text('scryfall_id'),
    name: text('name').notNull(),
    // Scryfall color_identity — subset of W|U|B|R|G (never 'C'; [] = colorless)
    colorIdentity: text('color_identity').array().notNull().default([]),
    // Scryfall image_uris.art_crop URL (may be null if card has faces with no top-level image)
    artCrop: text('art_crop'),
    isPartner: boolean('is_partner').notNull().default(false),
    createdBy: text('created_by').notNull(), // Clerk user ID
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('commanders_created_by_idx').on(table.createdBy),
    // Scryfall id is globally unique (when present)
    uniqueIndex('commanders_scryfall_id_unique').on(table.scryfallId),
    index('commanders_name_idx').on(table.name),
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
    // null = personal player (not group-owned)
    groupId: uuid('group_id').references(() => groups.id),
    createdBy: text('created_by').notNull(), // Clerk user ID
    // Non-null = account player (linked to Clerk user); null = guest
    accountUserId: text('account_user_id'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('players_created_by_idx').on(table.createdBy),
    index('players_group_id_idx').on(table.groupId),
    uniqueIndex('players_account_user_id_unique').on(table.accountUserId),
  ],
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
    // null = personal deck (not group-owned)
    groupId: uuid('group_id').references(() => groups.id),
    createdBy: text('created_by').notNull(), // Clerk user ID
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('decks_created_by_idx').on(table.createdBy),
    index('decks_commander_id_idx').on(table.commanderId),
    index('decks_group_id_idx').on(table.groupId),
  ],
);

// ─────────────────────────────────────────────
// matches
// E-005 · BR-MATCH-01 · BR-MATCH-06
// ─────────────────────────────────────────────
export const matches = pgTable(
  'matches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    status: matchStatusEnum('status').notNull().default('in_progress'),
    createdBy: text('created_by').notNull(), // Clerk user ID
    // null = personal match (not group-owned)
    groupId: uuid('group_id').references(() => groups.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // Set when match transitions to completed or abandoned
    endedAt: timestamp('ended_at'),
  },
  (table) => [index('matches_group_id_idx').on(table.groupId)],
);

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
// match_events
// E-006 · ADR-002 (Option A) · ADR-003 (Option A)
// BR-TRACK-09 (debounce) · BR-TRACK-11 (undo)
// ─────────────────────────────────────────────
export const matchEvents = pgTable(
  'match_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    matchId: uuid('match_id').notNull().references(() => matches.id),
    participationId: uuid('participation_id').notNull().references(() => participations.id),
    eventType: eventTypeEnum('event_type').notNull(),
    // positive = gained, negative = lost (life/poison). For commander_damage always positive.
    delta: integer('delta').notNull(),
    // Required when event_type = 'commander_damage'. Validated at API layer.
    commanderIdSource: uuid('commander_id_source').references(() => commanders.id),
    // Soft undo: event stays in log, marked undone (BR-TRACK-11)
    isUndone: boolean('is_undone').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // Supports: find last non-undone event for undo, and event log queries
    index('match_events_match_id_is_undone_idx').on(table.matchId, table.isUndone),
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

// ─────────────────────────────────────────────
// group_members
// E-004 · PLAT-001
// ─────────────────────────────────────────────
export const groupMembers = pgTable(
  'group_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id').notNull().references(() => groups.id),
    userId: text('user_id').notNull(), // Clerk user ID
    role: groupRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('group_members_group_user_unique').on(table.groupId, table.userId),
    index('group_members_user_id_idx').on(table.userId),
  ],
);

// ─────────────────────────────────────────────
// user_settings
// E-011 · BR-I18N-01 · BR-TRACK-08 · BR-TRACK-10 · PLAT-001
// debounce_threshold_ms validated 200–2000 at API layer (BR-TRACK-10)
// ─────────────────────────────────────────────
export const userSettings = pgTable(
  'user_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(), // Clerk user ID — UNIQUE enforced by index below
    language: languageEnum('language').notNull().default('auto'),
    swipeGesturesEnabled: boolean('swipe_gestures_enabled').notNull().default(true),
    debounceThresholdMs: integer('debounce_threshold_ms').notNull().default(500),
    requireCommander: boolean('require_commander').notNull().default(true),
    defaultLifeTotal: integer('default_life_total').notNull().default(40),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('user_settings_user_id_unique').on(table.userId)],
);
