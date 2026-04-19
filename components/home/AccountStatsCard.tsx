/**
 * AccountStatsCard — home dashboard summary for the user's account player.
 *
 * Layout: a large WinRateRing on the left + a 2×2 grid of mini-stats on the right
 *   (Matches, Top deck, Top wincon, Avg win turn). Falls back to a friendly empty
 *   state when the user hasn't created an account player yet, and to a "play your
 *   first match" message when the player exists but has no completed games.
 *
 * PLAT-010 (EPIC-05)
 */
import { Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { spacing } from '@/styles/tokens';
import type { AccountHomeStats } from '@/services/stats';

import { WinRateRing } from './WinRateRing';

interface AccountStatsCardProps {
  stats: AccountHomeStats;
}

export function AccountStatsCard({ stats }: AccountStatsCardProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  if (!stats.player) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{t('home.accountStatsTitle')}</Text>
        <Text style={styles.emptyText}>{t('home.accountStatsNoPlayer')}</Text>
      </View>
    );
  }

  if (stats.total_matches === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{t('home.accountStatsTitle')}</Text>
        <Text style={styles.emptyText}>{t('home.accountStatsEmpty')}</Text>
      </View>
    );
  }

  const wincon = stats.most_common_wincon
    ? t(`match.winCondition.${stats.most_common_wincon}`, { defaultValue: stats.most_common_wincon })
    : '—';

  const topDeckLabel = stats.most_played_deck?.deck.name ?? '—';

  const avgTurnLabel = stats.avg_win_turn != null
    ? formatTurn(stats.avg_win_turn)
    : '—';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('home.accountStatsTitle')}</Text>
      <View style={styles.body}>
        <WinRateRing winRatePct={stats.win_rate_pct} size={132} strokeWidth={12} />
        <View style={styles.grid}>
          <StatTile label={t('home.statTotalMatches')} value={String(stats.total_matches)} />
          <StatTile label={t('home.statMostPlayedDeck')} value={topDeckLabel} />
          <StatTile label={t('home.statMostCommonWincon')} value={wincon} />
          <StatTile label={t('home.statAvgWinTurn')} value={avgTurnLabel} />
        </View>
      </View>
    </View>
  );
}

// ─── Tile ─────────────────────────────────────────────────────────────────────

function StatTile({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.tileValue} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
    </View>
  );
}

function formatTurn(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  card: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    padding: spacing[4],
    gap: spacing[4],
  },
  title: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  body: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[4],
  },
  grid: {
    flex: 1 as const,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing[2],
  },
  tile: {
    width: '48%' as unknown as number,
    flexGrow: 1 as const,
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border.subtle,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    gap: 2,
  },
  tileLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.medium,
  },
  tileValue: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'],
    fontWeight: t.typography.weight.semibold,
  },
  emptyText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center' as const,
    paddingVertical: spacing[3],
  },
});
