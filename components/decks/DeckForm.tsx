/**
 * DeckForm — Modal form for creating / editing a deck.
 *
 * Commander fields are now Scryfall-backed: the user types a partial card
 * name, picks from the autocomplete dropdown, and we resolve the full card
 * (id, color_identity, art_crop) from Scryfall before saving.
 *
 * The commander record in our DB is created/reused by scryfall_id via
 * /api/commanders — no manual WUBRG picker, no free text.
 *
 * DATA-007 (EPIC-01)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { findCommander, type ScryfallCommander } from '@/services/scryfall';
import { useScryfallAutocomplete } from '@/hooks/useScryfallAutocomplete';
import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

// ─── Scryfall autocomplete input ──────────────────────────────────────────────

interface CommanderPickerProps {
  label: string;
  selected: ScryfallCommander | null;
  onSelect: (c: ScryfallCommander | null) => void;
  placeholder: string;
}

function CommanderPicker({ label, selected, onSelect, placeholder }: CommanderPickerProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const pickerStyles = useThemedStyles(createPickerStyles);

  const [query, setQuery] = useState(selected?.name ?? '');
  const [resolving, setResolving] = useState(false);
  const [focused, setFocused] = useState(false);
  const { suggestions, loading } = useScryfallAutocomplete(focused ? query : '');

  // Keep query in sync when selected changes externally (e.g. opening for edit)
  useEffect(() => {
    setQuery(selected?.name ?? '');
  }, [selected?.id]);

  const onChangeText = useCallback((v: string) => {
    setQuery(v);
    // Clear the selected commander as soon as the user edits the text away
    if (selected && v !== selected.name) onSelect(null);
  }, [selected, onSelect]);

  const pickSuggestion = useCallback(async (name: string) => {
    setResolving(true);
    setQuery(name);
    setFocused(false);
    try {
      const card = await findCommander(name);
      if (!card) {
        Alert.alert('Not a commander', `${name} is not a legal commander.`);
        onSelect(null);
        return;
      }
      onSelect(card);
    } finally {
      setResolving(false);
    }
  }, [onSelect]);

  const showDropdown = focused && query.trim().length >= 2 && !selected;

  return (
    <View style={pickerStyles.block}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={[styles.input, selected && pickerStyles.inputSelected]}
        value={query}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.muted}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="search"
      />

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <View style={pickerStyles.dropdown}>
          {loading && suggestions.length === 0 && (
            <View style={pickerStyles.dropdownLoading}>
              <ActivityIndicator color={theme.colors.accent.primary} size="small" />
            </View>
          )}
          {!loading && suggestions.length === 0 && (
            <Text style={pickerStyles.dropdownEmpty}>No matches</Text>
          )}
          <ScrollView keyboardShouldPersistTaps="always" style={{ maxHeight: 220 }}>
            {suggestions.map((name) => (
              <Pressable
                key={name}
                onPress={() => pickSuggestion(name)}
                style={({ pressed }) => [
                  pickerStyles.dropdownRow,
                  pressed && pickerStyles.dropdownRowPressed,
                ]}
              >
                <Text style={pickerStyles.dropdownRowText} numberOfLines={1}>
                  {name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Selected card preview */}
      {selected && (
        <View style={pickerStyles.selectedRow}>
          {selected.artCrop ? (
            <Image source={{ uri: selected.artCrop }} style={pickerStyles.selectedArt} />
          ) : (
            <View style={[pickerStyles.selectedArt, pickerStyles.selectedArtFallback]} />
          )}
          <View style={pickerStyles.selectedMeta}>
            <Text style={pickerStyles.selectedName} numberOfLines={1}>
              {selected.name}
            </Text>
            <ManaIdentityRow colors={selected.colorIdentity} size="xs" />
          </View>
        </View>
      )}

      {resolving && (
        <View style={pickerStyles.resolvingRow}>
          <ActivityIndicator color={theme.colors.accent.primary} size="small" />
          <Text style={pickerStyles.resolvingText}>Loading card…</Text>
        </View>
      )}
    </View>
  );
}

const createPickerStyles = (t: AppTheme) => ({
  block: { gap: spacing[2] },
  inputSelected: {
    borderColor: t.colors.accent.primary + 'AA',
  },
  dropdown: {
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    marginTop: -spacing[1],
    overflow: 'hidden' as const,
  },
  dropdownLoading: {
    padding: spacing[3],
    alignItems: 'center' as const,
  },
  dropdownEmpty: {
    color: t.colors.text.muted,
    padding: spacing[3],
    textAlign: 'center' as const,
    fontSize: t.typography.size['body-sm'],
  },
  dropdownRow: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: t.colors.border.subtle,
  },
  dropdownRowPressed: {
    backgroundColor: t.colors.background.surface,
  },
  dropdownRowText: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'] ?? t.typography.size['body-lg'],
  },
  selectedRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[3],
    padding: spacing[2],
    borderRadius: t.radius.md,
    backgroundColor: t.colors.background.surface,
  },
  selectedArt: {
    width: 56,
    height: 56,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.border.subtle,
  },
  selectedArtFallback: {
    backgroundColor: t.colors.border.subtle,
  },
  selectedMeta: {
    flex: 1,
    gap: spacing[1],
  },
  selectedName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'] ?? t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
  },
  resolvingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  resolvingText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
  },
});

// ─── DeckForm ────────────────────────────────────────────────────────────────

export type DeckCreateCommanderInput = {
  scryfall_id: string;
  name: string;
  color_identity: string[];
  art_crop: string | null;
  is_partner: boolean;
};

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
  onCreateCommander: (input: DeckCreateCommanderInput) => Promise<{ id: string }>;
}

export function DeckForm({ visible, deck, onSave, onClose, onCreateCommander }: DeckFormProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  // Deck fields
  const [deckName, setDeckName] = useState('');
  const [description, setDescription] = useState('');

  // Scryfall-resolved commanders
  const [cmd1, setCmd1] = useState<ScryfallCommander | null>(null);
  const [cmd2, setCmd2] = useState<ScryfallCommander | null>(null);

  // Partner toggle
  const [hasPartner, setHasPartner] = useState(false);

  const [saving, setSaving] = useState(false);

  // Hydrate when opening the form (editing or creating)
  useEffect(() => {
    if (!visible) return;
    if (deck) {
      setDeckName(deck.name);
      setDescription(deck.description ?? '');
      setCmd1(commanderToScryfall(deck.commander));
      if (deck.commander2) {
        setHasPartner(true);
        setCmd2(commanderToScryfall(deck.commander2));
      } else {
        setHasPartner(false);
        setCmd2(null);
      }
    } else {
      setDeckName('');
      setDescription('');
      setCmd1(null);
      setCmd2(null);
      setHasPartner(false);
    }
  }, [deck, visible]);

  async function handleSave() {
    if (!deckName.trim()) {
      Alert.alert(t('deck.nameRequired'), t('deck.nameRequiredMessage'));
      return;
    }
    if (!cmd1) {
      Alert.alert(t('common.error'), 'Select a commander from the search results.');
      return;
    }
    if (hasPartner && !cmd2) {
      Alert.alert(t('common.error'), 'Select a partner commander from the search results.');
      return;
    }

    setSaving(true);
    try {
      const created1 = await onCreateCommander({
        scryfall_id: cmd1.id,
        name: cmd1.name,
        color_identity: cmd1.colorIdentity,
        art_crop: cmd1.artCrop,
        is_partner: hasPartner, // rely on user toggle for this deck's partner intent
      });

      let cmd2Id: string | null = null;
      if (hasPartner && cmd2) {
        const created2 = await onCreateCommander({
          scryfall_id: cmd2.id,
          name: cmd2.name,
          color_identity: cmd2.colorIdentity,
          art_crop: cmd2.artCrop,
          is_partner: true,
        });
        cmd2Id = created2.id;
      }

      await onSave({
        name: deckName.trim(),
        commander_id: created1.id,
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

  // Partner hint: auto-suggest enabling partner toggle if the picked cmd1 has partner text
  const partnerHint = useMemo(() => cmd1?.hasPartner ?? false, [cmd1]);

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
          <CommanderPicker
            label={t('game.commander')}
            selected={cmd1}
            onSelect={setCmd1}
            placeholder="e.g. Atraxa, Praetors' Voice"
          />

          {/* Partner toggle */}
          <View style={styles.partnerRow}>
            <Text style={styles.partnerLabel}>
              Partner Commander
              {partnerHint && !hasPartner && (
                <Text style={{ color: theme.colors.accent.primary }}>  ·  has Partner</Text>
              )}
            </Text>
            <Switch
              value={hasPartner}
              onValueChange={(v) => {
                setHasPartner(v);
                if (!v) setCmd2(null);
              }}
              trackColor={{ false: theme.colors.border.strong, true: theme.colors.accent.primary + '88' }}
              thumbColor={hasPartner ? theme.colors.accent.primary : theme.colors.text.muted}
            />
          </View>

          {/* Partner Commander */}
          {hasPartner && (
            <CommanderPicker
              label="Partner Commander"
              selected={cmd2}
              onSelect={setCmd2}
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

// Map our DB Commander → ScryfallCommander (lossy but enough for UI prefill)
function commanderToScryfall(c: { id: string; scryfallId: string | null; name: string; colorIdentity: string[]; artCrop: string | null; isPartner: boolean }): ScryfallCommander {
  return {
    id: c.scryfallId ?? c.id,
    name: c.name,
    colorIdentity: c.colorIdentity ?? [],
    artCrop: c.artCrop,
    hasPartner: c.isPartner,
  };
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
    color: t.colors.accent.onPrimary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
  },
  btnDisabled: { opacity: 0.6 },
});
