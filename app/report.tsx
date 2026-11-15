/**
 * LABS — AI stats report screen (RPT-003).
 *
 * /report?kind=deck|player&id=…  — opened from "Analyze deck" on a deck and
 * "Analyze my stats" on your own player profile.
 *
 * The layout is fixed so every report looks the same:
 *   headline → deck shape → checkups → results → what stands out → things to try
 *
 * Numbers (curve, counts, records) are drawn here from the data package.
 * Claude supplies the words and which cards fill each checkup. Nothing is
 * saved: closing the screen discards the report.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { ManaSymbol, type ManaColor } from '@/components/ui/ManaSymbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { fetchReportData, runStatsReport, type ReportFailure } from '@/services/labs/statsReport';
import {
  allStats,
  type DeckShape,
  type ReportCheckup,
  type ReportData,
  type ReportDeck,
  type ReportKind,
  type ReportStat,
  type SampleLevel,
  type StatsReport,
} from '@/services/reportShared';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

type Phase =
  | { step: 'loading' }
  | { step: 'data_failed' }
  | { step: 'thinking' }
  | { step: 'failed'; reason: ReportFailure }
  | { step: 'done'; report: StatsReport };

/** Row label for a stat, from its id — so labels follow the app language. */
function statLabel(stat: ReportStat, t: TFunction): string {
  const [group, key] = stat.id.split(':');
  switch (group) {
    case 'overall':
      return t('report.stat.overall');
    case 'color':
      return t('report.stat.color', { color: t(`report.colors.${key}`, { defaultValue: key }) });
    case 'seat':
      return Number(key) <= 4 ? t(`career.turn.${key}`) : t('career.turn.nth', { n: key });
    case 'pod':
      return t('career.players', { count: Number(key) });
    case 'version':
      return key === 'unknown'
        ? t('decklist.history.unknownVersion')
        : t('decklist.history.version', { number: key });
    case 'matchup':
      return t('report.stat.against', { name: stat.name ?? '' });
    default:
      return stat.name ?? stat.label;
  }
}

/** How many cards of the list a checkup names (lands come from card types). */
function checkupCount(c: ReportCheckup, deck: ReportDeck): number {
  if (c.area === 'lands') return deck.shape?.lands ?? 0;
  const wanted = new Set(c.cards.map((n) => n.toLowerCase()));
  return deck.cards
    .filter((card) => wanted.has(card.name.toLowerCase()))
    .reduce((n, card) => n + card.quantity, 0);
}

export default function ReportScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: ReportKind; id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { getToken } = useAuth();
  // Clerk's getToken identity is unstable — hold it in a ref, never in deps.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [data, setData] = useState<ReportData | null>(null);
  const [phase, setPhase] = useState<Phase>({ step: 'loading' });
  const [openArea, setOpenArea] = useState<string | null>(null);
  // Guards against a slow answer landing after the screen moved on.
  const runRef = useRef(0);

  const language = i18n.language.startsWith('es') ? 'es' : 'en';

  const run = useCallback(async () => {
    const runId = ++runRef.current;
    const current = () => runRef.current === runId;
    setPhase({ step: 'loading' });

    let pkg: ReportData;
    try {
      const token = await getTokenRef.current();
      pkg = await fetchReportData(kind === 'player' ? 'player' : 'deck', id, token ?? undefined);
    } catch {
      if (current()) setPhase({ step: 'data_failed' });
      return;
    }
    if (!current()) return;
    setData(pkg);
    setPhase({ step: 'thinking' });

    const outcome = await runStatsReport(pkg, language);
    if (!current()) return;
    setPhase(outcome.ok ? { step: 'done', report: outcome.report } : { step: 'failed', reason: outcome.reason });
  }, [kind, id, language]);

  useEffect(() => {
    void run();
    return () => { runRef.current++; };
  }, [run]);

  const stats = data ? new Map(allStats(data).map((s) => [s.id, s])) : new Map<string, ReportStat>();
  const deck = data?.kind === 'deck' ? data.decks[0] : undefined;
  const report = phase.step === 'done' ? phase.report : null;

  const sampleChip = (level: SampleLevel) =>
    level === 'none' ? null : (
      <View style={[styles.chip, level === 'solid' ? styles.chipGood : level === 'early' ? styles.chipWarn : styles.chipMuted]}>
        <Text style={styles.chipText}>{t(`report.sample.${level}`)}</Text>
      </View>
    );

  const statRow = (s: ReportStat) => {
    const color = s.id.startsWith('color:') ? (s.id.split(':')[1] as ManaColor) : null;
    return (
      <View key={s.id} style={styles.row}>
        {color ? <ManaSymbol color={color} size="sm" /> : null}
        <Text style={styles.rowLabel} numberOfLines={1}>{statLabel(s, t)}</Text>
        <Text style={styles.rowValue}>{t('report.record', { wins: s.wins, matches: s.matches })}</Text>
        {sampleChip(s.sample)}
      </View>
    );
  };

  const statGroup = (titleKey: string, rows: ReportStat[]) =>
    rows.length === 0 ? null : (
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{t(titleKey)}</Text>
        {rows.map(statRow)}
      </View>
    );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {data ? <Text style={styles.subject}>{data.subject}</Text> : null}

        {phase.step === 'loading' && (
          <View style={styles.status}>
            <ActivityIndicator color={theme.colors.accent.primary} />
            <Text style={styles.muted}>{t('report.loadingData')}</Text>
          </View>
        )}

        {phase.step === 'data_failed' && (
          <View style={styles.status}>
            <Text style={styles.muted}>{t('report.dataFailed')}</Text>
            <TouchableOpacity onPress={run}><Text style={styles.link}>{t('report.retry')}</Text></TouchableOpacity>
          </View>
        )}

        {report?.headline ? <Text style={styles.headline}>{report.headline}</Text> : null}

        {phase.step === 'thinking' && (
          <View style={styles.status}>
            <ActivityIndicator color={theme.colors.accent.primary} />
            <Text style={styles.muted}>{t('report.thinking')}</Text>
          </View>
        )}

        {phase.step === 'failed' && (
          <View style={styles.card}>
            <Text style={styles.body}>{t(`report.error.${phase.reason}`)}</Text>
            {phase.reason === 'no_key' || phase.reason === 'key_rejected' ? (
              <TouchableOpacity onPress={() => router.push('/labs' as never)}>
                <Text style={styles.link}>{t('report.openLabs')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={run}><Text style={styles.link}>{t('report.retry')}</Text></TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Deck shape ── */}
        {deck?.shape ? <ShapeCard shape={deck.shape} /> : null}
        {data?.kind === 'deck' && deck && !deck.shape ? (
          <Text style={styles.muted}>{t('report.noList')}</Text>
        ) : null}

        {/* ── Checkups ── */}
        {report && deck && report.checkups.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('report.checkups')}</Text>
            <View style={styles.card}>
              {report.checkups.map((c) => {
                const open = openArea === c.area;
                const canOpen = c.cards.length > 0;
                return (
                  <TouchableOpacity
                    key={c.area}
                    activeOpacity={canOpen ? 0.7 : 1}
                    onPress={() => canOpen && setOpenArea(open ? null : c.area)}
                    style={styles.checkup}
                  >
                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>{t(`report.area.${c.area}`)}</Text>
                      <Text style={styles.rowValue}>{checkupCount(c, deck)}</Text>
                      <View style={[styles.chip, c.level === 'fine' ? styles.chipGood : c.level === 'low' ? styles.chipWarn : styles.chipInfo]}>
                        <Text style={styles.chipText}>{t(`report.level.${c.level}`)}</Text>
                      </View>
                    </View>
                    {c.note ? <Text style={styles.muted}>{c.note}</Text> : null}
                    {open ? <Text style={styles.cardNames}>{c.cards.join(' · ')}</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── Results ── */}
        {data ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('report.results')}</Text>
            <View style={styles.card}>
              {statRow(data.overall)}
              {statGroup('report.group.decks', data.by_deck)}
              {statGroup('report.group.colors', data.by_color)}
              {statGroup('report.group.versions', data.by_version)}
              {statGroup('report.group.matchups', data.matchups)}
              {statGroup('report.group.seat', data.by_seat)}
              {statGroup('report.group.pod', data.by_pod_size)}
            </View>
          </View>
        ) : null}

        {/* ── What stands out ── */}
        {report && report.findings.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('report.standsOut')}</Text>
            {report.findings.map((f, i) => {
              const s = f.stat_id ? stats.get(f.stat_id) : undefined;
              return (
                <View key={i} style={styles.card}>
                  <Text style={styles.itemTitle}>{f.title}</Text>
                  <Text style={styles.body}>{f.detail}</Text>
                  <View style={styles.chipRow}>
                    <View style={[styles.chip, styles.chipMuted]}>
                      <Text style={styles.chipText}>{t(`report.basedOn.${f.based_on}`)}</Text>
                    </View>
                    {s ? sampleChip(s.sample) : null}
                    {s ? (
                      <Text style={styles.muted}>
                        {statLabel(s, t)} · {t('report.record', { wins: s.wins, matches: s.matches })}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* ── Things to try ── */}
        {report && report.suggestions.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('report.toTry')}</Text>
            {report.suggestions.map((s, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.itemTitle}>{s.title}</Text>
                <Text style={styles.body}>{s.detail}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {report ? <Text style={styles.footer}>{t('report.footer')}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const CURVE_HEIGHT = 96;

function ShapeCard({ shape }: { shape: DeckShape }) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const max = Math.max(1, ...shape.curve.map((c) => c.count));

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('report.shape')}</Text>
      <View style={styles.card}>
        <Text style={styles.groupTitle}>{t('report.curve')}</Text>
        <View style={styles.curve}>
          {shape.curve.map((c) => (
            <View key={c.bucket} style={styles.curveCol}>
              <Text style={styles.curveCount}>{c.count}</Text>
              <View style={[styles.curveBar, { height: Math.max(2, (c.count / max) * CURVE_HEIGHT) }]} />
              <Text style={styles.curveBucket}>{c.bucket}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.body}>
          {[
            t('decklist.cardsCount', { count: shape.total_cards }),
            t('report.lands', { count: shape.lands }),
            shape.average_mana_value !== null
              ? t('report.avgManaValue', { value: shape.average_mana_value.toFixed(1) })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {/* Card types stay in English, like card names. */}
        <Text style={styles.muted}>{shape.types.map((ty) => `${ty.type} ${ty.count}`).join(' · ')}</Text>
      </View>
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  safe: { flex: 1, backgroundColor: t.colors.background.primary },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] },
  subject: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  headline: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.semibold,
    lineHeight: t.typography.size['heading-md'] * 1.3,
  },
  status: { alignItems: 'center' as const, gap: spacing[2], paddingVertical: spacing[4] },
  section: { gap: spacing[2] },
  sectionTitle: {
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
    borderWidth: 1,
    borderColor: t.colors.border.default,
    padding: spacing[4],
  },
  group: { gap: spacing[2], marginTop: spacing[2] },
  groupTitle: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing[2] },
  rowLabel: { flex: 1, color: t.colors.text.primary, fontSize: t.typography.size['body-sm'] },
  rowValue: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
    fontVariant: ['tabular-nums' as const],
  },
  checkup: { gap: 4, paddingVertical: 4 },
  cardNames: { color: t.colors.text.primary, fontSize: t.typography.size.caption, lineHeight: 18 },
  itemTitle: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'],
    fontWeight: t.typography.weight.semibold,
  },
  body: { color: t.colors.text.primary, fontSize: t.typography.size['body-sm'], lineHeight: 20 },
  muted: { color: t.colors.text.muted, fontSize: t.typography.size.caption, flexShrink: 1 },
  link: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  chipRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
    marginTop: 2,
  },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: {
    color: t.colors.text.primary,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
  },
  chipGood: { borderColor: t.colors.status.success },
  chipWarn: { borderColor: t.colors.status.warning },
  chipInfo: { borderColor: t.colors.status.info },
  chipMuted: { borderColor: t.colors.border.default },
  curve: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: spacing[2],
    height: CURVE_HEIGHT + 40,
  },
  curveCol: { flex: 1, alignItems: 'center' as const, justifyContent: 'flex-end' as const, gap: 4 },
  curveCount: { color: t.colors.text.muted, fontSize: t.typography.size.caption },
  curveBar: {
    width: '100%' as const,
    borderRadius: 4,
    backgroundColor: t.colors.accent.primary,
  },
  curveBucket: { color: t.colors.text.muted, fontSize: t.typography.size.caption },
  footer: { color: t.colors.text.muted, fontSize: t.typography.size.caption, textAlign: 'center' as const },
});
