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
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import type { HistoryFilters } from '@/hooks/useMatchHistory';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);

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
  const styles = useThemedStyles(createStyles);

  return <Text style={styles.sectionLabel}>{label}</Text>;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MatchHistoryFilterBarProps {
  filters: HistoryFilters;
  onChange: (f: HistoryFilters) => void;
}

export function MatchHistoryFilterBar({ filters, onChange }: MatchHistoryFilterBarProps) {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const RESULT_OPTIONS: Array<{ label: string; value: HistoryFilters['result'] }> = [
    { label: t('history.all'),       value: undefined },
    { label: t('history.win'),       value: 'win' },
    { label: t('history.lose'),      value: 'lose' },
    { label: t('history.draw'),      value: 'draw' },
    { label: t('history.abandoned'), value: 'abandoned' },
  ];

  const WIN_CONDITION_OPTIONS: Array<{ label: string; value: string }> = [
    { label: t('history.any'),                             value: '' },
    { label: t('match.winCondition.combat_short'),         value: 'combat_damage' },
    { label: t('match.winCondition.commander_damage_short'), value: 'commander_damage' },
    { label: t('match.winCondition.infect_short'),         value: 'infect' },
    { label: t('match.winCondition.combo_short'),          value: 'combo' },
    { label: t('match.winCondition.mill_short'),           value: 'mill' },
    { label: t('match.winCondition.concede_short'),        value: 'scoop' },
    { label: t('match.winCondition.other_short'),          value: 'other' },
  ];

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <View style={styles.root}>
      {/* Toggle row */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? t('history.filtersUp') : t('history.filtersDown')}
      >
        <Text style={styles.toggleLabel}>
          {expanded ? t('history.filtersUp') : t('history.filtersDown')}
          {activeCount > 0 && !expanded && (
            <Text style={styles.toggleBadge}>{` (${activeCount})`}</Text>
          )}
        </Text>
        {activeCount > 0 && (
          <Pressable
            onPress={() => onChange({})}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel={t('history.clearFilters')}
          >
            <Text style={styles.clearText}>{t('history.clear')}</Text>
          </Pressable>
        )}
      </Pressable>

      {/* Expanded panel */}
      {expanded && (
        <View style={styles.panel}>
          {/* Result filter */}
          <SectionLabel label={t('history.result')} />
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
              <SectionLabel label={t('history.winCondition')} />
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
          <SectionLabel label={t('history.dateRange')} />
          <View style={styles.dateRow}>
            <TextInput
              style={styles.dateInput}
              placeholder={t('history.dateFrom')}
              placeholderTextColor={theme.colors.text.muted}
              value={filters.date_from ?? ''}
              onChangeText={(v) => onChange({ ...filters, date_from: v || undefined })}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Text style={styles.dateSep}>→</Text>
            <TextInput
              style={styles.dateInput}
              placeholder={t('history.dateTo')}
              placeholderTextColor={theme.colors.text.muted}
              value={filters.date_to ?? ''}
              onChangeText={(v) => onChange({ ...filters, date_to: v || undefined })}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>

          {/* Player / Deck / Commander — stubs for Fase 2 */}
          <Text style={styles.stubNote}>{t('history.filtersStub')}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  root: {
    backgroundColor: t.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
  },

  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  toggleLabel: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  toggleBadge: {
    color: t.colors.accent.primary,
  },
  clearBtn: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  clearText: {
    color: t.colors.status.error,
    fontSize: t.typography.size['body-sm'],
  },

  panel: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[2],
  },

  sectionLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
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
    borderRadius: t.radius.round,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    marginRight: spacing[2],
  },
  chipActive: {
    backgroundColor: t.colors.accent.primary + '33',
    borderColor: t.colors.accent.primary,
  },
  chipText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
  },
  chipTextActive: {
    color: t.colors.accent.primary,
    fontWeight: t.typography.weight.semibold,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dateInput: {
    flex: 1,
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
  },
  dateSep: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
  },

  stubNote: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontStyle: 'italic',
    marginTop: spacing[2],
  },
})
