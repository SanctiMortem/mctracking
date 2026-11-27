/**
 * ColorStatsSection — stats v2: how a deck does against each colour.
 *
 * One section instead of the Colour record plus the Strong / Weak chips, so
 * the page cannot contradict itself. Per colour faced: wins–losses, a split
 * bar, and the adjusted win rate (pulled toward 50 % for small samples).
 * Colours with only a few matches are greyed and labelled; the strong / weak
 * chips show their number and only appear with 5 or more matches.
 *
 * LABS: rendered only when the "New stats" switch is on.
 */
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ManaSymbol } from '@/components/ui/ManaSymbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { ColorRowV2, ColorStatV2, DeckColorsV2 } from '@/services/stats2/contract';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

interface ColorStatsSectionProps {
  title: string;
  data: DeckColorsV2;
}

const wholePct = (value: number) => `${Math.round(value)}%`;

export function ColorStatsSection({ title, data }: ColorStatsSectionProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (!Array.isArray(data.rows) || data.rows.length === 0) return null;

  const won = theme.colors.lifeTotal.high;
  const lost = theme.colors.lifeTotal.critical;

  const chips = (label: string, list: ColorStatV2[], tint: string) =>
    list.length > 0 && (
      <View style={styles.chipGroup}>
        <Text style={styles.chipLabel}>{label}</Text>
        <View style={styles.chipRow}>
          {list.map((c) => (
            <View key={c.color} style={styles.chip}>
              <ManaSymbol color={c.color} size="sm" />
              <Text style={[styles.chipValue, { color: tint }]}>{wholePct(c.adj_pct)}</Text>
            </View>
          ))}
        </View>
      </View>
    );

  const bar = (r: ColorRowV2) => {
    const decisive = r.wins + r.losses;
    const winShare = decisive > 0 ? r.wins / decisive : 0;
    return (
      <View style={styles.track}>
        {r.wins > 0 && <View style={{ flex: winShare, backgroundColor: won }} />}
        {r.losses > 0 && <View style={{ flex: 1 - winShare, backgroundColor: lost }} />}
      </View>
    );
  };

  const sampleNote = (r: ColorRowV2) =>
    r.sample === 'few' ? t('stats2.sampleFew') : r.sample === 'early' ? t('stats2.sampleEarly') : null;

  const countLabel = (count: number) =>
    count === 0 ? t('stats2.colorCount0') : count === 1 ? t('stats2.colorCount1') : t('stats2.colorCountN', { count });

  const strong = Array.isArray(data.strong) ? data.strong : [];
  const weak = Array.isArray(data.weak) ? data.weak : [];
  const byCount = Array.isArray(data.by_color_count) ? data.by_color_count : [];

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>
        {(strong.length > 0 || weak.length > 0) && (
          <View style={styles.chipsRow}>
            {chips(t('deck.strongAgainstTitle'), strong, won)}
            {chips(t('deck.weakAgainstTitle'), weak, lost)}
          </View>
        )}

        {data.rows.map((r) => {
          const note = sampleNote(r);
          return (
            <View key={r.color} style={[styles.row, r.sample === 'few' && styles.rowFew]}>
              <ManaSymbol color={r.color} size="md" />
              <Text style={styles.record}>
                {r.wins}–{r.losses}
              </Text>
              <View style={styles.barCol}>
                {bar(r)}
                {note && <Text style={styles.sample}>{note}</Text>}
              </View>
              <Text style={styles.pct}>{wholePct(r.adj_pct)}</Text>
            </View>
          );
        })}

        {byCount.length > 1 && (
          <View style={styles.countBlock}>
            <Text style={styles.subTitle}>{t('stats2.colorCountTitle')}</Text>
            {byCount.map((r) => (
              <View key={r.color_count} style={[styles.row, r.sample === 'few' && styles.rowFew]}>
                <Text style={styles.countLabel} numberOfLines={1}>
                  {countLabel(r.color_count)}
                </Text>
                <Text style={styles.record}>
                  {r.wins}–{r.losses}
                </Text>
                <View style={styles.barCol}>{bar(r)}</View>
                <Text style={styles.pct}>{wholePct(r.adj_pct)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.note}>{t('stats2.colorsNote')}</Text>
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

  chipsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing[4],
    paddingBottom: spacing[1],
  },
  chipGroup: { gap: spacing[1] },
  chipLabel: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  chipRow: { flexDirection: 'row' as const, gap: spacing[2] },
  chip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[1],
    backgroundColor: t.colors.background.elevated,
    borderRadius: t.radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
  },
  chipValue: {
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
    fontVariant: ['tabular-nums' as const],
  },

  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
  },
  rowFew: { opacity: 0.5 },
  record: {
    width: 52,
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'],
    fontWeight: t.typography.weight.semibold,
    fontVariant: ['tabular-nums' as const],
  },
  barCol: { flex: 1, gap: 2 },
  track: {
    flexDirection: 'row' as const,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden' as const,
    backgroundColor: t.colors.border.default,
    gap: 2,
  },
  sample: { color: t.colors.text.secondary, fontSize: t.typography.size.caption },
  pct: {
    width: 44,
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'],
    fontWeight: t.typography.weight.semibold,
    fontVariant: ['tabular-nums' as const],
    textAlign: 'right' as const,
  },

  countBlock: {
    gap: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: t.colors.border.default,
  },
  subTitle: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  countLabel: {
    width: 72,
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
  },

  note: { color: t.colors.text.muted, fontSize: t.typography.size.caption },
});
