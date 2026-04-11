/**
 * PlayerSection — one player's quadrant in the Match Tracker (SCR-008).
 *
 * Rotatable 180° via long-press (BR-TRACK-13): each section tracks its own
 * rotation state independently.
 *
 * TRACK-003 (EPIC-03)
 */
import { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, motion, radius, spacing, typography } from '@/styles/tokens';

interface PlayerSectionProps {
  playerName: string;
  children: React.ReactNode;
  /** Flex basis for this section (e.g. 0.5 for half the container). */
  flex?: number;
  /** Additional style for the outer wrapper. */
  style?: object;
}

export function PlayerSection({ playerName, children, flex = 1, style }: PlayerSectionProps) {
  const [rotated, setRotated] = useState(false);
  const rotation = useSharedValue(0);

  const handleLongPress = useCallback(() => {
    const next = rotated ? 0 : 180;
    rotation.value = withTiming(next, { duration: motion.duration.normal });
    setRotated(!rotated);
  }, [rotated, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.wrapper, { flex }, style]}>
      <Animated.View style={[styles.inner, animatedStyle]}>
        {/* Rotation handle indicator */}
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={600}
          style={styles.rotateHandle}
          accessibilityLabel={`Long press to rotate ${playerName}'s section`}
          accessibilityRole="button"
        >
          <View style={styles.handleBar} />
        </Pressable>

        {/* Player name header */}
        <Text style={styles.playerName} numberOfLines={1}>
          {playerName}
        </Text>

        {/* Tracker content (LifeCounter, PoisonCounter, etc.) */}
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[2],
  },
  rotateHandle: {
    alignSelf: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[6],
  },
  handleBar: {
    width: 32,
    height: 3,
    borderRadius: radius.round,
    backgroundColor: colors.border.strong,
  },
  playerName: {
    color: colors.text.secondary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: spacing[1],
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
