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

import { colors, radius, spacing, typography } from '@/styles/tokens';

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
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? entities.filter((e) => e.label.toLowerCase().includes(query.toLowerCase()))
    : entities;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder={searchPlaceholder}
        placeholderTextColor={colors.text.muted}
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
  },

  search: {
    backgroundColor: colors.background.elevated,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    color: colors.text.primary,
    fontSize: typography.size['body-sm'],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },

  list: {
    maxHeight: 200,
  },

  empty: {
    padding: spacing[4],
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  optionSelected: {
    backgroundColor: colors.accent.primary + '22',
  },
  optionLabel: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.size['body-sm'],
  },
  optionLabelSelected: {
    color: colors.accent.primary,
    fontWeight: typography.weight.semibold,
  },
  checkmark: {
    color: colors.accent.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.bold,
    marginLeft: spacing[2],
  },
});
