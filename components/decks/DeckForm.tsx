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

import type { Commander } from '@/db/index';
import type { DeckWithCommanders } from '@/services/decks';
import { ColorChips } from '@/components/ui/ColorChips';
import { CommanderSelector } from '@/components/decks/CommanderSelector';
import { colors, radius, spacing, typography } from '@/styles/tokens';

interface DeckFormProps {
  visible: boolean;
  deck?: DeckWithCommanders | null;
  commanders: Commander[];
  onSave: (data: {
    name: string;
    commander_id: string;
    commander_id_2?: string | null;
    description?: string | null;
  }) => Promise<void>;
  onClose: () => void;
}

export function DeckForm({ visible, deck, commanders, onSave, onClose }: DeckFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [commander, setCommander] = useState<Commander | null>(null);
  const [commander2, setCommander2] = useState<Commander | null>(null);
  const [selectorOpen, setSelectorOpen] = useState<'primary' | 'partner' | null>(null);
  const [saving, setSaving] = useState(false);

  // Populate when editing
  useEffect(() => {
    if (deck) {
      setName(deck.name);
      setDescription(deck.description ?? '');
      setCommander(deck.commander as Commander);
      setCommander2((deck.commander2 as Commander | null) ?? null);
    } else {
      setName('');
      setDescription('');
      setCommander(null);
      setCommander2(null);
    }
  }, [deck, visible]);

  // Reset partner if primary commander changed to non-partner
  useEffect(() => {
    if (commander && !commander.isPartner) {
      setCommander2(null);
    }
  }, [commander]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert(t('deck.nameRequired'), t('deck.nameRequiredMessage'));
      return;
    }
    if (!commander) {
      Alert.alert(t('deck.commanderRequired'), t('deck.commanderRequiredMessage'));
      return;
    }
    if (commander.isPartner && !commander2) {
      Alert.alert(t('deck.partnerRequired'), t('deck.partnerRequiredMessage'));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        commander_id: commander.id,
        commander_id_2: commander2?.id ?? null,
        description: description.trim() || null,
      });
      onClose();
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      const msg = e instanceof Error ? e.message : t('common.error');
      Alert.alert(
        code === 'CONFLICT' ? t('common.error') : t('common.error'),
        msg,
      );
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

            {/* Primary Commander */}
            <Text style={styles.label}>{t('game.commander')}</Text>
            <Pressable
              style={[styles.selectorBtn, !commander && styles.selectorBtnEmpty]}
              onPress={() => setSelectorOpen('primary')}
            >
              {commander ? (
                <View style={styles.selectorContent}>
                  <View style={styles.selectorInfo}>
                    <Text style={styles.selectorName} numberOfLines={1}>{commander.name}</Text>
                    <ColorChips selected={commander.colors ?? []} readonly />
                  </View>
                  {commander.isPartner && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{t('commanders.partner')}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>{t('deck.selectCommander')}</Text>
              )}
            </Pressable>

            {/* Partner Commander (conditional) */}
            {commander?.isPartner && (
              <>
                <Text style={styles.label}>{t('deck.partnerCommander')}</Text>
                <Pressable
                  style={[styles.selectorBtn, !commander2 && styles.selectorBtnEmpty, styles.selectorBtnPartner]}
                  onPress={() => setSelectorOpen('partner')}
                >
                  {commander2 ? (
                    <View style={styles.selectorContent}>
                      <View style={styles.selectorInfo}>
                        <Text style={styles.selectorName} numberOfLines={1}>{commander2.name}</Text>
                        <ColorChips selected={commander2.colors ?? []} readonly />
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.selectorPlaceholder}>{t('deck.selectPartner')}</Text>
                  )}
                </Pressable>
              </>
            )}

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

      {/* Commander pickers (full-screen modals) */}
      <CommanderSelector
        visible={selectorOpen === 'primary'}
        commanders={commanders}
        selected={commander}
        onSelect={setCommander}
        onClose={() => setSelectorOpen(null)}
        title={t('deck.selectCommander')}
        excludeId={commander2?.id}
      />
      <CommanderSelector
        visible={selectorOpen === 'partner'}
        commanders={commanders}
        selected={commander2}
        onSelect={setCommander2}
        onClose={() => setSelectorOpen(null)}
        title={t('deck.selectPartner')}
        excludeId={commander?.id}
      />
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
  selectorBtn: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing[2],
  },
  selectorBtnEmpty: { borderStyle: 'dashed' },
  selectorBtnPartner: { borderColor: colors.accent.primary + '66' },
  selectorContent: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  selectorInfo: { flex: 1, gap: spacing[1] },
  selectorName: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
  },
  selectorPlaceholder: {
    color: colors.text.muted,
    fontSize: typography.size['body-lg'],
  },
  badge: {
    backgroundColor: colors.accent.primary + '33',
    borderRadius: radius.xs,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.accent.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
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
