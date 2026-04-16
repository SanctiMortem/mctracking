/**
 * SCR-014 — Commander Detail FULL.
 *
 * Shows commander name, color chips, partner badge, win rate stats,
 * decks using this commander, and players who piloted it.
 *
 * Replaces DATA-010 stub (EPIC-01).
 * HIST-009 (EPIC-04)
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
import { useCommanderStats } from '@/hooks/useCommanderStats';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CommanderDetailScreen() {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data, loading, error } = useCommanderStats(id);

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
          <Text style={styles.errorText}>{error ?? t('commanders.commanderNotFound')}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { commander, total_matches, wins, win_rate_pct, decks_using, players_using } = data;
  const hasMatches = total_matches > 0;
  const winRateDisplay = win_rate_pct !== null ? `${win_rate_pct}%` : '—';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Nav header ── */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{commander.name}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[8] }]}
      >
        {/* ── Hero: name + colors + partner badge ── */}
        <View style={styles.hero}>
          <View style={styles.nameRow}>
            <Text style={styles.commanderName} numberOfLines={2}>{commander.name}</Text>
            {commander.isPartner && (
              <View style={styles.partnerBadge}>
                <Text style={styles.partnerBadgeText}>{t('commanders.partner')}</Text>
              </View>
            )}
          </View>
          <ColorChips selected={commander.colors} readonly />
          {commander.colors.length === 0 && (
            <Text style={styles.colorlessNote}>{t('commanders.colorlessCommander')}</Text>
          )}
        </View>

        {/* ── Stats bar ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('commanders.stats')}</Text>
          {hasMatches ? (
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={[styles.statValue, styles.statValueHighlight]}>{winRateDisplay}</Text>
                <Text style={styles.statLabel}>{t('common.winRate')}</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{total_matches}</Text>
                <Text style={styles.statLabel}>{t('common.matches')}</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{wins}</Text>
                <Text style={styles.statLabel}>{t('common.wins')}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('commanders.noMatchesWith')}</Text>
            </View>
          )}
        </View>

        {/* ── Decks using ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('commanders.decksSection')}{decks_using.length > 0 ? ` (${decks_using.length})` : ''}
          </Text>
          {decks_using.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('commanders.noDecksWith')}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {decks_using.map((du) => (
                <TouchableOpacity
                  key={du.deck.id}
                  style={styles.deckRow}
                  onPress={() => router.push(`/decks/${du.deck.id}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deckName} numberOfLines={1}>{du.deck.name}</Text>
                  <Text style={styles.deckMatches}>{du.matches}p</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Players using ── */}
        {players_using.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('commanders.playersSection')} ({players_using.length})</Text>
            <View style={styles.list}>
              {players_using.map((pu) => {
                const initials = pu.player.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <View key={pu.player.id} style={styles.playerRow}>
                    <View style={styles.playerAvatar}>
                      <Text style={styles.playerAvatarText}>{initials}</Text>
                    </View>
                    <Text style={styles.playerName} numberOfLines={1}>{pu.player.name}</Text>
                    <Text style={styles.playerMatches}>{pu.matches}p</Text>
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

  // Hero
  hero: { gap: spacing[3] },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  commanderName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.bold,
    flexShrink: 1,
  },
  partnerBadge: {
    backgroundColor: t.colors.accent.primary + '33',
    borderRadius: t.radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  partnerBadgeText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  colorlessNote: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontStyle: 'italic',
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
  list: { gap: spacing[2] },

  // Stats
  statsRow: { flexDirection: 'row', gap: spacing[3] },
  statPill: {
    flex: 1,
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  statValue: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.bold,
  },
  statValueHighlight: { color: t.colors.accent.primary },
  statLabel: { color: t.colors.text.muted, fontSize: t.typography.size.caption },
  emptyCard: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  emptyText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontStyle: 'italic',
  },

  // Deck row
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  deckName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
    flex: 1,
  },
  deckMatches: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    flexShrink: 0,
  },

  // Player row
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
})
