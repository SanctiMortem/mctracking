/**
 * useDecklist — loads and edits a deck's optional card list and Moxfield link.
 *
 * GET/POST/DELETE /api/decks/:id/decklist, PATCH /api/decks/:id (moxfield_url).
 *
 * DECK-005, DECK-006 (EPIC-07)
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { Decklist } from '@/services/decklists';

type ListResponse = { success: true; data: Decklist };

export type UseDecklistReturn = {
  data: Decklist | null;
  loading: boolean;
  /** True while an import or removal is in flight. */
  saving: boolean;
  /** Import pasted text, replacing the current list. Throws with a readable message. */
  importText: (text: string) => Promise<void>;
  remove: () => Promise<void>;
  /** Save or clear (empty string) the Moxfield link. Resolves to the stored value. */
  saveMoxfieldUrl: (url: string) => Promise<string | null>;
};

export function useDecklist(deckId: string): UseDecklistReturn {
  const { getToken } = useAuth();
  // Clerk's getToken identity is unstable — hold it in a ref, never in deps.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [data, setData] = useState<Decklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getTokenRef.current();
        const res = await apiFetch<ListResponse>(
          `/api/decks/${deckId}/decklist`,
          'GET',
          undefined,
          token ?? undefined,
        );
        if (!cancelled) setData(res.data);
      } catch {
        // A missing list is not worth an error state on the deck screen — the
        // section just stays hidden (also covers an API that predates it).
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [deckId]);

  const importText = useCallback(async (text: string) => {
    setSaving(true);
    try {
      const token = await getTokenRef.current();
      const res = await apiFetch<ListResponse>(
        `/api/decks/${deckId}/decklist`,
        'POST',
        { text },
        token ?? undefined,
      );
      setData(res.data);
    } finally {
      setSaving(false);
    }
  }, [deckId]);

  const remove = useCallback(async () => {
    setSaving(true);
    try {
      const token = await getTokenRef.current();
      await apiFetch(`/api/decks/${deckId}/decklist`, 'DELETE', undefined, token ?? undefined);
      setData((prev) =>
        prev
          ? { ...prev, cards: [], total_cards: 0, unresolved_count: 0, off_identity_count: 0 }
          : prev,
      );
    } finally {
      setSaving(false);
    }
  }, [deckId]);

  const saveMoxfieldUrl = useCallback(async (url: string) => {
    const token = await getTokenRef.current();
    const updated = await apiFetch<{ moxfieldUrl: string | null }>(
      `/api/decks/${deckId}`,
      'PATCH',
      { moxfield_url: url.trim() === '' ? null : url.trim() },
      token ?? undefined,
    );
    return updated.moxfieldUrl ?? null;
  }, [deckId]);

  return { data, loading, saving, importText, remove, saveMoxfieldUrl };
}
