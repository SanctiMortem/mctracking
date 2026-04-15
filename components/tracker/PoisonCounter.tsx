/**
 * PoisonCounter — overlay content for poison counters.
 *
 * Renders only the −/count/+ controls and lethal alert.
 * The overlay chrome (backdrop, close button) is handled by PlayerDashboard.
 *
 * Floor: 0 (button disabled at 0, BR-TRACK-05).
 * Alert at 10 counters (visual only, BR-TRACK-05).
 *
 * TRACK-006 (EPIC-03)
 */
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GHPressable } from '@/components/ui/GHPressable';

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
      const next = Math.max(-poisonCounters, prev + d);
      debounceTrigger(next);
      return next;
    });
  }, [poisonCounters, debounceTrigger]);

  useEffect(() => () => { flush(); }, [flush]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Poison Counters</Text>

      <View style={styles.controls}>
        <GHPressable
          onPress={() => applyDelta(-1)}
          disabled={!canDecrement}
          style={[styles.btn, !canDecrement && styles.btnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Remove poison counter"
        >
          <Text style={styles.btnText}>−</Text>
        </GHPressable>

        <Text style={[styles.count, isAtLimit && styles.countAlert]}>
          {displayValue}
        </Text>

        <GHPressable
          onPress={() => applyDelta(1)}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel="Add poison counter"
        >
          <Text style={styles.btnText}>+</Text>
        </GHPressable>
      </View>

      {isAtLimit && <Text style={styles.limitText}>Lethal!</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  btnText: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.semibold,
  },
  count: {
    color: colors.text.primary,
    fontSize: typography.size['heading-lg'],
    fontWeight: typography.weight.bold,
    minWidth: 32,
    textAlign: 'center',
  },
  countAlert: {
    color: colors.accent.green,
  },
  limitText: {
    color: colors.accent.green,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
});
