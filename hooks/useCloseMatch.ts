/**
 * useCloseMatch — loads participations + manages close-match form state + PATCH API call.
 *
 * State machine: 'win' | 'draw' | 'abandon'
 *  - win:     requires selectedWinnerId + selectedWinCondition
 *  - draw:    no extra fields (BR-MATCH-08)
 *  - abandon: no extra fields (BR-MATCH-06)
 *
 * MATCH-006 (EPIC-02)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { Match, MatchResult } from '@/db/index';
import type { ParticipationDetail } from '@/services/matches';

export type CloseMode = 'win' | 'draw' | 'abandon';

export type UseCloseMatchReturn = {
  participations: ParticipationDetail[];
  loadingMatch: boolean;
  mode: CloseMode;
  setMode: (mode: CloseMode) => void;
  selectedWinnerId: string | null;
  setSelectedWinnerId: (id: string | null) => void;
  selectedWinCondition: string | null;
  setSelectedWinCondition: (cond: string | null) => void;
  isValid: boolean;
  isSubmitting: boolean;
  error: string | null;
  /** Returns true on success, false on error. */
  submit: () => Promise<boolean>;
  /** Edit an existing result (15-min window). Returns true on success. */
  submitEdit: () => Promise<boolean>;
};

export function useCloseMatch(matchId: string): UseCloseMatchReturn {
  const { getToken } = useAuth();

  const [participations, setParticipations] = useState<ParticipationDetail[]>([]);
  const [loadingMatch, setLoadingMatch] = useState(true);
  const [mode, setModeState] = useState<CloseMode>('win');
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [selectedWinCondition, setSelectedWinCondition] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Switching mode resets win-specific fields.
  const setMode = useCallback((next: CloseMode) => {
    setModeState(next);
    if (next !== 'win') {
      setSelectedWinnerId(null);
      setSelectedWinCondition(null);
    }
    setError(null);
  }, []);

  // Fetch participations on mount so the winner list is populated.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const res = await apiFetch<{
          success: true;
          data: {
            match: Match;
            participations: ParticipationDetail[];
            result: MatchResult | null;
          };
        }>(`/api/matches/${matchId}`, 'GET', undefined, token ?? undefined);
        if (!cancelled) setParticipations(res.data.participations);
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load match.');
      } finally {
        if (!cancelled) setLoadingMatch(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [matchId, getToken]);

  const isValid = useMemo(() => {
    if (mode === 'win') return selectedWinnerId !== null && selectedWinCondition !== null;
    return true; // draw/abandon always valid
  }, [mode, selectedWinnerId, selectedWinCondition]);

  const submit = useCallback(async (): Promise<boolean> => {
    if (!isValid || isSubmitting) return false;
    setIsSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      const body =
        mode === 'win'
          ? {
              action: 'win',
              winner_participation_id: selectedWinnerId,
              win_condition: selectedWinCondition,
            }
          : { action: mode };
      await apiFetch(`/api/matches/${matchId}`, 'PATCH', body, token ?? undefined);
      return true;
    } catch (e) {
      setError((e as Error).message ?? 'Failed to close match. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, mode, selectedWinnerId, selectedWinCondition, matchId, getToken]);

  const submitEdit = useCallback(async (): Promise<boolean> => {
    if (!isValid || isSubmitting) return false;
    setIsSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      const body =
        mode === 'win'
          ? {
              action: 'update_result',
              winner_participation_id: selectedWinnerId,
              win_condition: selectedWinCondition,
            }
          : { action: 'update_result_draw' };
      await apiFetch(`/api/matches/${matchId}`, 'PATCH', body, token ?? undefined);
      return true;
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'EDIT_WINDOW_EXPIRED') {
        setError('The 15-minute edit window has expired.');
      } else {
        setError(err.message ?? 'Failed to update result. Please try again.');
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, mode, selectedWinnerId, selectedWinCondition, matchId, getToken]);

  return {
    participations,
    loadingMatch,
    mode,
    setMode,
    selectedWinnerId,
    setSelectedWinnerId,
    selectedWinCondition,
    setSelectedWinCondition,
    isValid,
    isSubmitting,
    error,
    submit,
    submitEdit,
  };
}
