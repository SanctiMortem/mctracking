/**
 * PodHighlightsCarousel — compact auto-rotating highlight slide at the top
 * of the Stats screen. Used in both pod and personal scope.
 *
 * Visual: amber-tinted frame (mirrors the previous Head-to-Head CTA look)
 * with a thin brighter top edge for a subtle "shine," all text centered.
 * Half the height of the previous version.
 *
 * UX:
 *  - 6s auto-advance, loops.
 *  - Native FlatList horizontal paging for swipe (no outer Pressable so
 *    horizontal gestures aren't eaten by an ancestor).
 *  - When the user swipes, auto-rotate is paused for 8 seconds, then
 *    resumes on its own.
 *  - Dots when there's >1 slide.
 *
 * Slides (any that lack data are silently skipped):
 *   Total Matches → Most Active → Top Winner → Total Play Time
 *   → Win-Turn Records (fewest + most turns in one frame) → Longest Loss Streak
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { useTranslation } from 'react-i18next';

import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import { useResponsive } from '@/hooks/useResponsive';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import type { PodHighlights } from '@/services/stats';

const ROTATE_INTERVAL_MS = 6000;
const PAUSE_AFTER_SWIPE_MS = 8000;

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
  const pauseUntilRef = useRef<number>(0);

  const slides = useMemo<Slide[]>(() => {
    if (!data) return [];
    const out: Slide[] = [];

    if (data.total_matches > 0) {
      out.push({
        key: 'total-matches',
        render: () => (
          <SlideBody
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
            label={t('stats.podHighlights.totalPlayTime')}
            primary={formatDuration(data.total_play_time_seconds)}
            secondary={t('stats.podHighlights.totalPlayTimeSub')}
          />
        ),
      });
    }

    if (data.fastest_turn_win_deck || data.longest_turn_win_deck) {
      out.push({
        key: 'deck-records',
        render: () => (
          <DeckRecordsBody
            label={t('stats.podHighlights.deckTurnRecords')}
            fastest={data.fastest_turn_win_deck}
            longest={data.longest_turn_win_deck}
            fastestLabel={t('stats.podHighlights.fastestWin')}
            longestLabel={t('stats.podHighlights.longestWin')}
            turnsLabel={(n: number) => t('stats.podHighlights.turns', { count: n })}
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
            label={t('stats.podHighlights.longestLossStreak')}
            primary={player.name}
            secondary={t('stats.podHighlights.lossesInARow', { count: streak })}
          />
        ),
      });
    }

    return out;
  }, [data, t]);

  // Auto-rotate. Honours the pauseUntil timestamp so a swipe gets the user
  // a moment to read the slide they landed on before we move on again.
  useEffect(() => {
    if (slides.length <= 1 || width === 0) return;
    const id = setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
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

  function pauseFromInteraction() {
    pauseUntilRef.current = Date.now() + PAUSE_AFTER_SWIPE_MS;
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
      {/* Subtle "shine" — a thin brighter line along the top edge. */}
      <View style={styles.shine} pointerEvents="none" />

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={pauseFromInteraction}
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

// ─── Slide bodies ─────────────────────────────────────────────────────────────

function SlideBody({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary?: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.slideBody}>
      <Text style={styles.slideLabel}>{label}</Text>
      <Text style={styles.slidePrimary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {primary}
      </Text>
      {secondary ? (
        <Text style={styles.slideSecondary} numberOfLines={1}>{secondary}</Text>
      ) : null}
    </View>
  );
}

function DeckRecordsBody({
  label,
  fastest,
  longest,
  fastestLabel,
  longestLabel,
  turnsLabel,
}: {
  label: string;
  fastest: PodHighlights['fastest_turn_win_deck'];
  longest: PodHighlights['longest_turn_win_deck'];
  fastestLabel: string;
  longestLabel: string;
  turnsLabel: (n: number) => string;
}) {
  const styles = useThemedStyles(createStyles);

  function row(sublabel: string, record: PodHighlights['fastest_turn_win_deck']) {
    if (!record) return null;
    const colors = Array.from(
      new Set(record.commanders.flatMap((c) => c.colorIdentity ?? [])),
    );
    const art = record.commanders[0]?.artCrop ?? null;
    return (
      <View style={styles.deckRecordRow}>
        <View style={styles.deckRecordThumb}>
          {art ? (
            <Image source={{ uri: art }} style={styles.deckRecordThumbImg} />
          ) : (
            <View style={[styles.deckRecordThumbImg, styles.deckRecordThumbFallback]} />
          )}
        </View>
        <View style={styles.deckRecordInfo}>
          <Text style={styles.deckRecordSublabel}>{sublabel}</Text>
          <Text style={styles.deckRecordName} numberOfLines={1}>{record.deck.name}</Text>
          <Text style={styles.deckRecordMeta} numberOfLines={1}>
            {turnsLabel(record.turns)}
            {record.player_name ? `  ·  ${record.player_name}` : ''}
          </Text>
          {colors.length > 0 && (
            <View style={styles.deckRecordManaWrap}>
              <ManaIdentityRow colors={colors} size="xs" />
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.deckRecordsContainer}>
      <Text style={styles.slideLabel}>{label}</Text>
      <View style={styles.deckRecordsRows}>
        {row(fastestLabel, fastest)}
        {row(longestLabel, longest)}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  frame: {
    backgroundColor: t.colors.accent.primary + '22',
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.accent.primary + '44',
    overflow: 'hidden' as const,
    marginBottom: spacing[3],
    // Mirrors the previous Head-to-Head CTA palette so the carousel feels
    // like a featured highlight surface rather than a plain card.
  },
  // Brighter inset top line — reads as a thin "shine" along the upper edge.
  shine: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: t.colors.accent.primary + '88',
  },
  skeleton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.accent.primary + '44',
    backgroundColor: t.colors.accent.primary + '22',
    alignItems: 'center' as const,
    marginBottom: spacing[3],
  },
  skeletonText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
  },

  // Slide — half the previous height, centered content.
  slide: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 70,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  slideBody: {
    alignItems: 'center' as const,
    gap: 2,
    width: '100%' as unknown as number,
  },
  slideLabel: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size.label,
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
  },
  slidePrimary: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['heading-md'],
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.bold,
    textAlign: 'center' as const,
    width: '100%' as unknown as number,
  },
  slideSecondary: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center' as const,
  },

  // Deck records slide — compact, two centered rows.
  deckRecordsContainer: {
    alignItems: 'center' as const,
    gap: spacing[2],
    width: '100%' as unknown as number,
  },
  deckRecordsRows: {
    flexDirection: 'row' as const,
    gap: spacing[3],
    width: '100%' as unknown as number,
    justifyContent: 'center' as const,
  },
  deckRecordRow: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
  },
  deckRecordThumb: {
    width: 36,
    height: 36,
    borderRadius: t.radius.sm,
    overflow: 'hidden' as const,
    backgroundColor: t.colors.border.subtle,
    flexShrink: 0,
  },
  deckRecordThumbImg: {
    width: '100%' as unknown as number,
    height: '100%' as unknown as number,
  },
  deckRecordThumbFallback: {
    backgroundColor: t.colors.border.subtle,
  },
  deckRecordInfo: {
    flex: 1,
    gap: 1,
  },
  deckRecordSublabel: {
    color: t.colors.text.muted,
    fontSize: 10,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  deckRecordName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  deckRecordMeta: {
    color: t.colors.text.secondary,
    fontSize: 11,
  },
  deckRecordManaWrap: {
    marginTop: 2,
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
