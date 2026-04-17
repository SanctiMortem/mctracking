/**
 * SCR-012 — Player Profile FULL.
 *
 * Shows player initials + name, win rate hero (amber large number or
 * "Sin partidas"), W/L/D breakdown, favorite decks (top 5), and
 * favorite commanders (top 5 with color chips).
 *
 * Replaces DATA-008 stub (EPIC-01).
 * HIST-005 (EPIC-04)
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

import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import { DeckStatRow } from '@/components/match/DeckStatRow';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import { useResponsive } from '@/hooks/useResponsive';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ label, count }: { label: string; count?: number }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {count !== undefined && (
        <Text style={styles.sectionCount}>{count}</Text>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PlayerProfileScreen() {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, contentPadding } = useResponsive();
  const { data, loading, error } = usePlayerStats(id);

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
          <Text style={styles.errorText}>{error ?? t('player.playerNotFound')}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { player, total_matches, wins, losses, draws, win_rate_pct, favorite_decks, favorite_commanders } = data;

  const initials = player.name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const hasMatches = total_matches > 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Navigation header ── */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{player.name}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[8], paddingHorizontal: contentPadding }, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined]}
      >
        {/* ── Hero: avatar + name ── */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.playerName} numberOfLines={2}>{player.name}</Text>
        </View>

        {/* ── Win rate hero ── */}
        <View style={styles.winRateCard}>
          {hasMatches ? (
            <View style={styles.winRateContent}>
              <Text style={styles.winRateNumber}>
                {win_rate_pct !== null ? `${win_rate_pct}%` : '—'}
              </Text>
              <Text style={styles.winRateLabel}>{t('common.winRate')}</Text>
            </View>
          ) : (
            <Text style={styles.noMatchesText}>{t('common.noMatchesYet')}</Text>
          )}

          {/* W / L / D breakdown */}
          <View style={styles.wldRow}>
            <View style={styles.wldItem}>
              <Text style={[styles.wldValue, styles.wldWin]}>{wins}</Text>
              <Text style={styles.wldLabel}>{t('common.wins')}</Text>
            </View>
            <View style={styles.wldDivider} />
            <View style={styles.wldItem}>
              <Text style={styles.wldValue}>{losses}</Text>
              <Text style={styles.wldLabel}>{t('common.losses')}</Text>
            </View>
            <View style={styles.wldDivider} />
            <View style={styles.wldItem}>
              <Text style={styles.wldValue}>{draws}</Text>
              <Text style={styles.wldLabel}>{t('common.draws')}</Text>
            </View>
            <View style={styles.wldDivider} />
            <View style={styles.wldItem}>
              <Text style={styles.wldValue}>{total_matches}</Text>
              <Text style={styles.wldLabel}>{t('common.total')}</Text>
            </View>
          </View>
        </View>

        {/* ── Decks más usados ── */}
        <View style={styles.section}>
          <SectionTitle label={t('player.decksUsed')} count={favorite_decks.length} />
          {favorite_decks.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>{t('player.noDecksData')}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {favorite_decks.map((fd) => (
                <DeckStatRow
                  key={fd.deck.id}
                  deck={fd.deck}
                  commanders={fd.commanders}
                  matches={fd.matches}
                  win_rate_pct={fd.win_rate_pct}
                  onPress={() => router.push(`/decks/${fd.deck.id}`)}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Commanders más usados ── */}
        <View style={styles.section}>
          <SectionTitle label={t('stats.topCommanders')} count={favorite_commanders.length} />
          {favorite_commanders.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>{t('player.noDecksData')}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {favorite_commanders.map((fc) => (
                <TouchableOpacity
                  key={fc.commander.id}
                  style={styles.commanderRow}
                  onPress={() => router.push(`/commanders/${fc.commander.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.commanderInfo}>
                    <Text style={styles.commanderName} numberOfLines={1}>
                      {fc.commander.name}
                    </Text>
                    <ManaIdentityRow colors={fc.commander.colorIdentity} size="xs" />
                  </View>
                  <View style={styles.commanderStats}>
                    <Text style={styles.cmdMatchCount}>{fc.matches}p</Text>
                    <View style={[styles.wrBadge, fc.win_rate_pct !== null && styles.wrBadgeActive]}>
                      <Text style={[styles.wrText, fc.win_rate_pct !== null && styles.wrTextActive]}>
                        {fc.win_rate_pct !== null ? `${fc.win_rate_pct}%` : '—'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
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

  // Scroll content
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    gap: spacing[4],
  },

  // Hero
  hero: { alignItems: 'center', gap: spacing[3] },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: t.radius.round,
    backgroundColor: t.colors.accent.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['heading-xl'],
    fontWeight: t.typography.weight.bold,
  },
  playerName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.bold,
    textAlign: 'center',
  },

  // Win rate card
  winRateCard: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    gap: spacing[4],
    alignItems: 'center',
  },
  winRateContent: { alignItems: 'center', gap: spacing[1] },
  winRateNumber: {
    color: t.colors.accent.primary,
    fontSize: 48,
    fontWeight: t.typography.weight.bold,
    lineHeight: 56,
  },
  winRateLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  noMatchesText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-lg'],
    fontStyle: 'italic',
  },

  // W/L/D row
  wldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  wldItem: { flex: 1, alignItems: 'center', gap: 2 },
  wldValue: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.bold,
  },
  wldWin: { color: t.colors.accent.primary },
  wldLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
  },
  wldDivider: {
    width: 1,
    height: 32,
    backgroundColor: t.colors.border.subtle,
  },

  // Sections
  section: { gap: spacing[3] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
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
  list: { gap: spacing[2] },

  // Empty section
  emptySection: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  emptyText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontStyle: 'italic',
  },

  // Commander row
  commanderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  commanderInfo: { flex: 1, gap: 4 },
  commanderName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
  },
  commanderStats: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  cmdMatchCount: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
  },
  wrBadge: {
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    minWidth: 44,
    alignItems: 'center',
  },
  wrBadgeActive: { backgroundColor: t.colors.accent.primary + '22' },
  wrText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.semibold,
  },
  wrTextActive: { color: t.colors.accent.primary },
})
