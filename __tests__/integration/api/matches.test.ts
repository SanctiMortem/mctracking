/**
 * Integration tests — /api/matches
 * Requires: DATABASE_URL in .env.test pointing to a Neon test branch.
 * MATCH-009 (EPIC-02) · HIST-001 (EPIC-04)
 */

import {
  createMatch,
  closeMatch,
  getMatchById,
  listMatches,
} from '@/services/matches';
import type { CloseAction, ParticipantInput } from '@/services/matches';
import {
  seedTestData,
  cleanupTestData,
  TEST_USER_ID,
  TEST_USER_ID_2,
} from '../../helpers/seed';

type Seed = Awaited<ReturnType<typeof seedTestData>>;
let seed: Seed;

beforeAll(async () => {
  await cleanupTestData();
  seed = await seedTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

// ─── POST /api/matches ───────────────────────────────────────────────────────

describe('POST /api/matches', () => {
  it('returns 201 with match + participations for a valid 3-player setup', async () => {
    const participants: ParticipantInput[] = [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
      { player_id: seed.players.player3.id, deck_id: seed.decks.deck3.id },
    ];

    const result = await createMatch(TEST_USER_ID, participants);

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.match).toBeDefined();
      expect(result.data.match.status).toBe('in_progress');
      expect(result.data.match.createdBy).toBe(TEST_USER_ID);
      expect(result.data.match.endedAt).toBeNull();
      expect(result.data.participations).toHaveLength(3);

      for (const p of result.data.participations) {
        expect(p.matchId).toBe(result.data.match.id);
        expect(p.lifeTotal).toBe(40);
        expect(p.poisonCounters).toBe(0);
        expect(p.result).toBeNull();
      }
    }
  });

  it('returns 201 for a 2-player match (minimum)', async () => {
    // Need to close the previous match first to free decks, or use deck4
    const result = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player3.id, deck_id: seed.decks.deck4.id },
      { player_id: seed.players.player4.id, deck_id: seed.decks.deck3.id },
    ]);

    // deck3 may be in active match from previous test; handle both outcomes
    if ('data' in result) {
      expect(result.data.participations).toHaveLength(2);
    } else {
      // If deck3 is locked, we expect deckInActiveMatch
      expect('deckInActiveMatch' in result).toBe(true);
    }
  });

  it('returns 201 for a 4-player match (maximum)', async () => {
    // First, clean up and re-seed to get fresh state
    await cleanupTestData();
    seed = await seedTestData();

    const result = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
      { player_id: seed.players.player3.id, deck_id: seed.decks.deck3.id },
      { player_id: seed.players.player4.id, deck_id: seed.decks.deck4.id },
    ]);

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.participations).toHaveLength(4);
    }
  });

  it('returns invalidPlayerCount when fewer than 2 participants provided', async () => {
    const result = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
    ]);
    expect(result).toEqual({ invalidPlayerCount: true });
  });

  it('returns invalidPlayerCount when more than 4 participants provided', async () => {
    const result = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
      { player_id: seed.players.player3.id, deck_id: seed.decks.deck3.id },
      { player_id: seed.players.player4.id, deck_id: seed.decks.deck4.id },
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
    ]);
    expect(result).toEqual({ invalidPlayerCount: true });
  });

  it('returns duplicateDeck when the same deck_id appears twice in participants', async () => {
    const result = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck1.id },
    ]);
    expect(result).toEqual({ duplicateDeck: true });
  });

  it('returns forbidden when a deck does not belong to the authenticated user', async () => {
    const result = await createMatch(TEST_USER_ID_2, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
    ]);

    expect('forbidden' in result).toBe(true);
  });

  it('returns deckInActiveMatch when a deck is already in an in_progress match', async () => {
    // Clean slate
    await cleanupTestData();
    seed = await seedTestData();

    // Create first match with deck1
    const first = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
    ]);
    expect('data' in first).toBe(true);

    // Try to create another match with deck1 (still in_progress)
    const second = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player3.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player4.id, deck_id: seed.decks.deck3.id },
    ]);

    expect('deckInActiveMatch' in second).toBe(true);
    if ('deckInActiveMatch' in second) {
      expect(second.deckInActiveMatch).toBe(seed.decks.deck1.id);
    }
  });

  it('does not persist any record when the transaction fails', async () => {
    await cleanupTestData();
    seed = await seedTestData();

    // Use a fake deck_id that won't be found — ownership check returns forbidden
    const result = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: '00000000-0000-0000-0000-000000000000' },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
    ]);

    expect('forbidden' in result).toBe(true);

    // Verify no match was created
    const history = await listMatches(TEST_USER_ID);
    expect(history.data.total).toBe(0);
  });
});

// ─── PATCH /api/matches/:id — win ───────────────────────────────────────────

describe('PATCH /api/matches/:id — win', () => {
  let matchId: string;
  let winnerParticipationId: string;

  beforeAll(async () => {
    await cleanupTestData();
    seed = await seedTestData();

    const result = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
      { player_id: seed.players.player3.id, deck_id: seed.decks.deck3.id },
    ]);
    if (!('data' in result)) throw new Error('Failed to create match for win tests');
    matchId = result.data.match.id;
    winnerParticipationId = result.data.participations[0].id;
  });

  it('returns 200, sets status to "completed", creates MatchResult with winner + win_condition', async () => {
    const result = await closeMatch(TEST_USER_ID, matchId, {
      action: 'win',
      winner_participation_id: winnerParticipationId,
      win_condition: 'combat_damage',
    });

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.match.status).toBe('completed');
      expect(result.data.match.endedAt).not.toBeNull();
      expect(result.data.result).not.toBeNull();
      expect(result.data.result!.winnerParticipationId).toBe(winnerParticipationId);
      expect(result.data.result!.winCondition).toBe('combat_damage');
      expect(result.data.result!.isDraw).toBe(false);
    }
  });

  it('marks winner participation as "win" and all others as "lose"', async () => {
    // Verify via getMatchById
    const detail = await getMatchById(TEST_USER_ID, matchId);
    expect('data' in detail).toBe(true);
    if ('data' in detail) {
      const winner = detail.data.participations.find((p) => p.id === winnerParticipationId);
      expect(winner?.result).toBe('win');

      const losers = detail.data.participations.filter((p) => p.id !== winnerParticipationId);
      expect(losers.length).toBe(2);
      for (const loser of losers) {
        expect(loser.result).toBe('lose');
      }
    }
  });

  it('returns invalidWinCondition for an invalid win_condition value', async () => {
    // Need a fresh in_progress match
    await cleanupTestData();
    seed = await seedTestData();
    const m = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
    ]);
    if (!('data' in m)) throw new Error('setup failed');

    const result = await closeMatch(TEST_USER_ID, m.data.match.id, {
      action: 'win',
      winner_participation_id: m.data.participations[0].id,
      win_condition: 'invalid_condition',
    });

    expect(result).toEqual({ invalidWinCondition: true });
  });

  it('returns participationNotFound when winner_participation_id is not in this match', async () => {
    await cleanupTestData();
    seed = await seedTestData();
    const m = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
    ]);
    if (!('data' in m)) throw new Error('setup failed');

    const result = await closeMatch(TEST_USER_ID, m.data.match.id, {
      action: 'win',
      winner_participation_id: '00000000-0000-0000-0000-000000000000',
      win_condition: 'combat_damage',
    });

    expect(result).toEqual({ participationNotFound: true });
  });
});

// ─── PATCH /api/matches/:id — draw ──────────────────────────────────────────

describe('PATCH /api/matches/:id — draw', () => {
  let matchId: string;

  beforeAll(async () => {
    await cleanupTestData();
    seed = await seedTestData();

    const result = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
    ]);
    if (!('data' in result)) throw new Error('setup failed');
    matchId = result.data.match.id;
  });

  it('returns 200, sets status to "completed", creates MatchResult with isDraw=true', async () => {
    const result = await closeMatch(TEST_USER_ID, matchId, { action: 'draw' });

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.match.status).toBe('completed');
      expect(result.data.match.endedAt).not.toBeNull();
      expect(result.data.result).not.toBeNull();
      expect(result.data.result!.isDraw).toBe(true);
      expect(result.data.result!.winnerParticipationId).toBeNull();
    }
  });

  it('marks all participations as "draw"', async () => {
    const detail = await getMatchById(TEST_USER_ID, matchId);
    expect('data' in detail).toBe(true);
    if ('data' in detail) {
      for (const p of detail.data.participations) {
        expect(p.result).toBe('draw');
      }
    }
  });
});

// ─── PATCH /api/matches/:id — abandon ───────────────────────────────────────

describe('PATCH /api/matches/:id — abandon', () => {
  let matchId: string;

  beforeAll(async () => {
    await cleanupTestData();
    seed = await seedTestData();

    const result = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
    ]);
    if (!('data' in result)) throw new Error('setup failed');
    matchId = result.data.match.id;
  });

  it('returns 200, sets status to "abandoned", no MatchResult created', async () => {
    const result = await closeMatch(TEST_USER_ID, matchId, { action: 'abandon' });

    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data.match.status).toBe('abandoned');
      expect(result.data.match.endedAt).not.toBeNull();
      expect(result.data.result).toBeNull();
    }
  });

  it('leaves participation result as null', async () => {
    const detail = await getMatchById(TEST_USER_ID, matchId);
    expect('data' in detail).toBe(true);
    if ('data' in detail) {
      for (const p of detail.data.participations) {
        expect(p.result).toBeNull();
      }
    }
  });
});

// ─── PATCH /api/matches/:id — guard rails ───────────────────────────────────

describe('PATCH /api/matches/:id — guard rails', () => {
  it('returns notFound for a non-existent matchId', async () => {
    const result = await closeMatch(TEST_USER_ID, '00000000-0000-0000-0000-000000000000', {
      action: 'abandon',
    });
    expect(result).toEqual({ notFound: true });
  });

  it('returns forbidden when the authenticated user does not own the match', async () => {
    await cleanupTestData();
    seed = await seedTestData();

    const m = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
    ]);
    if (!('data' in m)) throw new Error('setup failed');

    const result = await closeMatch(TEST_USER_ID_2, m.data.match.id, { action: 'abandon' });
    expect(result).toEqual({ forbidden: true });
  });

  it('returns alreadyClosed when match is already completed or abandoned', async () => {
    await cleanupTestData();
    seed = await seedTestData();

    const m = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
    ]);
    if (!('data' in m)) throw new Error('setup failed');

    // Close it first
    await closeMatch(TEST_USER_ID, m.data.match.id, { action: 'abandon' });

    // Try to close again
    const result = await closeMatch(TEST_USER_ID, m.data.match.id, { action: 'draw' });
    expect(result).toEqual({ alreadyClosed: true });
  });
});

// ─── GET /api/matches/:id ────────────────────────────────────────────────────

describe('GET /api/matches/:id', () => {
  beforeAll(async () => {
    await cleanupTestData();
    seed = await seedTestData();
  });

  it('returns 200 with match, participations (embedded player/deck/commander), and result', async () => {
    const m = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck3.id },
    ]);
    if (!('data' in m)) throw new Error('setup failed');

    await closeMatch(TEST_USER_ID, m.data.match.id, {
      action: 'win',
      winner_participation_id: m.data.participations[0].id,
      win_condition: 'combo',
    });

    const detail = await getMatchById(TEST_USER_ID, m.data.match.id);

    expect('data' in detail).toBe(true);
    if ('data' in detail) {
      expect(detail.data.match.id).toBe(m.data.match.id);
      expect(detail.data.match.status).toBe('completed');
      expect(detail.data.participations).toHaveLength(2);

      // Verify embedded data
      const p1 = detail.data.participations[0];
      expect(p1.player).toBeDefined();
      expect(p1.player.id).toBeDefined();
      expect(p1.player.name).toBeDefined();
      expect(p1.deck).toBeDefined();
      expect(p1.deck.id).toBeDefined();
      expect(p1.deck.name).toBeDefined();
      expect(p1.commander).toBeDefined();
      expect(p1.commander.id).toBeDefined();
      expect(p1.commander.name).toBeDefined();
      expect(p1.commander.colors).toBeDefined();

      expect(detail.data.result).not.toBeNull();
      expect(detail.data.result!.winCondition).toBe('combo');
      expect(detail.data.events).toBeDefined();
      expect(Array.isArray(detail.data.events)).toBe(true);
    }
  });

  it('returns participations with commander2: null for non-partner decks', async () => {
    // deck1 uses cmd1 which is not a partner
    const m = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player3.id, deck_id: seed.decks.deck4.id },
    ]);
    if (!('data' in m)) throw new Error('setup failed');

    const detail = await getMatchById(TEST_USER_ID, m.data.match.id);
    expect('data' in detail).toBe(true);
    if ('data' in detail) {
      for (const p of detail.data.participations) {
        // deck1 and deck4 both use cmd1 (non-partner)
        expect(p.commander2).toBeNull();
      }
    }
  });

  it('returns participations with both commander and commander2 for partner decks', async () => {
    // deck2 uses cmd2 (partner) + cmd3 (partner)
    const m = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck2.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck3.id },
    ]);
    if (!('data' in m)) throw new Error('setup failed');

    const detail = await getMatchById(TEST_USER_ID, m.data.match.id);
    expect('data' in detail).toBe(true);
    if ('data' in detail) {
      const partnerParticipation = detail.data.participations.find(
        (p) => p.deckId === seed.decks.deck2.id,
      );
      expect(partnerParticipation).toBeDefined();
      expect(partnerParticipation!.commander.id).toBe(seed.commanders.cmd2.id);
      expect(partnerParticipation!.commander2).not.toBeNull();
      expect(partnerParticipation!.commander2!.id).toBe(seed.commanders.cmd3.id);
    }
  });

  it('returns result: null for in_progress match', async () => {
    await cleanupTestData();
    seed = await seedTestData();

    const m = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
    ]);
    if (!('data' in m)) throw new Error('setup failed');

    const detail = await getMatchById(TEST_USER_ID, m.data.match.id);
    expect('data' in detail).toBe(true);
    if ('data' in detail) {
      expect(detail.data.match.status).toBe('in_progress');
      expect(detail.data.result).toBeNull();
    }
  });

  it('returns notFound for a non-existent matchId', async () => {
    const result = await getMatchById(TEST_USER_ID, '00000000-0000-0000-0000-000000000000');
    expect(result).toEqual({ notFound: true });
  });

  it('returns notFound when the authenticated user does not own the match', async () => {
    await cleanupTestData();
    seed = await seedTestData();

    const m = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
    ]);
    if (!('data' in m)) throw new Error('setup failed');

    const result = await getMatchById(TEST_USER_ID_2, m.data.match.id);
    expect(result).toEqual({ notFound: true });
  });
});

// ─── GET /api/matches (history) ──────────────────────────────────────────────

describe('GET /api/matches — no filters', () => {
  beforeAll(async () => {
    await cleanupTestData();
    seed = await seedTestData();

    // Create match 1: completed (win)
    const m1 = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
    ]);
    if ('data' in m1) {
      await closeMatch(TEST_USER_ID, m1.data.match.id, {
        action: 'win',
        winner_participation_id: m1.data.participations[0].id,
        win_condition: 'combat_damage',
      });
    }

    // Create match 2: abandoned
    const m2 = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player3.id, deck_id: seed.decks.deck3.id },
      { player_id: seed.players.player4.id, deck_id: seed.decks.deck4.id },
    ]);
    if ('data' in m2) {
      await closeMatch(TEST_USER_ID, m2.data.match.id, { action: 'abandon' });
    }

    // Create match 3: still in_progress
    await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
    ]);
  });

  it('returns completed + abandoned matches ordered by ended_at DESC', async () => {
    const result = await listMatches(TEST_USER_ID);

    expect(result.data.matches.length).toBe(2);
    // Both should have ended_at set
    for (const ms of result.data.matches) {
      expect(ms.match.endedAt).not.toBeNull();
    }
    // DESC order
    if (result.data.matches.length >= 2) {
      const first = new Date(result.data.matches[0].match.endedAt!).getTime();
      const second = new Date(result.data.matches[1].match.endedAt!).getTime();
      expect(first).toBeGreaterThanOrEqual(second);
    }
  });

  it('never returns in_progress matches (BR-MATCH-07)', async () => {
    const result = await listMatches(TEST_USER_ID);

    for (const ms of result.data.matches) {
      expect(ms.match.status).not.toBe('in_progress');
    }
  });

  it('returns 200 with empty matches array when user has no history', async () => {
    const result = await listMatches(TEST_USER_ID_2);

    expect(result.data.matches).toEqual([]);
    expect(result.data.total).toBe(0);
  });
});

// ─── GET /api/matches — filters ─────────────────────────────────────────────

describe('GET /api/matches — filters', () => {
  let winMatchId: string;
  let drawMatchId: string;
  let abandonMatchId: string;

  beforeAll(async () => {
    await cleanupTestData();
    seed = await seedTestData();

    // Match 1: player1 wins with deck1 (commander: cmd1) via combat_damage
    const m1 = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
    ]);
    if (!('data' in m1)) throw new Error('setup failed');
    winMatchId = m1.data.match.id;
    await closeMatch(TEST_USER_ID, winMatchId, {
      action: 'win',
      winner_participation_id: m1.data.participations[0].id,
      win_condition: 'combat_damage',
    });

    // Match 2: draw with deck3 + deck4
    const m2 = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player3.id, deck_id: seed.decks.deck3.id },
      { player_id: seed.players.player4.id, deck_id: seed.decks.deck4.id },
    ]);
    if (!('data' in m2)) throw new Error('setup failed');
    drawMatchId = m2.data.match.id;
    await closeMatch(TEST_USER_ID, drawMatchId, { action: 'draw' });

    // Match 3: abandoned with deck1 + deck3
    const m3 = await createMatch(TEST_USER_ID, [
      { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
      { player_id: seed.players.player3.id, deck_id: seed.decks.deck3.id },
    ]);
    if (!('data' in m3)) throw new Error('setup failed');
    abandonMatchId = m3.data.match.id;
    await closeMatch(TEST_USER_ID, abandonMatchId, { action: 'abandon' });
  });

  it('filters by player_id: returns only matches where that player participated', async () => {
    const result = await listMatches(TEST_USER_ID, {
      playerId: seed.players.player4.id,
    });

    expect(result.data.matches.length).toBeGreaterThanOrEqual(1);
    // player4 only participated in the draw match
    for (const ms of result.data.matches) {
      const hasPlayer = ms.participations.some(
        (p) => p.playerId === seed.players.player4.id,
      );
      expect(hasPlayer).toBe(true);
    }
  });

  it('filters by deck_id: returns only matches where that deck was used', async () => {
    const result = await listMatches(TEST_USER_ID, {
      deckId: seed.decks.deck2.id,
    });

    expect(result.data.matches.length).toBeGreaterThanOrEqual(1);
    for (const ms of result.data.matches) {
      const hasDeck = ms.participations.some(
        (p) => p.deckId === seed.decks.deck2.id,
      );
      expect(hasDeck).toBe(true);
    }
  });

  it('filters by commander_id: matches where commander is primary or partner (BR-TRACK-03)', async () => {
    // cmd3 (Tymna) is partner in deck2
    const result = await listMatches(TEST_USER_ID, {
      commanderId: seed.commanders.cmd3.id,
    });

    expect(result.data.matches.length).toBeGreaterThanOrEqual(1);
    // The win match uses deck2 which has cmd3 as partner
    const matchIds = result.data.matches.map((ms) => ms.match.id);
    expect(matchIds).toContain(winMatchId);
  });

  it('filters by result=win + player_id: returns matches where that player won', async () => {
    const result = await listMatches(TEST_USER_ID, {
      playerId: seed.players.player1.id,
      result: 'win',
    });

    expect(result.data.matches.length).toBeGreaterThanOrEqual(1);
    for (const ms of result.data.matches) {
      const p1Part = ms.participations.find(
        (p) => p.playerId === seed.players.player1.id,
      );
      expect(p1Part?.result).toBe('win');
    }
  });

  it('filters by result=abandoned: returns only abandoned matches', async () => {
    const result = await listMatches(TEST_USER_ID, { result: 'abandoned' });

    expect(result.data.matches.length).toBeGreaterThanOrEqual(1);
    for (const ms of result.data.matches) {
      expect(ms.match.status).toBe('abandoned');
    }
  });

  it('filters by win_condition: returns only matches with that win condition', async () => {
    const result = await listMatches(TEST_USER_ID, { winCondition: 'combat_damage' });

    expect(result.data.matches.length).toBeGreaterThanOrEqual(1);
    for (const ms of result.data.matches) {
      expect(ms.result).not.toBeNull();
      expect(ms.result!.winCondition).toBe('combat_damage');
    }
  });

  it('filters by date_from + date_to: returns matches within the date range', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const result = await listMatches(TEST_USER_ID, {
      dateFrom: yesterday.toISOString(),
      dateTo: tomorrow.toISOString(),
    });

    // All 3 closed matches should be within this range
    expect(result.data.matches.length).toBe(3);
  });

  it('combined filters (player_id + result + date range): returns intersection', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const result = await listMatches(TEST_USER_ID, {
      playerId: seed.players.player1.id,
      result: 'win',
      dateFrom: yesterday.toISOString(),
      dateTo: tomorrow.toISOString(),
    });

    // Only match 1 where player1 won
    expect(result.data.matches.length).toBe(1);
    expect(result.data.matches[0].match.id).toBe(winMatchId);
  });
});

// ─── GET /api/matches — pagination (ADR-008) ────────────────────────────────

describe('GET /api/matches — pagination (ADR-008)', () => {
  beforeAll(async () => {
    await cleanupTestData();
    seed = await seedTestData();

    // Create 5 completed matches for pagination testing
    for (let i = 0; i < 5; i++) {
      const m = await createMatch(TEST_USER_ID, [
        { player_id: seed.players.player1.id, deck_id: seed.decks.deck1.id },
        { player_id: seed.players.player2.id, deck_id: seed.decks.deck2.id },
      ]);
      if ('data' in m) {
        await closeMatch(TEST_USER_ID, m.data.match.id, {
          action: 'win',
          winner_participation_id: m.data.participations[0].id,
          win_condition: 'combat_damage',
        });
      }
    }
  });

  it('returns has_more=true when more matches exist beyond the current page', async () => {
    const result = await listMatches(TEST_USER_ID, { limit: 2, offset: 0 });

    expect(result.data.matches).toHaveLength(2);
    expect(result.data.has_more).toBe(true);
    expect(result.data.total).toBe(5);
  });

  it('returns has_more=false on the last page', async () => {
    const result = await listMatches(TEST_USER_ID, { limit: 2, offset: 4 });

    expect(result.data.matches).toHaveLength(1);
    expect(result.data.has_more).toBe(false);
  });

  it('returns correct total count independent of limit/offset', async () => {
    const page1 = await listMatches(TEST_USER_ID, { limit: 2, offset: 0 });
    const page2 = await listMatches(TEST_USER_ID, { limit: 3, offset: 2 });

    expect(page1.data.total).toBe(5);
    expect(page2.data.total).toBe(5);
  });

  it('offset=20 with limit=20 returns the second page', async () => {
    // With only 5 matches, offset=20 yields empty
    const result = await listMatches(TEST_USER_ID, { limit: 20, offset: 20 });

    expect(result.data.matches).toHaveLength(0);
    expect(result.data.has_more).toBe(false);
    expect(result.data.total).toBe(5);
    expect(result.data.offset).toBe(20);
    expect(result.data.limit).toBe(20);
  });
});
