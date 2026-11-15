/**
 * Frame experiment — a sandbox for player-frame look and consistency.
 *
 * Only screens that wrap their tracker in <FrameExperimentProvider> get the
 * experimental behaviour (today: the signed-in casual match). Everywhere else
 * the hooks return the "off" defaults, so account matches and the guest
 * tracker render exactly as before. To retire the experiment: remove the
 * provider from app/match/casual.tsx (reverts casual), or make its behaviour
 * the default and delete this file.
 *
 * What it changes when on:
 *
 *   UNIFORM CONTENT BOX
 *     Frames still tile the whole screen, but every player's content (name,
 *     timer, life total, counters) is laid out in a box of the SAME size,
 *     centred in their frame. The box is the tightest frame in the match —
 *     min width × min height across all frames, measured in each player's
 *     own orientation — so bigger frames gain padding instead of stretching
 *     their content. One rule for the table, not one decision per frame.
 *     It is never smaller than the smallest frame was already, so nothing
 *     shrinks below what the layout showed before.
 *
 *   ONE LIFE-TOTAL SIZE
 *     Sized for a two-digit total in that shared box, so 7, 40 and 23 are
 *     the same height on every seat.
 *
 *   CENTRED LIFE TOTAL
 *     Centred on the content box, not on the area beside the sidebar.
 *
 *   FRAME LOOK
 *     Constant border thickness, faint inactive border, rounded corners, and
 *     a glow that bleeds inward from the edges of the active player's frame.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export interface Box {
  w: number;
  h: number;
}

/**
 * The content box is never longer than this many times its thickness. Past
 * that (two players side by side on a tall phone gives ~4:1) the sidebar and
 * life total drift so far apart the frame reads as stretched.
 */
const MAX_BOX_ASPECT = 2.8;

interface FrameExperimentValue {
  enabled: boolean;
  /** Content box every frame uses; null until at least one frame measured. */
  sharedBox: Box | null;
  /** A frame reports (or clears, with null) the content space it has. */
  reportBox: (id: string, box: Box | null) => void;
}

const OFF: FrameExperimentValue = { enabled: false, sharedBox: null, reportBox: () => {} };

const FrameExperimentContext = createContext<FrameExperimentValue>(OFF);

export function useFrameExperiment(): FrameExperimentValue {
  return useContext(FrameExperimentContext);
}

export function FrameExperimentProvider({ children }: { children: React.ReactNode }) {
  const boxesRef = useRef(new Map<string, Box>());
  const [sharedBox, setSharedBox] = useState<Box | null>(null);

  const reportBox = useCallback((id: string, box: Box | null) => {
    if (box) boxesRef.current.set(id, box);
    else boxesRef.current.delete(id);

    const all = [...boxesRef.current.values()];
    let next: Box | null = null;
    if (all.length) {
      const h = Math.min(...all.map((b) => b.h));
      const w = Math.min(Math.min(...all.map((b) => b.w)), h * MAX_BOX_ASPECT);
      next = { w: Math.floor(w), h: Math.floor(h) };
    }
    setSharedBox((prev) => {
      if (!next || !prev) return next;
      // Ignore sub-2px jitter so a re-measure does not re-render every frame.
      return Math.abs(prev.w - next.w) < 2 && Math.abs(prev.h - next.h) < 2 ? prev : next;
    });
  }, []);

  const value = useMemo(() => ({ enabled: true, sharedBox, reportBox }), [sharedBox, reportBox]);
  return <FrameExperimentContext.Provider value={value}>{children}</FrameExperimentContext.Provider>;
}

/**
 * Padding between the content box and the frame's edge, in the player's own
 * orientation. PlayerSection provides it; PlayerDashboard uses it to let the
 * commander art fill the whole frame rather than just the box. Zero when the
 * experiment is off.
 */
export const FramePadContext = createContext<{ x: number; y: number }>({ x: 0, y: 0 });

export function useFramePad(): { x: number; y: number } {
  return useContext(FramePadContext);
}

/**
 * How far (px, in the player's own left/right) the life total must shift to
 * sit on the content box's centre. Provided by PlayerDashboard, which knows
 * the sidebar width; 0 when the experiment is off.
 */
export const LifeCenterOffsetContext = createContext(0);

export function useLifeCenterOffset(): number {
  return useContext(LifeCenterOffsetContext);
}
