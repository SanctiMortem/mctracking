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
import { Text, View } from 'react-native';
import { GHPressable } from '@/components/ui/GHPressable';

import { useDebounce } from '@/hooks/useDebounce';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';
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
  const styles = useThemedStyles(createStyles);
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

const createStyles = (t: AppTheme) => ({
  container: {
    alignItems: 'center' as const,
    gap: spacing[2],
  },
  title: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  controls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[4],
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnDisabled: {
    opacity: 0.3,
  },
  btnText: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.semibold,
  },
  count: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-lg'],
    fontWeight: t.typography.weight.bold,
    minWidth: 32,
    textAlign: 'center' as const,
  },
  countAlert: {
    color: t.colors.accent.green,
  },
  limitText: {
    color: t.colors.accent.green,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
  },
});
