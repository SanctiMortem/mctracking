/**
 * LayoutPreview — visual mockup of the tracker layout for match setup.
 *
 * Shows selectable layout variants for the current player count, with a
 * miniature preview of the chosen layout. Each slot shows the player name,
 * a position number, and a rotation arrow.
 *
 * - Tap a layout variant thumbnail to select it.
 * - Tap a slot then tap another to swap positions.
 * - Tap the rotation arrow to cycle text direction (0->90->180->270).
 *
 * MATCH-005 (EPIC-02)
 */
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LAYOUT_VARIANTS } from '@/hooks/useMatchSetup';
import { colors, radius, spacing, typography } from '@/styles/tokens';

/** Preview takes 45% of the smallest screen dimension. */
const PREVIEW_RATIO = 9 / 14;
const SCREEN_FRACTION = 0.45;

/** Layout variant thumbnails are small. */
const THUMB_SIZE = 56;
const THUMB_RATIO = 9 / 14;

const ROTATION_STEPS = [0, 90, 180, 270] as const;
const ARROW_FOR_ROTATION: Record<number, string> = {
  0: '↑',
  90: '→',
  180: '↓',
  270: '←',
};

/** Human-readable labels for layout variants */
const VARIANT_LABELS: Record<string, string> = {
  '2p-stack': 'Stacked',
  '2p-side': 'Side by Side',
  '3p-top1-bot2': '1 Top + 2 Bottom',
  '3p-left1-right2': '1 Left + 2 Right',
  '3p-top2-bot1': '2 Top + 1 Bottom',
  '4p-grid': '2x2 Grid',
  '4p-top1-bot3': '1 Top + 3 Bottom',
  '4p-top3-bot1': '3 Top + 1 Bottom',
};

interface Player {
  id: string;
  name: string;
}

interface LayoutPreviewProps {
  players: Player[];
  rotations: Record<string, number>;
  layoutVariant: string;
  onReorder: (reordered: Player[]) => void;
  onRotate: (playerId: string, degrees: number) => void;
  onLayoutChange: (variant: string) => void;
}

// ── Layout variant thumbnail ──────────────────────────────────────────────

function VariantThumb({ variant, isSelected, onPress }: {
  variant: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const thumbH = THUMB_SIZE / THUMB_RATIO;

  const renderThumbSlots = () => {
    switch (variant) {
      case '2p-stack':
        return (
          <>
            <View style={thumbStyles.full} />
            <View style={thumbStyles.full} />
          </>
        );
      case '2p-side':
        return (
          <View style={thumbStyles.row}>
            <View style={thumbStyles.half} />
            <View style={thumbStyles.half} />
          </View>
        );
      case '3p-top1-bot2':
        return (
          <>
            <View style={[thumbStyles.full, { flex: 2 }]} />
            <View style={[thumbStyles.row, { flex: 3 }]}>
              <View style={thumbStyles.half} />
              <View style={thumbStyles.half} />
            </View>
          </>
        );
      case '3p-left1-right2':
        return (
          <View style={thumbStyles.row}>
            <View style={thumbStyles.half} />
            <View style={[thumbStyles.col, { flex: 1 }]}>
              <View style={thumbStyles.full} />
              <View style={thumbStyles.full} />
            </View>
          </View>
        );
      case '3p-top2-bot1':
        return (
          <>
            <View style={[thumbStyles.row, { flex: 3 }]}>
              <View style={thumbStyles.half} />
              <View style={thumbStyles.half} />
            </View>
            <View style={[thumbStyles.full, { flex: 2 }]} />
          </>
        );
      case '4p-grid':
        return (
          <>
            <View style={thumbStyles.row}>
              <View style={thumbStyles.half} />
              <View style={thumbStyles.half} />
            </View>
            <View style={thumbStyles.row}>
              <View style={thumbStyles.half} />
              <View style={thumbStyles.half} />
            </View>
          </>
        );
      case '4p-top1-bot3':
        return (
          <>
            <View style={[thumbStyles.full, { flex: 2 }]} />
            <View style={[thumbStyles.row, { flex: 3 }]}>
              <View style={thumbStyles.third} />
              <View style={thumbStyles.third} />
              <View style={thumbStyles.third} />
            </View>
          </>
        );
      case '4p-top3-bot1':
        return (
          <>
            <View style={[thumbStyles.row, { flex: 3 }]}>
              <View style={thumbStyles.third} />
              <View style={thumbStyles.third} />
              <View style={thumbStyles.third} />
            </View>
            <View style={[thumbStyles.full, { flex: 2 }]} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Pressable onPress={onPress} style={thumbStyles.container}>
      <View style={[
        thumbStyles.thumb,
        { width: THUMB_SIZE, height: thumbH },
        isSelected && thumbStyles.thumbSelected,
      ]}>
        {renderThumbSlots()}
      </View>
      <Text style={[thumbStyles.label, isSelected && thumbStyles.labelSelected]} numberOfLines={2}>
        {VARIANT_LABELS[variant] ?? variant}
      </Text>
    </Pressable>
  );
}

const thumbStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
    width: THUMB_SIZE + 16,
  },
  thumb: {
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border.default,
  },
  thumbSelected: {
    borderColor: colors.accent.primary,
    borderWidth: 2,
  },
  label: {
    color: colors.text.muted,
    fontSize: typography.size.label - 1,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.accent.primary,
    fontWeight: typography.weight.bold,
  },
  full: {
    flex: 1,
    backgroundColor: colors.background.surface,
    borderWidth: 0.5,
    borderColor: colors.border.subtle,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  half: {
    flex: 1,
    backgroundColor: colors.background.surface,
    borderWidth: 0.5,
    borderColor: colors.border.subtle,
  },
  third: {
    flex: 1,
    backgroundColor: colors.background.surface,
    borderWidth: 0.5,
    borderColor: colors.border.subtle,
  },
});

// ── Main LayoutPreview ────────────────────────────────────────────────────

export function LayoutPreview({
  players,
  rotations,
  layoutVariant,
  onReorder,
  onRotate,
  onLayoutChange,
}: LayoutPreviewProps) {
  const { t } = useTranslation();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const count = players.length;

  const base = Math.min(screenW, screenH);
  const previewWidth = base * SCREEN_FRACTION;
  const previewHeight = previewWidth / PREVIEW_RATIO;

  const variants = LAYOUT_VARIANTS[count] ?? [];

  const handleTap = useCallback((index: number) => {
    if (selectedIndex === null) {
      setSelectedIndex(index);
      return;
    }
    if (selectedIndex === index) {
      setSelectedIndex(null);
      return;
    }
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
        <Pressable
          onPress={() => handleRotate(player.id)}
          style={styles.rotateBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Rotate ${player.name}'s text direction. Currently ${deg}deg`}
        >
          <Text style={styles.rotateArrow}>{arrow}</Text>
        </Pressable>

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

  // Render the preview grid for the selected layout variant
  const renderPreviewGrid = () => {
    switch (layoutVariant) {
      case '2p-stack':
        return (
          <>
            <View style={styles.fullRow}>{renderSlot(0)}</View>
            <View style={styles.fullRow}>{renderSlot(1)}</View>
          </>
        );
      case '2p-side':
        return (
          <View style={styles.halfRow}>
            {renderSlot(0)}
            {renderSlot(1)}
          </View>
        );
      case '3p-top1-bot2':
        return (
          <>
            <View style={[styles.fullRow, { flex: 2 }]}>{renderSlot(0)}</View>
            <View style={[styles.halfRow, { flex: 3 }]}>
              {renderSlot(1)}
              {renderSlot(2)}
            </View>
          </>
        );
      case '3p-left1-right2':
        return (
          <View style={styles.halfRow}>
            {renderSlot(0)}
            <View style={{ flex: 1 }}>
              {renderSlot(1)}
              {renderSlot(2)}
            </View>
          </View>
        );
      case '3p-top2-bot1':
        return (
          <>
            <View style={[styles.halfRow, { flex: 3 }]}>
              {renderSlot(0)}
              {renderSlot(1)}
            </View>
            <View style={[styles.fullRow, { flex: 2 }]}>{renderSlot(2)}</View>
          </>
        );
      case '4p-grid':
        return (
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
        );
      case '4p-top1-bot3':
        return (
          <>
            <View style={[styles.fullRow, { flex: 2 }]}>{renderSlot(0)}</View>
            <View style={[styles.halfRow, { flex: 3 }]}>
              {renderSlot(1)}
              {renderSlot(2)}
              {renderSlot(3)}
            </View>
          </>
        );
      case '4p-top3-bot1':
        return (
          <>
            <View style={[styles.halfRow, { flex: 3 }]}>
              {renderSlot(0)}
              {renderSlot(1)}
              {renderSlot(2)}
            </View>
            <View style={[styles.fullRow, { flex: 2 }]}>{renderSlot(3)}</View>
          </>
        );
      default:
        return null;
    }
  };

  if (count < 2) return null;

  return (
    <View style={styles.container}>
      {/* Layout variant picker */}
      {variants.length > 1 && (
        <>
          <Text style={styles.variantLabel}>{t('match.chooseLayout', { defaultValue: 'Choose layout' })}</Text>
          <View style={styles.variantRow}>
            {variants.map((v) => (
              <VariantThumb
                key={v}
                variant={v}
                isSelected={v === layoutVariant}
                onPress={() => onLayoutChange(v)}
              />
            ))}
          </View>
        </>
      )}

      {/* Main preview */}
      <Text style={styles.hint}>{t('match.tapToSwap')}</Text>
      <View style={[styles.preview, { width: previewWidth, height: previewHeight }]}>
        {renderPreviewGrid()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[3],
    alignItems: 'center',
  },
  variantLabel: {
    color: colors.text.secondary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  variantRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
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
