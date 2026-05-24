/**
 * CommanderRankRow — redesigned ranking row for the Top Commanders section
 * and the full /stats/commanders screen.
 *
 * Layout: rank circle · square commander art · name + color pips ·
 * italic-serif WR% + match count.
 */
import { Image, Pressable, View, Text } from 'react-native';

import { ManaIdentityRow } from '@/components/ui/ManaSymbol';
import type { Commander } from '@/db/index';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

interface CommanderRankRowProps {
  rank: number;
  commander: Commander;
  matches: number;
  win_rate_pct: number | null;
  onPress?: () => void;
}

export function CommanderRankRow({ rank, commander, matches, win_rate_pct, onPress }: CommanderRankRowProps) {
  const styles = useThemedStyles(createStyles);

  const isPodium = rank >= 1 && rank <= 3;
  const winRateText = win_rate_pct !== null ? `${win_rate_pct}%` : '—';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.85 }]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={commander.name}
    >
      <View style={[styles.rankCircle, isPodium && styles.rankCirclePodium]}>
        <Text style={[styles.rankText, isPodium && styles.rankTextPodium]}>{rank}</Text>
      </View>
      <View style={styles.artThumb}>
        {commander.artCrop ? (
          <Image source={{ uri: commander.artCrop }} style={styles.artImg} resizeMode="cover" />
        ) : (
          <View style={styles.artImg} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{commander.name}</Text>
        {commander.colorIdentity && commander.colorIdentity.length > 0 && (
          <ManaIdentityRow colors={commander.colorIdentity} size="xs" />
        )}
      </View>
      <View style={styles.stats}>
        <Text style={[styles.wr, isPodium && styles.wrPodium]}>{winRateText}</Text>
        <Text style={styles.matches}>{matches} m</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (t: AppTheme) => ({
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  rankCirclePodium: {
    borderColor: t.colors.accent.primary + '99',
  },
  rankText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontWeight: t.typography.weight.semibold,
  },
  rankTextPodium: {
    color: t.colors.accent.primary,
  },
  artThumb: {
    width: 44,
    height: 44,
    borderRadius: t.radius.sm,
    overflow: 'hidden' as const,
    backgroundColor: t.colors.background.elevated,
    flexShrink: 0,
  },
  artImg: {
    width: '100%' as const,
    height: '100%' as const,
  },
  body: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  name: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.semibold,
  },
  stats: {
    alignItems: 'flex-end' as const,
    gap: 2,
    flexShrink: 0,
  },
  wr: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontWeight: t.typography.weight.semibold,
  },
  wrPodium: {
    color: t.colors.accent.primary,
  },
  matches: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontFamily: t.typography.fontFamily.body,
  },
});
