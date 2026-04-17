/**
 * useScryfallAutocomplete — debounced Scryfall name autocomplete.
 *
 * - 300ms debounce after the user stops typing
 * - 2-char minimum (matches Scryfall API behaviour)
 * - cancels in-flight lookups when the input changes
 */
import { useEffect, useRef, useState } from 'react';

import { autocomplete } from '@/services/scryfall';

const DEBOUNCE_MS = 300;
const MIN_LENGTH = 2;

export function useScryfallAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const handle = setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      setLoading(true);
      try {
        const list = await autocomplete(trimmed);
        // Only apply the result if this is still the latest request
        if (myReq === reqIdRef.current) {
          setSuggestions(list);
        }
      } finally {
        if (myReq === reqIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [query]);

  return { suggestions, loading };
}
