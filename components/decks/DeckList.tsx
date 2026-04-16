/**
 * DeckList — Simple FlatList of decks with commander + color identity display.
 * DATA-007 (EPIC-01)
 */
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import type { DeckWithCommanders } from '@/services/decks';
import { ColorChips } from '@/components/ui/ColorChips';
import { useResponsive } from '@/hooks/useResponsive';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

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
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();

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
    <Pressable style={styles.row} onPress={onTap} android_ripple={{ color: theme.colors.border.subtle }}>
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
  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{t('deck.noDecksYet')}</Text>
      <Text style={styles.emptySubtitle}>{t('deck.noDecksBody')}</Text>
    </View>
  );
}

export function DeckList({ decks, onTap, onEdit, onDelete }: DeckListProps) {
  const styles = useThemedStyles(createStyles);

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

const createStyles = (t: AppTheme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: t.colors.background.secondary,
    gap: spacing[3],
  },
  rowInfo: { flex: 1, gap: spacing[1] },
  deckName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
  },
  commanderName: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
  },
  rowActions: { flexDirection: 'row', gap: spacing[3] },
  actionBtn: { padding: spacing[2] },
  actionEdit: {
    color: t.colors.text.link,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  actionDelete: {
    color: t.colors.status.error,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  separator: {
    height: 1,
    backgroundColor: t.colors.border.subtle,
    marginHorizontal: spacing[4],
  },
  empty: { alignItems: 'center', gap: spacing[2], padding: spacing[6] },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyTitle: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
})
