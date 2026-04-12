/**
 * DeckForm — Modal form for creating / editing a deck.
 * Includes CommanderSelector with partner logic.
 * DATA-007 (EPIC-01)
 */
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import type { DeckWithCommanders } from '@/services/decks';
import { colors, radius, spacing, typography } from '@/styles/tokens';

interface DeckFormProps {
  visible: boolean;
  deck?: DeckWithCommanders | null;
  commanders?: unknown[];
  onSave: (data: {
    name: string;
    commander_id: string;
    commander_id_2?: string | null;
    description?: string | null;
  }) => Promise<void>;
  onClose: () => void;
}

export function DeckForm({ visible, deck, onSave, onClose }: DeckFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [commanderName, setCommanderName] = useState('');
  const [saving, setSaving] = useState(false);

  // Populate when editing
  useEffect(() => {
    if (deck) {
      setName(deck.name);
      setDescription(deck.description ?? '');
      setCommanderName((deck as { commander?: { name?: string } }).commander?.name ?? '');
    } else {
      setName('');
      setDescription('');
      setCommanderName('');
    }
  }, [deck, visible]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert(t('deck.nameRequired'), t('deck.nameRequiredMessage'));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        commander_id: commanderName.trim() || 'placeholder',
        commander_id_2: null,
        description: description.trim() || null,
      });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('common.error');
      Alert.alert(t('common.error'), msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{deck ? t('deck.editDeck') : t('deck.newDeck')}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Name */}
            <Text style={styles.label}>{t('commanders.name')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('deck.namePlaceholder')}
              placeholderTextColor={colors.text.muted}
              returnKeyType="next"
            />

            {/* Commander (plain text for now) */}
            <Text style={styles.label}>{t('game.commander')}</Text>
            <TextInput
              style={styles.input}
              value={commanderName}
              onChangeText={setCommanderName}
              placeholder="Commander name (optional)"
              placeholderTextColor={colors.text.muted}
              returnKeyType="next"
            />

            {/* Description */}
            <Text style={styles.label}>{t('deck.descriptionOptional')}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('deck.descriptionPlaceholder')}
              placeholderTextColor={colors.text.muted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.btnCancel} onPress={onClose}>
              <Text style={styles.btnCancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable style={[styles.btnSave, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color={colors.text.inverse} size="small" />
                : <Text style={styles.btnSaveText}>{deck ? t('common.save') : t('common.create')}</Text>
              }
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </>
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
    maxHeight: '85%',
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
    marginTop: spacing[2],
    marginBottom: spacing[2],
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
    marginBottom: spacing[2],
  },
  inputMultiline: { minHeight: 80 },
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
