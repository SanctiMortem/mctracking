/**
 * DeckList — FlatList of decks with commander filter chips and tap-to-detail.
 * DATA-007 (EPIC-01)
 */
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Commander } from '@/db/index';
import type { DeckWithCommanders } from '@/services/decks';
import { ColorChips } from '@/components/ui/ColorChips';
import { colors, radius, spacing, typography } from '@/styles/tokens';

interface DeckListProps {
  decks: DeckWithCommanders[];
  commanders: Commander[];          // For filter chips
  activeFilter: string | null;      // commander id or null = all
  onFilterChange: (id: string | null) => void;
  onTap: (deck: DeckWithCommanders) => void;
  onEdit: (deck: DeckWithCommanders) => void;
  onDelete: (deck: DeckWithCommanders) => void;
}

function FilterChips({
  commanders,
  active,
  onChange,
}: {
  commanders: Commander[];
  active: string | null;
  onChange: (id: string | null) => void;
}) {
  if (commanders.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      <Pressable
        style={[styles.filterChip, active === null && styles.filterChipActive]}
        onPress={() => onChange(null)}
      >
        <Text style={[styles.filterChipText, active === null && styles.filterChipTextActive]}>
          All
        </Text>
      </Pressable>
      {commanders.map((c) => (
        <Pressable
          key={c.id}
          style={[styles.filterChip, active === c.id && styles.filterChipActive]}
          onPress={() => onChange(active === c.id ? null : c.id)}
        >
          <Text style={[styles.filterChipText, active === c.id && styles.filterChipTextActive]} numberOfLines={1}>
            {c.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function DeckRow({
  deck,
  onTap,
  onEdit,
  onDelete,
}: {
  deck: DeckWithCommanders;
  onTap: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  function confirmDelete() {
    Alert.alert(
      'Remove Deck',
      `Remove "${deck.name}"? Match history will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onDelete },
      ],
    );
  }

  const hasPartner = !!deck.commander2;
  const allColors = hasPartner
    ? [...new Set([...(deck.commander.colors ?? []), ...(deck.commander2?.colors ?? [])])]
    : (deck.commander.colors ?? []);

  return (
    <Pressable style={styles.row} onPress={onTap} android_ripple={{ color: colors.border.subtle }}>
      <View style={styles.rowInfo}>
        {/* Deck name */}
        <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>

        {/* Commander(s) */}
        <Text style={styles.commanderName} numberOfLines={1}>
          {deck.commander.name}
          {hasPartner ? ` + ${deck.commander2!.name}` : ''}
        </Text>

        {/* Colors */}
        <ColorChips selected={allColors} readonly />
      </View>

      <View style={styles.rowActions}>
        <Pressable onPress={onEdit} style={styles.actionBtn} accessibilityLabel={`Edit ${deck.name}`}>
          <Text style={styles.actionEdit}>Edit</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} style={styles.actionBtn} accessibilityLabel={`Remove ${deck.name}`}>
          <Text style={styles.actionDelete}>Remove</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>
        {hasFilter ? 'No decks with this commander' : 'No decks yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {hasFilter
          ? 'Try removing the filter to see all decks.'
          : 'Tap the button above to build your first deck.'}
      </Text>
    </View>
  );
}

export function DeckList({
  decks,
  commanders,
  activeFilter,
  onFilterChange,
  onTap,
  onEdit,
  onDelete,
}: DeckListProps) {
  return (
    <View style={styles.container}>
      <FilterChips commanders={commanders} active={activeFilter} onChange={onFilterChange} />
      <FlatList
        data={decks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DeckRow
            deck={item}
            onTap={() => onTap(item)}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyState hasFilter={activeFilter !== null} />}
        contentContainerStyle={decks.length === 0 ? styles.emptyContainer : undefined}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  filterChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.round,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    maxWidth: 160,
  },
  filterChipActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  filterChipText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  filterChipTextActive: { color: colors.text.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.background.secondary,
    gap: spacing[3],
  },
  rowInfo: { flex: 1, gap: spacing[1] },
  deckName: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
  },
  commanderName: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
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
  empty: { alignItems: 'center', gap: spacing[2], padding: spacing[6] },
  emptyContainer: { flex: 1, justifyContent: 'center' },
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
    paddingHorizontal: spacing[4],
  },
});
