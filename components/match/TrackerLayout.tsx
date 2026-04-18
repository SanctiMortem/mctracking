/**
 * TrackerLayout — Collapsed Grid for 2/3/4 player frames.
 *
 * Design contract (per TRACK-003 layout spec):
 *   • Frames are packed tightly together at the center of the viewport.
 *   • Gutter between frames is a hard 2px — NO space-around / space-between.
 *     We use `gap: 2` with a centered flexbox; leftover screen real estate
 *     is absorbed as outer padding (alignItems/justifyContent: center on the
 *     wrapper).
 *   • Each frame keeps its 5:3 player aspect ratio. We compute the packed
 *     width/height the frames need and hand those exact dimensions to
 *     PlayerSection — so no slot letterboxing, no dead space between frames.
 *
 * TRACK-003 (EPIC-03)
 */
import { useCallback, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';

import { PlayerSection } from './PlayerSection';

const GAP = 2;
// Frame aspect (width / height) from the player's perspective.
const FRAME_ASPECT = 5 / 3;

export interface SectionData {
  id: string;
  rotation?: number;
  isActive?: boolean;
  content: React.ReactNode;
}

interface TrackerLayoutProps {
  sections: SectionData[];
  /** Layout variant key from match setup (e.g. '3p-top1-bot2'). */
  layoutVariant?: string;
}

// ─── Layout schema ────────────────────────────────────────────────────────────
// Each variant is described as a vertical stack of rows. Each row has a
// `weight` (relative height share) and a list of section indices that sit
// horizontally in that row. `3p-left1-right2` uses a single outer row with
// two columns — we handle it as a one-off below.

type RowSpec = { weight: number; cells: number[] };

function schemaFor(variant: string | undefined, count: number): RowSpec[] | null {
  if (count === 2) {
    if (variant === '2p-side') {
      return [{ weight: 1, cells: [0, 1] }];
    }
    // Default 2p-stack
    return [
      { weight: 1, cells: [0] },
      { weight: 1, cells: [1] },
    ];
  }

  if (count === 3) {
    if (variant === '3p-top2-bot1') {
      return [
        { weight: 3, cells: [0, 1] },
        { weight: 2, cells: [2] },
      ];
    }
    if (variant === '3p-left1-right2') {
      // Handled as a dedicated layout below — signal with null.
      return null;
    }
    // Default 3p-top1-bot2
    return [
      { weight: 2, cells: [0] },
      { weight: 3, cells: [1, 2] },
    ];
  }

  if (count === 4) {
    if (variant === '4p-top1-bot3') {
      return [
        { weight: 2, cells: [0] },
        { weight: 3, cells: [1, 2, 3] },
      ];
    }
    if (variant === '4p-top3-bot1') {
      return [
        { weight: 3, cells: [0, 1, 2] },
        { weight: 2, cells: [3] },
      ];
    }
    // Default 4p-grid (2x2)
    return [
      { weight: 1, cells: [0, 1] },
      { weight: 1, cells: [2, 3] },
    ];
  }

  return null;
}

// ─── Pack computation ─────────────────────────────────────────────────────────
// Given a viewport and a row schema, compute the largest frame sizes that:
//   1. Keep every frame at the 5:3 aspect ratio,
//   2. Use row weights as the ratio between row heights (once all cells share
//      the same height per row),
//   3. Fit inside the viewport with 2px gaps, horizontal and vertical.
//
// Strategy: assume the available height is the binding constraint, compute
// heights from weights, derive widths from the aspect ratio, then scale the
// whole layout down uniformly if the widest row would overflow.

type PackedRow = { weight: number; h: number; frameW: number; cells: number[] };

function packRows(rows: RowSpec[], vpW: number, vpH: number): { packed: PackedRow[]; packW: number; packH: number } {
  const totalWeight = rows.reduce((s, r) => s + r.weight, 0);
  const availH = vpH - GAP * (rows.length - 1);

  // First pass — distribute height by weight; width follows from aspect.
  const packed: PackedRow[] = rows.map((r) => {
    const h = (availH * r.weight) / totalWeight;
    const frameW = h * FRAME_ASPECT;
    return { weight: r.weight, h, frameW, cells: r.cells };
  });

  // Horizontal fit — if any row's packed width exceeds the viewport, scale
  // everything down uniformly so proportions stay intact.
  const worstRowW = Math.max(
    ...packed.map((r) => r.frameW * r.cells.length + GAP * (r.cells.length - 1)),
  );
  const scale = worstRowW > vpW ? vpW / worstRowW : 1;

  if (scale < 1) {
    for (const r of packed) {
      r.h *= scale;
      r.frameW *= scale;
    }
  }

  const packW = Math.max(
    ...packed.map((r) => r.frameW * r.cells.length + GAP * (r.cells.length - 1)),
  );
  const packH = packed.reduce((s, r) => s + r.h, 0) + GAP * (packed.length - 1);

  return { packed, packW, packH };
}

// ─── Components ───────────────────────────────────────────────────────────────

function Frame({ s, w, h }: { s: SectionData; w: number; h: number }) {
  return (
    <View style={{ width: w, height: h }}>
      <PlayerSection rotation={s.rotation} isActive={s.isActive}>
        {s.content}
      </PlayerSection>
    </View>
  );
}

export function TrackerLayout({ sections, layoutVariant }: TrackerLayoutProps) {
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewport((prev) => {
      if (Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1) return prev;
      return { w: width, h: height };
    });
  }, []);

  const count = sections.length;
  const measured = viewport.w > 0 && viewport.h > 0;

  // ─── 3p-left1-right2 — special two-column pack ──
  if (count === 3 && layoutVariant === '3p-left1-right2' && measured) {
    const { w: vpW, h: vpH } = viewport;
    // Left column: 1 frame at full viewport height.
    // Right column: 2 stacked frames, each at half height (minus GAP).
    const leftH = vpH;
    const leftW = leftH * FRAME_ASPECT;
    const rightFrameH = (vpH - GAP) / 2;
    const rightFrameW = rightFrameH * FRAME_ASPECT;

    let packW = leftW + GAP + rightFrameW;
    let packH = vpH;

    const scale = packW > vpW ? vpW / packW : 1;
    if (scale < 1) {
      packW *= scale;
      packH *= scale;
    }

    const sLeftW = leftW * scale;
    const sLeftH = leftH * scale;
    const sRightW = rightFrameW * scale;
    const sRightH = rightFrameH * scale;

    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onLayout={onLayout}>
        <View style={{ flexDirection: 'row', gap: GAP, width: packW, height: packH }}>
          <Frame s={sections[0]} w={sLeftW} h={sLeftH} />
          <View style={{ gap: GAP }}>
            <Frame s={sections[1]} w={sRightW} h={sRightH} />
            <Frame s={sections[2]} w={sRightW} h={sRightH} />
          </View>
        </View>
      </View>
    );
  }

  const rows = schemaFor(layoutVariant, count);
  if (!rows || !measured) {
    // Render the onLayout container so we can measure; once measured, we re-render.
    return <View style={{ flex: 1 }} onLayout={onLayout} />;
  }

  const { packed, packW, packH } = packRows(rows, viewport.w, viewport.h);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onLayout={onLayout}>
      <View style={{ width: packW, height: packH, gap: GAP }}>
        {packed.map((row, rowIdx) => (
          <View
            key={rowIdx}
            style={{
              flexDirection: 'row',
              gap: GAP,
              justifyContent: 'center',
              height: row.h,
            }}
          >
            {row.cells.map((sectionIdx) => (
              <Frame
                key={sections[sectionIdx].id}
                s={sections[sectionIdx]}
                w={row.frameW}
                h={row.h}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
