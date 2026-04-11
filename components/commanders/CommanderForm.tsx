/**
 * CommanderForm — Modal form for creating / editing a commander.
 * DATA-005 (EPIC-01)
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
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Commander } from '@/db/index';
import { ColorChips } from '@/components/ui/ColorChips';
import { colors, radius, spacing, typography } from '@/styles/tokens';

interface CommanderFormProps {
  visible: boolean;
  commander?: Commander | null;
  onSave: (data: { name: string; colors: string[]; isPartner: boolean }) => Promise<void>;
  onClose: () => void;
}

export function CommanderForm({ visible, commander, onSave, onClose }: CommanderFormProps) {
  const [name, setName] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [isPartner, setIsPartner] = useState(false);
  const [saving, setSaving] = useState(false);

  // Populate when editing
  useEffect(() => {
    if (commander) {
      setName(commander.name);
      setSelectedColors(commander.colors ?? []);
      setIsPartner(commander.isPartner);
    } else {
      setName('');
      setSelectedColors([]);
      setIsPartner(false);
    }
  }, [commander, visible]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a commander name.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), colors: selectedColors, isPartner });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      const isConflict = (e as { code?: string }).code === 'CONFLICT';
      Alert.alert(isConflict ? 'Name already exists' : 'Error', msg);
    } finally {
      setSaving(false);
    }
  }

  const isEdit = !!commander;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheet}
      >
        <View style={styles.handle} />

        <Text style={styles.title}>{isEdit ? 'Edit Commander' : 'New Commander'}</Text>

        {/* Name */}
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Atraxa, Praetors' Voice"
          placeholderTextColor={colors.text.muted}
          autoFocus={!isEdit}
          returnKeyType="done"
        />

        {/* Colors */}
        <Text style={styles.label}>Colors</Text>
        <ColorChips selected={selectedColors} onChange={setSelectedColors} />

        {/* Partner toggle */}
        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <Text style={styles.label}>Partner</Text>
            <Text style={styles.hint}>Allows two commanders in a deck</Text>
          </View>
          <Switch
            value={isPartner}
            onValueChange={setIsPartner}
            trackColor={{ false: colors.border.default, true: colors.accent.primary }}
            thumbColor={colors.text.primary}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.btnCancel} onPress={onClose}>
            <Text style={styles.btnCancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.btnSave, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={colors.text.inverse} size="small" />
              : <Text style={styles.btnSaveText}>{isEdit ? 'Save' : 'Create'}</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.background.overlay,
  },
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
  hint: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
    marginTop: 2,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
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
  btnDisabled: {
    opacity: 0.6,
  },
});
