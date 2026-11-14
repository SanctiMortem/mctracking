import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  real,
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
    // Optional link to the list on moxfield.com. Shown as a tappable link only —
    // the app never requests anything from Moxfield (DECK-006).
    moxfieldUrl: text('moxfield_url'),
    // null = personal deck (not group-owned)
    groupId: uuid('group_id').references(() => groups.id),
    createdBy: text('created_by').notNull(), // Clerk user ID
    // null = active; non-null = archived (hidden from pickers, history preserved)
    archivedAt: timestamp('archived_at'),
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
// cards — Scryfall cache (DECK-001)
// One row per Scryfall card, shared by every deck. Filled lazily by decklist
// imports so a card is only ever fetched from Scryfall once.
// ─────────────────────────────────────────────
export const cards = pgTable(
  'cards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scryfallId: text('scryfall_id').notNull(),
    oracleId: text('oracle_id'),
    // Full canonical name. Double-faced / split cards keep "Front // Back".
    name: text('name').notNull(),
    // Lowercased front-face name — what a decklist line is matched against.
    nameKey: text('name_key').notNull(),
    // Faces joined with "\n//\n" for multi-faced cards.
    oracleText: text('oracle_text'),
    typeLine: text('type_line'),
    colors: text('colors').array().notNull().default([]),
    colorIdentity: text('color_identity').array().notNull().default([]),
    // Scryfall image_uris.normal (front face for multi-faced cards)
    imageUrl: text('image_url'),
    fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('cards_scryfall_id_unique').on(table.scryfallId),
    index('cards_name_key_idx').on(table.nameKey),
  ],
);

// ─────────────────────────────────────────────
// deck_cards — a deck's optional full list (DECK-001)
// card_id is null when Scryfall could not resolve raw_name; the line is kept
// so the user can see and fix it. Off-colour-identity is computed on read
// from the deck's current commander(s), never stored.
// ─────────────────────────────────────────────
export const deckCards = pgTable(
  'deck_cards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deckId: uuid('deck_id').notNull().references(() => decks.id),
    cardId: uuid('card_id').references(() => cards.id),
    // The name as the user pasted it (after parsing)
    rawName: text('raw_name').notNull(),
    quantity: integer('quantity').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('deck_cards_deck_raw_name_unique').on(table.deckId, table.rawName),
    index('deck_cards_deck_id_idx').on(table.deckId),
  ],
);

// ─────────────────────────────────────────────
// matches
// E-005 · BR-MATCH-01 · BR-MATCH-06
// ─────────────────────────────────────────────
/**
 * Seat arrangement for a match: which variant of the grid, what order the
 * players sit in, and which way each frame faces. `rotations` is keyed by
 * playerId and holds degrees (0 / 90 / 180 / 270).
 *
 * Canonical home for this shape — services/matchLayout.ts re-exports it for
 * the client-side SecureStore helpers.
 */
export interface MatchLayout {
  rotations: Record<string, number>;
  playerOrder: string[];
  layoutVariant: string;
}

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
    // Seat layout captured at setup. Acts as the cross-device DEFAULT: a phone
    // opening an in-progress match reproduces the table arrangement instead of
    // prompting for it. Per-device overrides still live in SecureStore and win
    // over this, so the mid-match layout editor stays local to one device.
    // Nullable — matches created before this column, and casual/guest matches,
    // simply have no server-side layout.
    layout: jsonb('layout').$type<MatchLayout>(),
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
    // How many seconds the outgoing player spent on the turn that just ended.
    // Only populated on event_type = 'turn_passed' events recorded by clients
    // running the per-turn-time feature (migration 0008+). Older events stay
    // null and are silently excluded from time-based stats.
    turnDurationSeconds: integer('turn_duration_seconds'),
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
// match_narrations — LABS: AI recap of a match (ANL-003, RCP-001)
// One per match. Built from the annotated log; the transcript itself is
// never stored here.
// ─────────────────────────────────────────────
export interface NarrationSpeaker {
  label: string;
  player: string | null;
  confidence: number;
  evidence: string;
}
export interface NarrationRulesDebate {
  question: string;
  outcome: string;
}

export const matchNarrations = pgTable(
  'match_narrations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    matchId: uuid('match_id').notNull().references(() => matches.id),
    // 'draft' = visible to the match's players only; 'published' = pod-visible
    status: text('status').notNull().default('draft'),
    model: text('model'),
    headline: text('headline').notNull(),
    narrative: text('narrative').notNull(),
    keyMoments: jsonb('key_moments').$type<string[]>().notNull().default([]),
    rulesDebates: jsonb('rules_debates').$type<NarrationRulesDebate[]>().notNull().default([]),
    speakers: jsonb('speakers').$type<NarrationSpeaker[]>().notNull().default([]),
    createdBy: text('created_by').notNull(), // Clerk user ID of whoever ran the analysis
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('match_narrations_match_id_unique').on(table.matchId)],
);

// ─────────────────────────────────────────────
// match_event_annotations — LABS: why a log entry happened (ANL-002)
// At most one per event; a new analysis run replaces the previous rows.
// The log entry itself (amount, target, time) is never changed.
// ─────────────────────────────────────────────
export const matchEventAnnotations = pgTable(
  'match_event_annotations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    matchId: uuid('match_id').notNull().references(() => matches.id),
    eventId: uuid('event_id').notNull().references(() => matchEvents.id),
    // Who caused it — a participation in the same match, when identified
    sourceParticipationId: uuid('source_participation_id').references(() => participations.id),
    // English card name as said at the table, when one was named
    sourceCard: text('source_card'),
    // combat | commander | spell | ability | lifegain | other
    damageType: text('damage_type').notNull(),
    confidence: real('confidence').notNull(),
    evidenceQuote: text('evidence_quote'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('match_event_annotations_event_id_unique').on(table.eventId),
    index('match_event_annotations_match_id_idx').on(table.matchId),
  ],
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
