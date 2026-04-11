/**
 * WinConditionPicker — CMP-009.
 * Grid of win condition chips for SCR-009 Close Match.
 * 7 options (scoop/concede merged into one visible chip).
 *
 * MATCH-006 (EPIC-02)
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/styles/tokens';

const AMBER = '#F39C12';

const WIN_CONDITIONS = [
  { value: 'combat_damage',    label: 'Combat' },
  { value: 'commander_damage', label: 'Cmd Damage' },
  { value: 'infect',           label: 'Poison' },
  { value: 'combo',            label: 'Combo' },
  { value: 'mill',             label: 'Mill' },
  { value: 'scoop',            label: 'Concede' }, // scoop/concede shown as one (edge case note in issue)
  { value: 'other',            label: 'Other' },
] as const;

interface WinConditionPickerProps {
  selected: string | null;
  onSelect: (value: string) => void;
}

export function WinConditionPicker({ selected, onSelect }: WinConditionPickerProps) {
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
