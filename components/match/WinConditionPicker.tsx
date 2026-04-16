/**
 * WinConditionPicker — CMP-009.
 * Grid of win condition chips for SCR-009 Close Match.
 * 7 options (scoop/concede merged into one visible chip).
 *
 * MATCH-006 (EPIC-02)
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

interface WinConditionPickerProps {
  selected: string | null;
  onSelect: (value: string) => void;
}

export function WinConditionPicker({ selected, onSelect }: WinConditionPickerProps) {
  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();

  const WIN_CONDITIONS = [
    { value: 'combat_damage',    label: t('match.winCondition.combat_short') },
    { value: 'commander_damage', label: t('match.winCondition.commander_damage_short') },
    { value: 'infect',           label: t('match.winCondition.infect_short') },
    { value: 'combo',            label: t('match.winCondition.combo_short') },
    { value: 'mill',             label: t('match.winCondition.mill_short') },
    { value: 'scoop',            label: t('match.winCondition.concede_short') }, // scoop/concede shown as one
    { value: 'other',            label: t('match.winCondition.other_short') },
  ];

  return (
    <View style={styles.grid}>
      {WIN_CONDITIONS.map((cond) => {
        const isActive = selected === cond.value;
        return (
          <Pressable
            key={cond.value}
            onPress={() => onSelect(cond.value)}
            style={[styles.chip, isActive && styles.chipActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={cond.label}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{cond.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: t.radius.md,
    backgroundColor: t.colors.background.surface,
    borderWidth: 1,
    borderColor: t.colors.border?.default ?? '#2A2A45',
    minWidth: 88,
    alignItems: 'center',
    // Ensure minimum 44pt touch target height
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: t.colors.accent.primary,
    backgroundColor: t.colors.accent.primary + '1A',
  },
  label: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  labelActive: {
    color: t.colors.accent.primary,
    fontWeight: t.typography.weight.semibold,
  },
})
