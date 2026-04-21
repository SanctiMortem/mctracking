/**
 * useHome — data hook for SCR-002 Home Screen.
 *
 * Fetches in parallel:
 *   - /api/auth/session       → active_match (in_progress in the active context)
 *   - /api/matches?limit=3    → recent 3 completed matches + total count
 *   - /api/stats/global       → total matches + aggregate win rate badge
 *
 * Context-aware via activeContext from GroupContext.
 * When activeContext is a group_id the active_match is filtered client-side
 * (server group_id scoping reserved for EPIC-05).
 *
 * PLAT-010 (EPIC-05)
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { AccountHomeStats, GlobalAggregates, GlobalStats } from '@/services/stats';
import type { MatchSummary } from '@/services/matches';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveMatch = {
  id: string;
  group_id: string | null;
  started_at: string;
};

type SessionResponse = {
  success: true;
  data: {
    authenticated: boolean;
    user_id?: string;
    active_match?: ActiveMatch | null;
  };
};

type HistoryPage = {
  matches: MatchSummary[];
  total: number;
  has_more: boolean;
};

type HistoryResponse = { success: true; data: HistoryPage };
type GlobalStatsResponse = { success: true; data: GlobalStats };
type AccountHomeStatsResponse = { success: true; data: AccountHomeStats };
type GlobalAggregatesResponse = { success: true; data: GlobalAggregates };

export type UseHomeReturn = {
  activeMatch: ActiveMatch | null;
  recentMatches: MatchSummary[];
  totalMatches: number;
  winRatePct: number | null;
  /** Account-player-scoped stats for the home dashboard card. */
  accountStats: AccountHomeStats | null;
  /** Cross-match aggregates for the Global Stats card. */
  globalAggregates: GlobalAggregates | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

// ─── Win rate helper ──────────────────────────────────────────────────────────

/** Compute aggregate win rate from player_rankings (all tracked players). */
function computeWinRate(stats: GlobalStats): number | null {
  const rankings = stats.player_rankings;
  if (rankings.length === 0) return null;

  const totalParticipations = rankings.reduce((acc, r) => acc + r.total_matches, 0);
  const totalWins = rankings.reduce((acc, r) => acc + r.wins, 0);

  if (totalParticipations === 0) return null;
  return Math.round((totalWins / totalParticipations) * 1000) / 10;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHome(activeContext: 'personal' | string): UseHomeReturn {
  const { getToken } = useAuth();

  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [recentMatches, setRecentMatches] = useState<MatchSummary[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [winRatePct, setWinRatePct] = useState<number | null>(null);
  const [accountStats, setAccountStats] = useState<AccountHomeStats | null>(null);
  const [globalAggregates, setGlobalAggregates] = useState<GlobalAggregates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable refs to avoid re-creating the callback
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const activeContextRef = useRef(activeContext);
  activeContextRef.current = activeContext;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getTokenRef.current();
      const authHeader = token ?? undefined;

      const ctx = activeContextRef.current;
      const historyUrl = ctx !== 'personal'
        ? `/api/matches?limit=3&group_id=${ctx}`
        : '/api/matches?limit=3';

      // Global aggregates are world-wide — same result for every user/context,
      // never scoped by the active group.
      const [sessionRes, historyRes, statsRes, accountRes, aggregateRes] = await Promise.all([
        apiFetch<SessionResponse>('/api/auth/session', 'GET', undefined, authHeader),
        apiFetch<HistoryResponse>(historyUrl, 'GET', undefined, authHeader),
        apiFetch<GlobalStatsResponse>('/api/stats/global', 'GET', undefined, authHeader),
        apiFetch<AccountHomeStatsResponse>('/api/stats/account-home', 'GET', undefined, authHeader),
        apiFetch<GlobalAggregatesResponse>('/api/stats/global-aggregate', 'GET', undefined, authHeader),
      ]);

      // Active match — filter by active context (ADR-004)
      const rawMatch = sessionRes.data.active_match ?? null;
      if (rawMatch) {
        const matchInContext =
          ctx === 'personal'
            ? rawMatch.group_id === null
            : rawMatch.group_id === ctx;
        setActiveMatch(matchInContext ? rawMatch : null);
      } else {
        setActiveMatch(null);
      }

      setRecentMatches(historyRes.data.matches);
      setTotalMatches(historyRes.data.total);
      setWinRatePct(computeWinRate(statsRes.data));
      setAccountStats(accountRes.data);
      setGlobalAggregates(aggregateRes.data);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load home data.');
    } finally {
      setLoading(false);
    }
  }, []); // stable

  useEffect(() => {
    load();
  }, [load, activeContext]);

  return {
    activeMatch,
    recentMatches,
    totalMatches,
    winRatePct,
    accountStats,
    globalAggregates,
    loading,
    error,
    refresh: load,
  };
}
