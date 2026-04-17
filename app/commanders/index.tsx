/**
 * SCR-016 — Commanders Archive
 * List + CRUD inline for Commander entity.
 * DATA-005 (EPIC-01)
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
import { useTranslation } from 'react-i18next';

import type { Commander } from '@/db/index';
import { CommanderForm } from '@/components/commanders/CommanderForm';
import { CommanderList } from '@/components/commanders/CommanderList';
import { useCommanders } from '@/hooks/useCommanders';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

export default function CommandersScreen() {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();
  const { commanders, loading, error, refresh, update, remove } = useCommanders();
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Commander | null>(null);

  function openEdit(commander: Commander) {
    setEditing(commander);
    setFormVisible(true);
  }

  function closeForm() {
    setFormVisible(false);
    setEditing(null);
  }

  async function handleSave(data: { name: string; is_partner: boolean }) {
    if (!editing) return;
    await update(editing.id, data);
  }

  async function handleDelete(commander: Commander) {
    try {
      await remove(commander.id);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('commanders.deleteError'));
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header — commanders are created by picking cards in the Deck form */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('commanders.title')}</Text>
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
        <CommanderList
          commanders={commanders}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Create / Edit form */}
      <CommanderForm
        visible={formVisible}
        commander={editing}
        onSave={handleSave}
        onClose={closeForm}
      />
    </SafeAreaView>
  );
}

const createStyles = (t: AppTheme) => ({
  safe: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
  },
  title: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-lg'],
    fontWeight: t.typography.weight.bold,
  },
  fab: {
    backgroundColor: t.colors.accent.primary,
    borderRadius: t.radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  fabLabel: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
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
  retryText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-lg'],
  },
})
