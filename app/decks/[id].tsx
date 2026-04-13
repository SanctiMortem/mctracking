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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ColorChips } from '@/components/ui/ColorChips';
import { useDeckStats } from '@/hooks/useDeckStats';
import { colors, radius, spacing, typography } from '@/styles/tokens';

// ─── Commander card (partner-aware) ──────────────────────────────────────────

function CommanderCard({ name, cardColors, isPartner }: { name: string; cardColors: string[]; isPartner: boolean }) {
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
      <ColorChips selected={cardColors} readonly />
    </View>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data, loading, error } = useDeckStats(id);

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.primary} size="large" />
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

  const { deck, total_matches, wins, win_rate_pct, players_used_by } = data;
  const hasMatches = total_matches > 0;
  const winRateDisplay = win_rate_pct !== null ? `${win_rate_pct}%` : '—';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[8] }]}
      >
        {/* ── Commander(s) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {deck.commander2 ? t('deck.partnerSection') : t('deck.commanderSection')}
          </Text>
          <CommanderCard
            name={deck.commander.name}
            cardColors={deck.commander.colors}
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
                cardColors={deck.commander2.colors}
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
            <View style={styles.statsRow}>
              <StatPill value={winRateDisplay} label={t('common.winRate')} highlight={win_rate_pct !== null} />
              <StatPill value={String(total_matches)} label={t('common.matches')} />
              <StatPill value={String(wins)} label={t('common.wins')} />
            </View>
          ) : (
            <View style={styles.emptyStats}>
              <Text style={styles.emptyStatsText}>{t('deck.noMatchesWithDeck')}</Text>
            </View>
          )}
        </View>

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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[6],
  },
  errorText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
    textAlign: 'center',
  },
  linkText: {
    color: colors.text.link,
    fontSize: typography.size['body-lg'],
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
    color: colors.text.primary,
    fontSize: 28,
    lineHeight: 32,
  },
  navTitle: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
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
    color: colors.text.muted,
    fontSize: typography.size.label,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionCount: {
    color: colors.text.muted,
    fontSize: typography.size.label,
    backgroundColor: colors.background.elevated,
    paddingHorizontal: spacing[2],
    paddingVertical: 1,
    borderRadius: radius.round,
    overflow: 'hidden',
  },

  // Commander
  commanderCard: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    padding: spacing[4],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  commanderHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  commanderName: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
  },
  partnerBadge: {
    backgroundColor: colors.accent.primary + '33',
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  partnerBadgeText: {
    color: colors.accent.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  partnerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border.subtle },
  dividerPlus: {
    color: colors.text.muted,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.bold,
  },

  // Description
  description: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
    lineHeight: 24,
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    padding: spacing[4],
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  statValue: {
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.bold,
  },
  statValueHighlight: { color: colors.accent.primary },
  statLabel: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
  },
  emptyStats: {
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  emptyStatsText: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    fontStyle: 'italic',
  },

  // Players used by
  playerList: { gap: spacing[2] },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    gap: spacing[3],
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.round,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playerAvatarText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.bold,
  },
  playerName: {
    color: colors.text.primary,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  playerMatches: {
    color: colors.text.muted,
    fontSize: typography.size['body-sm'],
    flexShrink: 0,
  },
  wrBadge: {
    backgroundColor: colors.background.elevated,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    minWidth: 44,
    alignItems: 'center',
    flexShrink: 0,
  },
  wrBadgeActive: { backgroundColor: colors.accent.primary + '22' },
  wrText: {
    color: colors.text.muted,
    fontSize: typography.size.label,
    fontWeight: typography.weight.semibold,
  },
  wrTextActive: { color: colors.accent.primary },
});
