/**
 * ColorRecord — how a deck has done against each colour.
 *
 * One row per colour the deck has faced: the mana symbol, wins on the left,
 * losses on the right, and a split bar between them (green = won, red =
 * lost). Counted once per match:
 *   won  = matches this deck won with that colour across the table
 *   lost = matches this deck lost to a winning deck of that colour
 * Renders nothing when there is no record yet.
 */
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ManaSymbol, type ManaColor } from '@/components/ui/ManaSymbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { ColorRecord as ColorRecordRow } from '@/services/stats';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

interface ColorRecordProps {
  title: string;
  /** Undefined when a newer bundle talks to an API that predates the field. */
  rows: ColorRecordRow[] | undefined;
}

export function ColorRecord({ title, rows }: ColorRecordProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (!rows || rows.length === 0) return null;

  const won = theme.colors.lifeTotal.high;
  const lost = theme.colors.lifeTotal.critical;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>
        <View style={styles.legend}>
          <Text style={[styles.legendText, { color: won }]}>{t('colorRecord.won')}</Text>
          <Text style={[styles.legendText, { color: lost }]}>{t('colorRecord.lost')}</Text>
        </View>

        {rows.map((r) => {
          const total = r.wins + r.losses;
          const winShare = total > 0 ? r.wins / total : 0;
          return (
            <View key={r.color} style={styles.row}>
              <ManaSymbol color={r.color as ManaColor} size="md" />
              <Text style={[styles.count, { color: won }]}>{r.wins}</Text>
              <View style={styles.track}>
                {r.wins > 0 && <View style={{ flex: winShare, backgroundColor: won }} />}
                {r.losses > 0 && <View style={{ flex: 1 - winShare, backgroundColor: lost }} />}
              </View>
              <Text style={[styles.count, styles.countRight, { color: lost }]}>{r.losses}</Text>
            </View>
          );
        })}

        <Text style={styles.note}>{t('colorRecord.note')}</Text>
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
    gap: spacing[3],
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  legend: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    // Line the labels up over the two count columns.
    paddingLeft: 36,
  },
  legendText: {
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
  },
  count: {
    width: 28,
    fontSize: t.typography.size['body-md'],
    fontWeight: t.typography.weight.semibold,
    fontVariant: ['tabular-nums' as const],
    textAlign: 'left' as const,
  },
  countRight: { textAlign: 'right' as const },
  track: {
    flex: 1,
    flexDirection: 'row' as const,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden' as const,
    backgroundColor: t.colors.border.default,
    gap: 2,
  },
  note: { color: t.colors.text.muted, fontSize: t.typography.size.caption },
});
