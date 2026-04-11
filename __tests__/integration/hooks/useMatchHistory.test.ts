/**
 * Integration tests — useMatchHistory hook (EPIC-04)
 *
 * Tests offset pagination and filter behavior.
 * Requires: a mounted React Native component with a real API server running.
 *
 * HIST-002, HIST-012 (EPIC-04)
 */

describe.skip('useMatchHistory — pagination', () => {
  it.todo('initial load fetches page 1 (offset=0)');
  it.todo('loadMore increments offset by page size and appends to list');
  it.todo('hasMore=false when total results fit in one page');
  it.todo('hasMore=true when total exceeds one page');
  it.todo('refresh resets offset to 0 and replaces list');
});

describe.skip('useMatchHistory — filters', () => {
  it.todo('setting result=win sends result=win query param');
  it.todo('setting player_id sends player_id query param');
  it.todo('changing a filter resets offset to 0 (new query from beginning)');
  it.todo('clearing all filters returns unfiltered list');
});
