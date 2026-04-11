/**
 * useDebounce — generic debounce hook for tracker components.
 *
 * Schedules `callback` to fire `delayMs` after the last call to `trigger`.
 * Returns a `trigger` function that accumulates calls and a `cancel` to clear.
 *
 * Used by LifeCounter, PoisonCounter, CommanderDamageRow to batch rapid taps
 * into a single API call (BR-TRACK-09, BR-TRACK-10).
 *
 * TRACK-004 (EPIC-03)
 */
import { useCallback, useEffect, useRef } from 'react';

/**
 * @param callback   Called with the accumulated value after the debounce expires.
 * @param delayMs    Debounce window in milliseconds (default 500ms, BR-TRACK-10).
 */
export function useDebounce<T>(
  callback: (value: T) => void,
  delayMs: number = 500,
): {
  /** Restart the debounce timer with a new value. */
  trigger: (value: T) => void;
  /** Immediately flush the pending value (e.g. on component unmount). */
  flush: () => void;
  /** Cancel without firing. */
  cancel: () => void;
} {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<T | undefined>(undefined);
  const callbackRef = useRef(callback);

  // Keep callback ref current so callers don't need stable references
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingValueRef.current = undefined;
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingValueRef.current !== undefined) {
      callbackRef.current(pendingValueRef.current);
      pendingValueRef.current = undefined;
    }
  }, []);

  const trigger = useCallback((value: T) => {
    pendingValueRef.current = value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (pendingValueRef.current !== undefined) {
        callbackRef.current(pendingValueRef.current);
        pendingValueRef.current = undefined;
      }
    }, delayMs);
  }, [delayMs]);

  // Flush on unmount to avoid losing the last delta
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        if (pendingValueRef.current !== undefined) {
          callbackRef.current(pendingValueRef.current);
          pendingValueRef.current = undefined;
        }
      }
    };
  }, []);

  return { trigger, flush, cancel };
}
