/**
 * SCR-004 — Decks Library (tab screen)
 * Deck CRUD — simple list, no filters.
 * Tap → SCR-013 Deck Detail.
 * DATA-007 (EPIC-01)
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { DeckWithCommanders } from '@/services/decks';
import { DeckForm } from '@/components/decks/DeckForm';
import { DeckList } from '@/components/decks/DeckList';
import { useCommanders } from '@/hooks/useCommanders';
import { useDecks } from '@/hooks/useDecks';
import { useResponsive } from '@/hooks/useResponsive';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

export default function DecksScreen() {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const router = useRouter();
  const { t } = useTranslation();
  const { contentPadding, contentMaxWidth } = useResponsive();
  const { create: createCommander } = useCommanders();
  const [showArchived, setShowArchived] = useState(false);
  const { decks, loading, error, refresh, create, update, remove, setArchived } = useDecks(
    undefined,
    { includeArchived: showArchived },
  );

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<DeckWithCommanders | null>(null);

  function openCreate() {
    setEditing(null);
    setFormVisible(true);
  }

  function openEdit(deck: DeckWithCommanders) {
    setEditing(deck);
    setFormVisible(true);
  }

  function closeForm() {
    setFormVisible(false);
    setEditing(null);
  }

  async function handleSave(data: {
    name: string;
    commander_id: string;
    commander_id_2?: string | null;
    description?: string | null;
  }) {
    if (editing) {
      await update(editing.id, data);
    } else {
      await create(data);
    }
  }

  async function handleDelete(deck: DeckWithCommanders) {
    try {
      await remove(deck.id);
    } catch (e: unknown) {
      const isActiveMatch = (e as { code?: string }).code === 'ACTIVE_MATCH';
      Alert.alert(
        isActiveMatch ? t('deck.deckInMatchTitle') : t('common.error'),
        isActiveMatch
          ? t('deck.deckInMatchMessage')
          : (e instanceof Error ? e.message : t('deck.removeError')),
      );
    }
  }

  async function handleArchiveToggle(deck: DeckWithCommanders) {
    try {
      await setArchived(deck.id, !deck.archivedAt);
    } catch (e: unknown) {
      Alert.alert(
        t('common.error'),
        e instanceof Error ? e.message : t('deck.archiveError'),
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: contentPadding }, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined]}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{t('deck.decks')}</Text>
          <Text style={styles.subtitle}>
            Your arsenal — the blades and bindings you bring to the duel.
          </Text>
        </View>
        <Pressable style={styles.fab} onPress={openCreate} accessibilityLabel={t('deck.addDeckLabel')}>
          <Text style={styles.fabLabel}>{t('deck.addDeck')}</Text>
        </Pressable>
      </View>

      {/* Show archived toggle */}
      <View style={[styles.toolbar, { paddingHorizontal: contentPadding }, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined]}>
        <Pressable
          onPress={() => setShowArchived((v) => !v)}
          style={[styles.toolbarChip, showArchived && styles.toolbarChipActive]}
          accessibilityRole="switch"
          accessibilityState={{ checked: showArchived }}
        >
          <Text style={[styles.toolbarChipText, showArchived && styles.toolbarChipTextActive]}>
            {showArchived ? t('deck.hideArchived') : t('deck.showArchived')}
          </Text>
        </Pressable>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <DeckList
          decks={decks}
          onTap={(deck) => router.push(`/decks/${deck.id}`)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onArchiveToggle={handleArchiveToggle}
          showArchivedEmpty={showArchived}
        />
      )}

      {/* Form modal */}
      <DeckForm
        visible={formVisible}
        deck={editing}
        onSave={handleSave}
        onClose={closeForm}
        onCreateCommander={createCommander}
      />
    </SafeAreaView>
  );
}

const createStyles = (t: AppTheme) => ({
  safe: { flex: 1, backgroundColor: t.colors.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
    marginRight: spacing[3],
  },
  title: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-lg'],
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.bold,
  },
  subtitle: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
    fontFamily: t.typography.fontFamily.body,
    fontStyle: 'italic' as const,
    letterSpacing: 0.2,
  },
  fab: {
    backgroundColor: t.colors.accent.primary,
    borderRadius: t.radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  fabLabel: {
    color: t.colors.accent.onPrimary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  toolbarChip: {
    borderWidth: 1,
    borderColor: t.colors.border.default,
    borderRadius: t.radius.round,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: t.colors.background.secondary,
  },
  toolbarChipActive: {
    backgroundColor: t.colors.accent.primary + '22',
    borderColor: t.colors.accent.primary,
  },
  toolbarChipText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  toolbarChipTextActive: {
    color: t.colors.accent.primary,
    fontWeight: t.typography.weight.semibold,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[4] },
  errorText: {
    color: t.colors.status.error,
    fontSize: t.typography.size['body-lg'],
    textAlign: 'center',
    paddingHorizontal: spacing[6],
  },
  retryBtn: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  retryText: { color: t.colors.text.secondary, fontSize: t.typography.size['body-lg'] },
})
