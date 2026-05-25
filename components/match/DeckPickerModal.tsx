/**
 * DeckPickerModal — pageSheet modal for assigning a deck to a player slot in
 * the match setup screen.
 *
 * Behaviour:
 *  - Personal scope: flat ranked list of all the user's decks.
 *  - Pod scope: sections per owner, collapsed by default *except* the
 *    section for the player whose slot is being filled. That player's
 *    decks are visible immediately, everyone else is one tap away. Common
 *    case (assign your own deck) → zero extra taps; rare case → one tap.
 *
 * Header styling: gold small-caps eyebrow + per-section deck count badge,
 * matching the visual language we shipped on the Stats redesign.
 *
 * Future-A (search): the filtering pipeline below is split into two clear
 * steps — (1) flat `pickerDecks` from props, (2) grouped + collapsed view
 * derived in render. Adding a search bar is purely additive:
 *   - add a TextInput between the modal header and the list,
 *   - keep its value in `searchQuery` state,
 *   - filter `pickerDecks` against `deck.name`, `deck.commander.name`, and
 *     `deck.commander2?.name` (case-insensitive `includes`),
 *   - when `searchQuery !== ''`, skip the grouped/collapsed view and render
 *     the filtered list flat (drop the owner sections — they get in the
 *     way of search results).
 * No structural rewrite required.
 */
import { LayoutAnimation, Modal, Pressable, ScrollView, Text, UIManager, View, Platform } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import type { DeckWithCommanders } from '@/services/decks';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

// Enable LayoutAnimation on Android — iOS has it on by default. One-time
// per-process call; cheap, guarded by the platform check.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type PickerDeck = DeckWithCommanders & { ownerName?: string };

interface DeckPickerModalProps {
  visible: boolean;
  /**
   * Decks available to pick from. In pod scope the `ownerName` field drives
   * the grouping; personal scope decks have no `ownerName` and render flat.
   */
  decks: PickerDeck[];
  /** Currently selected deck id for the slot being filled (highlights the row). */
  selectedDeckId: string | null;
  /**
   * Name of the player whose slot is being filled. Used to choose which
   * owner section starts expanded — the section matching this name is
   * the only one open by default. Pass null in personal scope.
   */
  forPlayerName: string | null;
  /** Tells the picker we're in pod scope and should render sections. */
  grouped: boolean;
  onSelect: (deckId: string) => void;
  onClose: () => void;
}

export function DeckPickerModal({
  visible,
  decks,
  selectedDeckId,
  forPlayerName,
  grouped,
  onSelect,
  onClose,
}: DeckPickerModalProps) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  // Grouped view: { ownerName: PickerDeck[] }. Owner order is "the slot's
  // own player first, then everyone else alphabetically" — keeps the
  // common-case section pinned at the top.
  const sections = useMemo(() => {
    if (!grouped) return null;
    const byOwner: Record<string, PickerDeck[]> = {};
    for (const d of decks) {
      const key = d.ownerName ?? t('match.unknownOwner');
      (byOwner[key] ??= []).push(d);
    }
    const owners = Object.keys(byOwner).sort((a, b) => {
      if (a === forPlayerName) return -1;
      if (b === forPlayerName) return 1;
      return a.localeCompare(b);
    });
    return owners.map((owner) => ({ owner, decks: byOwner[owner] }));
  }, [grouped, decks, forPlayerName, t]);

  // Collapse state. Default: only the slot-player's section open. We
  // re-derive this every time the modal opens with a different player so
  // re-opening for a *different* slot lands on that slot's decks too.
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!visible || !grouped) return;
    setExpandedOwners(new Set(forPlayerName ? [forPlayerName] : []));
  }, [visible, grouped, forPlayerName]);

  function toggleOwner(owner: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedOwners((prev) => {
      const next = new Set(prev);
      if (next.has(owner)) next.delete(owner);
      else next.add(owner);
      return next;
    });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('match.selectADeck')}</Text>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel={t('match.closeDeckSelector')}
          >
            <Feather name="x" size={18} style={styles.closeIcon} />
          </Pressable>
        </View>

        {/* FUTURE-A: search input goes here. Wired to a `searchQuery`
            state, it filters `decks` by name + commander name and, when
            non-empty, the render branch below skips the grouped view in
            favour of a flat filtered list. */}

        {sections ? (
          <ScrollView
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {sections.map(({ owner, decks: ownerDecks }) => {
              const isExpanded = expandedOwners.has(owner);
              const isFocusedOwner = owner === forPlayerName;
              return (
                <View key={owner} style={styles.section}>
                  <Pressable
                    onPress={() => toggleOwner(owner)}
                    style={styles.sectionHeader}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                  >
                    <Feather
                      name={isExpanded ? 'chevron-down' : 'chevron-right'}
                      size={16}
                      style={styles.sectionChevron}
                    />
                    <Text
                      style={[
                        styles.sectionEyebrow,
                        isFocusedOwner && styles.sectionEyebrowFocused,
                      ]}
                      numberOfLines={1}
                    >
                      {owner}
                    </Text>
                    <View style={styles.sectionCount}>
                      <Text style={styles.sectionCountText}>{ownerDecks.length}</Text>
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.sectionBody}>
                      {ownerDecks.map((deck, idx) => (
                        <View key={deck.id}>
                          {idx > 0 && <View style={styles.separator} />}
                          <DeckOption
                            deck={deck}
                            isSelected={selectedDeckId === deck.id}
                            onSelect={() => onSelect(deck.id)}
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        ) : (
          // Personal scope — no owner grouping needed, flat list.
          <ScrollView
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {decks.map((deck, idx) => (
              <View key={deck.id}>
                {idx > 0 && <View style={styles.separator} />}
                <DeckOption
                  deck={deck}
                  isSelected={selectedDeckId === deck.id}
                  onSelect={() => onSelect(deck.id)}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── DeckOption ──────────────────────────────────────────────────────────────

function DeckOption({
  deck,
  isSelected,
  onSelect,
}: {
  deck: PickerDeck;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={onSelect}
      style={[styles.deckOption, isSelected && styles.deckOptionSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
    >
      <View style={styles.deckOptionInfo}>
        <Text style={styles.deckOptionName} numberOfLines={1}>
          {deck.name}
        </Text>
        <Text style={styles.deckOptionCommander} numberOfLines={1}>
          {deck.commander.name}
          {deck.commander2 ? ` / ${deck.commander2.name}` : ''}
        </Text>
      </View>
      <ManaIdentityRow colors={deck.commander.colorIdentity} size="xs" />
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
  },
  title: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.semibold,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: t.radius.round,
    backgroundColor: t.colors.background.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  closeIcon: {
    color: t.colors.text.secondary,
  },

  list: {
    paddingTop: spacing[2],
    paddingBottom: spacing[8],
  },

  // Section header — gold small-caps + count badge. Replaces the weak
  // muted text that was hard to spot against the sea of decks.
  section: {
    marginTop: spacing[2],
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
  },
  sectionChevron: {
    color: t.colors.text.muted,
  },
  sectionEyebrow: {
    flex: 1,
    color: t.colors.accent.primary,
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 2.4,
    textTransform: 'uppercase' as const,
  },
  // Slight emphasis on the section matching the slot's player — they
  // matter slightly more than the others on first glance.
  sectionEyebrowFocused: {
    color: t.colors.accent.primary,
    fontWeight: t.typography.weight.bold,
  },
  sectionCount: {
    minWidth: 26,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: t.radius.round,
    backgroundColor: t.colors.accent.primary + '22',
    alignItems: 'center' as const,
  },
  sectionCountText: {
    color: t.colors.accent.primary,
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.semibold,
  },
  sectionBody: {
    paddingVertical: spacing[1],
  },

  separator: {
    height: 1,
    backgroundColor: t.colors.border.subtle,
    marginHorizontal: spacing[4],
    opacity: 0.4,
  },
  deckOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  deckOptionSelected: {
    backgroundColor: t.colors.accent.primary + '1A',
  },
  deckOptionInfo: {
    flex: 1,
    gap: spacing[1],
  },
  deckOptionName: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
  },
  deckOptionCommander: {
    color: t.colors.text.tertiary,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size['body-sm'],
  },
});
