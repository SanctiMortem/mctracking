/**
 * DeckList — Simple FlatList of decks with commander + color identity display.
 * DATA-007 (EPIC-01)
 */
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import type { DeckWithCommanders } from '@/services/decks';
import { ColorChips } from '@/components/ui/ColorChips';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, radius, spacing, typography } from '@/styles/tokens';

interface DeckListProps {
  decks: DeckWithCommanders[];
  onTap: (deck: DeckWithCommanders) => void;
  onEdit: (deck: DeckWithCommanders) => void;
  onDelete: (deck: DeckWithCommanders) => void;
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
  const { t } = useTranslation();

  function confirmDelete() {
    Alert.alert(
      t('deck.removeDeckTitle'),
      t('deck.removeDeckMessage', { name: deck.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.remove'), style: 'destructive', onPress: onDelete },
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
        <Pressable onPress={onEdit} style={styles.actionBtn} accessibilityLabel={`${t('common.edit')} ${deck.name}`}>
          <Text style={styles.actionEdit}>{t('common.edit')}</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} style={styles.actionBtn} accessibilityLabel={`${t('common.remove')} ${deck.name}`}>
          <Text style={styles.actionDelete}>{t('common.remove')}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{t('deck.noDecksYet')}</Text>
      <Text style={styles.emptySubtitle}>{t('deck.noDecksBody')}</Text>
    </View>
  );
}

export function DeckList({ decks, onTap, onEdit, onDelete }: DeckListProps) {
  const { contentMaxWidth } = useResponsive();

  return (
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
      ListEmptyComponent={<EmptyState />}
      contentContainerStyle={[
        decks.length === 0 ? styles.emptyContainer : undefined,
        contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined,
      ]}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
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
