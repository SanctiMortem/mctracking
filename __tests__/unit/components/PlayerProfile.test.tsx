/**
 * Unit tests — SCR-012 Player Profile FULL + DeckStatRow
 * HIST-005 (EPIC-04)
 */

describe('SCR-012 win rate display', () => {
  it.todo('shows large amber win rate number when total_matches > 0');
  it.todo('shows "Sin partidas registradas" (not "0%") when total_matches = 0');
});

describe('DeckStatRow', () => {
  it.todo('shows deck name and win_rate_pct formatted as percentage');
  it.todo('shows Partner badge when commanders.length > 1');
  it.todo('shows "—" when win_rate_pct is null');
  it.todo('calls onPress when tapped');
});
