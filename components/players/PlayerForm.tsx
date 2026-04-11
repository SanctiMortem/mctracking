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

import type { Player } from '@/db/index';
import { colors, radius, spacing, typography } from '@/styles/tokens';

interface PlayerFormProps {
  visible: boolean;
  player?: Player | null;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
}

export function PlayerForm({ visible, player, onSave, onClose }: PlayerFormProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(player?.name ?? '');
  }, [player, visible]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a player name.');
      return;
    }
    setSaving(true);
    try {
      await onSave(name.trim());
      onClose();
    } catch (e: unknown) {
      const isConflict = (e as { code?: string }).code === 'CONFLICT';
      Alert.alert(
        isConflict ? 'Name already exists' : 'Error',
        e instanceof Error ? e.message : 'Something went wrong',
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

        <Text style={styles.title}>{player ? 'Edit Player' : 'New Player'}</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Gabriel"
          placeholderTextColor={colors.text.muted}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        <View style={styles.actions}>
          <Pressable style={styles.btnCancel} onPress={onClose}>
            <Text style={styles.btnCancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.btnSave, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={colors.text.inverse} size="small" />
              : <Text style={styles.btnSaveText}>{player ? 'Save' : 'Create'}</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.background.overlay },
  sheet: {
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing[6],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.round,
    backgroundColor: colors.border.strong,
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.semibold,
  },
  label: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
    marginBottom: -spacing[2],
  },
  input: {
    backgroundColor: colors.background.surface,
    color: colors.text.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.size['body-lg'],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  actions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  btnCancel: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  btnCancelText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
  },
  btnSave: {
    flex: 2,
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
  },
  btnSaveText: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
  },
  btnDisabled: { opacity: 0.6 },
});
