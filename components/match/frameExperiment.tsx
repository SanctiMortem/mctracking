/**
 * Frame experiment — a sandbox for player-frame look and consistency.
 *
 * Only screens that wrap their tracker in <FrameExperimentProvider enabled>
 * get the experimental behaviour (today: the signed-in casual match and the
 * account match tracker, when the Labs switch is on; the account tracker
 * can also switch it off for one match from its Layout sheet). Everywhere
 * else the hook returns the "off" defaults, so the guest tracker and any
 * device with the switch off render exactly as before. To retire it: remove
 * the provider from app/match/casual.tsx and app/match/[id]/tracker.tsx, or
 * make its behaviour the default and delete this file.
 *
 * Frames keep filling their slot edge to edge, exactly as before. What the
 * experiment makes consistent is the MEASUREMENTS inside them:
 *
 *   ONE SIDEBAR WIDTH   Every player's name/timer column is the same width
 *                       (20 % of the shortest frame) instead of 20 % of each
 *                       frame's own length.
 *   ONE LIFE-TOTAL SIZE Sized for a two-digit total in the tightest frame,
 *                       so 7, 40 and 23 are the same height on every seat.
 *   VERTICAL CENTRING   The life total is nudged down toward the middle of
 *                       the frame when there is room, instead of sitting
 *                       centred above the counter buttons.
 *   STRETCH LIMIT       A frame is never more than 1.5× the shortest frame's
 *                       length, nor more than 3.2:1; it is shortened and
 *                       centred in its slot instead.
 *   FRAME LOOK          Constant border thickness, faint inactive border,
 *                       rounded corners, and a glow that fades inward from
 *                       the active frame's edges.
 *   BRIGHTER            Commander art at about double strength with no grey
 *                       wash; it is shaded only behind the sidebar and the
 *                       counter footer so small text keeps its contrast.
 *
 * An earlier version laid every player's content out in one shared, centred
 * box and centred the life total on the whole frame. Both looked wrong on a
 * device — content floated in long frames and the number crowded the
 * sidebar — and were removed.
 */
import { Component, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Text } from 'react-native';

export interface Box {
  w: number;
  h: number;
}

/**
 * Stretch limits. A frame is never longer than MAX_FRAME_STRETCH times the
 * shortest frame at the table (the lone full-height player beside two
 * half-height ones would otherwise be twice as long), and never longer than
 * MAX_FRAME_ASPECT times its own thickness (two players side by side on a
 * tall phone would otherwise be ~4:1). Shortened frames are centred.
 */
export const MAX_FRAME_STRETCH = 1.5;
export const MAX_FRAME_ASPECT = 3.2;

/**
 * Ceiling for the life total. Two players stacked get near-square frames,
 * where "as big as fits" would fill the whole frame and crowd the counters.
 */
export const MAX_LIFE_FONT_SIZE = 170;

/** Sidebar hard minimum — same value PlayerDashboard uses. */
const SIDEBAR_MIN_WIDTH = 75;
/** Rule between sidebar and main zone. */
const DIVIDER_WIDTH = 1.5;
/** Height of the counter footer under the life total (PlayerDashboard zone B). */
export const COUNTER_FOOTER_HEIGHT = 52;

interface FrameExperimentValue {
  enabled: boolean;
  /** Tightest frame in the match (min length × min thickness); null until measured. */
  sharedBox: Box | null;
  /** Sidebar width every frame uses; null until measured. */
  sidebarWidth: number | null;
  /** Space the life total has in the tightest frame; null until measured. */
  lifeBox: Box | null;
  /** A frame reports (or clears, with null) its content size. */
  reportBox: (id: string, box: Box | null) => void;
}

const OFF: FrameExperimentValue = {
  enabled: false,
  sharedBox: null,
  sidebarWidth: null,
  lifeBox: null,
  reportBox: () => {},
};

const FrameExperimentContext = createContext<FrameExperimentValue>(OFF);

export function useFrameExperiment(): FrameExperimentValue {
  return useContext(FrameExperimentContext);
}

export function FrameExperimentProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const boxesRef = useRef(new Map<string, Box>());
  const [sharedBox, setSharedBox] = useState<Box | null>(null);

  const reportBox = useCallback((id: string, box: Box | null) => {
    if (box) boxesRef.current.set(id, box);
    else boxesRef.current.delete(id);

    const all = [...boxesRef.current.values()];
    const next = all.length
      ? {
          w: Math.floor(Math.min(...all.map((b) => b.w))),
          h: Math.floor(Math.min(...all.map((b) => b.h))),
        }
      : null;
    setSharedBox((prev) => {
      if (!next || !prev) return next;
      // Ignore sub-2px jitter so a re-measure does not re-render every frame.
      return Math.abs(prev.w - next.w) < 2 && Math.abs(prev.h - next.h) < 2 ? prev : next;
    });
  }, []);

  const value = useMemo<FrameExperimentValue>(() => {
    if (!enabled) return OFF;
    const sidebarWidth = sharedBox ? Math.max(SIDEBAR_MIN_WIDTH, sharedBox.w * 0.2) : null;
    const lifeBox =
      sharedBox && sidebarWidth
        ? {
            w: sharedBox.w - sidebarWidth - DIVIDER_WIDTH,
            h: sharedBox.h - COUNTER_FOOTER_HEIGHT,
          }
        : null;
    return { enabled: true, sharedBox, sidebarWidth, lifeBox, reportBox };
  }, [enabled, sharedBox, reportBox]);

  return <FrameExperimentContext.Provider value={value}>{children}</FrameExperimentContext.Provider>;
}

/**
 * Safety net for the experiment. If anything under it throws while rendering
 * (which closes the app in a release build), the tracker is rendered again
 * with the experiment off — the classic frames — and a one-line notice says
 * why. Match state lives above this boundary, so the game carries on.
 * An error with the experiment already off is rethrown by React as usual.
 */
export class FrameExperimentBoundary extends Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message.slice(0, 160) };
  }

  render() {
    if (this.state.error === null) return this.props.children;
    return (
      <FrameExperimentContext.Provider value={OFF}>
        <Text
          numberOfLines={2}
          style={{ color: '#e8c06a', fontSize: 11, textAlign: 'center', paddingVertical: 4, paddingHorizontal: 12 }}
        >
          New frames hit an error and are off for this match: {this.state.error}
        </Text>
        {this.props.children}
      </FrameExperimentContext.Provider>
    );
  }
}
