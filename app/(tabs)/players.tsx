/**
 * SCR-003 — Players List (tab screen)
 * Roster management: create, edit, delete players.
 * Tap → SCR-012 Player Profile.
 * DATA-006 (EPIC-01)
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

import type { Player } from '@/db/index';
import { PlayerForm } from '@/components/players/PlayerForm';
import { PlayerList } from '@/components/players/PlayerList';
import { usePlayers } from '@/hooks/usePlayers';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, radius, spacing, typography } from '@/styles/tokens';

export default function PlayersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { players, loading, error, refresh, create, update, remove } = usePlayers();
  const { contentPadding, contentMaxWidth } = useResponsive();
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);

  function openCreate() {
    setEditing(null);
    setFormVisible(true);
  }

  function openEdit(player: Player) {
    setEditing(player);
    setFormVisible(true);
  }

  function closeForm() {
    setFormVisible(false);
    setEditing(null);
  }

  async function handleSave(name: string) {
    if (editing) {
      await update(editing.id, name);
    } else {
      await create(name);
    }
  }

  async function handleDelete(player: Player) {
    try {
      await remove(player.id);
    } catch (e: unknown) {
      const isActiveMatch = (e as { code?: string }).code === 'ACTIVE_MATCH';
      Alert.alert(
        isActiveMatch ? t('player.playerInMatchTitle') : t('common.error'),
        isActiveMatch
          ? t('player.playerInMatchMessage')
          : (e instanceof Error ? e.message : t('player.removeError')),
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: contentPadding }, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined]}>
        <Text style={styles.title}>{t('player.players')}</Text>
        <Pressable style={styles.fab} onPress={openCreate} accessibilityLabel={t('player.addPlayerLabel')}>
          <Text style={styles.fabLabel}>{t('player.addPlayer')}</Text>
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
        <PlayerList
          players={players}
          onTap={(player) => router.push(`/players/${player.id}`)}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Form modal */}
      <PlayerForm
        visible={formVisible}
        player={editing}
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
