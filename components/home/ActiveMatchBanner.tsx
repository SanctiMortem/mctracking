/**
 * ActiveMatchBanner — one row inside the "Matches in Progress" frame.
 *
 * Tap → /match/[id]/tracker. Shows the host's account-player name and a
 * relative "Started X ago" so multiple banners in the same pod can be
 * distinguished.
 *
 * Stripped of its own border/background — the parent frame on the Home tab
 * provides the container chrome and the rows just sit inside.
 *
 * CMP-015 (design doc) · PLAT-010 (EPIC-05)
 */
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveMatchBannerProps {
  matchId: string;
  /** ISO string. When present, subtitle becomes "Started X ago". */
  startedAt?: string;
  /** Display name of the host's account player. Hidden when null. */
  hostName?: string | null;
  onPress: () => void;
}

// ─── Relative-time helper ─────────────────────────────────────────────────────

/** Returns a short human-readable elapsed time: "2m", "1h", "3d". */
function elapsedSince(isoOrDate: string | Date): string {
  const startMs = typeof isoOrDate === 'string'
    ? new Date(isoOrDate).getTime()
    : isoOrDate.getTime();
  if (Number.isNaN(startMs)) return '';
  const deltaSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  if (deltaSec < 60) return `${deltaSec}s`;
  const minutes = Math.floor(deltaSec / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActiveMatchBanner({ matchId: _matchId, startedAt, hostName, onPress }: ActiveMatchBannerProps) {
  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();

  const startedLine = startedAt
    ? t('home.activeMatchStartedAgo', { time: elapsedSince(startedAt) })
    : t('home.activeMatchResume');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={t('home.activeMatchBannerA11y')}
    >
      <View style={styles.pulseIndicator} />
      <View style={styles.content}>
        <Text style={styles.title}>{t('home.activeMatchTitle')}</Text>
        {hostName && (
          <Text style={styles.host} numberOfLines={1}>{hostName}</Text>
        )}
        <Text style={styles.subtitle}>{startedLine}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    gap: spacing[3],
  },
  rowPressed: {
    opacity: 0.6,
  },

  pulseIndicator: {
    width: 10,
    height: 10,
    borderRadius: t.radius.round,
    backgroundColor: t.colors.accent.primary,
    flexShrink: 0,
  },

  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
  },
  host: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  subtitle: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
  },

  chevron: {
    color: t.colors.accent.primary,
    fontSize: 22,
    fontWeight: t.typography.weight.bold,
    flexShrink: 0,
  },
})
