/**
 * CommanderSelector — Modal search picker for selecting a Commander.
 * Reusable in DeckForm (DATA-007) and Match Setup (EPIC-02).
 * DATA-007 (EPIC-01)
 */
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import type { Commander } from '@/db/index';
import { ColorChips } from '@/components/ui/ColorChips';
import { colors, radius, spacing, typography } from '@/styles/tokens';

interface CommanderSelectorProps {
  visible: boolean;
  commanders: Commander[];
  selected: Commander | null;
  onSelect: (commander: Commander) => void;
  onClose: () => void;
  /** Label shown in the modal header — if omitted, falls back to t('deck.selectCommander') */
  title?: string;
  /** Exclude a specific commander ID (e.g. the primary when picking partner) */
  excludeId?: string;
}

export function CommanderSelector({
  visible,
  commanders,
  selected,
  onSelect,
  onClose,
  title,
  excludeId,
}: CommanderSelectorProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return commanders.filter(
      (c) =>
        c.id !== excludeId &&
        (q === '' || c.name.toLowerCase().includes(q)),
    );
  }, [commanders, query, excludeId]);

  function handleSelect(commander: Commander) {
    onSelect(commander);
    setQuery('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title ?? t('deck.selectCommander')}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>

        {/* Search */}
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder={t('commanders.searchPlaceholder')}
          placeholderTextColor={colors.text.muted}
          clearButtonMode="while-editing"
          autoFocus
        />

        {/* No commanders state */}
        {commanders.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('commanders.noCommandersYet')}</Text>
            <Text style={styles.emptySubtitle}>{t('commanders.noCommandersGoTo')}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = selected?.id === item.id;
              return (
                <Pressable
                  style={[styles.row, isSelected && styles.rowSelected]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={styles.rowInfo}>
                    <View style={styles.rowHeader}>
                      <Text style={[styles.name, isSelected && styles.nameSelected]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.isPartner && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{t('commanders.partner')}</Text>
                        </View>
                      )}
                    </View>
                    <ColorChips selected={item.colors ?? []} readonly />
                  </View>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{t('commanders.noResultsFor', { query })}</Text>
              </View>
            }
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.semibold,
  },
  closeBtn: { padding: spacing[2] },
  closeText: {
    color: colors.text.link,
    fontSize: typography.size['body-lg'],
  },
  search: {
    backgroundColor: colors.background.surface,
    color: colors.text.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.size['body-lg'],
    margin: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.background.secondary,
    gap: spacing[3],
  },
  rowSelected: {
    backgroundColor: colors.accent.primary + '1A',
  },
  rowInfo: { flex: 1, gap: spacing[1] },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  name: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
  },
  nameSelected: { color: colors.accent.primary },
  badge: {
    backgroundColor: colors.accent.primary + '33',
    borderRadius: radius.xs,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.accent.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  checkmark: {
    color: colors.accent.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.bold,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing[4],
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[2] },
  emptyTitle: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
  },
});
