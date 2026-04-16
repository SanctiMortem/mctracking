/**
 * ColorChips — MTG WUBRG color selector / display.
 * Interactive: multi-select chips (44pt touch target).
 * Read-only: compact color dots.
 *
 * Reusable across Commanders, Decks.
 * DATA-005 (EPIC-01)
 */
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { MtgColor } from '@/types/index';
import { spacing } from '@/styles/tokens';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

const COLOR_DEFS: { code: MtgColor; label: string; bg: string; fg: string; stroke?: string }[] = [
  { code: 'W', label: 'W', bg: '#f5f0d0', fg: '#1c1102' },
  { code: 'U', label: 'U', bg: '#3a7bd5', fg: '#ffffff' },
  { code: 'B', label: 'B', bg: '#000000', fg: '#ffffff', stroke: 'rgba(255,255,255,0.25)' },
  { code: 'R', label: 'R', bg: '#d4380d', fg: '#ffffff' },
  { code: 'G', label: 'G', bg: '#2d7d2d', fg: '#ffffff' },
  { code: 'C', label: 'C', bg: '#9ca3af', fg: '#1c1102' },
];

interface ColorChipsProps {
  selected: string[];
  onChange?: (next: string[]) => void;
  readonly?: boolean;
}

export function ColorChips({ selected, onChange, readonly = false }: ColorChipsProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  function toggle(code: string) {
    if (readonly || !onChange) return;
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code],
    );
  }

  if (readonly) {
    return (
      <View style={styles.rowCompact}>
        {COLOR_DEFS.filter((c) => selected.includes(c.code)).map((c) => (
          <View key={c.code} style={[styles.dot, { backgroundColor: c.bg, borderWidth: c.stroke ? 1 : 0, borderColor: c.stroke ?? 'transparent' }]}>
            <Text style={[styles.dotLabel, { color: c.fg }]}>{c.label}</Text>
          </View>
        ))}
        {selected.length === 0 && (
          <Text style={styles.emptyLabel}>—</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {COLOR_DEFS.map((c) => {
        const active = selected.includes(c.code);
        return (
          <TouchableOpacity
            key={c.code}
            onPress={() => toggle(c.code)}
            style={[
              styles.chip,
              { backgroundColor: active ? c.bg : theme.colors.background.surface },
              active && styles.chipActive,
              active && c.stroke ? { borderWidth: 1, borderColor: c.stroke } : undefined,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`Color ${c.code}`}
          >
            <Text style={[styles.chipLabel, { color: active ? c.fg : theme.colors.text.secondary }]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const CHIP_SIZE = 44;
const DOT_SIZE = 20;

const createStyles = (t: AppTheme) => ({
  row: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  chip: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: t.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  chipActive: {
    borderColor: 'transparent',
  },
  chipLabel: {
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.bold,
  },
  rowCompact: {
    flexDirection: 'row',
    gap: spacing[1],
    alignItems: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: t.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotLabel: {
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.bold,
  },
  emptyLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
  },
})
