/**
 * CommanderList — Searchable FlatList of commanders with edit/delete actions.
 * DATA-005 (EPIC-01)
 */
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Commander } from '@/db/index';
import { ColorChips } from '@/components/ui/ColorChips';
import { colors, radius, spacing, typography } from '@/styles/tokens';

interface CommanderListProps {
  commanders: Commander[];
  onEdit: (commander: Commander) => void;
  onDelete: (commander: Commander) => void;
}

function CommanderRow({
  commander,
  onEdit,
  onDelete,
}: {
  commander: Commander;
  onEdit: () => void;
  onDelete: () => void;
}) {
  function confirmDelete() {
    Alert.alert(
      'Delete Commander',
      `Remove "${commander.name}"? Decks using this commander will keep it in their history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <View style={styles.rowHeader}>
          <Text style={styles.name} numberOfLines={1}>{commander.name}</Text>
          {commander.isPartner && (
            <View style={styles.partnerBadge}>
              <Text style={styles.partnerText}>Partner</Text>
            </View>
          )}
        </View>
        <ColorChips selected={commander.colors ?? []} readonly />
      </View>
      <View style={styles.rowActions}>
        <Pressable onPress={onEdit} style={styles.actionBtn} accessibilityLabel="Edit commander">
          <Text style={styles.actionEdit}>Edit</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} style={styles.actionBtn} accessibilityLabel="Delete commander">
          <Text style={styles.actionDelete}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No commanders yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the button above to add your first commander.
      </Text>
    </View>
  );
}

export function CommanderList({ commanders, onEdit, onDelete }: CommanderListProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commanders;
    return commanders.filter((c) => c.name.toLowerCase().includes(q));
  }, [commanders, query]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search commanders…"
        placeholderTextColor={colors.text.muted}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CommanderRow
            commander={item}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: {
    backgroundColor: colors.background.surface,
    color: colors.text.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.size['body-lg'],
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.background.secondary,
  },
  rowInfo: { flex: 1, gap: spacing[1] },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  name: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  partnerBadge: {
    backgroundColor: colors.accent.primary + '33',
    borderRadius: radius.xs,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  partnerText: {
    color: colors.accent.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  rowActions: { flexDirection: 'row', gap: spacing[3] },
  actionBtn: { padding: spacing[2] },
  actionEdit: {
    color: colors.text.link,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  actionDelete: {
    color: colors.status.error,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing[4],
  },
  empty: { alignItems: 'center', gap: spacing[2] },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyTitle: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
  },
  emptySubtitle: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
    paddingHorizontal: spacing[8],
  },
});
