/**
 * GlobalStatsCard — cross-match highlights for the home dashboard.
 *
 * Surfaces five aggregates computed server-side by /api/stats/global-aggregate:
 *   - Most used win condition
 *   - Most popular commander (plays)
 *   - Commander with the most commander damage dealt
 *   - Fastest-winning commander (lowest average turn count, min 2 wins)
 *   - Most popular deck color identity
 *
 * Renders a row per stat with a label, the headline value, and a subtitle
 * (play count, damage total, etc.). Each row degrades to an em-dash when
 * the underlying data isn't present yet.
 */
import { Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { ColorChips } from '@/components/ui/ColorChips';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { spacing } from '@/styles/tokens';
import type { GlobalAggregates } from '@/services/stats';

interface GlobalStatsCardProps {
  stats: GlobalAggregates;
}

export function GlobalStatsCard({ stats }: GlobalStatsCardProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  if (stats.total_matches === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{t('home.globalStatsTitle')}</Text>
        <Text style={styles.emptyText}>{t('home.globalStatsEmpty')}</Text>
      </View>
    );
  }

  const winconLabel = stats.top_wincon
    ? t(`match.winCondition.${stats.top_wincon.value}`, { defaultValue: stats.top_wincon.value })
    : '—';
  const winconSub = stats.top_wincon
    ? t('home.globalSubWins', { count: stats.top_wincon.count })
    : null;

  const commanderLabel = stats.top_commander?.commander.name ?? '—';
  const commanderSub = stats.top_commander
    ? t('home.globalSubPlays', { count: stats.top_commander.value })
    : null;

  const damageLabel = stats.top_damage_commander?.commander.name ?? '—';
  const damageSub = stats.top_damage_commander
    ? t('home.globalSubDamage', { count: stats.top_damage_commander.value })
    : null;

  const fastestLabel = stats.fastest_commander?.commander.name ?? '—';
  const fastestSub = stats.fastest_commander
    ? t('home.globalSubAvgTurn', { turn: formatTurn(stats.fastest_commander.avg_turns) })
    : null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('home.globalStatsTitle')}</Text>
      <View style={styles.list}>
        <StatRow
          label={t('home.globalTopWincon')}
          value={winconLabel}
          sub={winconSub}
        />
        <StatRow
          label={t('home.globalTopCommander')}
          value={commanderLabel}
          sub={commanderSub}
        />
        <StatRow
          label={t('home.globalTopDamage')}
          value={damageLabel}
          sub={damageSub}
        />
        <StatRow
          label={t('home.globalFastestCommander')}
          value={fastestLabel}
          sub={fastestSub}
        />
        <ColorStatRow
          label={t('home.globalTopColors')}
          colors={stats.top_color_identity?.colors ?? null}
          sub={
            stats.top_color_identity
              ? t('home.globalSubDecks', { count: stats.top_color_identity.count })
              : null
          }
        />
      </View>
    </View>
  );
}

// ─── Rows ─────────────────────────────────────────────────────────────────────

function StatRow({ label, value, sub }: { label: string; value: string; sub: string | null }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.rowValueBlock}>
        <Text style={styles.rowValue} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
        {sub && <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text>}
      </View>
    </View>
  );
}

function ColorStatRow({ label, colors, sub }: { label: string; colors: string[] | null; sub: string | null }) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const chipSelection = colors && colors.length > 0 ? colors : colors ? ['C'] : [];
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.rowValueBlock}>
        {chipSelection.length > 0 ? (
          <ColorChips selected={chipSelection} readonly />
        ) : (
          <Text style={styles.rowValue}>—</Text>
        )}
        {sub ? (
          <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text>
        ) : (
          colors === null && <Text style={styles.rowSub} numberOfLines={1}>{t('home.globalStatsNoData')}</Text>
        )}
      </View>
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
    gap: spacing[3],
  },
  title: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  list: {
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border.subtle,
  },
  rowLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.medium,
    flexShrink: 1 as const,
  },
  rowValueBlock: {
    flex: 1 as const,
    alignItems: 'flex-end' as const,
    gap: 2,
  },
  rowValue: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'],
    fontWeight: t.typography.weight.semibold,
    textAlign: 'right' as const,
  },
  rowSub: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
    textAlign: 'right' as const,
  },
  emptyText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center' as const,
    paddingVertical: spacing[3],
  },
});
