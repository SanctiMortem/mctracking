/**
 * CommanderDamageRow — one row per enemy commander in CommanderDamagePanel.
 *
 * Tap +/- to add commander damage. Alert at 21 (BR-TRACK-04).
 * Fires onDelta on every tap; parent batches the server commit.
 *
 * TRACK-005 (EPIC-03)
 */
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { GHPressable } from '@/components/ui/GHPressable';

import { useResponsive } from '@/hooks/useResponsive';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

const COMMANDER_DAMAGE_LIMIT = 21;

interface CommanderDamageRowProps {
  commanderName: string;
  commanderId: string;
  currentDamage: number;
  participationId: string;
  /** Called on every tap with +1 or −1. Parent updates damage + life synchronously. */
  onDelta: (participationId: string, commanderId: string, delta: number) => void;
}

export function CommanderDamageRow({
  commanderName,
  commanderId,
  currentDamage,
  participationId,
  onDelta,
}: CommanderDamageRowProps) {
  const { scale, isTablet } = useResponsive();
  const styles = useThemedStyles(createStyles);
  const { theme: t } = useTheme();
  // Single source of truth — no local arithmetic on displayed damage.
  const displayDamage = currentDamage;
  const isAtLimit = displayDamage >= COMMANDER_DAMAGE_LIMIT;

  const applyDelta = useCallback((d: number) => {
    onDelta(participationId, commanderId, d);
  }, [onDelta, participationId, commanderId]);

  const btnSize = isTablet ? scale(28) : 28;
  const fontSize = isTablet ? scale(t.typography.size['body-lg']) : t.typography.size['body-lg'];
  const nameSize = isTablet ? scale(t.typography.size.caption) : t.typography.size.caption;

  return (
    <View style={[styles.row, isAtLimit && styles.rowAlert, isTablet && { gap: scale(spacing[2]), paddingVertical: scale(spacing[1]) }]}>
      <Text
        style={[styles.name, isAtLimit && styles.nameAlert, isTablet && { fontSize: nameSize }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {commanderName}
      </Text>

      <View style={styles.controls}>
        <GHPressable
          onPress={() => applyDelta(-1)}
          disabled={displayDamage <= 0}
          style={[styles.btn, displayDamage <= 0 && styles.btnDisabled, isTablet && { width: btnSize, height: btnSize }]}
          accessibilityRole="button"
          accessibilityLabel={`Decrease damage from ${commanderName}`}
        >
          <Text style={[styles.btnText, isTablet && { fontSize, lineHeight: fontSize * 1.1 }]}>−</Text>
        </GHPressable>

        <View style={styles.damageWrap}>
          <Text style={[styles.damage, isAtLimit && styles.damageAlert, isTablet && { fontSize, minWidth: scale(28) }]}>
            {displayDamage}
          </Text>
          {isAtLimit && <Text style={styles.limitBadge}>21!</Text>}
        </View>

        <GHPressable
          onPress={() => applyDelta(1)}
          style={[styles.btn, isTablet && { width: btnSize, height: btnSize }]}
          accessibilityRole="button"
          accessibilityLabel={`Increase damage from ${commanderName}`}
        >
          <Text style={[styles.btnText, isTablet && { fontSize, lineHeight: fontSize * 1.1 }]}>+</Text>
        </GHPressable>
      </View>
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  row: {
    alignItems: 'center' as const,
    gap: 0,
    paddingVertical: 1,
    marginBottom: 2,
  },
  rowAlert: {
    // Just tint the text, no background box
  },
  name: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: t.typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
  },
  nameAlert: {
    color: t.colors.status.error,
  },
  controls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-evenly' as const,
    width: '100%' as const,
  },
  btn: {
    width: 32,
    height: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnDisabled: {
    opacity: 0.3,
  },
  btnText: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
  },
  damageWrap: {
    alignItems: 'center' as const,
    minWidth: 20,
  },
  damage: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.lifeTotalBold,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.bold,
    minWidth: 20,
    textAlign: 'center' as const,
  },
  damageAlert: {
    color: t.colors.status.error,
  },
  limitBadge: {
    color: t.colors.status.error,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size.label - 2,
    fontWeight: t.typography.weight.semibold,
    marginTop: 0,
  },
});
