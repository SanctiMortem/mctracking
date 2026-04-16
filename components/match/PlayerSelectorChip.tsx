/**
 * PlayerSelectorChip — CMP-019.
 * Tappable chip for player selection in SCR-007 Match Setup.
 * Selected state: amber border + subtle fill.
 *
 * MATCH-005 (EPIC-02)
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Player } from '@/db/index';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

const AVATAR_SIZE = 44; // 44pt minimum touch target (mobile-design)

interface PlayerSelectorChipProps {
  player: Player;
  isSelected: boolean;
  onPress: () => void;
  /** Optional badge: 'pod' or 'guest' — shown below the name */
  badge?: 'pod' | 'guest';
}

export function PlayerSelectorChip({ player, isSelected, onPress, badge }: PlayerSelectorChipProps) {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const initials = player.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, isSelected && styles.chipSelected]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} ${player.name}`}
      android_ripple={{ color: theme.colors.accent.primary + '22', borderless: true }}
    >
      <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
        <Text style={[styles.initials, isSelected && styles.initialsSelected]}>{initials}</Text>
      </View>
      <Text style={[styles.name, isSelected && styles.nameSelected]} numberOfLines={1}>
        {player.name.split(' ')[0]}
      </Text>
      {badge && (
        <Text style={[styles.badge, badge === 'pod' && styles.badgePod]}>
          {badge === 'pod' ? '👤' : '🎭'}
        </Text>
      )}
    </Pressable>
  );
}

const createStyles = (t: AppTheme) => ({
  chip: {
    width: 68,
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
    borderRadius: t.radius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: t.colors.accent.primary,
    backgroundColor: t.colors.accent.primary + '14', // 8% opacity
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: t.radius.round,
    backgroundColor: t.colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: {
    backgroundColor: t.colors.accent.primary + '33',
  },
  initials: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.bold,
  },
  initialsSelected: {
    color: t.colors.accent.primary,
  },
  name: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
    textAlign: 'center',
  },
  nameSelected: {
    color: t.colors.text.primary,
    fontWeight: t.typography.weight.medium,
  },
  badge: {
    fontSize: 10,
    color: t.colors.text.muted,
  },
  badgePod: {
    color: t.colors.accent.primary,
  },
})
