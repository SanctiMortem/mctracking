/**
 * WinConditionPicker — CMP-009.
 * Grid of win condition chips for SCR-009 Close Match.
 * 7 options (scoop/concede merged into one visible chip).
 *
 * MATCH-006 (EPIC-02)
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { colors, radius, spacing, typography } from '@/styles/tokens';

const AMBER = '#F39C12';

interface WinConditionPickerProps {
  selected: string | null;
  onSelect: (value: string) => void;
}

export function WinConditionPicker({ selected, onSelect }: WinConditionPickerProps) {
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

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border?.default ?? '#2A2A45',
    minWidth: 88,
    alignItems: 'center',
    // Ensure minimum 44pt touch target height
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: AMBER,
    backgroundColor: AMBER + '1A',
  },
  label: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  labelActive: {
    color: AMBER,
    fontWeight: typography.weight.semibold,
  },
});
