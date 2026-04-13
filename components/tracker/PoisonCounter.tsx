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

  return (
    <View style={[styles.container, isAtLimit && styles.containerAlert]}>
      <Text style={styles.icon}>☠️</Text>

      <Pressable
        onPress={() => applyDelta(-1)}
        disabled={!canDecrement}
        style={[styles.btn, !canDecrement && styles.btnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Remove poison counter"
      >
        <Text style={styles.btnText}>−</Text>
      </Pressable>

      <Text style={[styles.count, isAtLimit && styles.countAlert]}>
        {displayValue}
      </Text>

      {isAtLimit && (
        <Text style={styles.limitLabel}>☠</Text>
      )}

      <Pressable
        onPress={() => applyDelta(1)}
        style={styles.btn}
        accessibilityRole="button"
        accessibilityLabel="Add poison counter"
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
    gap: spacing[2],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    width: '100%',
    justifyContent: 'center',
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
    borderRadius: radius.round,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
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
