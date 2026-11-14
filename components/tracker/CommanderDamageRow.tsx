/**
 * CommanderDamageRow — one row per enemy commander in CommanderDamagePanel.
 *
 * The counter is the damage of the hit being entered (starts at 0); the
 * running total is shown beside the name as "total / 21". Alert when the
 * total plus this hit reaches 21 (BR-TRACK-04). The panel owns the hit
 * state and applies it when the overlay closes.
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
  /** Running total already applied from this commander. */
  totalDamage: number;
  /** Damage entered for the hit in progress (not applied yet). */
  hit: number;
  /** Called on every tap with +1 or −1 to adjust the hit in progress. */
  onAdjust: (commanderId: string, delta: number) => void;
}

export function CommanderDamageRow({
  commanderName,
  commanderId,
  totalDamage,
  hit,
  onAdjust,
}: CommanderDamageRowProps) {
  const { scale, isTablet } = useResponsive();
  const styles = useThemedStyles(createStyles);
  const { theme: t } = useTheme();
  const displayDamage = hit;
  // Lethal once this hit lands, not only after it has been saved.
  const isAtLimit = totalDamage + hit >= COMMANDER_DAMAGE_LIMIT;

  const applyDelta = useCallback((d: number) => {
    onAdjust(commanderId, d);
  }, [onAdjust, commanderId]);

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
        <Text style={[styles.total, isAtLimit && styles.nameAlert]}>
          {`  ${totalDamage} / ${COMMANDER_DAMAGE_LIMIT}`}
        </Text>
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
            {displayDamage > 0 ? `+${displayDamage}` : '0'}
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
  total: {
    color: t.colors.text.muted,
    fontVariant: ['tabular-nums' as const],
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
