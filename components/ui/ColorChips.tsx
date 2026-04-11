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
import { colors as tokens, radius, spacing, typography } from '@/styles/tokens';

const COLOR_DEFS: { code: MtgColor; label: string; bg: string; fg: string }[] = [
  { code: 'W', label: 'W', bg: '#D8D4C8', fg: '#0D0D0F' },
  { code: 'U', label: 'U', bg: '#0E68AB', fg: '#F0F0F5' },
  { code: 'B', label: 'B', bg: '#3A2A1E', fg: '#F0F0F5' },
  { code: 'R', label: 'R', bg: '#D3202A', fg: '#F0F0F5' },
  { code: 'G', label: 'G', bg: '#00733E', fg: '#F0F0F5' },
  { code: 'C', label: 'C', bg: '#BEB9B2', fg: '#0D0D0F' },
];

interface ColorChipsProps {
  selected: string[];
  onChange?: (next: string[]) => void;
  readonly?: boolean;
}

export function ColorChips({ selected, onChange, readonly = false }: ColorChipsProps) {
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
          <View key={c.code} style={[styles.dot, { backgroundColor: c.bg }]}>
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
              { backgroundColor: active ? c.bg : tokens.background.surface },
              active && styles.chipActive,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`Color ${c.code}`}
          >
            <Text style={[styles.chipLabel, { color: active ? c.fg : tokens.text.secondary }]}>
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  chip: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.border.default,
  },
  chipActive: {
    borderColor: 'transparent',
  },
  chipLabel: {
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.bold,
  },
  rowCompact: {
    flexDirection: 'row',
    gap: spacing[1],
    alignItems: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotLabel: {
    fontSize: typography.size.label,
    fontWeight: typography.weight.bold,
  },
  emptyLabel: {
    color: tokens.text.muted,
    fontSize: typography.size['body-sm'],
  },
});
