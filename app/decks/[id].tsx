/**
 * SCR-013 — Deck Detail FULL.
 *
 * Shows deck name, commander(s) with color chips (partner-aware), description,
 * win rate stats bar, and the list of players who piloted this deck.
 *
 * Replaces DATA-009 stub (EPIC-01).
 * HIST-007 (EPIC-04)
 */
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { CircularWinRate } from '@/components/ui/CircularWinRate';
import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import { useDeckStats } from '@/hooks/useDeckStats';
import { useResponsive } from '@/hooks/useResponsive';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

// ─── Commander card (partner-aware) ──────────────────────────────────────────

function CommanderCard({ name, cardColors, isPartner }: { name: string; cardColors: string[]; isPartner: boolean }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.commanderCard}>
      <View style={styles.commanderHeader}>
        <Text style={styles.commanderName} numberOfLines={1}>{name}</Text>
        {isPartner && (
          <View style={styles.partnerBadge}>
            <Text style={styles.partnerBadgeText}>Partner</Text>
          </View>
        )}
      </View>
      <ManaIdentityRow colors={cardColors} size="sm" />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DeckDetailScreen() {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, contentPadding } = useResponsive();
  const { data, loading, error } = useDeckStats(id);

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent.primary} size="large" />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? t('deck.nameRequired')}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const {
    deck,
    total_matches,
    wins,
    win_rate_pct,
    players_used_by,
    best_matchups,
    worst_matchups,
    strong_against_colors,
    weak_against_colors,
  } = data;
  const hasMatches = total_matches > 0;
  const bgArt = deck.commander.artCrop ?? deck.commander2?.artCrop ?? null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Faded commander background ── */}
      {bgArt && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Image
            source={{ uri: bgArt }}
            style={[StyleSheet.absoluteFillObject, styles.bgImage]}
            resizeMode="cover"
          />
          <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
            <Defs>
              <RadialGradient id="deckBgVignette" cx="50%" cy="45%" rx="75%" ry="75%" fx="50%" fy="45%">
                <Stop offset="0" stopColor={theme.colors.background.primary} stopOpacity="0.55" />
                <Stop offset="1" stopColor={theme.colors.background.primary} stopOpacity="1" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#deckBgVignette)" />
          </Svg>
        </View>
      )}

      {/* ── Nav header ── */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{deck.name}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[8], paddingHorizontal: contentPadding }, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined]}
      >
        {/* ── Commander(s) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {deck.commander2 ? t('deck.partnerSection') : t('deck.commanderSection')}
          </Text>
          <CommanderCard
            name={deck.commander.name}
            cardColors={deck.commander.colorIdentity}
            isPartner={deck.commander.isPartner}
          />
          {deck.commander2 && (
            <>
              <View style={styles.partnerDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerPlus}>+</Text>
                <View style={styles.dividerLine} />
              </View>
              <CommanderCard
                name={deck.commander2.name}
                cardColors={deck.commander2.colorIdentity}
                isPartner={deck.commander2.isPartner}
              />
            </>
          )}
        </View>

        {/* ── Description ── */}
        {deck.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('deck.descriptionSection')}</Text>
            <Text style={styles.description}>{deck.description}</Text>
          </View>
        ) : null}

        {/* ── Stats ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('commanders.stats')}</Text>
          {hasMatches ? (
            <View style={styles.statsCard}>
              <CircularWinRate winRate={win_rate_pct} label={t('common.winRate')} />
              <View style={styles.statsSide}>
                <View style={styles.statSideItem}>
                  <Text style={styles.statValue}>{total_matches}</Text>
                  <Text style={styles.statLabel}>{t('common.matches')}</Text>
                </View>
                <View style={styles.statSideItem}>
                  <Text style={styles.statValue}>{wins}</Text>
                  <Text style={styles.statLabel}>{t('common.wins')}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyStats}>
              <Text style={styles.emptyStatsText}>{t('deck.noMatchesWithDeck')}</Text>
            </View>
          )}
        </View>

        {/* ── Color matchups ── */}
        {(strong_against_colors.length > 0 || weak_against_colors.length > 0) && (
          <View style={styles.section}>
            <View style={styles.colorMatchupRow}>
              {strong_against_colors.length > 0 && (
                <View style={styles.colorMatchupCard}>
                  <View style={styles.colorMatchupLabelWrap}>
                    <Text style={styles.colorMatchupLabel}>{t('deck.strongAgainstTitle')}</Text>
                  </View>
                  <ManaIdentityRow colors={strong_against_colors.map((c) => c.color)} size="md" />
                </View>
              )}
              {weak_against_colors.length > 0 && (
                <View style={styles.colorMatchupCard}>
                  <View style={styles.colorMatchupLabelWrap}>
                    <Text style={styles.colorMatchupLabel}>{t('deck.weakAgainstTitle')}</Text>
                  </View>
                  <ManaIdentityRow colors={weak_against_colors.map((c) => c.color)} size="md" />
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Best matchups ── */}
        {best_matchups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('deck.bestMatchupsTitle')}</Text>
            <Text style={styles.flavorText}>{t('deck.bestMatchupsFlavor')}</Text>
            <View style={styles.matchupList}>
              {best_matchups.map((m) => (
                <TouchableOpacity
                  key={`best-${m.deck.id}`}
                  style={styles.matchupRow}
                  onPress={() => router.push(`/decks/${m.deck.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.matchupInfo}>
                    <Text style={styles.matchupDeckName} numberOfLines={1}>{m.deck.name}</Text>
                    <Text style={styles.matchupMeta}>
                      {m.wins}–{m.matches - m.wins} · {m.matches}p
                    </Text>
                  </View>
                  <View style={[styles.wrBadge, styles.wrBadgeWin]}>
                    <Text style={[styles.wrText, styles.wrTextWin]}>
                      {m.win_rate_pct !== null ? `${m.win_rate_pct}%` : '—'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Worst matchups ── */}
        {worst_matchups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('deck.worstMatchupsTitle')}</Text>
            <Text style={styles.flavorText}>{t('deck.worstMatchupsFlavor')}</Text>
            <View style={styles.matchupList}>
              {worst_matchups.map((m) => (
                <TouchableOpacity
                  key={`worst-${m.deck.id}`}
                  style={styles.matchupRow}
                  onPress={() => router.push(`/decks/${m.deck.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.matchupInfo}>
                    <Text style={styles.matchupDeckName} numberOfLines={1}>{m.deck.name}</Text>
                    <Text style={styles.matchupMeta}>
                      {m.wins}–{m.matches - m.wins} · {m.matches}p
                    </Text>
                  </View>
                  <View style={[styles.wrBadge, styles.wrBadgeLose]}>
                    <Text style={[styles.wrText, styles.wrTextLose]}>
                      {m.win_rate_pct !== null ? `${m.win_rate_pct}%` : '—'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Players who used it ── */}
        {players_used_by.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('commanders.playersSection')}{' '}
              <Text style={styles.sectionCount}>{players_used_by.length}</Text>
            </Text>
            <View style={styles.playerList}>
              {players_used_by.map((pu) => {
                const initials = pu.player.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                const wr = pu.win_rate_pct !== null ? `${pu.win_rate_pct}%` : '—';
                return (
                  <View key={pu.player.id} style={styles.playerRow}>
                    <View style={styles.playerAvatar}>
                      <Text style={styles.playerAvatarText}>{initials}</Text>
                    </View>
                    <Text style={styles.playerName} numberOfLines={1}>
                      {pu.player.name}
                    </Text>
                    <Text style={styles.playerMatches}>{pu.matches}p</Text>
                    <View style={[styles.wrBadge, pu.win_rate_pct !== null && styles.wrBadgeActive]}>
                      <Text style={[styles.wrText, pu.win_rate_pct !== null && styles.wrTextActive]}>
                        {wr}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  root: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
  },
  bgImage: {
    opacity: 0.35,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[6],
  },
  errorText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-lg'],
    textAlign: 'center',
  },
  linkText: {
    color: t.colors.text.link,
    fontSize: t.typography.size['body-lg'],
  },

  // Nav header
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  backBtn: { width: 32, alignItems: 'center' },
  backIcon: {
    color: t.colors.text.primary,
    fontSize: 28,
    lineHeight: 32,
  },
  navTitle: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
    flex: 1,
    textAlign: 'center',
  },

  // Content
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    gap: spacing[6],
  },

  // Sections
  section: { gap: spacing[3] },
  sectionTitle: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionCount: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    backgroundColor: t.colors.background.elevated,
    paddingHorizontal: spacing[2],
    paddingVertical: 1,
    borderRadius: t.radius.round,
    overflow: 'hidden',
  },

  // Commander
  commanderCard: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    padding: spacing[4],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  commanderHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  commanderName: {
    flex: 1,
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
  },
  partnerBadge: {
    backgroundColor: t.colors.accent.primary + '33',
    borderRadius: t.radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  partnerBadgeText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
  },
  partnerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: t.colors.border.subtle },
  dividerPlus: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.bold,
  },

  // Description
  description: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-lg'],
    lineHeight: 24,
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    padding: spacing[4],
  },

  // Stats card
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  statsSide: { flex: 1, gap: spacing[3] },
  statSideItem: { gap: 2 },
  statValue: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.bold,
  },
  statLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Color matchups (strong/weak against)
  colorMatchupRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  colorMatchupCard: {
    flex: 1,
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: t.colors.border.default,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  // Wrapping the label in a flex-1 view lets both cards stretch to the same
  // height (parent row defaults to alignItems: stretch) and pushes the mana
  // pip to the bottom edge — so pips align horizontally even when one label
  // wraps to two lines and the other is single-line.
  colorMatchupLabelWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  colorMatchupLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // Matchups
  flavorText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontStyle: 'italic',
    marginTop: -spacing[1],
  },
  matchupList: { gap: spacing[2] },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    gap: spacing[3],
  },
  matchupInfo: { flex: 1, gap: 2 },
  matchupDeckName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
  },
  matchupMeta: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
  },
  wrBadgeWin: { backgroundColor: t.colors.status.success + '22' },
  wrTextWin: { color: t.colors.status.success },
  wrBadgeLose: { backgroundColor: t.colors.status.error + '22' },
  wrTextLose: { color: t.colors.status.error },
  emptyStats: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  emptyStatsText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontStyle: 'italic',
  },

  // Players used by
  playerList: { gap: spacing[2] },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    gap: spacing[3],
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: t.radius.round,
    backgroundColor: t.colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playerAvatarText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.bold,
  },
  playerName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
    flex: 1,
  },
  playerMatches: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    flexShrink: 0,
  },
  wrBadge: {
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    minWidth: 44,
    alignItems: 'center',
    flexShrink: 0,
  },
  wrBadgeActive: { backgroundColor: t.colors.accent.primary + '22' },
  wrText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.semibold,
  },
  wrTextActive: { color: t.colors.accent.primary },
})
