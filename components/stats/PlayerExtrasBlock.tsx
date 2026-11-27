/**
 * PlayerExtrasBlock — stats v2 on the player page: wins vs expected, and
 * placement (average, top 2, first out).
 *
 * Placement only uses matches whose order of elimination is known, so it
 * says how many of the player's matches it is based on, and shows "not
 * enough tracked games" instead of a number below five.
 *
 * LABS: rendered only when the "New stats" switch is on.
 */
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { PlayerExtrasV2 } from '@/services/stats2/contract';
import { signedOneDecimal } from '@/services/stats2/view';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

interface PlayerExtrasBlockProps {
  data: PlayerExtrasV2;
}

export function PlayerExtrasBlock({ data }: PlayerExtrasBlockProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  if (!data || typeof data.matches !== 'number' || data.matches === 0 || !data.placement) return null;

  const { average, top2_rate_pct: top2, first_out_rate_pct: firstOut } = data.placement;
  const coverage = average?.coverage;
  const hasPlacement = typeof average?.value === 'number';
  const pct = (v: number | null | undefined) => (typeof v === 'number' ? `${Math.round(v)}%` : '—');

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t('stats2.extrasTitle')}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.item}>
            <Text style={styles.value}>{signedOneDecimal(data.wins_vs_expected)}</Text>
            <Text style={styles.label}>{t('stats2.winsVsExpected')}</Text>
          </View>
          {hasPlacement && (
            <>
              <View style={styles.divider} />
              <View style={styles.item}>
                <Text style={styles.value}>{average.value!.toFixed(1)}</Text>
                <Text style={styles.label}>{t('stats2.avgPlacement')}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.item}>
                <Text style={styles.value}>{pct(top2?.value)}</Text>
                <Text style={styles.label}>{t('stats2.top2')}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.item}>
                <Text style={styles.value}>{pct(firstOut?.value)}</Text>
                <Text style={styles.label}>{t('stats2.firstOut')}</Text>
              </View>
            </>
          )}
        </View>

        <Text style={styles.note}>
          {t('stats2.winsVsExpectedNote', { wins: data.wins, expected: data.expected_wins.toFixed(1) })}
        </Text>
        <Text style={styles.note}>
          {hasPlacement && coverage
            ? t('stats2.placementBasedOn', { used: coverage.used, total: coverage.total })
            : t('stats2.placementNotEnough')}
        </Text>
      </View>
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
  card: {
    gap: spacing[2],
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
    paddingBottom: spacing[1],
  },
  item: { flex: 1, alignItems: 'center' as const, gap: 2 },
  divider: { width: 1, backgroundColor: t.colors.border.default },
  value: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.semibold,
    fontVariant: ['tabular-nums' as const],
  },
  label: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
    textAlign: 'center' as const,
  },
  note: { color: t.colors.text.muted, fontSize: t.typography.size.caption },
});
