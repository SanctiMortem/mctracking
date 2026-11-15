/**
 * DecklistSection — a deck's optional full card list on the deck screen.
 *
 * Read-only: the list, a card's image and rules text on tap, and the Moxfield
 * link. Adding or replacing the list and setting the link happen in the
 * create / edit deck form (DeckForm), not here. Renders nothing for a deck
 * with no list, no link and no history.
 *
 * Every import is kept as a dated version (DECK-007); "History" opens the
 * versions with what changed between them.
 *
 * Unresolved lines and cards outside the commander's colour identity are
 * listed first with a warning. Card names are always shown in English.
 * The app never requests anything from Moxfield — the link just opens.
 *
 * DECK-005, DECK-006 (EPIC-07)
 */
import { useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { DeckVersionHistory } from '@/components/decks/DeckVersionHistory';
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
  const { t, i18n } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { data, loading } = useDecklist(deckId);

  const [expanded, setExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
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
  const link = moxfieldUrl ?? null;
  // An API older than versioning sends no version fields.
  const versionCount = data.version_count ?? 0;
  const hasHistory = versionCount > 1;
  if (!hasList && !link && !hasHistory) return null;

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
              {data.version ? (
                <Text style={styles.summaryMeta}>
                  {t('decklist.history.version', { number: data.version.number })}
                  {' · '}
                  {new Date(data.version.created_at).toLocaleDateString(i18n.language, {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Text>
              ) : null}
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
        ) : null}

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

        {/* ── Version history ── */}
        {hasHistory && (
          <View style={styles.list}>
            <TouchableOpacity
              style={styles.summaryRow}
              activeOpacity={0.7}
              onPress={() => setHistoryOpen((v) => !v)}
            >
              <Text style={styles.summaryMeta}>
                {t('decklist.history.title')} · {t('decklist.history.versionsCount', { count: versionCount })}
              </Text>
              <Text style={styles.linkText}>
                {historyOpen ? t('decklist.hide') : t('decklist.show')}
              </Text>
            </TouchableOpacity>
            {historyOpen && <DeckVersionHistory deckId={deckId} />}
          </View>
        )}

        {/* ── Moxfield link ── */}
        {link && (
          <TouchableOpacity onPress={() => Linking.openURL(link)} activeOpacity={0.7}>
            <Text style={styles.linkText}>{t('decklist.openMoxfield')} ↗</Text>
          </TouchableOpacity>
        )}

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
  summaryMeta: { color: t.colors.text.muted, fontSize: t.typography.size.caption },
  summaryWarn: { color: t.colors.status.error, fontSize: t.typography.size.caption },
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
