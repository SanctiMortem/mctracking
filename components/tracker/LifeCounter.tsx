/**
 * LifeCounter — CMP-001: Invisible Split HitZone approach.
 *
 * The entire 80% action zone is the input surface. An invisible vertical
 * split divides it down the middle:
 *   LEFT HALF  → tap −1, hold for rapid decrement
 *   RIGHT HALF → tap +1, hold for rapid increment
 *
 * The HP number sits centered and is "Transparent to Hits" — tapping on the
 * number registers +/− based on which side of the center-line is hit.
 *
 * Double-tap anywhere triggers direct entry (set exact HP).
 *
 * Delta badge shows accumulated change since the last server commit, fades
 * after 2s of tap inactivity.
 *
 * IMPORTANT: `lifeTotal` is the single source of truth for the displayed
 * number. This component performs NO local arithmetic on it — the parent
 * (useTracker) updates it synchronously on every tap via `onDelta`. This
 * eliminates the parent/child race that previously caused mid-tap HP flicker.
 *
 * TRACK-004 (EPIC-03)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  type LayoutChangeEvent,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { COUNTER_FOOTER_HEIGHT, MAX_LIFE_FONT_SIZE, useFrameExperiment } from '@/components/match/frameExperiment';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

const HOLD_REPEAT_MS = 150;
// Badge accumulator resets after this many ms of tap inactivity — matches
// the parent's commit debounce so the badge visually corresponds to the
// "burst" that gets logged as a single event.
const BADGE_RESET_MS = 600;
const DELTA_DISPLAY_MS = 2000;

interface LifeCounterProps {
  lifeTotal: number;
  participationId: string;
  /** Called on every tap with +1 or −1. Parent updates lifeTotal synchronously. */
  onDelta: (participationId: string, delta: number) => void;
  /** Called when the user sets HP directly via double-tap prompt. */
  onSetAbsolute?: (participationId: string, nextLifeTotal: number) => void;
  /** The player is dead: the total is shown but taps and holds do nothing. */
  disabled?: boolean;
}

// Big Shoulders Display is a condensed font — narrower character widths.
// Bumped from 0.48 → 0.56 because the earlier estimate was tuned against
// 2-digit HP totals; the accumulated per-char error over 3+ digits pushed
// the rendered text past the container and numberOfLines={1} truncated
// "100" to "1…". 0.56 gives ~15% margin at 3 digits, plenty for 4-digit
// commander shenanigans. The adjustsFontSizeToFit prop on the <Text> is a
// belt-and-suspenders safety net for any layout the estimate still misses.
const CHAR_WIDTH_RATIO = 0.56;
const NEGATIVE_SIGN_RATIO = 0.32;

/** Compute the largest fontSize that fits `text` inside `w × h`. */
function computeFontSize(text: string, w: number, h: number): number {
  if (w <= 0 || h <= 0) return 40;
  const str = String(text);
  const charCount = str.replace('-', '').length;
  const hasNeg = str.startsWith('-');
  const effectiveChars = charCount * CHAR_WIDTH_RATIO + (hasNeg ? NEGATIVE_SIGN_RATIO : 0);
  const byWidth = w / Math.max(effectiveChars, 0.5);
  const byHeight = h * 0.85;
  return Math.floor(Math.min(byWidth, byHeight));
}

export function LifeCounter({ lifeTotal, participationId, onDelta, onSetAbsolute, disabled = false }: LifeCounterProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Delta badge — purely visual. Tracks the accumulated delta since the
  // last idle period of BADGE_RESET_MS. It does NOT drive the HP number.
  const [displayedDelta, setDisplayedDelta] = useState(0);
  const badgeAccumRef = useRef(0);
  const badgeResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deltaOpacity = useSharedValue(0);
  const deltaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Single source of truth for what the user sees.
  const displayValue = lifeTotal;

  // Tap-zone feedback flashes — one per side. Each tap pulses the matching
  // overlay opacity from 0 → peak → 0 so the player gets a visual confirmation
  // of which half their finger landed on.
  const minusFlash = useSharedValue(0);
  const plusFlash = useSharedValue(0);
  const flashSide = useCallback((d: number) => {
    const sv = d < 0 ? minusFlash : plusFlash;
    sv.value = 0.35;
    sv.value = withTiming(0, { duration: 280 });
  }, [minusFlash, plusFlash]);
  const minusFlashStyle = useAnimatedStyle(() => ({ opacity: minusFlash.value }));
  const plusFlashStyle = useAnimatedStyle(() => ({ opacity: plusFlash.value }));

  const lifeColor = (() => {
    if (displayValue <= 0) return theme.colors.lifeTotal.zero;
    if (displayValue <= 4) return theme.colors.lifeTotal.critical;
    if (displayValue <= 9) return theme.colors.lifeTotal.low;
    if (displayValue <= 20) return theme.colors.lifeTotal.medium;
    return theme.colors.lifeTotal.high;
  })();

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize((prev) => {
      if (Math.abs(prev.w - width) < 2 && Math.abs(prev.h - height) < 2) return prev;
      return { w: width, h: height };
    });
  }, []);

  // ── Frame experiment ──
  // One number size for the table: sized for a two-digit total in the space
  // the tightest frame gives its life total, so 7, 40 and 23 match on every
  // seat. Three or more digits fall back to adjustsFontSizeToFit on <Text>.
  const { enabled: expEnabled, lifeBox } = useFrameExperiment();

  const dynamicFontSize = useMemo(() => {
    if (expEnabled && lifeBox) {
      return Math.min(MAX_LIFE_FONT_SIZE, computeFontSize('88', lifeBox.w, lifeBox.h));
    }
    return computeFontSize(String(displayValue), containerSize.w, containerSize.h);
  }, [expEnabled, lifeBox, displayValue, containerSize.w, containerSize.h]);

  // The counter sits above the footer buttons, so a number centred in it
  // looks high in the frame. Nudge it down toward the frame's middle (half
  // the footer) — but never so far that the digits reach the footer.
  const verticalNudge = expEnabled
    ? Math.max(0, Math.min(COUNTER_FOOTER_HEIGHT / 2, (containerSize.h - dynamicFontSize * 0.8) / 2))
    : 0;

  const showDeltaBadge = useCallback((value: number) => {
    setDisplayedDelta(value);
    deltaOpacity.value = 1;
    if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
    deltaTimerRef.current = setTimeout(() => {
      deltaOpacity.value = withTiming(0, { duration: motion.duration.normal });
    }, DELTA_DISPLAY_MS);
  }, [deltaOpacity]);

  const applyDelta = useCallback((d: number) => {
    if (disabled) return;
    // 1. Tell the parent — it updates lifeTotal synchronously.
    onDelta(participationId, d);
    // 2. Flash the side that was tapped.
    flashSide(d);
    // 3. Update the badge accumulator independently.
    badgeAccumRef.current += d;
    showDeltaBadge(badgeAccumRef.current);
    // 4. Schedule accumulator reset after idle window.
    if (badgeResetTimerRef.current) clearTimeout(badgeResetTimerRef.current);
    badgeResetTimerRef.current = setTimeout(() => {
      badgeAccumRef.current = 0;
    }, BADGE_RESET_MS);
  }, [onDelta, participationId, showDeltaBadge, flashSide, disabled]);

  const stopHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const startHold = useCallback((d: number) => {
    holdTimerRef.current = setInterval(() => applyDelta(d), HOLD_REPEAT_MS);
  }, [applyDelta]);

  useEffect(() => () => {
    if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
    if (badgeResetTimerRef.current) clearTimeout(badgeResetTimerRef.current);
  }, []);

  // A hold-to-repeat in progress stops the moment the player dies.
  useEffect(() => {
    if (disabled) stopHold();
  }, [disabled, stopHold]);

  // ── Direct entry via Alert.prompt (double-tap) ──
  const handleDirectEntry = useCallback(() => {
    Alert.prompt(
      'Set Life Total',
      `Current: ${displayValue}`,
      (text) => {
        const parsed = parseInt(text, 10);
        if (isNaN(parsed)) return;
        const delta = parsed - lifeTotal;
        if (delta === 0) return;
        if (onSetAbsolute) {
          onSetAbsolute(participationId, parsed);
        } else {
          onDelta(participationId, delta);
        }
        showDeltaBadge(delta);
      },
      'plain-text',
      String(displayValue),
      'number-pad',
    );
  }, [displayValue, lifeTotal, participationId, onDelta, onSetAbsolute, showDeltaBadge]);

  // ── Gesture handlers ──
  // We use the tap X coordinate to determine left (-1) vs right (+1)
  const containerWidthRef = useRef(0);
  useEffect(() => {
    containerWidthRef.current = containerSize.w;
  }, [containerSize.w]);

  const handleTap = useCallback((x: number) => {
    const mid = containerWidthRef.current / 2;
    applyDelta(x < mid ? -1 : 1);
  }, [applyDelta]);

  const handleLongPress = useCallback((x: number) => {
    const mid = containerWidthRef.current / 2;
    startHold(x < mid ? -1 : 1);
  }, [startHold]);

  const handlePressOut = useCallback(() => {
    stopHold();
  }, [stopHold]);

  // Single tap — left/right split based on X coordinate
  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onEnd((e) => {
      'worklet';
      runOnJS(handleTap)(e.x);
    });

  // Double tap — direct entry
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      runOnJS(handleDirectEntry)();
    });

  // Long press — hold repeat
  const longPressGesture = Gesture.LongPress()
    .enabled(!disabled)
    .minDuration(400)
    .onStart((e) => {
      'worklet';
      runOnJS(handleLongPress)(e.x);
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(handlePressOut)();
    });

  // Long press wins if held, otherwise single tap fires
  // Direct entry (double-tap) disabled for now — only −/+ via split hit zones
  const composed = Gesture.Race(longPressGesture, tapGesture);

  const deltaAnimStyle = useAnimatedStyle(() => ({
    opacity: deltaOpacity.value,
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={styles.container} onLayout={onContainerLayout}>
        {/* Tap-side flash overlays — behind HP, above container background */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flashHalf,
            styles.flashLeft,
            expEnabled && styles.flashHalfFull,
            { backgroundColor: theme.colors.lifeTotal.critical },
            minusFlashStyle,
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flashHalf,
            styles.flashRight,
            expEnabled && styles.flashHalfFull,
            { backgroundColor: theme.colors.lifeTotal.high },
            plusFlashStyle,
          ]}
        />
        {/* HP number — transparent to hits (pointerEvents="none") */}
        <View style={styles.lifeTotalOverlay} pointerEvents="none">
          <Text
            style={[
              styles.lifeTotal,
              {
                color: lifeColor,
                fontSize: dynamicFontSize,
                lineHeight: dynamicFontSize * 1.05,
                transform: [{ translateY: dynamicFontSize * 0.04 + verticalNudge }],
              },
            ]}
            numberOfLines={1}
            // If the manual estimate above is still slightly too big for a
            // given container (edge cases: unusual aspect ratios, 4-digit
            // totals), let the platform shrink the text down instead of
            // clipping to "1…". minimumFontScale caps how much it can
            // shrink so we never render a legible-only-with-glasses "132".
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {displayValue}
          </Text>

        </View>

        {/* Delta badge */}
        <Animated.View
          style={[styles.deltaBadge, expEnabled && styles.deltaBadgeExp, deltaAnimStyle]}
          pointerEvents="none"
        >
          <Text
            style={[
              styles.deltaBadgeText,
              expEnabled && styles.deltaBadgeTextExp,
              { color: displayedDelta > 0 ? theme.colors.lifeTotal.high : theme.colors.lifeTotal.critical },
            ]}
          >
            {displayedDelta > 0 ? `+${displayedDelta}` : displayedDelta}
          </Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const createStyles = (t: AppTheme) => ({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  flashHalf: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    width: '50%' as const,
  },
  flashLeft: { left: 0 },
  flashRight: { right: 0 },
  lifeTotalOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  lifeTotal: {
    fontFamily: t.typography.fontFamily.lifeTotal,
    letterSpacing: -2,
    textAlign: 'center' as const,
    includeFontPadding: false,
    fontVariant: ['tabular-nums'] as const,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  deltaBadge: {
    position: 'absolute' as const,
    right: 8,
    top: '25%' as const,
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  deltaBadgeText: {
    fontSize: t.typography.size['body-lg'],
    fontFamily: t.typography.fontFamily.lifeTotalBold,
  },

  // ── Frame experiment ──
  // The tap flash runs the full height of the frame, down through the
  // counter footer, instead of stopping above Poison / CMD. The footer is a
  // later sibling, so its text still draws on top of the flash.
  flashHalfFull: { bottom: -COUNTER_FOOTER_HEIGHT },
  // Floating "+3 / −2": a little larger and pulled in from the corner.
  deltaBadgeExp: {
    // Translucent, so the life total stays visible behind it.
    backgroundColor: t.colors.background.elevated + 'A6',
    // border.default already carries its own alpha (#rrggbbaa) — appending
    // another alpha pair made an invalid 10-digit colour, so it is used as is.
    right: '11%' as const,
    top: '20%' as const,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  deltaBadgeTextExp: {
    fontSize: Math.round(t.typography.size['body-lg'] * 1.4),
  },
});
