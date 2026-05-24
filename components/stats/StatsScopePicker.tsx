/**
 * StatsScopePicker — horizontal chip strip for choosing the active stats
 * scope ("All my matches" + one chip per pod). Reused by the Stats
 * dashboard and the per-entity ALL screens.
 */
import { ScrollView, TouchableOpacity, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '@/contexts/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

export type StatsScopeOption = {
  id: string | null;
  label: string;
};

interface StatsScopePickerProps {
  options: StatsScopeOption[];
  value: string | null;
  onChange: (id: string | null) => void;
}

export function StatsScopePicker({ options, value, onChange }: StatsScopePickerProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (options.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {options.map((opt) => {
        const selected = opt.id === value;
        return (
          <TouchableOpacity
            key={opt.id ?? 'personal'}
            style={[styles.chip, selected && styles.chipActive]}
            onPress={() => onChange(opt.id)}
            activeOpacity={0.8}
          >
            {selected && (
              <Feather name="eye" size={12} color={theme.colors.accent.primary} style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.chipText, selected && styles.chipTextActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (t: AppTheme) => ({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[1],
    paddingBottom: spacing[3],
    gap: spacing[2],
    alignItems: 'center' as const,
  },
  chip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing[3] + 2,
    paddingVertical: 8,
    borderRadius: t.radius.round,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    backgroundColor: t.colors.background.surface,
  },
  chipActive: {
    backgroundColor: t.colors.accent.primary + '22',
    borderColor: t.colors.accent.primary + '99',
  },
  chipText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.semibold,
  },
  chipTextActive: {
    color: t.colors.accent.primary,
  },
});
