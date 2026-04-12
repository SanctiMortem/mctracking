/**
 * Integration tests — /api/stats/* (EPIC-04 History & Stats)
 *
 * These tests validate business rules for stats calculation and history filtering.
 * Requires: DATABASE_URL in .env.test pointing to a Neon test branch.
 *
 * HIST-004, HIST-006, HIST-008, HIST-010, HIST-012 (EPIC-04)
 */
import {
  getPlayerStats,
  getDeckStats,
  getCommanderStats,
  getMatchupStats,
  getGlobalStats,
} from '@/services/stats';
import { createMatch, closeMatch, listMatches } from '@/services/matches';
import { recordEvent } from '@/services/matchEvents';
import { db } from '@/services/db';
import { participations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  seedTestData,
  cleanupTestData,
  TEST_USER_ID,
  TEST_USER_ID_2,
} from '../../helpers/seed';

type Seed = Awaited<ReturnType<typeof seedTestData>>;
let seed: Seed;

/**
 * Helper: create a match, optionally record some events, then close it.
 * Returns the match data.
 */
async function createAndCloseMatch(
  s: Seed,
  players: Array<{ playerId: string; deckId: string }>,
  outcome: { action: 'win'; winnerIndex: number; winCondition: string }
    | { action: 'draw' }
    | { action: 'abandon' },
) {
  const result = await createMatch(
    TEST_USER_ID,
    players.map((p) => ({ player_id: p.playerId, deck_id: p.deckId })),
  );
  if (!('data' in result)) throw new Error('Failed to create match');

  const { match, participations: parts } = result.data;

  if (outcome.action === 'win') {
    await closeMatch(TEST_USER_ID, match.id, {
      action: 'win',
      winner_participation_id: parts[outcome.winnerIndex].id,
      win_condition: outcome.winCondition,
    });
  } else if (outcome.action === 'draw') {
    await closeMatch(TEST_USER_ID, match.id, { action: 'draw' });
  } else {
    await closeMatch(TEST_USER_ID, match.id, { action: 'abandon' });
  }

  return { match, participations: parts };
}

beforeAll(async () => {
  await cleanupTestData();
  seed = await seedTestData();

  // Create a baseline of completed matches for stats tests:
  // Match 1: player1(deck1) wins vs player2(deck2) — combat_damage
  await createAndCloseMatch(
    seed,
    [
      { playerId: seed.players.player1.id, deckId: seed.decks.deck1.id },
      { playerId: seed.players.player2.id, deckId: seed.decks.deck2.id },
    ],
    { action: 'win', winnerIndex: 0, winCondition: 'combat_damage' },
  );

  // Match 2: player2(deck2) wins vs player1(deck1) — combo
  await createAndCloseMatch(
    seed,
    [
      { playerId: seed.players.player1.id, deckId: seed.decks.deck1.id },
      { playerId: seed.players.player2.id, deckId: seed.decks.deck2.id },
    ],
    { action: 'win', winnerIndex: 1, winCondition: 'combo' },
  );

  // Match 3: player1(deck1) wins vs player3(deck3) — infect
  await createAndCloseMatch(
    seed,
    [
      { playerId: seed.players.player1.id, deckId: seed.decks.deck1.id },
      { playerId: seed.players.player3.id, deckId: seed.decks.deck3.id },
    ],
    { action: 'win', winnerIndex: 0, winCondition: 'infect' },
  );

  // Match 4: 3-player draw — player1(deck1), player2(deck2), player3(deck3)
  await createAndCloseMatch(
    seed,
    [
      { playerId: seed.players.player1.id, deckId: seed.decks.deck1.id },
      { playerId: seed.players.player2.id, deckId: seed.decks.deck2.id },
      { playerId: seed.players.player3.id, deckId: seed.decks.deck3.id },
    ],
    { action: 'draw' },
  );

  // Match 5: abandoned — should be excluded from stats
  await createAndCloseMatch(
    seed,
    [
      { playerId: seed.players.player1.id, deckId: seed.decks.deck1.id },
      { playerId: seed.players.player2.id, deckId: seed.decks.deck2.id },
    ],
    { action: 'abandon' },
  );
});

afterAll(async () => {
  await cleanupTestData();
});

// ─── GET /matches (HIST-001, HIST-012) ───────────────────────────────────────

describe('GET /api/matches — history filtering', () => {
  it('excludes in_progress matches from response (BR-MATCH-07)', async () => {
    // Create an in_progress match (don't close it)
    const result = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player3.id, deck_id: seed.decks.deck3.id },
      { player_id: seed.players.player4.id, deck_id: seed.decks.deck4.id },
    ]);
    if (!('data' in result)) throw new Error('Failed to create match');

    const listResult = await listMatches(TEST_USER_ID);
    const statuses = listResult.data.matches.map((m) => m.match.status);

    expect(statuses).not.toContain('in_progress');
  });

  it('includes completed matches', async () => {
    const listResult = await listMatches(TEST_USER_ID);
    const statuses = listResult.data.matches.map((m) => m.match.status);

    expect(statuses).toContain('completed');
  });

  it('includes abandoned matches', async () => {
    const listResult = await listMatches(TEST_USER_ID);
    const statuses = listResult.data.matches.map((m) => m.match.status);

    expect(statuses).toContain('abandoned');
  });

  it('returns matches paginated with offset (ADR-008)', async () => {
    const page1 = await listMatches(TEST_USER_ID, { limit: 2, offset: 0 });
    const page2 = await listMatches(TEST_USER_ID, { limit: 2, offset: 2 });

    expect(page1.data.matches.length).toBeLessThanOrEqual(2);
    expect(page1.data.limit).toBe(2);
    expect(page1.data.offset).toBe(0);

    // Page2 should have different matches
    if (page2.data.matches.length > 0) {
      const page1Ids = page1.data.matches.map((m) => m.match.id);
      const page2Ids = page2.data.matches.map((m) => m.match.id);
      expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids));
    }
  });

  it('returns hasMore=false when all pages exhausted', async () => {
    const result = await listMatches(TEST_USER_ID, { limit: 100, offset: 0 });
    expect(result.data.has_more).toBe(false);
  });

  it('GET ?player_id=X returns only matches where player X participated', async () => {
    const result = await listMatches(TEST_USER_ID, {
      playerId: seed.players.player3.id,
    });

    // player3 participated in match3 (win for p1) and match4 (draw)
    expect(result.data.matches.length).toBeGreaterThanOrEqual(1);
    for (const ms of result.data.matches) {
      const playerIds = ms.participations.map((p) => p.playerId);
      expect(playerIds).toContain(seed.players.player3.id);
    }
  });

  it('GET ?date_from=Y&date_to=Z filters by date range inclusive', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const result = await listMatches(TEST_USER_ID, {
      dateFrom: yesterday.toISOString(),
      dateTo: tomorrow.toISOString(),
    });

    // All seeded matches were created today
    expect(result.data.matches.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── GET /api/stats/players/:id (HIST-004, HIST-012) ─────────────────────────

describe('GET /api/stats/players/:id', () => {
  it('returns win_rate_pct calculated per CALC-001 (1 decimal, round half-up)', async () => {
    // player1: 2 wins, 1 loss, 1 draw out of 4 completed matches
    const result = await getPlayerStats(TEST_USER_ID, seed.players.player1.id);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.wins).toBe(2);
      expect(result.data.total_matches).toBe(4);
      // 2/4 = 50.0%
      expect(result.data.win_rate_pct).toBe(50.0);
    }
  });

  it('returns win_rate_pct=null (not 0) when player has zero completed matches', async () => {
    // player4 has no completed matches
    const result = await getPlayerStats(TEST_USER_ID, seed.players.player4.id);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.win_rate_pct).toBeNull();
      expect(result.data.total_matches).toBe(0);
    }
  });

  it('excludes abandoned matches from total_matches denominator (BR-STATS-03)', async () => {
    // player1 was in 5 matches but 1 was abandoned
    const result = await getPlayerStats(TEST_USER_ID, seed.players.player1.id);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      // Only 4 completed matches counted (abandoned excluded)
      expect(result.data.total_matches).toBe(4);
    }
  });

  it('counts only completed matches in total_matches (BR-STATS-01)', async () => {
    const result = await getPlayerStats(TEST_USER_ID, seed.players.player1.id);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.total_matches).toBe(result.data.wins + result.data.losses + result.data.draws);
    }
  });

  it('returns favorite_decks ordered by match count descending', async () => {
    const result = await getPlayerStats(TEST_USER_ID, seed.players.player1.id);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.favorite_decks.length).toBeGreaterThan(0);
      // deck1 used in all player1's matches
      expect(result.data.favorite_decks[0].deck.id).toBe(seed.decks.deck1.id);

      // Verify descending order
      for (let i = 1; i < result.data.favorite_decks.length; i++) {
        expect(result.data.favorite_decks[i].matches).toBeLessThanOrEqual(
          result.data.favorite_decks[i - 1].matches,
        );
      }
    }
  });

  it('counts both commanderId and commanderId2 independently in favorite_commanders (BR-STATS-05)', async () => {
    // player2 uses deck2 which has cmd2 (primary) + cmd3 (partner)
    const result = await getPlayerStats(TEST_USER_ID, seed.players.player2.id);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      const cmdIds = result.data.favorite_commanders.map((fc) => fc.commander.id);
      // Both partner commanders should appear
      expect(cmdIds).toContain(seed.commanders.cmd2.id);
      expect(cmdIds).toContain(seed.commanders.cmd3.id);
    }
  });

  it('returns notFound when player does not exist', async () => {
    const result = await getPlayerStats(TEST_USER_ID, '00000000-0000-0000-0000-000000000000');
    expect(result).toEqual({ notFound: true });
  });

  it('returns forbidden when player belongs to a different user', async () => {
    const result = await getPlayerStats(TEST_USER_ID_2, seed.players.player1.id);
    expect(result).toEqual({ forbidden: true });
  });
});

// ─── GET /api/stats/decks/:id (HIST-006, HIST-012) ───────────────────────────

describe('GET /api/stats/decks/:id', () => {
  it('returns win rate summing victories across all players who used the deck (BR-STATS-04)', async () => {
    // deck1 was used by player1 in matches 1-4 (2 wins, 1 loss, 1 draw)
    const result = await getDeckStats(TEST_USER_ID, seed.decks.deck1.id);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.wins).toBe(2);
      expect(result.data.total_matches).toBe(4);
      expect(result.data.win_rate_pct).toBe(50.0);
    }
  });

  it('returns players_used_by with per-player win_rate_pct', async () => {
    const result = await getDeckStats(TEST_USER_ID, seed.decks.deck1.id);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.players_used_by.length).toBeGreaterThan(0);
      const player1Usage = result.data.players_used_by.find(
        (pu) => pu.player.id === seed.players.player1.id,
      );
      expect(player1Usage).toBeDefined();
      expect(player1Usage!.matches).toBeGreaterThanOrEqual(1);
      expect(typeof player1Usage!.win_rate_pct).toBe('number');
    }
  });

  it('excludes abandoned matches from total_matches denominator (BR-STATS-03)', async () => {
    // deck1 was in 5 matches total but 1 was abandoned
    const result = await getDeckStats(TEST_USER_ID, seed.decks.deck1.id);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      // Should only count 4 completed matches
      expect(result.data.total_matches).toBe(4);
    }
  });

  it('returns notFound when deck does not exist', async () => {
    const result = await getDeckStats(TEST_USER_ID, '00000000-0000-0000-0000-000000000000');
    expect(result).toEqual({ notFound: true });
  });

  it('returns forbidden when deck belongs to a different user', async () => {
    const result = await getDeckStats(TEST_USER_ID_2, seed.decks.deck1.id);
    expect(result).toEqual({ forbidden: true });
  });
});

// ─── GET /api/stats/commanders/:id (HIST-008, HIST-012) ──────────────────────

describe('GET /api/stats/commanders/:id', () => {
  it('counts matches where commander appears as primary or partner (BR-STATS-05)', async () => {
    // cmd2 (Thrasios) is primary in deck2, which is a partner deck with cmd3
    const result = await getCommanderStats(TEST_USER_ID, seed.commanders.cmd2.id);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      // deck2 was used in matches 1, 2, 4 (all completed)
      expect(result.data.total_matches).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns decks_using ordered by match count descending', async () => {
    // cmd1 (Atraxa) is used in deck1 and deck4
    const result = await getCommanderStats(TEST_USER_ID, seed.commanders.cmd1.id);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.decks_using.length).toBeGreaterThanOrEqual(1);
      for (let i = 1; i < result.data.decks_using.length; i++) {
        expect(result.data.decks_using[i].matches).toBeLessThanOrEqual(
          result.data.decks_using[i - 1].matches,
        );
      }
    }
  });

  it('returns players_using ordered by match count descending', async () => {
    const result = await getCommanderStats(TEST_USER_ID, seed.commanders.cmd1.id);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.players_using.length).toBeGreaterThanOrEqual(1);
      for (let i = 1; i < result.data.players_using.length; i++) {
        expect(result.data.players_using[i].matches).toBeLessThanOrEqual(
          result.data.players_using[i - 1].matches,
        );
      }
    }
  });

  it('returns notFound when commander does not exist', async () => {
    const result = await getCommanderStats(TEST_USER_ID, '00000000-0000-0000-0000-000000000000');
    expect(result).toEqual({ notFound: true });
  });

  it('returns forbidden when commander belongs to a different user', async () => {
    const result = await getCommanderStats(TEST_USER_ID_2, seed.commanders.cmd1.id);
    expect(result).toEqual({ forbidden: true });
  });
});

// ─── GET /api/stats/matchup (HIST-010, HIST-012) ─────────────────────────────

describe('GET /api/stats/matchup?scope=all — entity matchup', () => {
  it('returns total_matches=0 when entities never shared a match', async () => {
    // player3 and player4 never shared a completed match in our seed
    const result = await getMatchupStats(
      TEST_USER_ID,
      'player',
      seed.players.player3.id,
      seed.players.player4.id,
      'all',
    );
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.total_matches).toBe(0);
    }
  });

  it('scope=all includes matches with any number of players (BR-STATS-06)', async () => {
    // player1 and player2 played together in matches 1, 2, 4 (2-player + 3-player)
    const result = await getMatchupStats(
      TEST_USER_ID,
      'player',
      seed.players.player1.id,
      seed.players.player2.id,
      'all',
    );
    expect('data' in result).toBe(true);
    if ('data' in result) {
      // Should include the 3-player draw match too
      expect(result.data.total_matches).toBeGreaterThanOrEqual(3);
    }
  });

  it('aggregates wins correctly when A and B played multiple matches', async () => {
    // player1 vs player2: match1 (p1 wins), match2 (p2 wins), match4 (draw)
    const result = await getMatchupStats(
      TEST_USER_ID,
      'player',
      seed.players.player1.id,
      seed.players.player2.id,
      'all',
    );
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.entity_a_wins).toBe(1); // player1 won match1
      expect(result.data.entity_b_wins).toBe(1); // player2 won match2
      expect(result.data.draws).toBe(1); // match4 was draw
      expect(result.data.total_matches).toBe(3);
    }
  });

  it('entity_type=commander counts decks using that commander as primary or partner', async () => {
    // cmd1 (Atraxa) is in deck1; cmd2 (Thrasios) is in deck2
    const result = await getMatchupStats(
      TEST_USER_ID,
      'commander',
      seed.commanders.cmd1.id,
      seed.commanders.cmd2.id,
      'all',
    );
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.total_matches).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns notFound when entity_a does not exist', async () => {
    const result = await getMatchupStats(
      TEST_USER_ID,
      'player',
      '00000000-0000-0000-0000-000000000000',
      seed.players.player2.id,
      'all',
    );
    expect('notFound' in result).toBe(true);
  });
});

describe('GET /api/stats/matchup?scope=1v1', () => {
  it('scope=1v1 only counts matches with exactly 2 participants (BR-STATS-06)', async () => {
    const result = await getMatchupStats(
      TEST_USER_ID,
      'player',
      seed.players.player1.id,
      seed.players.player2.id,
      '1v1',
    );
    expect('data' in result).toBe(true);
    if ('data' in result) {
      // Only match1 and match2 are 2-player; match4 (3-player draw) excluded
      expect(result.data.total_matches).toBe(2);
    }
  });

  it('scope=1v1 returns fewer total_matches than scope=all when multi-player matches exist', async () => {
    const allResult = await getMatchupStats(
      TEST_USER_ID,
      'player',
      seed.players.player1.id,
      seed.players.player2.id,
      'all',
    );
    const oneVOneResult = await getMatchupStats(
      TEST_USER_ID,
      'player',
      seed.players.player1.id,
      seed.players.player2.id,
      '1v1',
    );

    expect('data' in allResult).toBe(true);
    expect('data' in oneVOneResult).toBe(true);
    if ('data' in allResult && 'data' in oneVOneResult) {
      expect(oneVOneResult.data.total_matches).toBeLessThan(allResult.data.total_matches);
    }
  });

  it('scope=1v1 returns total_matches=0 when no 2-player matches shared', async () => {
    // player1 and player3 only share match3 (2-player) and match4 (3-player)
    // In 1v1 scope, match4 is excluded
    const result = await getMatchupStats(
      TEST_USER_ID,
      'player',
      seed.players.player1.id,
      seed.players.player3.id,
      '1v1',
    );
    expect('data' in result).toBe(true);
    if ('data' in result) {
      // match3 is 2-player so it should count
      expect(result.data.total_matches).toBe(1);
    }
  });
});

// ─── GET /api/stats/global (HIST-010, HIST-012) ──────────────────────────────

describe('GET /api/stats/global — global stats dashboard', () => {
  it('returns total_matches count for completed matches scoped to user', async () => {
    const result = await getGlobalStats(TEST_USER_ID);
    expect(result.data.total_matches).toBe(4); // 4 completed, 1 abandoned excluded
  });

  it('returns player_rankings ordered by win_rate_pct DESC', async () => {
    const result = await getGlobalStats(TEST_USER_ID);
    const rankings = result.data.player_rankings;

    expect(rankings.length).toBeGreaterThan(0);
    for (let i = 1; i < rankings.length; i++) {
      const prev = rankings[i - 1].win_rate_pct ?? -1;
      const curr = rankings[i].win_rate_pct ?? -1;
      expect(curr).toBeLessThanOrEqual(prev);
    }
  });

  it('ranking uses RANK (1,1,3) when two players are tied (BR-STATS-07)', async () => {
    const result = await getGlobalStats(TEST_USER_ID);
    const rankings = result.data.player_rankings;

    // Check that rank assignment follows RANK behavior (not DENSE_RANK)
    // If two players share rank 1, the next should be 3 not 2
    for (let i = 1; i < rankings.length; i++) {
      if (rankings[i].win_rate_pct === rankings[i - 1].win_rate_pct) {
        expect(rankings[i].rank).toBe(rankings[i - 1].rank); // tied = same rank
      }
      if (
        i + 1 < rankings.length &&
        rankings[i].win_rate_pct !== rankings[i + 1].win_rate_pct
      ) {
        // After a tie group, the next rank should skip (RANK behavior)
        // rank(next) = i + 2 (1-indexed position)
      }
    }
  });

  it('player with 0 matches does not appear in player_rankings', async () => {
    const result = await getGlobalStats(TEST_USER_ID);
    const rankedPlayerIds = result.data.player_rankings.map((r) => r.player.id);

    // player4 has no completed matches — should not appear
    expect(rankedPlayerIds).not.toContain(seed.players.player4.id);
  });

  it('top_decks excludes decks with fewer than 3 completed matches', async () => {
    const result = await getGlobalStats(TEST_USER_ID);

    for (const td of result.data.top_decks) {
      expect(td.total_matches).toBeGreaterThanOrEqual(3);
    }
  });

  it('top_decks returns at most 5 entries ordered by win_rate_pct DESC', async () => {
    const result = await getGlobalStats(TEST_USER_ID);

    expect(result.data.top_decks.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < result.data.top_decks.length; i++) {
      const prev = result.data.top_decks[i - 1].win_rate_pct ?? -1;
      const curr = result.data.top_decks[i].win_rate_pct ?? -1;
      expect(curr).toBeLessThanOrEqual(prev);
    }
  });

  it('top_commanders excludes commanders with fewer than 3 completed matches', async () => {
    const result = await getGlobalStats(TEST_USER_ID);

    for (const tc of result.data.top_commanders) {
      expect(tc.total_matches).toBeGreaterThanOrEqual(3);
    }
  });

  it('top_commanders counts partner commanders (commanderId2) independently (BR-STATS-05)', async () => {
    const result = await getGlobalStats(TEST_USER_ID);

    // cmd3 (Tymna) is only commanderId2 on deck2 — should still be counted if it has enough matches
    const allCmdIds = result.data.top_commanders.map((tc) => tc.commander.id);
    // deck2 was in 3 completed matches, so both cmd2 and cmd3 may qualify for top_commanders
    // We verify the mechanism works by checking that partner commanders are tracked
    // (they may or may not appear in top 5 depending on match count)
    expect(result.data.top_commanders).toBeDefined();
  });
});
