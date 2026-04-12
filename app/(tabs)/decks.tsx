/**
 * SCR-004 — Decks Library (tab screen)
 * Deck CRUD with commander filter and partner support.
 * Tap → SCR-013 Deck Detail.
 * DATA-007 (EPIC-01)
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { DeckWithCommanders } from '@/services/decks';
import { DeckForm } from '@/components/decks/DeckForm';
import { DeckList } from '@/components/decks/DeckList';
import { useCommanders } from '@/hooks/useCommanders';
import { useDecks } from '@/hooks/useDecks';
import { colors, radius, spacing, typography } from '@/styles/tokens';

export default function DecksScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { commanders } = useCommanders();

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const { decks, loading, error, refresh, create, update, remove } = useDecks(activeFilter ?? undefined);

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

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('deck.decks')}</Text>
        <Pressable style={styles.fab} onPress={openCreate} accessibilityLabel={t('deck.addDeckLabel')}>
          <Text style={styles.fabLabel}>{t('deck.addDeck')}</Text>
        </Pressable>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.primary} size="large" />
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
          commanders={commanders}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onTap={(deck) => router.push(`/decks/${deck.id}`)}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Form modal */}
      <DeckForm
        visible={formVisible}
        deck={editing}
        commanders={commanders}
        onSave={handleSave}
        onClose={closeForm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
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
    fontSize: typography.size['heading-lg'],
    fontWeight: typography.weight.bold,
  },
  fab: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  fabLabel: {
    color: colors.text.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[4] },
  errorText: {
    color: colors.status.error,
    fontSize: typography.size['body-lg'],
    textAlign: 'center',
    paddingHorizontal: spacing[6],
  },
  retryBtn: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  retryText: { color: colors.text.secondary, fontSize: typography.size['body-lg'] },
});
