/**
 * MatchHistoryFilterBar — collapsible filter bar for SCR-005.
 *
 * Chips: result (all/win/lose/draw/abandoned), win_condition (8 options).
 * Date range: ISO text inputs (date picker in Fase 2).
 * Player/deck/commander filters: placeholder stubs — selectors in Fase 2 (PLAT).
 *
 * HIST-002 (EPIC-04)
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { HistoryFilters } from '@/hooks/useMatchHistory';
import { colors, radius, spacing, typography } from '@/styles/tokens';

// ─── Config ───────────────────────────────────────────────────────────────────

const RESULT_OPTIONS: Array<{ label: string; value: HistoryFilters['result'] }> = [
  { label: 'All',       value: undefined },
  { label: 'Win',       value: 'win' },
  { label: 'Lose',      value: 'lose' },
  { label: 'Draw',      value: 'draw' },
  { label: 'Abandoned', value: 'abandoned' },
];

const WIN_CONDITION_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Any',              value: '' },
  { label: 'Combat',           value: 'combat_damage' },
  { label: 'Cmd Damage',       value: 'commander_damage' },
  { label: 'Infect',           value: 'infect' },
  { label: 'Combo',            value: 'combo' },
  { label: 'Mill',             value: 'mill' },
  { label: 'Concede',          value: 'scoop' },
  { label: 'Other',            value: 'other' },
];

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MatchHistoryFilterBarProps {
  filters: HistoryFilters;
  onChange: (f: HistoryFilters) => void;
}

export function MatchHistoryFilterBar({ filters, onChange }: MatchHistoryFilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <View style={styles.root}>
      {/* Toggle row */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse filters' : 'Expand filters'}
      >
        <Text style={styles.toggleLabel}>
          {expanded ? 'Filters ▲' : 'Filters ▼'}
          {activeCount > 0 && !expanded && (
            <Text style={styles.toggleBadge}>{` (${activeCount})`}</Text>
          )}
        </Text>
        {activeCount > 0 && (
          <Pressable
            onPress={() => onChange({})}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </Pressable>

      {/* Expanded panel */}
      {expanded && (
        <View style={styles.panel}>
          {/* Result filter */}
          <SectionLabel label="Result" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {RESULT_OPTIONS.map((opt) => (
              <Chip
                key={String(opt.value ?? 'all')}
                label={opt.label}
                active={filters.result === opt.value}
                onPress={() => onChange({ ...filters, result: opt.value })}
              />
            ))}
          </ScrollView>

          {/* Win condition filter — only relevant when result is not abandoned */}
          {filters.result !== 'abandoned' && filters.result !== 'lose' && (
            <>
              <SectionLabel label="Win Condition" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {WIN_CONDITION_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value || 'any'}
                    label={opt.label}
                    active={(filters.win_condition ?? '') === opt.value}
                    onPress={() => onChange({ ...filters, win_condition: opt.value || undefined })}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* Date range */}
          <SectionLabel label="Date Range" />
          <View style={styles.dateRow}>
            <TextInput
              style={styles.dateInput}
              placeholder="From (YYYY-MM-DD)"
              placeholderTextColor={colors.text.muted}
              value={filters.date_from ?? ''}
              onChangeText={(t) => onChange({ ...filters, date_from: t || undefined })}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Text style={styles.dateSep}>→</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="To (YYYY-MM-DD)"
              placeholderTextColor={colors.text.muted}
              value={filters.date_to ?? ''}
              onChangeText={(t) => onChange({ ...filters, date_to: t || undefined })}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>

          {/* Player / Deck / Commander — stubs for Fase 2 */}
          <Text style={styles.stubNote}>
            Player / Deck / Commander filters — coming in a future update
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },

  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  toggleLabel: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  toggleBadge: {
    color: colors.accent.primary,
  },
  clearBtn: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  clearText: {
    color: colors.status.error,
    fontSize: typography.size['body-sm'],
  },

  panel: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[2],
  },

  sectionLabel: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing[2],
  },

  chipRow: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginRight: spacing[2],
  },
  chipActive: {
    backgroundColor: colors.accent.primary + '33',
    borderColor: colors.accent.primary,
  },
  chipText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
  },
  chipTextActive: {
    color: colors.accent.primary,
    fontWeight: typography.weight.semibold,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dateInput: {
    flex: 1,
    backgroundColor: colors.background.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    color: colors.text.primary,
    fontSize: typography.size['body-sm'],
  },
  dateSep: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },

  stubNote: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
    fontStyle: 'italic',
    marginTop: spacing[2],
  },
});
