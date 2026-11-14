/**
 * DecklistSection — a deck's optional full card list on the deck screen.
 *
 * - Owner: paste a list to import or replace it, remove it, set a Moxfield link.
 * - Everyone who can see the deck: read the list, tap a card for its image
 *   and rules text, open the Moxfield link.
 *
 * Unresolved lines and cards outside the commander's colour identity are
 * listed first with a warning. Card names are always shown in English.
 * The app never requests anything from Moxfield — the link just opens.
 *
 * DECK-005, DECK-006 (EPIC-07)
 */
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/contexts/ThemeContext';
import { useDecklist } from '@/hooks/useDecklist';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { DecklistCard } from '@/services/decklists';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

interface DecklistSectionProps {
  deckId: string;
  moxfieldUrl: string | null | undefined;
}

/** Display order for card-type groups (MTG terms stay in English). */
const TYPE_ORDER = [
  'Creature', 'Planeswalker', 'Battle', 'Instant', 'Sorcery',
  'Artifact', 'Enchantment', 'Land', 'Other',
] as const;

function typeGroup(card: DecklistCard): string {
  // "Legendary Artifact Creature — Golem" → card types before the dash.
  const types = (card.card?.type_line ?? '').split('—')[0];
  // Creature wins over Artifact/Enchantment; Land wins for "Artifact Land".
  for (const type of ['Creature', 'Land', ...TYPE_ORDER]) {
    if (types.includes(type)) return type;
  }
  return 'Other';
}

export function DecklistSection({ deckId, moxfieldUrl }: DecklistSectionProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { data, loading, saving, importText, remove, saveMoxfieldUrl } = useDecklist(deckId);

  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState(moxfieldUrl ?? null);
  const [linkDraft, setLinkDraft] = useState(moxfieldUrl ?? '');
  const [linkSaving, setLinkSaving] = useState(false);
  const [selected, setSelected] = useState<DecklistCard | null>(null);

  const groups = useMemo(() => {
    const problems: DecklistCard[] = [];
    const byType = new Map<string, DecklistCard[]>();
    for (const c of data?.cards ?? []) {
      if (!c.card || c.off_identity) {
        problems.push(c);
        continue;
      }
      const g = typeGroup(c);
      byType.set(g, [...(byType.get(g) ?? []), c]);
    }
    return {
      problems,
      typed: TYPE_ORDER.filter((g) => byType.has(g)).map((g) => ({ type: g, cards: byType.get(g)! })),
    };
  }, [data]);

  if (loading || !data) return null;

  const hasList = data.cards.length > 0;
  const canEdit = data.can_edit;
  // Nothing to show a viewer who cannot edit.
  if (!hasList && !link && !canEdit) return null;

  const onImport = async () => {
    setError(null);
    try {
      await importText(text);
      setEditing(false);
      setText('');
      setExpanded(true);
    } catch (e) {
      setError((e as Error).message || t('decklist.importFailed'));
    }
  };

  const onSaveLink = async () => {
    setError(null);
    setLinkSaving(true);
    try {
      const saved = await saveMoxfieldUrl(linkDraft);
      setLink(saved);
      setLinkDraft(saved ?? '');
    } catch (e) {
      setError((e as Error).message || t('decklist.linkFailed'));
    } finally {
      setLinkSaving(false);
    }
  };

  const onRemove = () => {
    Alert.alert(t('decklist.removeTitle'), t('decklist.removeMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('decklist.remove'),
        style: 'destructive',
        onPress: () => {
          remove().catch((e) => setError((e as Error).message));
        },
      },
    ]);
  };

  const renderRow = (c: DecklistCard) => (
    <TouchableOpacity
      key={c.raw_name}
      style={styles.cardRow}
      activeOpacity={c.card ? 0.7 : 1}
      onPress={() => c.card && setSelected(c)}
    >
      <Text style={styles.cardQty}>{c.quantity}</Text>
      <Text style={[styles.cardName, !c.card && styles.cardNameUnresolved]} numberOfLines={1}>
        {c.card?.name ?? c.raw_name}
      </Text>
      {!c.card && <Text style={styles.flag}>{t('decklist.notFound')}</Text>}
      {c.off_identity && <Text style={styles.flag}>{t('decklist.offIdentity')}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.section}>
      <Text style={styles.title}>
        {t('decklist.title')}
        {hasList ? <Text style={styles.count}>{`  ${data.total_cards}`}</Text> : null}
      </Text>

      <View style={styles.card}>
        {/* ── Summary / toggle ── */}
        {hasList ? (
          <TouchableOpacity
            style={styles.summaryRow}
            activeOpacity={0.7}
            onPress={() => setExpanded((v) => !v)}
          >
            <View style={styles.summaryText}>
              <Text style={styles.summaryMain}>
                {t('decklist.cardsCount', { count: data.total_cards })}
              </Text>
              {(data.unresolved_count > 0 || data.off_identity_count > 0) && (
                <Text style={styles.summaryWarn}>
                  {[
                    data.unresolved_count > 0
                      ? t('decklist.unresolvedCount', { count: data.unresolved_count })
                      : null,
                    data.off_identity_count > 0
                      ? t('decklist.offIdentityCount', { count: data.off_identity_count })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              )}
            </View>
            <Text style={styles.linkText}>
              {expanded ? t('decklist.hide') : t('decklist.show')}
            </Text>
          </TouchableOpacity>
        ) : (
          canEdit && !editing && <Text style={styles.empty}>{t('decklist.empty')}</Text>
        )}

        {/* ── List ── */}
        {hasList && expanded && (
          <View style={styles.list}>
            {groups.problems.length > 0 && (
              <View style={styles.group}>
                <Text style={styles.groupTitleWarn}>{t('decklist.needsAttention')}</Text>
                {groups.problems.map(renderRow)}
              </View>
            )}
            {groups.typed.map((g) => (
              <View key={g.type} style={styles.group}>
                <Text style={styles.groupTitle}>
                  {g.type} ({g.cards.reduce((n, c) => n + c.quantity, 0)})
                </Text>
                {g.cards.map(renderRow)}
              </View>
            ))}
          </View>
        )}

        {/* ── Moxfield link ── */}
        {link && !editing && (
          <TouchableOpacity onPress={() => Linking.openURL(link)} activeOpacity={0.7}>
            <Text style={styles.linkText}>{t('decklist.openMoxfield')} ↗</Text>
          </TouchableOpacity>
        )}

        {/* ── Owner actions ── */}
        {canEdit && !editing && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btn} onPress={() => { setError(null); setEditing(true); }}>
              <Text style={styles.btnText}>
                {hasList ? t('decklist.replace') : t('decklist.add')}
              </Text>
            </TouchableOpacity>
            {hasList && (
              <TouchableOpacity style={styles.btnGhost} onPress={onRemove} disabled={saving}>
                <Text style={styles.btnGhostText}>{t('decklist.remove')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Editor ── */}
        {canEdit && editing && (
          <View style={styles.editor}>
            <Text style={styles.hint}>{t('decklist.pasteHint')}</Text>
            <TextInput
              style={styles.textArea}
              value={text}
              onChangeText={setText}
              placeholder={'1 Sol Ring\n1 Arcane Signet\n1 Command Tower'}
              placeholderTextColor={theme.colors.text.muted}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              textAlignVertical="top"
              editable={!saving}
            />
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, (saving || text.trim() === '') && styles.btnDisabled]}
                onPress={onImport}
                disabled={saving || text.trim() === ''}
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.accent.primary} size="small" />
                ) : (
                  <Text style={styles.btnText}>{t('decklist.import')}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnGhost}
                onPress={() => { setEditing(false); setError(null); }}
                disabled={saving}
              >
                <Text style={styles.btnGhostText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>{t('decklist.moxfieldLabel')}</Text>
            <View style={styles.linkRow}>
              <TextInput
                style={styles.linkInput}
                value={linkDraft}
                onChangeText={setLinkDraft}
                placeholder="https://moxfield.com/decks/…"
                placeholderTextColor={theme.colors.text.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!linkSaving}
              />
              <TouchableOpacity
                style={[styles.btnGhost, linkSaving && styles.btnDisabled]}
                onPress={onSaveLink}
                disabled={linkSaving || linkDraft.trim() === (link ?? '')}
              >
                <Text style={styles.btnGhostText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      {/* ── Card detail ── */}
      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {selected?.card?.image_url ? (
                <Image
                  source={{ uri: selected.card.image_url }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              ) : null}
              <Text style={styles.modalName}>{selected?.card?.name}</Text>
              {selected?.card?.type_line ? (
                <Text style={styles.modalType}>{selected.card.type_line}</Text>
              ) : null}
              {selected?.card?.oracle_text ? (
                <Text style={styles.modalOracle}>{selected.card.oracle_text}</Text>
              ) : null}
            </ScrollView>
            <TouchableOpacity style={styles.btnGhost} onPress={() => setSelected(null)}>
              <Text style={styles.btnGhostText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  section: { gap: spacing[3] },
  title: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  count: { color: t.colors.text.muted, fontWeight: t.typography.weight.regular },
  card: {
    gap: spacing[3],
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing[3],
  },
  summaryText: { flexShrink: 1, gap: 2 },
  summaryMain: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'],
    fontWeight: t.typography.weight.semibold,
  },
  summaryWarn: { color: t.colors.status.error, fontSize: t.typography.size.caption },
  empty: { color: t.colors.text.muted, fontSize: t.typography.size['body-sm'] },
  linkText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  list: { gap: spacing[3] },
  group: { gap: 2 },
  groupTitle: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  groupTitleWarn: {
    color: t.colors.status.error,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
    paddingVertical: 5,
  },
  cardQty: {
    width: 24,
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontVariant: ['tabular-nums' as const],
  },
  cardName: {
    flex: 1,
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
  },
  cardNameUnresolved: { color: t.colors.text.muted, fontStyle: 'italic' as const },
  flag: {
    color: t.colors.status.error,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
  },
  actions: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing[3] },
  btn: {
    minHeight: 40,
    paddingHorizontal: spacing[4],
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.accent.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  btnGhost: {
    minHeight: 40,
    paddingHorizontal: spacing[2],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnGhostText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  editor: { gap: spacing[2] },
  hint: { color: t.colors.text.muted, fontSize: t.typography.size.caption },
  textArea: {
    minHeight: 160,
    maxHeight: 280,
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
    borderWidth: 1,
    borderColor: t.colors.border.default,
    borderRadius: t.radius.lg,
    padding: spacing[3],
  },
  linkRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing[2] },
  linkInput: {
    flex: 1,
    minHeight: 40,
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
    borderWidth: 1,
    borderColor: t.colors.border.default,
    borderRadius: t.radius.lg,
    paddingHorizontal: spacing[3],
  },
  error: { color: t.colors.status.error, fontSize: t.typography.size['body-sm'] },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: spacing[4],
  },
  modalCard: {
    width: '100%' as const,
    maxWidth: 380,
    maxHeight: '90%' as const,
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    padding: spacing[4],
    gap: spacing[2],
  },
  modalContent: { gap: spacing[2], alignItems: 'center' as const },
  modalImage: { width: '100%' as const, aspectRatio: 488 / 680, borderRadius: 12 },
  modalName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
    textAlign: 'center' as const,
  },
  modalType: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center' as const,
  },
  modalOracle: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
    lineHeight: 20,
    alignSelf: 'stretch' as const,
  },
});
