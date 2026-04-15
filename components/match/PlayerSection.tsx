/**
 * PlayerSection — Level 2: Fixed 5:3 ratio "Safety Box".
 *
 * Enforces a strict 5:3 aspect ratio for ALL player frames regardless of
 * device size or player count. The frame is max-fitted and centered within
 * its allocated slot. Dead space outside the frame is filled with a dark
 * neutral background.
 *
 * For rotated players (90°/270°), the on-screen frame is 3:5 so that after
 * CSS rotation the player sees a 5:3 landscape frame.
 *
 * The internal coordinate system is ALWAYS 5:3 from the player's perspective.
 * This means the 20% sidebar, 80% action zone, text sizes, and hit zones
 * behave identically regardless of screen size — they scale proportionally
 * with the frame, not the screen.
 *
 * TRACK-003 (EPIC-03)
 */
import { useCallback, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { colors } from '@/styles/tokens';

/** Width:Height ratio for all player frames */
const FRAME_RATIO = 5 / 3;

interface PlayerSectionProps {
  children: React.ReactNode;
  flex?: number;
  /** Content rotation in degrees (0, 90, 180, 270). Defaults to 0. */
  rotation?: number;
  /** Whether this player's turn timer is active — highlights the whole frame. */
  isActive?: boolean;
  style?: object;
}

export function PlayerSection({ children, flex = 1, rotation = 0, isActive = false, style }: PlayerSectionProps) {
  const isSideways = rotation === 90 || rotation === 270;
  const [slotSize, setSlotSize] = useState({ w: 0, h: 0 });

  const onSlotLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSlotSize((prev) => {
      if (Math.abs(prev.w - width) < 2 && Math.abs(prev.h - height) < 2) return prev;
      return { w: width, h: height };
    });
  }, []);

  const { w: slotW, h: slotH } = slotSize;

  // On-screen frame ratio: 5:3 for 0/180°, 3:5 for 90/270°
  const screenRatio = isSideways ? 1 / FRAME_RATIO : FRAME_RATIO;

  let frameW = slotW;
  let frameH = slotH;

  if (slotW > 0 && slotH > 0) {
    const slotRatio = slotW / slotH;
    if (slotRatio > screenRatio) {
      // Slot is wider — constrain by height
      frameH = slotH;
      frameW = slotH * screenRatio;
    } else {
      // Slot is taller — constrain by width
      frameW = slotW;
      frameH = slotW / screenRatio;
    }
  }

  // Content dimensions: always 5:3 from the player's perspective
  // For sideways, swap so the content is landscape, then rotation makes it fit the portrait frame
  const contentW = isSideways ? frameH : frameW;
  const contentH = isSideways ? frameW : frameH;

  const measured = slotW > 0 && slotH > 0;

  return (
    <View
      style={[styles.slot, { flex }, style]}
      onLayout={onSlotLayout}
    >
      {measured && (
        <View
          style={[
            styles.frame,
            isActive && styles.frameActive,
            { width: frameW, height: frameH },
          ]}
        >
          <View
            style={[
              styles.content,
              { width: contentW, height: contentH },
              rotation !== 0 && { transform: [{ rotate: `${rotation}deg` }] },
            ]}
          >
            {children}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    // Dark neutral fills the dead space outside the 5:3 frame
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  frame: {
    backgroundColor: colors.background.secondary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(238, 191, 115, 0.15)',
  },
  frameActive: {
    borderColor: colors.accent.primary,
    borderWidth: 1.5,
    backgroundColor: colors.background.secondary + 'ee',
  },
  content: {
    // Content always fills the 5:3 box from the player's perspective
    alignItems: 'stretch',
    justifyContent: 'center',
  },
});
