/**
 * useMatchSetup — form state + API call for SCR-007 Match Setup.
 *
 * Manages player selection (2-4), deck assignments, duplicate-deck validation,
 * and the POST /api/matches call.
 *
 * MATCH-005 (EPIC-02)
 */
import { useCallback, useMemo, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { Match, Participation } from '@/db/index';

export type UseMatchSetupReturn = {
  selectedPlayerIds: string[];
  deckAssignments: Record<string, string>; // playerId → deckId
  togglePlayer: (playerId: string) => void;
  setDeck: (playerId: string, deckId: string) => void;
  duplicateDeckIds: Set<string>;
  isValid: boolean;
  isSubmitting: boolean;
  apiError: string | null;
  /** Returns the new match ID on success, or null on failure. */
  submit: () => Promise<string | null>;
};

export function useMatchSetup(): UseMatchSetupReturn {
  const { getToken } = useAuth();

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [deckAssignments, setDeckAssignments] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const togglePlayer = useCallback((playerId: string) => {
    setApiError(null);
    setSelectedPlayerIds((prev) => {
      if (prev.includes(playerId)) {
        // Deselect: also clear this player's deck assignment.
        setDeckAssignments((da) => {
          const next = { ...da };
          delete next[playerId];
          return next;
        });
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length >= 4) return prev; // BR-MATCH-01: max 4
      return [...prev, playerId];
    });
  }, []);

  const setDeck = useCallback((playerId: string, deckId: string) => {
    setDeckAssignments((prev) => ({ ...prev, [playerId]: deckId }));
    setApiError(null);
  }, []);

  // Set of deckIds that appear more than once across assignments (BR-MATCH-02).
  const duplicateDeckIds = useMemo<Set<string>>(() => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const deckId of Object.values(deckAssignments)) {
      if (seen.has(deckId)) dupes.add(deckId);
      seen.add(deckId);
    }
    return dupes;
  }, [deckAssignments]);

  const isValid = useMemo(() => {
    if (selectedPlayerIds.length < 2) return false;                                  // BR-MATCH-01
    if (selectedPlayerIds.some((id) => !deckAssignments[id])) return false;          // all slots filled
    if (duplicateDeckIds.size > 0) return false;                                     // BR-MATCH-02
    return true;
  }, [selectedPlayerIds, deckAssignments, duplicateDeckIds]);

  const submit = useCallback(async (): Promise<string | null> => {
    if (!isValid || isSubmitting) return null;
    setIsSubmitting(true);
    setApiError(null);
    try {
      const token = await getToken();
      const participants = selectedPlayerIds.map((playerId) => ({
        player_id: playerId,
        deck_id: deckAssignments[playerId],
      }));
      const res = await apiFetch<{ success: true; data: { match: Match; participations: Participation[] } }>(
        '/api/matches',
        'POST',
        { participants },
        token ?? undefined,
      );
      return res.data.match.id;
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'DECK_IN_ACTIVE_MATCH') {
        setApiError('One of the selected decks is already in an active match.');
      } else if (err.code === 'DECK_DUPLICATE') {
        setApiError('Each deck can only be used once per match.');
      } else {
        setApiError(err.message ?? 'Failed to create match. Please try again.');
      }
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, getToken, selectedPlayerIds, deckAssignments]);

  return {
    selectedPlayerIds,
    deckAssignments,
    togglePlayer,
    setDeck,
    duplicateDeckIds,
    isValid,
    isSubmitting,
    apiError,
    submit,
  };
}
