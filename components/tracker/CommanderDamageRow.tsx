/**
 * CommanderDamageRow — one row per enemy commander in CommanderDamagePanel.
 *
 * Tap +/- to add commander damage. Alert at 21 (BR-TRACK-04).
 * Debounced — fires onEvent after DEBOUNCE_MS.
 *
 * TRACK-005 (EPIC-03)
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDebounce } from '@/hooks/useDebounce';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, radius, spacing, typography } from '@/styles/tokens';
import type { EventType } from '@/services/matchEvents';

const DEBOUNCE_MS = 200;
const COMMANDER_DAMAGE_LIMIT = 21;

interface CommanderDamageRowProps {
  commanderName: string;
  commanderId: string;
  currentDamage: number;
  participationId: string;
  onEvent: (input: {
    participationId: string;
    eventType: EventType;
    delta: number;
    commanderIdSource?: string;
  }) => Promise<void>;
}

export function CommanderDamageRow({
  commanderName,
  commanderId,
  currentDamage,
  participationId,
  onEvent,
}: CommanderDamageRowProps) {
  const { scale, isTablet } = useResponsive();
  const [pendingDelta, setPendingDelta] = useState(0);
  const displayDamage = currentDamage + pendingDelta;
  const isAtLimit = displayDamage >= COMMANDER_DAMAGE_LIMIT;

  const { trigger: debounceTrigger, flush } = useDebounce<number>((accumulated) => {
    if (accumulated !== 0) {
      onEvent({
        participationId,
        eventType: 'commander_damage',
        delta: accumulated,
        commanderIdSource: commanderId,
      });
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

  useEffect(() => () => { flush(); }, [flush]);

  const btnSize = isTablet ? scale(28) : 28;
  const fontSize = isTablet ? scale(typography.size['body-lg']) : typography.size['body-lg'];
  const nameSize = isTablet ? scale(typography.size.caption) : typography.size.caption;

  return (
    <View style={[styles.row, isAtLimit && styles.rowAlert, isTablet && { gap: scale(spacing[2]), paddingVertical: scale(spacing[1]) }]}>
      <Text style={[styles.name, isAtLimit && styles.nameAlert, isTablet && { fontSize: nameSize }]} numberOfLines={1}>
        {commanderName}
      </Text>

      <Pressable
        onPress={() => applyDelta(-1)}
        disabled={displayDamage <= 0}
        style={[styles.btn, displayDamage <= 0 && styles.btnDisabled, isTablet && { width: btnSize, height: btnSize }]}
        accessibilityRole="button"
        accessibilityLabel={`Decrease damage from ${commanderName}`}
      >
        <Text style={[styles.btnText, isTablet && { fontSize, lineHeight: fontSize * 1.1 }]}>−</Text>
      </Pressable>

      <Text style={[styles.damage, isAtLimit && styles.damageAlert, isTablet && { fontSize, minWidth: scale(28) }]}>
        {displayDamage}
      </Text>

      {/* Always rendered to avoid layout shift */}
      <Text style={[styles.limitBadge, !isAtLimit && { opacity: 0 }]}>21!</Text>

      <Pressable
        onPress={() => applyDelta(1)}
        style={[styles.btn, isTablet && { width: btnSize, height: btnSize }]}
        accessibilityRole="button"
        accessibilityLabel={`Increase damage from ${commanderName}`}
      >
        <Text style={[styles.btnText, isTablet && { fontSize, lineHeight: fontSize * 1.1 }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: radius.sm,
    backgroundColor: colors.background.surface,
    marginBottom: spacing[1],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowAlert: {
    borderColor: colors.status.error + '88',
    backgroundColor: colors.status.error + '12',
  },
  name: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
  },
  nameAlert: {
    color: colors.status.error,
  },
  btn: {
    width: 28,
    height: 28,
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
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.bold,
    lineHeight: typography.size['body-lg'] * 1.1,
  },
  damage: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.bold,
    minWidth: 28,
    textAlign: 'center',
  },
  damageAlert: {
    color: colors.status.error,
  },
  limitBadge: {
    color: colors.status.error,
    fontSize: typography.size.label,
    fontWeight: typography.weight.bold,
    backgroundColor: colors.status.error + '22',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
});
