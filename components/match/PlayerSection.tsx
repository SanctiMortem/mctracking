/**
 * PlayerSection — Level 2: The immovable frame (anchor).
 *
 * This component is a pure container. It:
 *   1. Participates in flex layout via `flex` (TrackerLayout decides size)
 *   2. Creates an absolute-filled inner frame so NO child content change
 *      can ever move, resize, or shift this component on screen
 *   3. Applies CSS rotation to the content layer (0/90/180/270)
 *   4. Renders children (the PlayerDashboard) centered inside
 *
 * It has zero awareness of what's inside it — no player name, no scroll,
 * no tracker logic. That all lives in PlayerDashboard (Level 3).
 *
 * TRACK-003 (EPIC-03)
 */
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/styles/tokens';

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

  return (
    <View style={[styles.wrapper, isActive && styles.wrapperActive, { flex }, style]}>
      {/* Absolute fill — wrapper keeps its flex-assigned size no matter what */}
      <View style={[styles.frame, isActive && styles.frameActive]}>
        <View
          style={[
            styles.content,
            isSideways && styles.contentSideways,
            rotation !== 0 && { transform: [{ rotate: `${rotation}deg` }] },
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(238, 191, 115, 0.15)',
  },
  wrapperActive: {
    borderColor: colors.accent.primary,
    borderWidth: 1.5,
  },
  frame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: spacing[1],
  },
  frameActive: {
    backgroundColor: colors.background.secondary + 'ee',
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // For 90/270°: swap perceived width/height by setting both axes to fill
  contentSideways: {
    aspectRatio: undefined,
  },
});
