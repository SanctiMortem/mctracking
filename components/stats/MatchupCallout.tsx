/**
 * MatchupCallout — outlined CTA card that pivots from deck stats to the
 * head-to-head matchup screen. Crossed-swords Feather icon on the left,
 * title + subtitle, chevron on the right.
 */
import { TouchableOpacity, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

interface MatchupCalloutProps {
  title: string;
  subtitle: string;
  onPress: () => void;
}

export function MatchupCallout({ title, subtitle, onPress }: MatchupCalloutProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconBox}>
        <Feather name="crosshair" size={22} style={styles.icon} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={20} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const createStyles = (t: AppTheme) => ({
  card: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[3],
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.accent.primary + '55',
    paddingVertical: spacing[3] + 2,
    paddingHorizontal: spacing[3] + 2,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.background.elevated,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: t.colors.border.subtle,
  },
  icon: {
    color: t.colors.accent.primary,
  },
  body: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontWeight: t.typography.weight.semibold,
  },
  subtitle: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontFamily: t.typography.fontFamily.body,
  },
  chevron: {
    color: t.colors.text.muted,
  },
});
