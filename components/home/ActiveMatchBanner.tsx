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

import { colors, radius, spacing, typography } from '@/styles/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveMatchBannerProps {
  matchId: string;
  onPress: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActiveMatchBanner({ matchId: _matchId, onPress }: ActiveMatchBannerProps) {
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

const AMBER = '#F39C12';
const AMBER_BG = '#F39C1218';
const AMBER_BORDER = '#F39C1244';

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AMBER_BG,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: AMBER_BORDER,
    padding: spacing[4],
    gap: spacing[3],
  },
  bannerPressed: {
    opacity: 0.75,
  },

  pulseIndicator: {
    width: 10,
    height: 10,
    borderRadius: radius.round,
    backgroundColor: AMBER,
    flexShrink: 0,
  },

  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: AMBER,
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.semibold,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
  },

  chevron: {
    color: AMBER,
    fontSize: 22,
    fontWeight: typography.weight.bold,
    flexShrink: 0,
  },
});
