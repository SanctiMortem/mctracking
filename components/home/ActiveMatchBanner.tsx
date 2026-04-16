/**
 * ActiveMatchBanner — banner for an in_progress match in the active context.
 *
 * Only renders when a match is provided (context filtering done in useHome).
 * Tap → navigates to /match/[id]/tracker.
 *
 * CMP-015 (design doc) · PLAT-010 (EPIC-05)
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveMatchBannerProps {
  matchId: string;
  onPress: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActiveMatchBanner({ matchId: _matchId, onPress }: ActiveMatchBannerProps) {
  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();

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
        <Text style={styles.subtitle}>{t('home.activeMatchResume')}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────


const createStyles = (t: AppTheme) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
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
