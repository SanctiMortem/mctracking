/**
 * MatchSetupForm — SCR-007 Match Setup form.
 *
 * Two-section layout:
 *  1. Player selection chips (CMP-019)
 *  2. Deck assignment per selected player (CMP-018)
 *
 * Deck picker UI lives in its own DeckPickerModal component.
 *
 * MATCH-005 (EPIC-02)
 */
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import { useDecks } from '@/hooks/useDecks';
import { usePlayers } from '@/hooks/usePlayers';
import { usePodMembers } from '@/hooks/usePodMembers';
import { usePodDecks } from '@/hooks/usePodDecks';
import { useMatchSetup } from '@/hooks/useMatchSetup';
import { useSettings } from '@/hooks/useSettings';
import { useGroupContext } from '@/contexts/GroupContext';
import type { DeckWithCommanders } from '@/services/decks';
import type { PodDeck } from '@/services/pods';
import type { Player } from '@/db/index';
import { spacing } from '@/styles/tokens';

import { DeckPickerModal } from './DeckPickerModal';
import { LayoutPreview } from './LayoutPreview';
import { PlayerSelectorChip } from './PlayerSelectorChip';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Unified deck type for the picker — works for both personal and pod decks.
 * Re-exported via DeckPickerModal so the actual modal owns the canonical shape.
 */
type PickerDeck = DeckWithCommanders & { ownerName?: string };

const STARTING_LIFE_OPTIONS = [25, 30, 40] as const;

interface MatchSetupFormProps {
  onSubmit: (matchId: string, rotations: Record<string, number>, playerOrder: string[], layoutVariant: string) => void;
}

export function MatchSetupForm({ onSubmit }: MatchSetupFormProps) {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();
  const { activeContext } = useGroupContext();
  const isPod = activeContext !== 'personal';
  const groupId = isPod ? activeContext : null;

  const { players: personalPlayers, loading: loadingPlayers } = usePlayers();
  const { decks: personalDecks, loading: loadingDecks } = useDecks();
  const { members: podMemberData, loading: loadingPodMembers } = usePodMembers(groupId);
  const { podDecks, loading: loadingPodDecks } = usePodDecks(groupId);
  const { settings } = useSettings();
  const defaultStartingLife = settings?.defaultLifeTotal ?? 40;

  // Build unified player list: pod members + guests (or just personal players)
  const { allPlayers, guestPlayers, podPlayers } = useMemo(() => {
    if (!isPod) {
      return { allPlayers: personalPlayers, guestPlayers: personalPlayers, podPlayers: [] as Player[] };
    }
    const podP = podMemberData.map((m) => m.player);
    // Guests are personal players without accountUserId
    const guests = personalPlayers.filter((p) => !p.accountUserId);
    return {
      allPlayers: [...podP, ...guests],
      guestPlayers: guests,
      podPlayers: podP,
    };
  }, [isPod, personalPlayers, podMemberData]);

  // Build unified deck list
  const allDecks: PickerDeck[] = useMemo(() => {
    if (!isPod) return personalDecks;
    return podDecks.map((d) => ({ ...d, ownerName: d.ownerName }));
  }, [isPod, personalDecks, podDecks]);

  const isDataLoading = isPod
    ? loadingPlayers || loadingPodMembers || loadingPodDecks
    : loadingPlayers || loadingDecks;

  const {
    selectedPlayerIds,
    deckAssignments,
    rotations,
    layoutVariant,
    startingLife,
    setStartingLife,
    togglePlayer,
    setDeck,
    reorderPlayers,
    setRotation,
    setLayoutVariant,
    duplicateDeckIds,
    isValid,
    isSubmitting,
    apiError,
    submit,
  } = useMatchSetup(groupId, defaultStartingLife);

  // deckPickerFor: playerId currently opening the deck picker, or null.
  const [deckPickerFor, setDeckPickerFor] = useState<string | null>(null);

  async function handleSubmit() {
    const matchId = await submit();
    if (matchId) onSubmit(matchId, rotations, selectedPlayerIds, layoutVariant);
  }

  // ─── Edge cases ───────────────────────────────────────────────────────────

  if (isDataLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.accent.primary} />
      </View>
    );
  }

  if (allPlayers.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.edgeCaseTitle}>{t('match.noPlayersYet')}</Text>
        <Text style={styles.edgeCaseBody}>{t('match.noPlayersEdgeBody')}</Text>
      </View>
    );
  }

  if (allDecks.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.edgeCaseTitle}>{t('match.noDecksYet')}</Text>
        <Text style={styles.edgeCaseBody}>{t('match.noDecksEdgeBody')}</Text>
      </View>
    );
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const selectedPlayers = selectedPlayerIds
    .map((id) => allPlayers.find((p) => p.id === id))
    .filter(Boolean) as Player[];

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

        {isPod && podPlayers.length > 0 && (
          <>
            <Text style={styles.subSectionLabel}>{t('match.podMembers')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {podPlayers.map((player) => (
                <PlayerSelectorChip
                  key={player.id}
                  player={player}
                  isSelected={selectedPlayerIds.includes(player.id)}
                  onPress={() => togglePlayer(player.id)}
                  badge="pod"
                />
              ))}
            </ScrollView>
          </>
        )}

        {isPod && guestPlayers.length > 0 && (
          <>
            <Text style={styles.subSectionLabel}>{t('match.guestPlayers')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {guestPlayers.map((player) => (
                <PlayerSelectorChip
                  key={player.id}
                  player={player}
                  isSelected={selectedPlayerIds.includes(player.id)}
                  onPress={() => togglePlayer(player.id)}
                  badge="guest"
                />
              ))}
            </ScrollView>
          </>
        )}

        {!isPod && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {allPlayers.map((player) => (
              <PlayerSelectorChip
                key={player.id}
                player={player}
                isSelected={selectedPlayerIds.includes(player.id)}
                onPress={() => togglePlayer(player.id)}
              />
            ))}
          </ScrollView>
        )}

        {selectedPlayerIds.length > 0 && selectedPlayerIds.length < 2 && (
          <Text style={styles.hintText}>{t('match.selectMorePlayers')}</Text>
        )}

        {/* ── Section 2: Deck assignment ── */}
        {selectedPlayers.length >= 1 && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>{t('match.assignDecks')}</Text>

            {selectedPlayers.map((player) => {
              const assignedDeck = allDecks.find((d) => d.id === deckAssignments[player.id]);
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
                        <ManaIdentityRow colors={assignedDeck.commander.colorIdentity} size="xs" />
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

        {/* ── Section 3: Starting life ── */}
        {selectedPlayers.length >= 2 && !hasDuplicate && selectedPlayers.every((p) => deckAssignments[p.id]) && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>{t('match.startingLifeSection')}</Text>
            <View style={styles.lifePickerRow}>
              {STARTING_LIFE_OPTIONS.map((value) => {
                const selected = startingLife === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setStartingLife(value)}
                    style={[styles.lifeChip, selected && styles.lifeChipSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.lifeChipText, selected && styles.lifeChipTextSelected]}>
                      {value}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hintText}>{t('match.startingLifeHint')}</Text>
          </>
        )}

        {/* ── Section 4: Position arrangement ── */}
        {selectedPlayers.length >= 2 && !hasDuplicate && selectedPlayers.every((p) => deckAssignments[p.id]) && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>{t('match.arrangePositions')}</Text>

            <LayoutPreview
              players={selectedPlayers.map((p) => ({ id: p.id, name: p.name }))}
              rotations={rotations}
              layoutVariant={layoutVariant}
              onReorder={(reordered) => reorderPlayers(reordered.map((p) => p.id))}
              onRotate={setRotation}
              onLayoutChange={setLayoutVariant}
            />
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
            <ActivityIndicator color={theme.colors.text.inverse} size="small" />
          ) : (
            <Text style={[styles.submitBtnText, (!isValid || isSubmitting) && styles.submitBtnTextDisabled]}>
              {t('match.startMatch')}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Deck picker — lives in its own component (DeckPickerModal). It
          owns the collapsible-by-owner UX and the smart default ("focused
          player's section is the only one open on open"). */}
      <DeckPickerModal
        visible={deckPickerFor !== null}
        decks={allDecks}
        selectedDeckId={deckPickerFor !== null ? deckAssignments[deckPickerFor] ?? null : null}
        forPlayerName={
          deckPickerFor !== null
            ? allPlayers.find((p) => p.id === deckPickerFor)?.name ?? null
            : null
        }
        grouped={isPod}
        onSelect={(deckId) => {
          if (deckPickerFor) setDeck(deckPickerFor, deckId);
          setDeckPickerFor(null);
        }}
        onClose={() => setDeckPickerFor(null)}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 36;
const FOOTER_HEIGHT = 88;

const createStyles = (t: AppTheme) => ({
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
    color: t.colors.text.tertiary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },
  subSectionLabel: {
    color: t.colors.text.muted,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.medium,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
    marginTop: spacing[1],
  },
  chipsRow: {
    gap: spacing[2],
    paddingBottom: spacing[2],
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border.subtle,
    marginVertical: spacing[6],
  },
  hintText: {
    color: t.colors.text.muted,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size.caption,
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
    borderRadius: t.radius.round,
    backgroundColor: t.colors.accent.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  slotAvatarText: {
    color: t.colors.accent.primary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.bold,
  },
  slotPlayerName: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
    width: 64,
    flexShrink: 0,
  },

  // ─── Deck trigger ─────────────────────────────────────────────────────────
  deckTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border?.default ?? '#2A2A45',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 44,
  },
  deckTriggerError: {
    borderColor: t.colors.status.error,
  },
  deckTriggerFilled: {
    flex: 1,
    gap: spacing[1],
  },
  deckTriggerName: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  deckTriggerPlaceholder: {
    flex: 1,
    color: t.colors.text.muted,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size['body-sm'],
  },
  chevron: {
    color: t.colors.text.muted,
    fontSize: 20,
    marginLeft: spacing[2],
  },

  // ─── Starting life picker ─────────────────────────────────────────────────
  lifePickerRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  lifeChip: {
    flex: 1,
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border?.default ?? '#2A2A45',
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  lifeChipSelected: {
    backgroundColor: t.colors.accent.primary,
    borderColor: t.colors.accent.primary,
  },
  lifeChipText: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.semibold,
  },
  lifeChipTextSelected: {
    color: t.colors.accent.onPrimary,
  },

  // ─── Errors ───────────────────────────────────────────────────────────────
  errorText: {
    color: t.colors.status.error,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size['body-sm'],
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
    backgroundColor: t.colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: t.colors.border.subtle,
  },
  submitBtn: {
    backgroundColor: t.colors.accent.primary,
    borderRadius: t.radius.xl,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: t.colors.background.surface,
  },
  submitBtnText: {
    color: t.colors.accent.onPrimary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.5,
  },
  submitBtnTextDisabled: {
    color: t.colors.text.muted,
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
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
    textAlign: 'center',
  },
  edgeCaseBody: {
    color: t.colors.text.tertiary,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center',
    lineHeight: t.typography.size['body-sm'] * 1.5,
  },
})
