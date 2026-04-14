/**
 * PoisonCounter — tracks poison (Infect) counters per player.
 *
 * Floor: 0 (button disabled at 0, BR-TRACK-05).
 * Alert at 10 counters (visual only, no action, BR-TRACK-05).
 * Debounced same as LifeCounter.
 *
 * TRACK-006 (EPIC-03)
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDebounce } from '@/hooks/useDebounce';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, radius, spacing, typography } from '@/styles/tokens';
import type { EventType } from '@/services/matchEvents';

const DEBOUNCE_MS = 200;
const POISON_LIMIT = 10;

interface PoisonCounterProps {
  poisonCounters: number;
  participationId: string;
  onEvent: (input: {
    participationId: string;
    eventType: EventType;
    delta: number;
    commanderIdSource?: string;
  }) => Promise<void>;
}

export function PoisonCounter({ poisonCounters, participationId, onEvent }: PoisonCounterProps) {
  const { scale, isTablet } = useResponsive();
  const [pendingDelta, setPendingDelta] = useState(0);

  const displayValue = Math.max(0, poisonCounters + pendingDelta);
  const isAtLimit = displayValue >= POISON_LIMIT;
  const canDecrement = displayValue > 0;

  const { trigger: debounceTrigger, flush } = useDebounce<number>((accumulated) => {
    if (accumulated !== 0) {
      onEvent({ participationId, eventType: 'poison_change', delta: accumulated });
      setPendingDelta(0);
    }
  }, DEBOUNCE_MS);

  const applyDelta = useCallback((d: number) => {
    setPendingDelta((prev) => {
      // Clamp: can't go below 0
      const next = Math.max(-poisonCounters, prev + d);
      debounceTrigger(next);
      return next;
    });
  }, [poisonCounters, debounceTrigger]);

  useEffect(() => () => { flush(); }, [flush]);

  const btnSize = isTablet ? scale(32) : 32;
  const fontSize = isTablet ? scale(typography.size['heading-md']) : typography.size['heading-md'];
  const iconSize = isTablet ? scale(typography.size['body-sm']) : typography.size['body-sm'];

  return (
    <View style={[styles.container, isAtLimit && styles.containerAlert]}>
      <Text style={[styles.icon, isTablet && { fontSize: iconSize }]}>☠️</Text>

      <Pressable
        onPress={() => applyDelta(-1)}
        disabled={!canDecrement}
        style={[styles.btn, !canDecrement && styles.btnDisabled, isTablet && { width: btnSize, height: btnSize }]}
        accessibilityRole="button"
        accessibilityLabel="Remove poison counter"
      >
        <Text style={[styles.btnText, isTablet && { fontSize, lineHeight: fontSize * 1.1 }]}>−</Text>
      </Pressable>

      <Text style={[styles.count, isAtLimit && styles.countAlert, isTablet && { fontSize, minWidth: scale(28) }]}>
        {displayValue}
      </Text>

      {/* Always rendered to avoid layout shift */}
      <Text style={[styles.limitLabel, !isAtLimit && { opacity: 0 }]}>☠</Text>

      <Pressable
        onPress={() => applyDelta(1)}
        style={[styles.btn, isTablet && { width: btnSize, height: btnSize }]}
        accessibilityRole="button"
        accessibilityLabel="Add poison counter"
      >
        <Text style={[styles.btnText, isTablet && { fontSize, lineHeight: fontSize * 1.1 }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    width: '100%',
    justifyContent: 'center',
    flexShrink: 1,
  },
  containerAlert: {
    borderColor: colors.accent.green + '66',
    backgroundColor: colors.accent.green + '12',
  },
  icon: {
    fontSize: typography.size['body-sm'],
  },
  btn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  btnText: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.bold,
    lineHeight: typography.size['heading-md'] * 1.1,
  },
  count: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.bold,
    minWidth: 28,
    textAlign: 'center',
  },
  countAlert: {
    color: colors.accent.green,
  },
  limitLabel: {
    fontSize: typography.size['body-sm'],
    color: colors.accent.green,
  },
});
