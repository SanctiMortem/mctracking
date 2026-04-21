/**
 * PlayerForm — Modal form for creating / renaming a player.
 * DATA-006 (EPIC-01)
 */
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import type { Player } from '@/db/index';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

interface PlayerFormProps {
  visible: boolean;
  player?: Player | null;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
}

export function PlayerForm({ visible, player, onSave, onClose }: PlayerFormProps) {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(player?.name ?? '');
  }, [player, visible]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert(t('player.nameRequired'), t('player.nameRequiredMessage'));
      return;
    }
    setSaving(true);
    try {
      await onSave(name.trim());
      onClose();
    } catch (e: unknown) {
      const isConflict = (e as { code?: string }).code === 'CONFLICT';
      Alert.alert(
        isConflict ? t('player.nameExists') : t('common.error'),
        e instanceof Error ? e.message : t('common.error'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.title}>{player ? t('player.editPlayer') : t('player.newPlayer')}</Text>

        <Text style={styles.label}>{t('player.nameLabel')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('player.namePlaceholder')}
          placeholderTextColor={theme.colors.text.muted}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        <View style={styles.actions}>
          <Pressable style={styles.btnCancel} onPress={onClose}>
            <Text style={styles.btnCancelText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable style={[styles.btnSave, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={theme.colors.text.inverse} size="small" />
              : <Text style={styles.btnSaveText}>{player ? t('common.save') : t('common.create')}</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (t: AppTheme) => ({
  backdrop: { flex: 1, backgroundColor: t.colors.background.overlay },
  sheet: {
    backgroundColor: t.colors.background.elevated,
    borderTopLeftRadius: t.radius.xxl,
    borderTopRightRadius: t.radius.xxl,
    padding: spacing[6],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: t.radius.round,
    backgroundColor: t.colors.border.strong,
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
  title: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.semibold,
  },
  label: {
    color: t.colors.text.tertiary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
    marginBottom: -spacing[2],
  },
  input: {
    backgroundColor: t.colors.background.surface,
    color: t.colors.text.primary,
    borderRadius: t.radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: t.typography.size['body-lg'],
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  actions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  btnCancel: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    alignItems: 'center',
  },
  btnCancelText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
  },
  btnSave: {
    flex: 2,
    paddingVertical: spacing[3],
    borderRadius: t.radius.md,
    backgroundColor: t.colors.accent.primary,
    alignItems: 'center',
  },
  btnSaveText: {
    color: t.colors.accent.onPrimary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
  },
  btnDisabled: { opacity: 0.6 },
})
