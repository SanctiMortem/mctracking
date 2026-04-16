/**
 * EntitySelector — searchable inline list for selecting one entity.
 *
 * Shows a search input + scrollable list. Selected item is highlighted.
 * Used in SCR-015 (Matchup Stats) to pick entity A and entity B.
 *
 * HIST-011 (EPIC-04)
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

export interface EntityOption {
  id: string;
  label: string;
}

interface EntitySelectorProps {
  entities: EntityOption[];
  selected: string | null;
  onSelect: (id: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
}

export function EntitySelector({
  entities,
  selected,
  onSelect,
  placeholder,
  searchPlaceholder = 'Buscar…',
}: EntitySelectorProps) {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? entities.filter((e) => e.label.toLowerCase().includes(query.toLowerCase()))
    : entities;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder={searchPlaceholder}
        placeholderTextColor={theme.colors.text.muted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{placeholder}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {filtered.map((entity) => {
            const isSelected = entity.id === selected;
            return (
              <TouchableOpacity
                key={entity.id}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => onSelect(entity.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]} numberOfLines={1}>
                  {entity.label}
                </Text>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  container: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    overflow: 'hidden',
  },

  search: {
    backgroundColor: t.colors.background.elevated,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
  },

  list: {
    maxHeight: 200,
  },

  empty: {
    padding: spacing[4],
    alignItems: 'center',
  },
  emptyText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center',
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
  },
  optionSelected: {
    backgroundColor: t.colors.accent.primary + '22',
  },
  optionLabel: {
    flex: 1,
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
  },
  optionLabelSelected: {
    color: t.colors.accent.primary,
    fontWeight: t.typography.weight.semibold,
  },
  checkmark: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.bold,
    marginLeft: spacing[2],
  },
})
