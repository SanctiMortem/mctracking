/**
 * PlayerSelectorChip — CMP-019.
 * Tappable chip for player selection in SCR-007 Match Setup.
 * Selected state: amber border + subtle fill.
 *
 * MATCH-005 (EPIC-02)
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Player } from '@/db/index';
import { colors, radius, spacing, typography } from '@/styles/tokens';

// Amber color for selected state (per 15_DESIGN.md CMP-019).
const AMBER = '#F39C12';
const AVATAR_SIZE = 44; // 44pt minimum touch target (mobile-design)

interface PlayerSelectorChipProps {
  player: Player;
  isSelected: boolean;
  onPress: () => void;
}

export function PlayerSelectorChip({ player, isSelected, onPress }: PlayerSelectorChipProps) {
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
      android_ripple={{ color: AMBER + '22', borderless: true }}
    >
      <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
        <Text style={[styles.initials, isSelected && styles.initialsSelected]}>{initials}</Text>
      </View>
      <Text style={[styles.name, isSelected && styles.nameSelected]} numberOfLines={1}>
        {player.name.split(' ')[0]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 68,
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: AMBER,
    backgroundColor: AMBER + '14', // 8% opacity
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.round,
    backgroundColor: colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: {
    backgroundColor: colors.accent.primary + '33',
  },
  initials: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.bold,
  },
  initialsSelected: {
    color: colors.accent.primary,
  },
  name: {
    color: colors.text.secondary,
    fontSize: typography.size.caption,
    textAlign: 'center',
  },
  nameSelected: {
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },
});
