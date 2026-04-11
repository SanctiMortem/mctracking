/**
 * Unit tests — stats components (EPIC-04 History & Stats)
 *
 * Covers:
 *   PlayerRankingRow — rank badge rendering, tied-rank display (BR-STATS-07)
 *   MatchupCard      — all display states
 *   EntitySelector   — search filtering
 *
 * HIST-011, HIST-012 (EPIC-04)
 */

// ─── PlayerRankingRow ─────────────────────────────────────────────────────────

describe.skip('PlayerRankingRow', () => {
  it.todo('renders rank badge with #1 in amber color for rank=1');
  it.todo('renders rank badge with muted color for rank > 1');
  it.todo('displays player name and initials avatar');
  it.todo('shows win rate percentage when win_rate_pct is non-null');
  it.todo('shows — when win_rate_pct is null');
  it.todo('shows match count with "p" suffix');
  it.todo('renders tied rank correctly — two rank=1 players both show #1 (BR-STATS-07)');
  it.todo('player ranked #3 after a tie at #1 shows #3 (not #2 — RANK not DENSE_RANK)');
});

// ─── MatchupCard ──────────────────────────────────────────────────────────────

describe.skip('MatchupCard', () => {
  it.todo('shows initial state prompt when entityAName or entityBName is null');
  it.todo('shows loading spinner when loading=true');
  it.todo('shows "Sin partidas en común" when total_matches=0');
  it.todo('shows entity names and win counts when data is populated');
  it.todo('shows draws badge only when draws > 0');
  it.todo('renders win-rate bar proportional to wins A vs wins B');
  it.todo('does not render bar when both entity wins are 0 (all draws)');
});

// ─── EntitySelector ───────────────────────────────────────────────────────────

describe.skip('EntitySelector', () => {
  it.todo('renders all entities when search query is empty');
  it.todo('filters entities by search query (case-insensitive)');
  it.todo('shows checkmark on selected entity');
  it.todo('highlights selected entity row with accent background');
  it.todo('calls onSelect with entity id when row is pressed');
  it.todo('shows placeholder text when no entities match search');
});

// ─── useMatchupStats hook ─────────────────────────────────────────────────────

describe.skip('useMatchupStats', () => {
  it.todo('does not fetch when entityAId is null');
  it.todo('does not fetch when entityBId is null');
  it.todo('does not fetch when entityAId equals entityBId');
  it.todo('fetches and returns data when both IDs are provided and different');
  it.todo('re-fetches when scope changes from all to 1v1');
  it.todo('re-fetches when entityAId changes');
  it.todo('clears data when a selector is reset to null');
});
