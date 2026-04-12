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
import { colors, radius, spacing, typography } from '@/styles/tokens';

export default function CommandersScreen() {
  const { t } = useTranslation();
  const { commanders, loading, error, refresh, create, update, remove } = useCommanders();
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Commander | null>(null);

  function openCreate() {
    setEditing(null);
    setFormVisible(true);
  }

  function openEdit(commander: Commander) {
    setEditing(commander);
    setFormVisible(true);
  }

  function closeForm() {
    setFormVisible(false);
    setEditing(null);
  }

  async function handleSave(data: { name: string; colors: string[]; isPartner: boolean }) {
    if (editing) {
      await update(editing.id, data);
    } else {
      await create(data);
    }
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('commanders.title')}</Text>
        <Pressable style={styles.fab} onPress={openCreate} accessibilityLabel={t('commanders.addCommanderLabel')}>
          <Text style={styles.fabLabel}>{t('commanders.addCommander')}</Text>
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
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
  retryText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
  },
});
