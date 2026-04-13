/**
 * MatchSetupForm — SCR-007 Match Setup form.
 *
 * Two-section layout:
 *  1. Player selection chips (CMP-019)
 *  2. Deck assignment per selected player (CMP-018)
 *
 * Includes inline deck picker Modal (pageSheet) and duplicate-deck validation.
 *
 * MATCH-005 (EPIC-02)
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import { ColorChips } from '@/components/ui/ColorChips';
import { useDecks } from '@/hooks/useDecks';
import { usePlayers } from '@/hooks/usePlayers';
import { useMatchSetup } from '@/hooks/useMatchSetup';
import type { DeckWithCommanders } from '@/services/decks';
import { colors, radius, spacing, typography } from '@/styles/tokens';

import { PlayerSelectorChip } from './PlayerSelectorChip';

interface MatchSetupFormProps {
  onSubmit: (matchId: string) => void;
}

export function MatchSetupForm({ onSubmit }: MatchSetupFormProps) {
  const { t } = useTranslation();
  const { players, loading: loadingPlayers } = usePlayers();
  const { decks, loading: loadingDecks } = useDecks();
  const {
    selectedPlayerIds,
    deckAssignments,
    togglePlayer,
    setDeck,
    duplicateDeckIds,
    isValid,
    isSubmitting,
    apiError,
    submit,
  } = useMatchSetup();

  // deckPickerFor: playerId currently opening the deck picker, or null.
  const [deckPickerFor, setDeckPickerFor] = useState<string | null>(null);

  async function handleSubmit() {
    const matchId = await submit();
    if (matchId) onSubmit(matchId);
  }

  // ─── Edge cases ───────────────────────────────────────────────────────────

  if (loadingPlayers || loadingDecks) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }

  if (players.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.edgeCaseTitle}>{t('match.noPlayersYet')}</Text>
        <Text style={styles.edgeCaseBody}>{t('match.noPlayersEdgeBody')}</Text>
      </View>
    );
  }

  if (decks.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.edgeCaseTitle}>{t('match.noDecksYet')}</Text>
        <Text style={styles.edgeCaseBody}>{t('match.noDecksEdgeBody')}</Text>
      </View>
    );
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const selectedPlayers = selectedPlayerIds
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean) as typeof players;

  const hasDuplicate = duplicateDeckIds.size > 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section 1: Player selection ── */}
        <Text style={styles.sectionLabel}>{t('match.selectPlayersLabel')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {players.map((player) => (
            <PlayerSelectorChip
              key={player.id}
              player={player}
              isSelected={selectedPlayerIds.includes(player.id)}
              onPress={() => togglePlayer(player.id)}
            />
          ))}
        </ScrollView>

        {selectedPlayerIds.length > 0 && selectedPlayerIds.length < 2 && (
          <Text style={styles.hintText}>{t('match.selectMorePlayers')}</Text>
        )}

        {/* ── Section 2: Deck assignment ── */}
        {selectedPlayers.length >= 1 && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>{t('match.assignDecks')}</Text>

            {selectedPlayers.map((player) => {
              const assignedDeck = decks.find((d) => d.id === deckAssignments[player.id]);
              const isDuplicateDeck = assignedDeck ? duplicateDeckIds.has(assignedDeck.id) : false;
              const initials = player.name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <View key={player.id} style={styles.slotRow}>
                  {/* Player badge */}
                  <View style={styles.slotAvatar}>
                    <Text style={styles.slotAvatarText}>{initials}</Text>
                  </View>
                  <Text style={styles.slotPlayerName} numberOfLines={1}>
                    {player.name}
                  </Text>

                  {/* Deck picker trigger */}
                  <Pressable
                    onPress={() => setDeckPickerFor(player.id)}
                    style={[styles.deckTrigger, isDuplicateDeck && styles.deckTriggerError]}
                    accessibilityLabel={`${t('match.selectDeck')} ${player.name}`}
                    accessibilityRole="button"
                  >
                    {assignedDeck ? (
                      <View style={styles.deckTriggerFilled}>
                        <Text style={styles.deckTriggerName} numberOfLines={1}>
                          {assignedDeck.name}
                        </Text>
                        <ColorChips selected={assignedDeck.commander.colors} readonly />
                      </View>
                    ) : (
                      <Text style={styles.deckTriggerPlaceholder}>{t('match.selectDeck')}</Text>
                    )}
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                </View>
              );
            })}

            {/* Duplicate deck inline error */}
            {hasDuplicate && (
              <Text style={styles.errorText}>{t('match.sameDeckError')}</Text>
            )}
          </>
        )}

        {/* API error */}
        {apiError && <Text style={styles.errorText}>{apiError}</Text>}

        {/* Bottom spacer so footer doesn't cover last row */}
        <View style={styles.scrollSpacer} />
      </ScrollView>

      {/* ── Footer: Submit ── */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
          style={[styles.submitBtn, (!isValid || isSubmitting) && styles.submitBtnDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValid || isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.text.inverse} size="small" />
          ) : (
            <Text style={[styles.submitBtnText, (!isValid || isSubmitting) && styles.submitBtnTextDisabled]}>
              {t('match.startMatch')}
            </Text>
          )}
        </Pressable>
      </View>

      {/* ── Deck Picker Modal ── */}
      <Modal
        visible={deckPickerFor !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDeckPickerFor(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('match.selectADeck')}</Text>
            <Pressable
              onPress={() => setDeckPickerFor(null)}
              style={styles.modalClose}
              accessibilityLabel={t('match.closeDeckSelector')}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          <FlatList
            data={decks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected =
                deckPickerFor !== null && deckAssignments[deckPickerFor] === item.id;
              return (
                <DeckOption
                  deck={item}
                  isSelected={isSelected}
                  onSelect={() => {
                    if (deckPickerFor) setDeck(deckPickerFor, item.id);
                    setDeckPickerFor(null);
                  }}
                />
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.deckList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Modal>
    </>
  );
}

// ─── DeckOption ──────────────────────────────────────────────────────────────

function DeckOption({
  deck,
  isSelected,
  onSelect,
}: {
  deck: DeckWithCommanders;
  isSelected: boolean;
  onSelect: () => void;
}) {
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
      <ColorChips selected={deck.commander.colors} readonly />
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 36;
const FOOTER_HEIGHT = 88;

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  scrollSpacer: {
    height: FOOTER_HEIGHT + spacing[4],
  },

  // ─── Sections ─────────────────────────────────────────────────────────────
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },
  chipsRow: {
    gap: spacing[2],
    paddingBottom: spacing[2],
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing[6],
  },
  hintText: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
  },

  // ─── Player slot ──────────────────────────────────────────────────────────
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  slotAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.round,
    backgroundColor: colors.accent.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  slotAvatarText: {
    color: colors.accent.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
  },
  slotPlayerName: {
    color: colors.text.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
    width: 64,
    flexShrink: 0,
  },

  // ─── Deck trigger ─────────────────────────────────────────────────────────
  deckTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border?.default ?? '#2A2A45',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 44,
  },
  deckTriggerError: {
    borderColor: colors.status.error,
  },
  deckTriggerFilled: {
    flex: 1,
    gap: spacing[1],
  },
  deckTriggerName: {
    color: colors.text.primary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  deckTriggerPlaceholder: {
    flex: 1,
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
  },
  chevron: {
    color: colors.text.muted,
    fontSize: 20,
    marginLeft: spacing[2],
  },

  // ─── Errors ───────────────────────────────────────────────────────────────
  errorText: {
    color: colors.status.error,
    fontSize: typography.size['body-sm'],
    marginTop: spacing[3],
  },

  // ─── Footer ───────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    paddingTop: spacing[3],
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  submitBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.xl,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: colors.background.surface,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.5,
  },
  submitBtnTextDisabled: {
    color: colors.text.muted,
  },

  // ─── Deck Picker Modal ────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  modalTitle: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.semibold,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: radius.round,
    backgroundColor: colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
  },
  deckList: {
    paddingVertical: spacing[2],
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing[4],
  },
  deckOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  deckOptionSelected: {
    backgroundColor: colors.accent.primary + '1A',
  },
  deckOptionInfo: {
    flex: 1,
    gap: spacing[1],
  },
  deckOptionName: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
  },
  deckOptionCommander: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
  },

  // ─── Edge cases ───────────────────────────────────────────────────────────
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
    gap: spacing[3],
  },
  edgeCaseTitle: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
  edgeCaseBody: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    textAlign: 'center',
    lineHeight: typography.size['body-sm'] * 1.5,
  },
});
