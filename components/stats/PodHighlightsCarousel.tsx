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

// Feather names we use; constraining to a small set so a typo at the call
// site is a compile error, not a missing glyph.
type SlideIcon =
  | 'layers'
  | 'user'
  | 'award'
  | 'clock'
  | 'droplet'        // infect → poison
  | 'zap'            // combo → lightning chain
  | 'crosshair'      // biggest hit
  | 'trending-down';

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

  const slides = useMemo<Slide[]>(() => {
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

    if (data.longest_loss_streak && data.longest_loss_streak.streak >= 2) {
      const { player, streak } = data.longest_loss_streak;
      out.push({
        key: 'loss-streak',
        render: () => (
          <SlideBody
            iconName="trending-down"
            label={t('stats.podHighlights.longestLossStreak')}
            primary={player.name}
            secondary={t('stats.podHighlights.lossesInARow', { count: streak })}
          />
        ),
      });
    }

    return out;
  }, [data, t]);

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
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
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
    // Explicit 2-row × 3-col grid. No flex holders, no auto-distribution.
    // Every dimension is a number you can change in one place.
    <View style={styles.slide}>
      {/* Row 1 — 26 px tall, title centered (spans the full width). */}
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>{label}</Text>
      </View>

      {/* Row 2 — 84 px tall, three columns:
            col 1 → 60 px wide, icon centered
            col 2 → flex 1 (50 % of remaining), value cell
            col 3 → flex 1 (50 % of remaining), context cell                 */}
      <View style={styles.statRow}>
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
        <View style={styles.contextCell}>
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

  // Slide = a 2-row × 3-col grid with explicit pixel dimensions.
  // No flex:1 + space-between, no space-evenly, no padding on the slide
  // itself — every position is dictated by row height + column width.
  //
  // Total inner height = 26 (titleRow) + 84 (statRow) = 110 px.
  // Plus the dots row (~13 px) and the 2 × 2 px borders the OUTER frame
  // measures 110 + 13 + 4 = 127 px on screen.
  slide: {
    width: '100%' as unknown as number,
    // No padding; rows fill edge-to-edge inside the frame border.
  },

  // ── Row 1 — title pinned to the left with 5 px inset ──────────────────────
  titleRow: {
    height: 26,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingLeft: 5,
    width: '100%' as unknown as number,
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

  // ── Row 2 — three columns ─────────────────────────────────────────────────
  // `minWidth: 0` on the flex cells is the critical bit: without it a flex:1
  // child refuses to shrink below its intrinsic content width, so long
  // strings like the context push past the 50 % slice and bleed into the
  // next slide. With `minWidth: 0` flex:1 actually means flex:1.
  statRow: {
    height: 84,
    flexDirection: 'row' as const,
    width: '100%' as unknown as number,
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
  contextCell: {
    flex: 1,
    minWidth: 0,
    height: 84,
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
