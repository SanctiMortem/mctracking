/**
 * PodHighlightsCarousel — compact auto-rotating highlight slide at the top
 * of the Stats screen. Used in both pod and personal scope.
 *
 * Visual: amber-tinted frame (mirrors the old Head-to-Head CTA look) with
 * a thin brighter top edge for a subtle "shine," all text centered.
 *
 * UX:
 *  - 6s auto-advance, loops, never pauses (user explicitly didn't want a
 *    pause button or swipe-pause — just a continuous slideshow).
 *  - Native FlatList horizontal paging for swipe.
 *  - Dot indicators when there's >1 slide.
 *
 * Slides (any that lack data are silently skipped):
 *   Total Matches → Most Active → Top Winner → Total Play Time
 *   → Most Infect Wins → Most Combo Wins → Biggest Hit → Longest Loss Streak
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@/hooks/useResponsive';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import type { PodHighlights } from '@/services/stats';

const ROTATE_INTERVAL_MS = 6000;
// Frame border width (per side). Kept in sync with `frame.borderWidth` in
// the stylesheet — used to convert the frame's outer onLayout width into
// the inner page width that the FlatList actually shows.
const FRAME_BORDER = 2;

// Total slides we'd ever show. Carousel randomly picks RANDOM_SLIDE_COUNT
// of these per Stats screen mount, so each visit feels fresh.
const RANDOM_SLIDE_COUNT = 5;

// Feather names we use; constraining to a small set so a typo at the call
// site is a compile error, not a missing glyph.
type SlideIcon =
  | 'layers'
  | 'user'
  | 'award'
  | 'clock'
  | 'droplet'         // infect → poison
  | 'zap'             // combo → lightning chain
  | 'crosshair'       // biggest hit
  | 'trending-down'   // loss streak
  | 'heart'           // healing
  | 'trending-up'     // total life lost (volume)
  | 'activity'        // life swing in a turn (volatility)
  | 'watch'           // longest match
  | 'alert-triangle'; // average violent turn → aggression warning

interface Slide {
  key: string;
  render: () => React.ReactElement;
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

// ─── Component ───────────────────────────────────────────────────────────────

export function PodHighlightsCarousel({ data, loading }: Props) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const { contentMaxWidth } = useResponsive();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);

  const allSlides = useMemo<Slide[]>(() => {
    if (!data) return [];
    const out: Slide[] = [];

    if (data.total_matches > 0) {
      out.push({
        key: 'total-matches',
        render: () => (
          <SlideBody
            iconName="layers"
            label={t('stats.podHighlights.totalMatches')}
            primary={`${data.total_matches}`}
            secondary={t('stats.podHighlights.totalMatchesSub', { count: data.total_players })}
          />
        ),
      });
    }

    if (data.most_active_player) {
      const { player, value } = data.most_active_player;
      out.push({
        key: 'most-active',
        render: () => (
          <SlideBody
            iconName="user"
            label={t('stats.podHighlights.mostActivePlayer')}
            primary={player.name}
            secondary={t('stats.podHighlights.matchesPlayed', { count: value })}
          />
        ),
      });
    }

    if (data.top_winner) {
      const { player, value, wins, total } = data.top_winner;
      out.push({
        key: 'top-winner',
        render: () => (
          <SlideBody
            iconName="award"
            label={t('stats.podHighlights.topWinner')}
            primary={player.name}
            secondary={`${value}%  ·  ${wins}/${total}`}
          />
        ),
      });
    }

    if (data.total_play_time_seconds > 0) {
      out.push({
        key: 'play-time',
        render: () => (
          <SlideBody
            iconName="clock"
            label={t('stats.podHighlights.totalPlayTime')}
            primary={formatDuration(data.total_play_time_seconds)}
            secondary={t('stats.podHighlights.totalPlayTimeSub')}
          />
        ),
      });
    }

    if (data.most_infect_wins) {
      const { player, wins } = data.most_infect_wins;
      out.push({
        key: 'most-infect',
        render: () => (
          <SlideBody
            iconName="droplet"
            label={t('stats.podHighlights.mostInfectWins')}
            primary={player.name}
            secondary={t('stats.podHighlights.winsCount', { count: wins })}
          />
        ),
      });
    }

    if (data.most_combo_wins) {
      const { player, wins } = data.most_combo_wins;
      out.push({
        key: 'most-combo',
        render: () => (
          <SlideBody
            iconName="zap"
            label={t('stats.podHighlights.mostComboWins')}
            primary={player.name}
            secondary={t('stats.podHighlights.winsCount', { count: wins })}
          />
        ),
      });
    }

    if (data.biggest_hit && data.biggest_hit.damage > 0) {
      const { damage, dealer_player, dealer_commander } = data.biggest_hit;
      // Headline is the damage number; subtitle attributes the dealer +
      // their commander. Fallbacks keep the slide useful even if attribution
      // failed (e.g. deck deleted, commander removed).
      const dealerName = dealer_player?.name ?? t('stats.podHighlights.unknownPlayer');
      const cmdName = dealer_commander?.name ?? t('stats.podHighlights.unknownCommander');
      out.push({
        key: 'biggest-hit',
        render: () => (
          <SlideBody
            iconName="crosshair"
            label={t('stats.podHighlights.biggestHit')}
            primary={t('stats.podHighlights.damageAmount', { count: damage })}
            secondary={`${dealerName}  ·  ${cmdName}`}
          />
        ),
      });
    }

    if (data.highest_total_healed) {
      const { player, healed } = data.highest_total_healed;
      out.push({
        key: 'highest-heal',
        render: () => (
          <SlideBody
            iconName="heart"
            label={t('stats.podHighlights.highestHeal')}
            primary={player.name}
            secondary={t('stats.podHighlights.lifeHealed', { count: healed })}
          />
        ),
      });
    }

    if (data.total_life_lost_pod > 0) {
      out.push({
        key: 'total-life-lost',
        render: () => (
          <SlideBody
            iconName="trending-up"
            label={t('stats.podHighlights.totalLifeLost')}
            primary={`${data.total_life_lost_pod}`}
            secondary={t('stats.podHighlights.totalLifeLostSub')}
          />
        ),
      });
    }

    if (data.largest_life_swing_in_turn) {
      const { player, swing, turn } = data.largest_life_swing_in_turn;
      const magnitude = Math.abs(swing);
      out.push({
        key: 'largest-swing',
        render: () => (
          <SlideBody
            iconName="activity"
            label={t('stats.podHighlights.largestSwing')}
            primary={`${swing > 0 ? '+' : '−'}${magnitude}`}
            secondary={t('stats.podHighlights.largestSwingSub', { name: player.name, turn })}
          />
        ),
      });
    }

    if (data.longest_match_seconds > 0) {
      out.push({
        key: 'longest-match',
        render: () => (
          <SlideBody
            iconName="watch"
            label={t('stats.podHighlights.longestMatch')}
            primary={formatDuration(data.longest_match_seconds)}
            secondary={t('stats.podHighlights.longestMatchSub')}
          />
        ),
      });
    }

    if (data.avg_violent_turn && data.avg_violent_turn > 0) {
      out.push({
        key: 'avg-violent-turn',
        render: () => (
          <SlideBody
            iconName="alert-triangle"
            label={t('stats.podHighlights.avgViolentTurn')}
            primary={t('stats.podHighlights.turnNumber', { turn: data.avg_violent_turn })}
            secondary={t('stats.podHighlights.avgViolentTurnSub')}
          />
        ),
      });
    }

    if (data.current_loss_streak && data.current_loss_streak.streak >= 2) {
      const { player, streak } = data.current_loss_streak;
      out.push({
        key: 'loss-streak',
        render: () => (
          <SlideBody
            iconName="trending-down"
            label={t('stats.podHighlights.currentLossStreak')}
            primary={player.name}
            secondary={t('stats.podHighlights.lossesInARow', { count: streak })}
          />
        ),
      });
    }

    return out;
  }, [data, t]);

  // Randomly pick RANDOM_SLIDE_COUNT slides per Stats screen mount so each
  // visit feels fresh. Memoised against the slide *keys* so a re-render
  // doesn't reshuffle and yank the slide out from under the user.
  const slides = useMemo<Slide[]>(() => {
    if (allSlides.length <= RANDOM_SLIDE_COUNT) return allSlides;
    const shuffled = [...allSlides];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, RANDOM_SLIDE_COUNT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSlides.map((s) => s.key).join('|')]);

  // Auto-rotate — unconditional. User explicitly didn't want a pause.
  useEffect(() => {
    if (slides.length <= 1 || width === 0) return;
    const id = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % slides.length;
        listRef.current?.scrollToOffset({
          offset: next * width,
          animated: true,
        });
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
        styles.frame,
        contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined,
      ]}
      // Frame uses border-box sizing, so layout.width is the OUTER edge.
      // The FlatList inside only sees outer − 4 (2-px border on each side),
      // so each slide must render at that inner width or the pages drift
      // by 4 px per swipe and the last slide's right edge gets clipped.
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - FRAME_BORDER * 2)}
    >
      {/* No separate top shine anymore — the full 2-px frame border carries
          the brighter amber, so the whole outline reads as the highlight. */}
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {item.render()}
          </View>
        )}
      />

      {slides.length > 1 && (
        <View style={styles.dotsRow}>
          {slides.map((s, i) => (
            <View
              key={s.key}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Slide body ─────────────────────────────────────────────────────────────

function SlideBody({
  iconName,
  label,
  primary,
  secondary,
}: {
  iconName: SlideIcon;
  label: string;
  primary: string;
  secondary?: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    // Explicit 60 % / 40 % horizontal split. Left holds title (pinned to
    // top-left) + icon + value. Right holds the context (centered + wraps).
    // No flex auto-distribution between content blocks — every dimension is
    // a number you can change in one spot.
    <View style={styles.slide}>
      {/* Left 60 % — title + icon/value stacked */}
      <View style={styles.leftSide}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{label}</Text>
        </View>
        <View style={styles.iconValueRow}>
          <View style={styles.iconCell}>
            <Feather name={iconName} size={50} style={styles.icon} />
          </View>
          <View style={styles.valueCell}>
            <Text
              style={styles.value}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.4}
            >
              {primary}
            </Text>
          </View>
        </View>
      </View>

      {/* Right 40 % — context centered, wraps up to 3 lines. */}
      <View style={styles.rightSide}>
        {secondary ? (
          <Text
            style={styles.context}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {secondary}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  frame: {
    backgroundColor: t.colors.accent.primary + '22',
    borderRadius: t.radius.md,
    // Full-perimeter 2 px line in the brighter amber that used to live only
    // at the top — the whole outline now reads as the highlight.
    borderWidth: 2,
    borderColor: t.colors.accent.primary + '88',
    overflow: 'hidden' as const,
    marginBottom: spacing[3],
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

  // Slide = 60 % left / 40 % right horizontal split. Total slide height is
  // 110 px (same as before: 26 titleRow + 84 icon/value). Right side fills
  // the full 110 px vertically to centre its context. No padding on slide;
  // sides handle their own internal insets.
  slide: {
    width: '100%' as unknown as number,
    height: 110,
    flexDirection: 'row' as const,
  },

  // ── Left 60 % ─────────────────────────────────────────────────────────────
  leftSide: {
    width: '60%' as unknown as number,
    height: 110,
  },
  titleRow: {
    height: 26,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingLeft: 5,
  },
  title: {
    color: t.colors.accent.primary,
    fontSize: 17,
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    textAlign: 'left' as const,
  },
  iconValueRow: {
    height: 84,
    flexDirection: 'row' as const,
  },
  iconCell: {
    width: 60,
    height: 84,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  icon: {
    color: t.colors.accent.primary,
    textShadowColor: t.colors.accent.primary + '55',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // minWidth: 0 — without it the valueCell refuses to shrink below its
  // intrinsic text width, breaking the parent's 60 % allotment.
  valueCell: {
    flex: 1,
    minWidth: 0,
    height: 84,
    paddingLeft: 5,
    paddingRight: 5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  value: {
    color: t.colors.accent.primary,
    fontSize: 48,
    lineHeight: 52,
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.bold,
    textAlign: 'center' as const,
  },

  // ── Right 40 % — context centered, wraps to 3 lines ───────────────────────
  rightSide: {
    width: '40%' as unknown as number,
    height: 110,
    paddingLeft: 5,
    paddingRight: 5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  context: {
    color: t.colors.text.secondary,
    fontSize: 16,
    lineHeight: 19,
    textAlign: 'center' as const,
    width: '100%' as unknown as number,
  },

  dotsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    paddingBottom: spacing[2],
    paddingTop: 0,
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: t.colors.accent.primary + '44',
  },
  dotActive: {
    backgroundColor: t.colors.accent.primary,
  },
});
