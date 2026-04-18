/**
 * PlayerSection — Level 2: Cardinal-axis frame.
 *
 * CARDINAL COORDINATE SYSTEM
 *   Viewport axes: North = top, South = bottom, East = right, West = left.
 *   Every player "faces the centre" of the screen; their frame is placed on
 *   the opposite edge from their gaze. The rotation prop is a CSS rotation
 *   in degrees that maps onto one of four cardinal facings:
 *
 *       CSS 0°   = facing North (reader sits on the South edge)
 *       CSS 180° = facing South (reader sits on the North edge)
 *       CSS 90°  = facing East  (reader sits on the West edge)
 *       CSS 270° = facing West  (reader sits on the East edge)
 *
 * THE 0/180 RULE (within an axis)
 *   A slot is pinned to either the NS axis (0° / 180°) or the EW axis
 *   (90° / 270°). Manual flip swaps the facing WITHIN the axis — it never
 *   crosses axes. A long-press on the sidebar (handled in PlayerDashboard
 *   via the `usePlayerFlip` context) toggles the facing.
 *
 * ELASTICITY
 *   The frame itself is flex:1 and fills the slot the TrackerLayout gave
 *   it — no fixed aspect ratio. For EW-axis players, the inner content
 *   rect is swapped (W↔H) so that after the 90°/270° CSS rotation the
 *   content lands landscape inside the portrait-ish slot. The content's
 *   internal coordinate system is therefore always "landscape from the
 *   player's perspective", with the 20 % sidebar on their left.
 *
 * HIT-ZONE SYNC
 *   All Pressables (life ±, dead button, counter footer) live INSIDE the
 *   rotated content, so "right" stays on the player's physical right hand
 *   regardless of rotation or manual flip.
 *
 * TRACK-003 (EPIC-03)
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

export type CardinalAxis = 'NS' | 'EW';

interface PlayerSectionProps {
  children: React.ReactNode;
  /** CSS rotation in degrees (0 / 90 / 180 / 270). Anything else is snapped. */
  rotation?: number;
  /** Whether this player's turn timer is active — highlights the whole frame. */
  isActive?: boolean;
  style?: object;
}

/** Snap an arbitrary rotation to the nearest cardinal value. */
function snapCardinal(raw: number): 0 | 90 | 180 | 270 {
  const norm = ((raw % 360) + 360) % 360;
  if (norm >= 45 && norm < 135) return 90;
  if (norm >= 135 && norm < 225) return 180;
  if (norm >= 225 && norm < 315) return 270;
  return 0;
}

function axisOf(rotation: 0 | 90 | 180 | 270): CardinalAxis {
  return rotation === 90 || rotation === 270 ? 'EW' : 'NS';
}

/** Flip a rotation across its axis (the other valid facing within the axis). */
function flipWithinAxis(rotation: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 {
  switch (rotation) {
    case 0: return 180;
    case 180: return 0;
    case 90: return 270;
    case 270: return 90;
  }
}

// ─── Manual-flip context ─────────────────────────────────────────────────────
// Exposed so consumers (e.g. PlayerDashboard) can render a small flip toggle
// or hook a long-press to it. State lives here so the frame, not the
// content, owns it.

interface FlipContextValue {
  flipped: boolean;
  toggle: () => void;
}
const FlipContext = createContext<FlipContextValue | null>(null);

export function usePlayerFlip(): FlipContextValue {
  return useContext(FlipContext) ?? { flipped: false, toggle: () => {} };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PlayerSection({ children, rotation = 0, isActive = false, style }: PlayerSectionProps) {
  const styles = useThemedStyles(createStyles);
  const [manualFlipped, setManualFlipped] = useState(false);
  const [slot, setSlot] = useState({ w: 0, h: 0 });

  const defaultRotation = snapCardinal(rotation);
  const effectiveRotation = manualFlipped ? flipWithinAxis(defaultRotation) : defaultRotation;
  const axis = axisOf(effectiveRotation);
  const isSideways = axis === 'EW';

  const toggleFlip = useCallback(() => setManualFlipped((v) => !v), []);
  const flipCtx = useMemo<FlipContextValue>(
    () => ({ flipped: manualFlipped, toggle: toggleFlip }),
    [manualFlipped, toggleFlip],
  );

  const onSlotLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSlot((prev) => {
      if (Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1) return prev;
      return { w: width, h: height };
    });
  }, []);

  const measured = slot.w > 0 && slot.h > 0;

  // Content dims: for EW-axis players we swap W/H so that after the 90°/270°
  // rotation the content fills the slot. For NS-axis players content dims
  // match the slot exactly.
  const contentW = isSideways ? slot.h : slot.w;
  const contentH = isSideways ? slot.w : slot.h;

  return (
    <View
      style={[styles.frame, isActive && styles.frameActive, style]}
      onLayout={onSlotLayout}
    >
      {measured && (
        <View
          style={[
            styles.content,
            {
              width: contentW,
              height: contentH,
              left: (slot.w - contentW) / 2,
              top: (slot.h - contentH) / 2,
              transform: [{ rotate: `${effectiveRotation}deg` }],
            },
          ]}
        >
          <FlipContext.Provider value={flipCtx}>{children}</FlipContext.Provider>
        </View>
      )}
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  frame: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    position: 'relative' as const,
    backgroundColor: t.colors.background.secondary,
    overflow: 'hidden' as const,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(238, 191, 115, 0.15)',
  },
  frameActive: {
    borderColor: t.colors.accent.primary,
    borderWidth: 1.5,
    backgroundColor: t.colors.background.secondary + 'ee',
  },
  content: {
    position: 'absolute' as const,
  },
});
