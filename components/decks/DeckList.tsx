/**
 * DeckList — Simple FlatList of decks with commander + color identity display.
 * DATA-007 (EPIC-01)
 */
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import type { DeckWithCommanders } from '@/services/decks';
import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
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
  onArchiveToggle?: (deck: DeckWithCommanders) => void;
  showArchivedEmpty?: boolean;
}

function DeckRow({
  deck,
  onTap,
  onEdit,
  onDelete,
  onArchiveToggle,
}: {
  deck: DeckWithCommanders;
  onTap: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchiveToggle?: () => void;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();

  const isArchived = !!deck.archivedAt;

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

  function confirmArchiveToggle() {
    if (!onArchiveToggle) return;
    Alert.alert(
      isArchived ? t('deck.unarchiveDeckTitle') : t('deck.archiveDeckTitle'),
      isArchived
        ? t('deck.unarchiveDeckMessage', { name: deck.name })
        : t('deck.archiveDeckMessage', { name: deck.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isArchived ? t('deck.unarchive') : t('deck.archive'),
          onPress: onArchiveToggle,
        },
      ],
    );
  }

  const hasPartner = !!deck.commander2;
  const allColors = hasPartner
    ? [...new Set([...(deck.commander.colorIdentity ?? []), ...(deck.commander2?.colorIdentity ?? [])])]
    : (deck.commander.colorIdentity ?? []);
  const artSrc = deck.commander.artCrop ?? deck.commander2?.artCrop ?? null;

  return (
    <Pressable
      style={[styles.row, isArchived && styles.rowArchived]}
      onPress={onTap}
      android_ripple={{ color: theme.colors.border.subtle }}
    >
      {/* Commander art thumbnail */}
      <View style={[styles.thumb, isArchived && styles.thumbArchived]}>
        {artSrc ? (
          <Image source={{ uri: artSrc }} style={styles.thumbImg} />
        ) : (
          <View style={[styles.thumbImg, styles.thumbFallback]} />
        )}
      </View>

      <View style={styles.rowInfo}>
        {/* Deck name + archived badge */}
        <View style={styles.deckNameRow}>
          <Text
            style={[styles.deckName, isArchived && styles.deckNameArchived]}
            numberOfLines={1}
          >
            {deck.name}
          </Text>
          {isArchived && (
            <View style={styles.archivedBadge}>
              <Text style={styles.archivedBadgeText}>{t('deck.archivedBadge')}</Text>
            </View>
          )}
        </View>

        {/* Commander(s) */}
        <Text style={styles.commanderName} numberOfLines={1}>
          {deck.commander.name}
          {hasPartner ? ` + ${deck.commander2!.name}` : ''}
        </Text>

        {/* Color identity — white mana pips */}
        <ManaIdentityRow colors={allColors} size="xs" />
      </View>

      <View style={styles.rowActions}>
        <Pressable onPress={onEdit} style={styles.actionBtn} accessibilityLabel={`${t('common.edit')} ${deck.name}`}>
          <Text style={styles.actionEdit}>{t('common.edit')}</Text>
        </Pressable>
        {onArchiveToggle && (
          <Pressable
            onPress={confirmArchiveToggle}
            style={styles.actionBtn}
            accessibilityLabel={`${isArchived ? t('deck.unarchive') : t('deck.archive')} ${deck.name}`}
          >
            <Text style={styles.actionArchive}>
              {isArchived ? t('deck.unarchive') : t('deck.archive')}
            </Text>
          </Pressable>
        )}
        <Pressable onPress={confirmDelete} style={styles.actionBtn} accessibilityLabel={`${t('common.remove')} ${deck.name}`}>
          <Text style={styles.actionDelete}>{t('common.remove')}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function EmptyState({ archived }: { archived?: boolean }) {
  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>
        {archived ? t('deck.archivedEmpty') : t('deck.noDecksYet')}
      </Text>
      <Text style={styles.emptySubtitle}>
        {archived ? t('deck.archivedEmptyBody') : t('deck.noDecksBody')}
      </Text>
    </View>
  );
}

export function DeckList({ decks, onTap, onEdit, onDelete, onArchiveToggle, showArchivedEmpty }: DeckListProps) {
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
          onArchiveToggle={onArchiveToggle ? () => onArchiveToggle(item) : undefined}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<EmptyState archived={showArchivedEmpty} />}
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
  rowArchived: {
    opacity: 0.6,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: t.radius.sm,
    overflow: 'hidden',
    backgroundColor: t.colors.border.subtle,
  },
  thumbArchived: {
    opacity: 0.7,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    backgroundColor: t.colors.border.subtle,
  },
  rowInfo: { flex: 1, gap: spacing[1] },
  deckNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  deckName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
    flexShrink: 1,
  },
  deckNameArchived: {
    fontStyle: 'italic' as const,
  },
  archivedBadge: {
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  archivedBadgeText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
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
  actionArchive: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  actionDelete: {
    color: t.colors.status.error,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  separator: {
    height: 2,
    backgroundColor: t.colors.border.default,
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
