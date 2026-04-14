/**
 * LifeCounter — CMP-001.
 *
 * Displays the life total as a large number. Tap +/- for quick changes.
 * Long-press +/- for hold-repeat (every 150ms). Tap the number for direct entry.
 *
 * Debounces taps into a single API call (BR-TRACK-09). The display shows
 * the pending local value immediately; `onEvent` fires after the debounce window.
 *
 * Shows a temporary delta badge (e.g. "+3" / "−5") that fades after 2s.
 * Once the badge disappears the change is already stacked in the undo log.
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useDebounce } from '@/hooks/useDebounce';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, radius, spacing, typography, motion } from '@/styles/tokens';
import type { EventType } from '@/services/matchEvents';

const HOLD_REPEAT_MS = 150;
const DEBOUNCE_MS = 200; // Snappy response; EPIC-05 will make this configurable
const DELTA_DISPLAY_MS = 2000; // How long the delta badge stays visible

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
  const { scale, isTablet } = useResponsive();
  // pendingDelta accumulates taps before debounce fires
  const [pendingDelta, setPendingDelta] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Delta badge state: shows accumulated change, fades after DELTA_DISPLAY_MS
  const [displayedDelta, setDisplayedDelta] = useState(0);
  const deltaOpacity = useSharedValue(0);
  const deltaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Track pending delta in a ref so the badge callback always has the latest value
  // without needing pendingDelta in dependency arrays (which causes stale closures).
  const pendingDeltaRef = useRef(0);

  const applyDelta = useCallback((d: number) => {
    setPendingDelta((prev) => {
      const next = prev + d;
      debounceTrigger(next);
      pendingDeltaRef.current = next;
      return next;
    });
    // Show the badge outside the render cycle to avoid writing to
    // Reanimated shared values during React's render phase.
    setTimeout(() => {
      const val = pendingDeltaRef.current;
      if (val === 0) return;
      setDisplayedDelta(val);
      deltaOpacity.value = 1;
      if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
      deltaTimerRef.current = setTimeout(() => {
        deltaOpacity.value = withTiming(0, { duration: motion.duration.normal });
      }, DELTA_DISPLAY_MS);
    }, 0);
  }, [debounceTrigger, deltaOpacity]);

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
  useEffect(() => () => {
    flush();
    if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
  }, [flush]);

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
          // Show badge outside render cycle
          setDisplayedDelta(delta);
          deltaOpacity.value = 1;
          if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
          deltaTimerRef.current = setTimeout(() => {
            deltaOpacity.value = withTiming(0, { duration: motion.duration.normal });
          }, DELTA_DISPLAY_MS);
        }
      },
      'plain-text',
      String(displayValue),
      'number-pad',
    );
  }, [displayValue, lifeTotal, participationId, onEvent, flush, deltaOpacity]);

  const deltaAnimStyle = useAnimatedStyle(() => ({
    opacity: deltaOpacity.value,
  }));

  const btnSize = isTablet ? scale(48) : 48;
  const btnFontSize = isTablet ? scale(typography.size['heading-lg']) : typography.size['heading-lg'];
  const lifeFontSize = isTablet ? scale(typography.size['display-lg']) : typography.size['display-lg'];
  const deltaFontSize = isTablet ? scale(typography.size['body-sm']) : typography.size['body-sm'];

  return (
    <View style={styles.container}>
      {/* − button */}
      <Pressable
        onPress={() => applyDelta(-1)}
        onLongPress={() => startHold(-1)}
        onPressOut={stopHold}
        delayLongPress={400}
        style={[styles.btn, isTablet && { width: btnSize, height: btnSize, maxWidth: btnSize, maxHeight: btnSize }]}
        accessibilityRole="button"
        accessibilityLabel="Decrease life"
      >
        <Text style={[styles.btnText, isTablet && { fontSize: btnFontSize }]}>−</Text>
      </Pressable>

      {/* Life total + delta badge */}
      <View style={styles.lifeTotalWrapper}>
        <Pressable onPress={handleDirectEntry} style={styles.lifeTotalContainer}>
          <Text
            style={[styles.lifeTotal, { color: lifeColor }, isTablet && { fontSize: lifeFontSize }]}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.3}
          >
            {displayValue}
          </Text>
          {/* Always rendered to avoid layout shift — invisible when alive */}
          <Text style={[styles.deadLabel, displayValue > 0 && { opacity: 0 }]}>☠</Text>
        </Pressable>

        {/* Delta badge — floats to the right of the life total */}
        <Animated.View style={[styles.deltaBadge, deltaAnimStyle]} pointerEvents="none">
          <Text
            style={[
              styles.deltaBadgeText,
              { color: displayedDelta > 0 ? colors.lifeTotal.high : colors.lifeTotal.critical },
              isTablet && { fontSize: deltaFontSize },
            ]}
          >
            {displayedDelta > 0 ? `+${displayedDelta}` : displayedDelta}
          </Text>
        </Animated.View>
      </View>

      {/* + button */}
      <Pressable
        onPress={() => applyDelta(1)}
        onLongPress={() => startHold(1)}
        onPressOut={stopHold}
        delayLongPress={400}
        style={[styles.btn, isTablet && { width: btnSize, height: btnSize, maxWidth: btnSize, maxHeight: btnSize }]}
        accessibilityRole="button"
        accessibilityLabel="Increase life"
      >
        <Text style={[styles.btnText, isTablet && { fontSize: btnFontSize }]}>+</Text>
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
    flexShrink: 1,
  },
  btn: {
    width: 48,
    height: 48,
    maxWidth: 60,
    maxHeight: 60,
    aspectRatio: 1,
    borderRadius: radius.round,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    flexShrink: 1,
  },
  btnText: {
    color: colors.text.primary,
    fontSize: typography.size['heading-lg'],
    fontWeight: typography.weight.bold,
  },
  lifeTotalWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  lifeTotalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  lifeTotal: {
    fontSize: typography.size['display-lg'],
    fontFamily: typography.fontFamily.display,
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
  deltaBadge: {
    position: 'absolute',
    right: -8,
    top: 0,
    backgroundColor: colors.background.elevated,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  deltaBadgeText: {
    fontSize: typography.size['body-sm'],
    fontFamily: typography.fontFamily.display,
    fontWeight: typography.weight.bold,
  },
});
