/**
 * LayoutPreview — visual mockup of the tracker layout for match setup.
 *
 * Shows a miniature version of the 2p/3p/4p grid layout. Each slot shows
 * the player name, a position number, and a rotation arrow.
 *
 * - Tap a slot then tap another to swap positions.
 * - Tap the rotation arrow to cycle text direction (0°→90°→180°→270°).
 *
 * MATCH-005 (EPIC-02)
 */
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radius, spacing, typography } from '@/styles/tokens';

const ROTATION_STEPS = [0, 90, 180, 270] as const;
const ARROW_FOR_ROTATION: Record<number, string> = {
  0: '↑',
  90: '→',
  180: '↓',
  270: '←',
};

interface Player {
  id: string;
  name: string;
}

interface LayoutPreviewProps {
  /** Players in current position order (index = position). */
  players: Player[];
  /** Rotation degrees per player ID. */
  rotations: Record<string, number>;
  /** Called when user swaps two positions — returns the new ordered array. */
  onReorder: (reordered: Player[]) => void;
  /** Called when user taps the rotation arrow for a player. */
  onRotate: (playerId: string, degrees: number) => void;
}

export function LayoutPreview({ players, rotations, onReorder, onRotate }: LayoutPreviewProps) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const count = players.length;

  const handleTap = useCallback((index: number) => {
    if (selectedIndex === null) {
      setSelectedIndex(index);
      return;
    }
    if (selectedIndex === index) {
      setSelectedIndex(null);
      return;
    }
    // Swap positions
    const next = [...players];
    [next[selectedIndex], next[index]] = [next[index], next[selectedIndex]];
    onReorder(next);
    setSelectedIndex(null);
  }, [selectedIndex, players, onReorder]);

  const handleRotate = useCallback((playerId: string) => {
    const current = rotations[playerId] ?? 0;
    const currentStep = ROTATION_STEPS.indexOf(current as typeof ROTATION_STEPS[number]);
    const nextStep = (currentStep + 1) % ROTATION_STEPS.length;
    onRotate(playerId, ROTATION_STEPS[nextStep]);
  }, [rotations, onRotate]);

  const renderSlot = (index: number) => {
    const player = players[index];
    if (!player) return null;
    const isSelected = selectedIndex === index;
    const deg = rotations[player.id] ?? 0;
    const arrow = ARROW_FOR_ROTATION[deg] ?? '↑';

    return (
      <View key={player.id} style={[styles.slot, isSelected && styles.slotSelected]}>
        {/* Rotation arrow button — top-right corner */}
        <Pressable
          onPress={() => handleRotate(player.id)}
          style={styles.rotateBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Rotate ${player.name}'s text direction. Currently ${deg}°`}
        >
          <Text style={styles.rotateArrow}>{arrow}</Text>
        </Pressable>

        {/* Slot body — tap to select for swap */}
        <Pressable
          onPress={() => handleTap(index)}
          style={styles.slotBody}
          accessibilityRole="button"
          accessibilityLabel={`Position ${index + 1}: ${player.name}. Tap to select for swap.`}
        >
          <Text style={styles.positionNumber}>P{index + 1}</Text>
          <View style={{ transform: [{ rotate: `${deg}deg` }] }}>
            <Text style={styles.slotName} numberOfLines={1}>{player.name}</Text>
          </View>
        </Pressable>
      </View>
    );
  };

  if (count < 2) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>{t('match.tapToSwap')}</Text>
      <View style={styles.preview}>
        {count === 2 && (
          <>
            <View style={styles.fullRow}>{renderSlot(0)}</View>
            <View style={styles.fullRow}>{renderSlot(1)}</View>
          </>
        )}
        {count === 3 && (
          <>
            <View style={styles.fullRow}>{renderSlot(0)}</View>
            <View style={styles.halfRow}>
              {renderSlot(1)}
              {renderSlot(2)}
            </View>
          </>
        )}
        {count === 4 && (
          <>
            <View style={styles.halfRow}>
              {renderSlot(0)}
              {renderSlot(1)}
            </View>
            <View style={styles.halfRow}>
              {renderSlot(2)}
              {renderSlot(3)}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[4],
  },
  hint: {
    color: colors.text.muted,
    fontSize: typography.size.caption,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  preview: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
    aspectRatio: 9 / 14,
  },
  fullRow: {
    flex: 1,
    flexDirection: 'row',
  },
  halfRow: {
    flex: 1,
    flexDirection: 'row',
  },
  slot: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.subtle,
    padding: spacing[1],
  },
  slotSelected: {
    backgroundColor: colors.accent.primary + '33',
    borderColor: colors.accent.primary,
    borderWidth: 1.5,
  },
  slotBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
  },
  rotateBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 1,
    width: 28,
    height: 28,
    borderRadius: radius.round,
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotateArrow: {
    color: colors.accent.primary,
    fontSize: 16,
    fontWeight: typography.weight.bold,
  },
  positionNumber: {
    color: colors.accent.primary,
    fontSize: typography.size.label,
    fontWeight: typography.weight.bold,
    letterSpacing: typography.letterSpacing.wide,
  },
  slotName: {
    color: colors.text.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
    maxWidth: '90%',
  },
});
