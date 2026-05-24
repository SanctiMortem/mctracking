/**
 * StatsAllScreenHeader — shared header for the /stats/decks, /stats/players
 * and /stats/commanders screens.
 *
 * Mirrors the typography of the Stats dashboard:
 *   - small-caps gold eyebrow
 *   - italic-serif title
 *   - inline subtitle
 *   - tappable back chevron on the left
 */
import { TouchableOpacity, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

interface StatsAllScreenHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export function StatsAllScreenHeader({ eyebrow, title, subtitle }: StatsAllScreenHeaderProps) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/stats');
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing[2] }]}>
      <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
        <Feather name="chevron-left" size={26} style={styles.backIcon} />
      </TouchableOpacity>
      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  wrap: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginLeft: -spacing[2],
    marginTop: 2,
  },
  backIcon: {
    color: t.colors.text.primary,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size.label,
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 2.6,
    textTransform: 'uppercase' as const,
  },
  title: {
    color: t.colors.text.primary,
    fontSize: 32,
    lineHeight: 38,
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontWeight: t.typography.weight.semibold,
  },
  subtitle: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.bodyItalic,
    fontStyle: 'italic' as const,
    marginTop: 2,
  },
});
