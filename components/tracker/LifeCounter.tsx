/**
 * LifeCounter — CMP-001.
 *
 * Displays the life total as a large number. Tap +/- for quick changes.
 * Long-press +/- for hold-repeat (every 150ms). Tap the number for direct entry.
 *
 * Debounces taps into a single API call (BR-TRACK-09). The display shows
 * the pending local value immediately; `onEvent` fires after the debounce window.
 *
 * TRACK-008 decision: uses `adjustsFontSizeToFit` for iPhone SE 4p compat.
 *
 * TRACK-004 (EPIC-03)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useDebounce } from '@/hooks/useDebounce';
import { colors, radius, spacing, typography } from '@/styles/tokens';
import type { EventType } from '@/services/matchEvents';

const HOLD_REPEAT_MS = 150;
const DEBOUNCE_MS = 500; // Default; EPIC-05 will make this configurable

interface LifeCounterProps {
  lifeTotal: number;
  participationId: string;
  onEvent: (input: {
    participationId: string;
    eventType: EventType;
    delta: number;
    commanderIdSource?: string;
  }) => Promise<void>;
}

export function LifeCounter({ lifeTotal, participationId, onEvent }: LifeCounterProps) {
  // pendingDelta accumulates taps before debounce fires
  const [pendingDelta, setPendingDelta] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Display: server value + pending (local feedback)
  const displayValue = lifeTotal + pendingDelta;

  const lifeColor = (() => {
    if (displayValue <= 0) return colors.lifeTotal.zero;
    if (displayValue <= 4) return colors.lifeTotal.critical;
    if (displayValue <= 9) return colors.lifeTotal.low;
    if (displayValue <= 20) return colors.lifeTotal.medium;
    return colors.lifeTotal.high;
  })();

  // After debounce: flush accumulated delta to API
  const { trigger: debounceTrigger, flush } = useDebounce<number>((accumulatedDelta) => {
    if (accumulatedDelta !== 0) {
      onEvent({ participationId, eventType: 'life_change', delta: accumulatedDelta });
      setPendingDelta(0);
    }
  }, DEBOUNCE_MS);

  const applyDelta = useCallback((d: number) => {
    setPendingDelta((prev) => {
      const next = prev + d;
      debounceTrigger(next);
      return next;
    });
  }, [debounceTrigger]);

  const stopHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const startHold = useCallback((d: number) => {
    holdTimerRef.current = setInterval(() => applyDelta(d), HOLD_REPEAT_MS);
  }, [applyDelta]);

  // Flush on unmount
  useEffect(() => () => { flush(); }, [flush]);

  // Direct entry via Alert (simple MVP approach — no modal)
  const handleDirectEntry = useCallback(() => {
    // Flush any pending delta first
    flush();
    Alert.prompt(
      'Set Life Total',
      `Current: ${displayValue}`,
      (text) => {
        const parsed = parseInt(text, 10);
        if (isNaN(parsed)) return;
        const delta = parsed - lifeTotal;
        if (delta !== 0) {
          onEvent({ participationId, eventType: 'life_change', delta });
        }
      },
      'plain-text',
      String(displayValue),
      'number-pad',
    );
  }, [displayValue, lifeTotal, participationId, onEvent, flush]);

  return (
    <View style={styles.container}>
      {/* − button */}
      <Pressable
        onPress={() => applyDelta(-1)}
        onLongPress={() => startHold(-1)}
        onPressOut={stopHold}
        delayLongPress={400}
        style={styles.btn}
        accessibilityRole="button"
        accessibilityLabel="Decrease life"
      >
        <Text style={styles.btnText}>−</Text>
      </Pressable>

      {/* Life total */}
      <Pressable onPress={handleDirectEntry} style={styles.lifeTotalContainer}>
        <Text
          style={[styles.lifeTotal, { color: lifeColor }]}
          adjustsFontSizeToFit
          numberOfLines={1}
          minimumFontScale={0.5}
        >
          {displayValue}
        </Text>
        {displayValue <= 0 && (
          <Text style={styles.deadLabel}>☠</Text>
        )}
      </Pressable>

      {/* + button */}
      <Pressable
        onPress={() => applyDelta(1)}
        onLongPress={() => startHold(1)}
        onPressOut={stopHold}
        delayLongPress={400}
        style={styles.btn}
        accessibilityRole="button"
        accessibilityLabel="Increase life"
      >
        <Text style={styles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    width: '100%',
  },
  btn: {
    width: 60,
    height: 60,
    borderRadius: radius.round,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  btnText: {
    color: colors.text.primary,
    fontSize: typography.size['heading-xl'],
    fontWeight: typography.weight.bold,
    lineHeight: typography.size['heading-xl'] * 1.1,
  },
  lifeTotalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    maxWidth: 140,
  },
  lifeTotal: {
    fontSize: typography.size['display-lg'],
    fontWeight: typography.weight.black,
    letterSpacing: typography.letterSpacing.tight,
    textAlign: 'center',
    width: '100%',
  },
  deadLabel: {
    fontSize: typography.size['body-sm'],
    color: colors.lifeTotal.zero,
    marginTop: -spacing[1],
  },
});
