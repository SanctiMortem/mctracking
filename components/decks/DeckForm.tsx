/**
 * DeckForm — Modal form for creating / editing a deck.
 * Commander entered as text + WUBRG color identity picker + optional partner.
 * Creates the commander record automatically on save.
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
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import type { DeckWithCommanders } from '@/services/decks';
import { mtgColors, spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

// ─── MTG Color Identity ──────────────────────────────────────────────────────

const MTG_COLORS: { code: string; label: string; color: string }[] = [
  { code: 'W', label: 'White', color: mtgColors.white },
  { code: 'U', label: 'Blue', color: mtgColors.blue },
  { code: 'B', label: 'Black', color: '#3A2A1E' },
  { code: 'R', label: 'Red', color: mtgColors.red },
  { code: 'G', label: 'Green', color: mtgColors.green },
];

function ColorIdentityPicker({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (code: string) => void;
}) {
  const { theme } = useTheme();
  const colorStyles = useThemedStyles(createColorStyles);

  return (
    <View style={colorStyles.row}>
      {MTG_COLORS.map(({ code, label, color }) => {
        const active = selected.has(code);
        return (
          <Pressable
            key={code}
            onPress={() => onToggle(code)}
            style={[
              colorStyles.chip,
              { borderColor: active ? color : theme.colors.border.default },
              active && { backgroundColor: color + '33' },
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={label}
          >
            <View
              style={[
                colorStyles.pip,
                { backgroundColor: color },
                code === 'W' && { borderColor: '#AAA' },
              ]}
            />
            <Text style={[colorStyles.chipLabel, active && { color: theme.colors.text.primary }]}>
              {code}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createColorStyles = (t: AppTheme) => ({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: t.radius.round,
    borderWidth: 1.5,
    borderColor: t.colors.border.default,
  },
  pip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
})

// ─── Commander Input Block ───────────────────────────────────────────────────

function CommanderInput({
  label,
  name,
  onChangeName,
  selectedColors,
  onToggleColor,
  placeholder,
}: {
  label: string;
  name: string;
  onChangeName: (v: string) => void;
  selectedColors: Set<string>;
  onToggleColor: (code: string) => void;
  placeholder: string;
}) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const cmdStyles = useThemedStyles(createCmdStyles);

  return (
    <View style={cmdStyles.block}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={onChangeName}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.muted}
        returnKeyType="next"
      />
      <Text style={cmdStyles.colorLabel}>Color Identity</Text>
      <ColorIdentityPicker selected={selectedColors} onToggle={onToggleColor} />
    </View>
  );
}

const createCmdStyles = (t: AppTheme) => ({
  block: { gap: spacing[2] },
  colorLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.medium,
    marginTop: spacing[1],
  },
});

// ─── DeckForm ────────────────────────────────────────────────────────────────

interface DeckFormProps {
  visible: boolean;
  deck?: DeckWithCommanders | null;
  onSave: (data: {
    name: string;
    commander_id: string;
    commander_id_2?: string | null;
    description?: string | null;
  }) => Promise<void>;
  onClose: () => void;
  onCreateCommander: (input: { name: string; colors: string[]; isPartner: boolean }) => Promise<{ id: string }>;
}

export function DeckForm({ visible, deck, onSave, onClose, onCreateCommander }: DeckFormProps) {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();

  // Deck fields
  const [deckName, setDeckName] = useState('');
  const [description, setDescription] = useState('');

  // Commander 1
  const [cmdName, setCmdName] = useState('');
  const [cmdColors, setCmdColors] = useState<Set<string>>(new Set());

  // Partner toggle + Commander 2
  const [hasPartner, setHasPartner] = useState(false);
  const [cmd2Name, setCmd2Name] = useState('');
  const [cmd2Colors, setCmd2Colors] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);

  // Populate when editing
  useEffect(() => {
    if (deck) {
      setDeckName(deck.name);
      setDescription(deck.description ?? '');
      setCmdName(deck.commander?.name ?? '');
      setCmdColors(new Set(deck.commander?.colors ?? []));
      if (deck.commander2) {
        setHasPartner(true);
        setCmd2Name(deck.commander2.name);
        setCmd2Colors(new Set(deck.commander2.colors));
      } else {
        setHasPartner(false);
        setCmd2Name('');
        setCmd2Colors(new Set());
      }
    } else {
      setDeckName('');
      setDescription('');
      setCmdName('');
      setCmdColors(new Set());
      setHasPartner(false);
      setCmd2Name('');
      setCmd2Colors(new Set());
    }
  }, [deck, visible]);

  function toggleCmdColor(code: string) {
    setCmdColors((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function toggleCmd2Color(code: string) {
    setCmd2Colors((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  async function handleSave() {
    // Validate deck name
    if (!deckName.trim()) {
      Alert.alert(t('deck.nameRequired'), t('deck.nameRequiredMessage'));
      return;
    }

    // Validate commander
    if (!cmdName.trim()) {
      Alert.alert(t('common.error'), 'Commander name is required.');
      return;
    }
    if (cmdColors.size === 0) {
      Alert.alert(t('common.error'), 'Select at least one color for the commander.');
      return;
    }

    // Validate partner if enabled
    if (hasPartner) {
      if (!cmd2Name.trim()) {
        Alert.alert(t('common.error'), 'Partner commander name is required.');
        return;
      }
      if (cmd2Colors.size === 0) {
        Alert.alert(t('common.error'), 'Select at least one color for the partner commander.');
        return;
      }
    }

    setSaving(true);
    try {
      // Create commander(s) first, then create the deck
      const cmd1 = await onCreateCommander({
        name: cmdName.trim(),
        colors: Array.from(cmdColors),
        isPartner: hasPartner,
      });

      let cmd2Id: string | null = null;
      if (hasPartner) {
        const cmd2 = await onCreateCommander({
          name: cmd2Name.trim(),
          colors: Array.from(cmd2Colors),
          isPartner: true,
        });
        cmd2Id = cmd2.id;
      }

      await onSave({
        name: deckName.trim(),
        commander_id: cmd1.id,
        commander_id_2: cmd2Id,
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheet}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>{deck ? t('deck.editDeck') : t('deck.newDeck')}</Text>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Deck Name */}
          <Text style={styles.label}>{t('deck.deckName', { defaultValue: 'Deck Name' })}</Text>
          <TextInput
            style={styles.input}
            value={deckName}
            onChangeText={setDeckName}
            placeholder={t('deck.namePlaceholder')}
            placeholderTextColor={theme.colors.text.muted}
            returnKeyType="next"
          />

          {/* Commander */}
          <CommanderInput
            label={t('game.commander')}
            name={cmdName}
            onChangeName={setCmdName}
            selectedColors={cmdColors}
            onToggleColor={toggleCmdColor}
            placeholder="e.g. Atraxa, Praetors' Voice"
          />

          {/* Partner toggle */}
          <View style={styles.partnerRow}>
            <Text style={styles.partnerLabel}>Partner Commander</Text>
            <Switch
              value={hasPartner}
              onValueChange={setHasPartner}
              trackColor={{ false: theme.colors.border.strong, true: theme.colors.accent.primary + '88' }}
              thumbColor={hasPartner ? theme.colors.accent.primary : theme.colors.text.muted}
            />
          </View>

          {/* Partner Commander */}
          {hasPartner && (
            <CommanderInput
              label="Partner Commander"
              name={cmd2Name}
              onChangeName={setCmd2Name}
              selectedColors={cmd2Colors}
              onToggleColor={toggleCmd2Color}
              placeholder="e.g. Thrasios, Triton Hero"
            />
          )}

          {/* Description */}
          <Text style={styles.label}>{t('deck.descriptionOptional')}</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('deck.descriptionPlaceholder')}
            placeholderTextColor={theme.colors.text.muted}
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
          <Pressable
            style={[styles.btnSave, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.text.inverse} size="small" />
            ) : (
              <Text style={styles.btnSaveText}>
                {deck ? t('common.save') : t('common.create')}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  backdrop: { flex: 1, backgroundColor: t.colors.background.overlay },
  sheet: {
    backgroundColor: t.colors.background.elevated,
    borderTopLeftRadius: t.radius.xxl,
    borderTopRightRadius: t.radius.xxl,
    padding: spacing[6],
    paddingBottom: spacing[8],
    maxHeight: '85%',
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
    marginTop: spacing[2],
    marginBottom: spacing[2],
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
    marginBottom: spacing[2],
  },
  inputMultiline: { minHeight: 80 },

  // Partner toggle row
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    marginTop: spacing[2],
  },
  partnerLabel: {
    color: t.colors.text.tertiary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },

  // Action buttons
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
})
