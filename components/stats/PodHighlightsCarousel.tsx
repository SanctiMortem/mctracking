/**
 * PodHighlightsCarousel — featured-highlight slide deck at the top of the
 * Stats screen (both personal and pod scope).
 *
 * Each slide is built from a `Highlight` shape — every renderer just declares
 * the icon, title, big value (+ optional small unit), and optional secondary
 * line (italic name + grey context). The presentation component handles
 * everything else: the SVG compass-dial medallion on the left, the title
 * row with extending underline, the value + position inline, the secondary
 * line, and the dot row that sits below the frame.
 *
 * UX:
 *  - 6 s auto-advance, loops, no pause.
 *  - Native FlatList horizontal paging for swipe.
 *  - Dots below the frame (small enough to read clean even at ~13 slides).
 *  - Compact "n / total" tag aligned with the value row, inside the frame.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import { HighlightMedallion } from '@/components/stats/HighlightMedallion';
import { useResponsive } from '@/hooks/useResponsive';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import type { PodHighlights } from '@/services/stats';

const ROTATE_INTERVAL_MS = 6000;
// Frame border width per side — used to convert outer onLayout width into
// the inner page width that FlatList actually has available.
const FRAME_BORDER = 2;

// Feather names we use; constraining to a small set so a typo at the call
// site is a compile error, not a missing glyph.
type SlideIcon =
  | 'layers'
  | 'user'
  | 'award'
  | 'clock'
  | 'droplet'         // infect → poison
  | 'zap'             // combo → lightning
  | 'crosshair'       // biggest hit
  | 'trending-down'   // loss streak
  | 'heart'           // healing
  | 'trending-up'     // total life lost (volume)
  | 'activity'        // life swing in a turn (volatility)
  | 'watch'           // longest match
  | 'alert-triangle'  // average violent turn → aggression warning
  | 'hash';           // avg turn time → tempo

// Declarative slide content. The carousel handles layout, icons, dots, etc.
interface Highlight {
  key: string;
  iconName: SlideIcon;
  title: string;
  value: string;
  /** Small uppercase unit next to the value (e.g. "DMG", "WINS"). Optional. */
  valueUnit?: string;
  /** Italic prefix on the secondary line — typically the player's name. */
  secondaryName?: string;
  /** Plain grey continuation of the secondary line. */
  secondaryRest?: string;
}

interface Props {
  data: PodHighlights | null;
  loading: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0m';
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PodHighlightsCarousel({ data, loading }: Props) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const { contentMaxWidth } = useResponsive();
  const listRef = useRef<FlatList<Highlight>>(null);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);

  const slides = useMemo<Highlight[]>(() => {
    if (!data) return [];
    const out: Highlight[] = [];

    if (data.total_matches > 0) {
      out.push({
        key: 'total-matches',
        iconName: 'layers',
        title: t('stats.podHighlights.totalMatches'),
        value: `${data.total_matches}`,
        valueUnit: t('stats.podHighlights.matchesUnit'),
        secondaryRest: t('stats.podHighlights.totalMatchesSub', { count: data.total_players }),
      });
    }

    if (data.most_active_player) {
      const { player, value } = data.most_active_player;
      out.push({
        key: 'most-active',
        iconName: 'user',
        title: t('stats.podHighlights.mostActivePlayer'),
        value: `${value}`,
        valueUnit: t('stats.podHighlights.matchesUnit'),
        secondaryName: player.name,
      });
    }

    if (data.top_winner) {
      const { player, value, wins, total } = data.top_winner;
      out.push({
        key: 'top-winner',
        iconName: 'award',
        title: t('stats.podHighlights.topWinner'),
        value: `${value}`,
        valueUnit: '%',
        secondaryName: player.name,
        secondaryRest: `· ${wins} / ${total}`,
      });
    }

    if (data.total_play_time_seconds > 0) {
      out.push({
        key: 'play-time',
        iconName: 'clock',
        title: t('stats.podHighlights.totalPlayTime'),
        value: formatDuration(data.total_play_time_seconds),
        secondaryRest: t('stats.podHighlights.totalPlayTimeSub'),
      });
    }

    if (data.most_infect_wins) {
      const { player, wins } = data.most_infect_wins;
      out.push({
        key: 'most-infect',
        iconName: 'droplet',
        title: t('stats.podHighlights.mostInfectWins'),
        value: `${wins}`,
        valueUnit: t('stats.podHighlights.winsUnit'),
        secondaryName: player.name,
      });
    }

    if (data.most_combo_wins) {
      const { player, wins } = data.most_combo_wins;
      out.push({
        key: 'most-combo',
        iconName: 'zap',
        title: t('stats.podHighlights.mostComboWins'),
        value: `${wins}`,
        valueUnit: t('stats.podHighlights.winsUnit'),
        secondaryName: player.name,
      });
    }

    if (data.biggest_hit && data.biggest_hit.damage > 0) {
      const { damage, dealer_player, dealer_commander } = data.biggest_hit;
      const dealerName = dealer_player?.name ?? t('stats.podHighlights.unknownPlayer');
      const cmdName = dealer_commander?.name ?? t('stats.podHighlights.unknownCommander');
      out.push({
        key: 'biggest-hit',
        iconName: 'crosshair',
        title: t('stats.podHighlights.biggestHit'),
        value: `${damage}`,
        valueUnit: t('stats.podHighlights.dmgUnit'),
        secondaryName: dealerName,
        secondaryRest: `${cmdName} · ${t('stats.podHighlights.commanderDamage')}`,
      });
    }

    if (data.highest_total_healed) {
      const { player, healed } = data.highest_total_healed;
      out.push({
        key: 'highest-heal',
        iconName: 'heart',
        title: t('stats.podHighlights.highestHeal'),
        value: `${healed}`,
        valueUnit: t('stats.podHighlights.lifeUnit'),
        secondaryName: player.name,
        secondaryRest: t('stats.podHighlights.healedSub'),
      });
    }

    if (data.total_life_lost_pod > 0) {
      out.push({
        key: 'total-life-lost',
        iconName: 'trending-up',
        title: t('stats.podHighlights.totalLifeLost'),
        value: `${data.total_life_lost_pod}`,
        valueUnit: t('stats.podHighlights.lifeUnit'),
        secondaryRest: t('stats.podHighlights.totalLifeLostSub'),
      });
    }

    if (data.largest_life_swing_in_turn) {
      const { player, swing, turn } = data.largest_life_swing_in_turn;
      const magnitude = Math.abs(swing);
      out.push({
        key: 'largest-swing',
        iconName: 'activity',
        title: t('stats.podHighlights.largestSwing'),
        value: `${swing > 0 ? '+' : '−'}${magnitude}`,
        valueUnit: t('stats.podHighlights.lifeUnit'),
        secondaryName: player.name,
        secondaryRest: t('stats.podHighlights.turnSubInline', { turn }),
      });
    }

    if (data.longest_match_seconds > 0) {
      out.push({
        key: 'longest-match',
        iconName: 'watch',
        title: t('stats.podHighlights.longestMatch'),
        value: formatDuration(data.longest_match_seconds),
        secondaryRest: t('stats.podHighlights.longestMatchSub'),
      });
    }

    if (data.avg_violent_turn && data.avg_violent_turn > 0) {
      out.push({
        key: 'avg-violent-turn',
        iconName: 'alert-triangle',
        title: t('stats.podHighlights.avgViolentTurn'),
        value: `T${data.avg_violent_turn}`,
        secondaryRest: t('stats.podHighlights.avgViolentTurnSub'),
      });
    }

    if (data.avg_turn_time_seconds && data.avg_turn_time_seconds > 0) {
      const seconds = data.avg_turn_time_seconds;
      const value = seconds < 60
        ? `${seconds}s`
        : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      out.push({
        key: 'avg-turn-time',
        iconName: 'hash',
        title: t('stats.podHighlights.avgTurnTime'),
        value,
        secondaryRest: t('stats.podHighlights.avgTurnTimeSub'),
      });
    }

    if (data.current_loss_streak && data.current_loss_streak.streak >= 2) {
      const { player, streak } = data.current_loss_streak;
      out.push({
        key: 'loss-streak',
        iconName: 'trending-down',
        title: t('stats.podHighlights.currentLossStreak'),
        value: `${streak}`,
        valueUnit: t('stats.podHighlights.lossesUnit'),
        secondaryName: player.name,
      });
    }

    return out;
  }, [data, t]);

  // Auto-rotate — unconditional.
  useEffect(() => {
    if (slides.length <= 1 || width === 0) return;
    const id = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % slides.length;
        listRef.current?.scrollToOffset({ offset: next * width, animated: true });
        return next;
      });
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slides.length, width]);

  // Snap to a valid index if the slide set shrinks.
  useEffect(() => {
    if (slides.length === 0) {
      setIndex(0);
      return;
    }
    if (index >= slides.length) {
      setIndex(0);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [slides.length, index]);

  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width === 0) return;
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / width);
    if (next !== index) setIndex(next);
  }

  if (loading && (!data || slides.length === 0)) {
    return (
      <View style={styles.skeleton}>
        <Text style={styles.skeletonText}>{t('stats.podHighlights.loading')}</Text>
      </View>
    );
  }

  if (slides.length === 0) return null;

  return (
    <View
      style={[
        styles.outer,
        contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined,
      ]}
    >
      <View
        style={styles.frame}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width - FRAME_BORDER * 2)}
      >
        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(s) => s.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          decelerationRate="fast"
          renderItem={({ item, index: i }) => (
            <View style={[styles.slide, { width }]}>
              <Slide
                highlight={item}
                position={{ index: i, total: slides.length }}
              />
            </View>
          )}
        />
      </View>

      {slides.length > 1 && (
        <View style={styles.dotsRow}>
          {slides.map((s, i) => {
            const active = i === index;
            return (
              <View
                key={s.key}
                style={[
                  styles.dot,
                  active && styles.dotActive,
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Slide ───────────────────────────────────────────────────────────────────

function Slide({
  highlight,
  position,
}: {
  highlight: Highlight;
  position: { index: number; total: number };
}) {
  const styles = useThemedStyles(createStyles);
  const { iconName, title, value, valueUnit, secondaryName, secondaryRest } = highlight;
  const positionLabel = `${pad2(position.index + 1)} / ${pad2(position.total)}`;
  const hasSecondary = !!(secondaryName || secondaryRest);

  return (
    <View style={styles.slideInner}>
      {/* Left — medallion */}
      <View style={styles.medallionWrap}>
        <HighlightMedallion iconName={iconName} size={130} />
      </View>

      {/* Faint vertical divider between medallion and content */}
      <View style={styles.divider} />

      {/* Right — content stack */}
      <View style={styles.content}>
        {/* Title row: amber uppercase title + extending faint line */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <View style={styles.titleLine} />
        </View>

        {/* Value row: big serif number/text + small unit + position tag */}
        <View style={styles.valueRow}>
          <Text
            style={styles.value}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.55}
          >
            {value}
          </Text>
          {valueUnit ? (
            <Text style={styles.valueUnit} numberOfLines={1}>{valueUnit}</Text>
          ) : null}
          <View style={styles.spacer} />
          <Text style={styles.positionText}>{positionLabel}</Text>
        </View>

        {/* Secondary line: italic name + grey rest */}
        {hasSecondary && (
          <Text style={styles.secondary} numberOfLines={2}>
            {secondaryName ? (
              <Text style={styles.secondaryName}>{secondaryName}</Text>
            ) : null}
            {secondaryName && secondaryRest ? <Text>  </Text> : null}
            {secondaryRest ? (
              <Text style={styles.secondaryRest}>{secondaryRest}</Text>
            ) : null}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  // The carousel sits in `outer`, which holds the frame + the dots row below.
  outer: {
    width: '100%' as unknown as number,
    marginBottom: spacing[3],
  },
  frame: {
    backgroundColor: t.colors.accent.primary + '14',
    borderRadius: t.radius.md,
    borderWidth: 2,
    borderColor: t.colors.accent.primary + '88',
    overflow: 'hidden' as const,
  },
  skeleton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: t.radius.md,
    borderWidth: 2,
    borderColor: t.colors.accent.primary + '88',
    backgroundColor: t.colors.accent.primary + '22',
    alignItems: 'center' as const,
    marginBottom: spacing[3],
  },
  skeletonText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
  },

  // ── Slide ─────────────────────────────────────────────────────────────────
  // Fixed height of 170 px to fit the 130-px medallion comfortably with
  // breathing room above and below. Width is set per-render from FlatList.
  slide: {
    height: 170,
  },
  slideInner: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing[3],
  },

  medallionWrap: {
    width: 150,
    height: 150,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  divider: {
    width: 1,
    height: '70%' as unknown as number,
    backgroundColor: t.colors.accent.primary + '44',
    marginRight: spacing[3],
  },

  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center' as const,
    paddingRight: spacing[3],
    gap: spacing[3],
  },

  // Title row — uppercase amber label + line extending to the right edge.
  titleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[3],
  },
  title: {
    color: t.colors.accent.primary,
    fontSize: 13,
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  titleLine: {
    flex: 1,
    height: 1,
    backgroundColor: t.colors.accent.primary + '55',
  },

  // Value row — big serif number/text + small uppercase unit + position tag.
  valueRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: spacing[2],
  },
  value: {
    color: t.colors.text.primary,
    fontSize: 44,
    fontFamily: t.typography.fontFamily.display ?? t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.bold,
    lineHeight: 48,
    flexShrink: 1,
  },
  valueUnit: {
    color: t.colors.accent.primary,
    fontSize: 14,
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  },
  spacer: {
    flex: 1,
  },
  positionText: {
    color: t.colors.text.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'] as const,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 1,
  },

  // Secondary line — italic name + plain grey rest.
  secondary: {
    color: t.colors.text.secondary,
    fontSize: 14,
    lineHeight: 18,
  },
  secondaryName: {
    color: t.colors.text.secondary,
    fontStyle: 'italic' as const,
    fontFamily: t.typography.fontFamily.display ?? t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.medium,
  },
  secondaryRest: {
    color: t.colors.text.secondary,
  },

  // Dots row sits OUTSIDE the frame, below it.
  dotsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingTop: spacing[3],
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: t.colors.accent.primary + '33',
  },
  dotActive: {
    width: 18,
    backgroundColor: t.colors.accent.primary,
  },
});
