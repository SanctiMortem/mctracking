/**
 * useMatchSetup — form state + API call for SCR-007 Match Setup.
 *
 * Manages player selection (2-4), deck assignments, duplicate-deck validation,
 * and the POST /api/matches call.
 *
 * MATCH-005 (EPIC-02)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { Match, Participation } from '@/db/index';

/**
 * Available layout variants per player count.
 * Each variant is a string key used by TrackerLayout to decide how to arrange frames.
 *
 * All variants are "center-facing": every slot's default rotation points
 * the player toward the centre of the device.
 */
export const LAYOUT_VARIANTS: Record<number, string[]> = {
  2: ['2p-stack', '2p-side'],
  3: ['3p-top1-bot2', '3p-left1-right2', '3p-top2-bot1'],
  4: ['4p-grid', '4p-pod'],
};

/**
 * Default slot rotations per layout variant — Cardinal Orientation System.
 *
 *   CSS 0°   → player faces North (sits on South edge, reads up)
 *   CSS 180° → player faces South (sits on North edge, reads upside-down)
 *   CSS 90°  → player faces East  (sits on West edge, lands content landscape)
 *   CSS 270° → player faces West  (sits on East edge, lands content landscape)
 *
 * Each slot is pinned to an axis (NS or EW). Manual flip swaps within the
 * axis only (0↔180 for NS, 90↔270 for EW).
 *
 * Index = slot position (matches selectedPlayerIds order).
 */
export const DEFAULT_SLOT_ROTATIONS: Record<string, number[]> = {
  // ── 2 players ──
  // NS axis: top faces South, bottom faces North.
  '2p-stack':        [180, 0],
  // EW axis: left faces East, right faces West.
  '2p-side':         [90, 270],

  // ── 3 players ──
  // Top player on NS axis; bottom pair on EW axis (East-facer on the left,
  // West-facer on the right).
  '3p-top1-bot2':    [180, 90, 270],
  // Landscape split: left column on EW axis (faces East), right column has
  // two W-facers stacked vertically.
  '3p-left1-right2': [90, 270, 270],
  // Top pair on EW axis; bottom player on NS axis.
  '3p-top2-bot1':    [90, 270, 0],

  // ── 4 players ──
  // Quad 2×2 (EW axis throughout): left column faces East, right faces West.
  '4p-grid':         [90, 270, 90, 270],
  // 1-2-1 Commander Pod: top NS-South, mid pair EW (East, West), bottom NS-North.
  '4p-pod':          [180, 90, 270, 0],
};

export type UseMatchSetupReturn = {
  selectedPlayerIds: string[];
  deckAssignments: Record<string, string>; // playerId → deckId
  rotations: Record<string, number>; // playerId → degrees (0, 90, 180, 270)
  layoutVariant: string;
  togglePlayer: (playerId: string) => void;
  setDeck: (playerId: string, deckId: string) => void;
  /** Replace selectedPlayerIds with a new order (same IDs, different positions). */
  reorderPlayers: (orderedIds: string[]) => void;
  /** Set text rotation for a player's frame. */
  setRotation: (playerId: string, degrees: number) => void;
  /** Set the layout variant for the current player count. */
  setLayoutVariant: (variant: string) => void;
  duplicateDeckIds: Set<string>;
  isValid: boolean;
  isSubmitting: boolean;
  apiError: string | null;
  /** Returns the new match ID on success, or null on failure. */
  submit: () => Promise<string | null>;
};

export function useMatchSetup(groupId?: string | null): UseMatchSetupReturn {
  const { getToken } = useAuth();

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [deckAssignments, setDeckAssignments] = useState<Record<string, string>>({});
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const [layoutVariant, setLayoutVariant] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const togglePlayer = useCallback((playerId: string) => {
    setApiError(null);
    setSelectedPlayerIds((prev) => {
      if (prev.includes(playerId)) {
        // Deselect: also clear this player's deck assignment and rotation.
        setDeckAssignments((da) => {
          const next = { ...da };
          delete next[playerId];
          return next;
        });
        setRotations((r) => {
          const next = { ...r };
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

  const reorderPlayers = useCallback((orderedIds: string[]) => {
    setSelectedPlayerIds(orderedIds);
  }, []);

  const setRotation = useCallback((playerId: string, degrees: number) => {
    setRotations((prev) => ({ ...prev, [playerId]: degrees }));
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
      const body: Record<string, unknown> = { participants };
      if (groupId) body.group_id = groupId;
      const res = await apiFetch<{ success: true; data: { match: Match; participations: Participation[] } }>(
        '/api/matches',
        'POST',
        body,
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
  }, [isValid, isSubmitting, getToken, selectedPlayerIds, deckAssignments, groupId]);

  // Auto-select default layout variant when player count changes
  const playerCount = selectedPlayerIds.length;
  const variants = LAYOUT_VARIANTS[playerCount] ?? [];
  const effectiveLayout = layoutVariant && variants.includes(layoutVariant)
    ? layoutVariant
    : variants[0] ?? '';

  // Apply default rotations whenever the effective layout or player list changes.
  // This sets sensible defaults (top=180°, bottom=0°) without overriding manual changes
  // made after the layout was already set — we only apply when layout or player count changes.
  useEffect(() => {
    if (!effectiveLayout || selectedPlayerIds.length < 2) return;
    const defaults = DEFAULT_SLOT_ROTATIONS[effectiveLayout];
    if (!defaults) return;
    const newRotations: Record<string, number> = {};
    selectedPlayerIds.forEach((id, idx) => {
      newRotations[id] = defaults[idx] ?? 0;
    });
    setRotations(newRotations);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveLayout, playerCount]);

  return {
    selectedPlayerIds,
    deckAssignments,
    rotations,
    layoutVariant: effectiveLayout,
    togglePlayer,
    setDeck,
    reorderPlayers,
    setRotation,
    setLayoutVariant,
    duplicateDeckIds,
    isValid,
    isSubmitting,
    apiError,
    submit,
  };
}
