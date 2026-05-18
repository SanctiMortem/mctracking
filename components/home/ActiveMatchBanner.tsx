/**
 * ActiveMatchBanner — banner for an in_progress match in the active context.
 *
 * Renders for each in-progress match the user can see (filtering done in
 * useHome). Tap → navigates to /match/[id]/tracker. Shows a "started X ago"
 * subtitle so multiple banners in the same pod are distinguishable.
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

export function ActiveMatchBanner({ matchId: _matchId, startedAt, onPress }: ActiveMatchBannerProps) {
  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();

  const subtitle = startedAt
    ? t('home.activeMatchStartedAgo', { time: elapsedSince(startedAt) })
    : t('home.activeMatchResume');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
      accessibilityRole="button"
      accessibilityLabel={t('home.activeMatchBannerA11y')}
    >
      <View style={styles.pulseIndicator} />
      <View style={styles.content}>
        <Text style={styles.title}>{t('home.activeMatchTitle')}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  banner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: t.colors.accent.primary + '18',
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.accent.primary + '44',
    padding: spacing[4],
    gap: spacing[3],
  },
  bannerPressed: {
    opacity: 0.75,
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
