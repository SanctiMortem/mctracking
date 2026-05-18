/**
 * PodHighlightsCarousel — auto-rotating slide deck at the top of the
 * Stats screen when a pod is selected.
 *
 * Each slide is a small "highlight" card: Most Active Player, Top Winner,
 * Total Pod Play Time, Deck Speed Records, Longest Loss Streak. Nulls in
 * the source data are skipped (a brand-new pod with zero matches shows
 * nothing). When only one slide qualifies, no auto-rotate and no dots.
 *
 * UX:
 *  - 6s auto-advance, looping
 *  - Horizontal swipe to skip (native FlatList pagingEnabled)
 *  - Tap to pause/resume (with a small "paused" indicator)
 *  - Dot row at the bottom
 *
 * No native deps — just FlatList + setInterval + state.
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import {
  FlatList,
  Image,
  Pressable,
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
  const [paused, setPaused] = useState(false);
  const [width, setWidth] = useState(0);

  const slides = useMemo<Slide[]>(() => {
    if (!data) return [];
    const out: Slide[] = [];

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

  // Auto-rotate
  useEffect(() => {
    if (paused || slides.length <= 1) return;
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
  }, [paused, slides.length, width]);

  // Keep index in range if slides shrink (e.g. data refreshed and a highlight became null)
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
      <Pressable onPress={() => setPaused((p) => !p)}>
        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(s) => s.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              {item.render()}
              {paused && (
                <Text style={styles.pausedTag}>
                  {t('stats.podHighlights.paused')}
                </Text>
              )}
            </View>
          )}
        />
      </Pressable>

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
      <Text style={styles.slidePrimary} numberOfLines={2}>{primary}</Text>
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

  function row(
    sublabel: string,
    record: PodHighlights['fastest_turn_win_deck'],
  ) {
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
            <ManaIdentityRow colors={colors} size="xs" />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.deckRecordsContainer}>
      <Text style={styles.slideLabel}>{label}</Text>
      {row(fastestLabel, fastest)}
      {row(longestLabel, longest)}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  frame: {
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    overflow: 'hidden' as const,
    marginBottom: spacing[2],
  },
  skeleton: {
    padding: spacing[4],
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    backgroundColor: t.colors.background.surface,
    alignItems: 'center' as const,
  },
  skeletonText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
  },

  slide: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    minHeight: 110,
  },
  slideBody: {
    gap: spacing[1],
  },
  slideLabel: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size.label,
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  slidePrimary: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontFamily: t.typography.fontFamily.headline,
    fontWeight: t.typography.weight.bold,
    marginTop: spacing[1],
  },
  slideSecondary: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    marginTop: 2,
  },

  // Deck records slide (two stacked rows)
  deckRecordsContainer: {
    gap: spacing[3],
  },
  deckRecordRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[3],
  },
  deckRecordThumb: {
    width: 44,
    height: 44,
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
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  deckRecordName: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'],
    fontWeight: t.typography.weight.semibold,
  },
  deckRecordMeta: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
  },

  pausedTag: {
    position: 'absolute' as const,
    top: spacing[2],
    right: spacing[3],
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },

  dotsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    paddingBottom: spacing[2],
    paddingTop: 0,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: t.colors.border.default,
  },
  dotActive: {
    backgroundColor: t.colors.accent.primary,
  },
});
