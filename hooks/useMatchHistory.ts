/**
 * useMatchHistory — paginated match history with filters and infinite scroll.
 *
 * - Connects to GET /matches (HIST-001)
 * - Offset pagination (ADR-008): appends on loadMore, resets on filter change
 * - Pull-to-refresh resets offset and re-fetches
 *
 * HIST-002 (EPIC-04)
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { MatchSummary } from '@/services/matches';

const PAGE_SIZE = 20;

export type HistoryFilters = {
  player_id?: string;
  deck_id?: string;
  commander_id?: string;
  result?: 'win' | 'lose' | 'draw' | 'abandoned';
  win_condition?: string;
  date_from?: string;
  date_to?: string;
};

type HistoryPage = {
  matches: MatchSummary[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

type ApiResponse = { success: true; data: HistoryPage };

export type UseMatchHistoryReturn = {
  matches: MatchSummary[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  filters: HistoryFilters;
  setFilters: (f: HistoryFilters) => void;
  refresh: () => void;
  loadMore: () => void;
};

function buildQs(filters: HistoryFilters, limit: number, offset: number, groupId?: string | null): string {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (groupId)              params.set('group_id', groupId);
  if (filters.player_id)    params.set('player_id', filters.player_id);
  if (filters.deck_id)      params.set('deck_id', filters.deck_id);
  if (filters.commander_id) params.set('commander_id', filters.commander_id);
  if (filters.result)       params.set('result', filters.result);
  if (filters.win_condition) params.set('win_condition', filters.win_condition);
  if (filters.date_from)    params.set('date_from', filters.date_from);
  if (filters.date_to)      params.set('date_to', filters.date_to);
  return `?${params.toString()}`;
}

export function useMatchHistory(groupId?: string | null): UseMatchHistoryReturn {
  const { getToken } = useAuth();

  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<HistoryFilters>({});

  // Track current offset without causing re-renders
  const offsetRef = useRef(0);
  // Prevent concurrent loadMore calls
  const loadingMoreRef = useRef(false);

  // Stable ref for getToken to avoid re-creating callbacks
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const groupIdRef = useRef(groupId);
  groupIdRef.current = groupId;

  const fetchPage = useCallback(async (
    currentFilters: HistoryFilters,
    offset: number,
    append: boolean,
  ) => {
    try {
      const token = await getTokenRef.current();
      const qs = buildQs(currentFilters, PAGE_SIZE, offset, groupIdRef.current);
      const res = await apiFetch<ApiResponse>(`/api/matches${qs}`, 'GET', undefined, token ?? undefined);
      const page = res.data;

      setMatches((prev) => append ? [...prev, ...page.matches] : page.matches);
      setTotal(page.total);
      setHasMore(page.has_more);
      offsetRef.current = offset + page.matches.length;
      setError(null);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load history.');
    }
  }, []); // stable — no deps, uses refs

  // Initial load + filter/context change
  useEffect(() => {
    offsetRef.current = 0;
    setLoading(true);
    setMatches([]);
    fetchPage(filters, 0, false).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, groupId]);

  const refresh = useCallback(() => {
    offsetRef.current = 0;
    setLoading(true);
    setMatches([]);
    fetchPage(filtersRef.current, 0, false).finally(() => setLoading(false));
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    fetchPage(filtersRef.current, offsetRef.current, true).finally(() => {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    });
  }, [hasMore, fetchPage]);

  const setFilters = useCallback((f: HistoryFilters) => {
    setFiltersState(f);
  }, []);

  return { matches, total, hasMore, loading, loadingMore, error, filters, setFilters, refresh, loadMore };
}
