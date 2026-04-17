/**
 * CommanderForm — Modal form for editing an existing commander.
 *
 * Commanders are created by picking a card from Scryfall inside DeckForm, so
 * this form no longer offers manual creation: only name, partner-capable flag,
 * and color identity display are editable. Color identity itself is pulled
 * from Scryfall at creation time and shown read-only here.
 *
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
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import type { Commander } from '@/db/index';
import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

interface CommanderFormProps {
  visible: boolean;
  commander?: Commander | null;
  onSave: (data: { name: string; is_partner: boolean }) => Promise<void>;
  onClose: () => void;
}

export function CommanderForm({ visible, commander, onSave, onClose }: CommanderFormProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [isPartner, setIsPartner] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (commander) {
      setName(commander.name);
      setIsPartner(commander.isPartner);
    } else {
      setName('');
      setIsPartner(false);
    }
  }, [commander, visible]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert(t('commanders.nameRequired'), t('commanders.nameRequiredMessage'));
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), is_partner: isPartner });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('common.error');
      Alert.alert(t('common.error'), msg);
    } finally {
      setSaving(false);
    }
  }

  if (!commander) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheet}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>{t('commanders.editCommander')}</Text>

        {/* Name */}
        <Text style={styles.label}>{t('commanders.name')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholderTextColor={theme.colors.text.muted}
          returnKeyType="done"
        />

        {/* Color identity (read-only, from Scryfall) */}
        <Text style={styles.label}>{t('commanders.colors')}</Text>
        <View style={styles.colorRow}>
          <ManaIdentityRow colors={commander.colorIdentity ?? []} size="md" />
        </View>

        {/* Partner toggle */}
        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <Text style={styles.label}>{t('commanders.partner')}</Text>
            <Text style={styles.hint}>{t('commanders.allowsPartner')}</Text>
          </View>
          <Switch
            value={isPartner}
            onValueChange={setIsPartner}
            trackColor={{ false: theme.colors.border.default, true: theme.colors.accent.primary }}
            thumbColor={theme.colors.text.primary}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.btnCancel} onPress={onClose}>
            <Text style={styles.btnCancelText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable style={[styles.btnSave, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={theme.colors.text.inverse} size="small" />
              : <Text style={styles.btnSaveText}>{t('common.save')}</Text>
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
  hint: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    marginTop: 2,
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
  colorRow: {
    paddingVertical: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { flex: 1 },
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
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
  },
  btnDisabled: { opacity: 0.6 },
});
