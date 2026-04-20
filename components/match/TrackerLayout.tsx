/**
 * TrackerLayout — Level 1: Elastic grid of center-facing frames.
 *
 * CARDINAL ORIENTATION MATRIX
 *   Every layout is a pure JSX tree of flex containers. Frames are flex:1
 *   so they fill 100 % of the cell the grid gave them. A fixed 2 px gap
 *   sits between every frame; leftover viewport real-estate is pushed to
 *   the edges (outer `justifyContent: 'center'`).
 *
 *   The set of supported center-facing variants:
 *     2p-side     — 2 columns (EW axis)
 *     2p-stack    — 2 rows    (NS axis, kept for symmetry)
 *     3p-left1-right2  — col + (col of 2)            [EW / EW / EW]
 *     3p-top1-bot2     — row + (row of 2)            [NS / EW / EW]
 *     3p-top2-bot1     — (row of 2) + row            [EW / EW / NS]
 *     4p-grid     — 2 × (row of 2)                   [EW × 4]
 *     4p-pod      — 4-row grid, top/bot span width,  [NS / EW / EW / NS]
 *                   mid pair spans rows 2+3
 *
 * TRACK-003 (EPIC-03)
 */
import { View } from 'react-native';

import { PlayerSection } from './PlayerSection';

const GAP = 4;

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

// ─── Frame + flex helpers ────────────────────────────────────────────────────

function Cell({ s, flex = 1 }: { s: SectionData; flex?: number }) {
  return (
    <View style={{ flex, minWidth: 0, minHeight: 0 }}>
      <PlayerSection rotation={s.rotation} isActive={s.isActive}>
        {s.content}
      </PlayerSection>
    </View>
  );
}

function Row({ children, flex = 1 }: { children: React.ReactNode; flex?: number }) {
  return (
    <View style={{ flex, flexDirection: 'row', gap: GAP, minWidth: 0, minHeight: 0 }}>
      {children}
    </View>
  );
}

function Col({ children, flex = 1 }: { children: React.ReactNode; flex?: number }) {
  return (
    <View style={{ flex, flexDirection: 'column', gap: GAP, minWidth: 0, minHeight: 0 }}>
      {children}
    </View>
  );
}

// ─── Variant renderer ────────────────────────────────────────────────────────

function renderVariant(variant: string | undefined, sections: SectionData[]): React.ReactNode {
  const count = sections.length;
  const v = normalizeVariant(variant, count);

  if (count === 2) {
    if (v === '2p-side') {
      // EW axis: West-facing player | East-facing player
      return (
        <Row>
          <Cell s={sections[0]} />
          <Cell s={sections[1]} />
        </Row>
      );
    }
    // 2p-stack (NS axis): South-facing player above North-facing player
    return (
      <Col>
        <Cell s={sections[0]} />
        <Cell s={sections[1]} />
      </Col>
    );
  }

  if (count === 3) {
    if (v === '3p-top2-bot1') {
      // Two top frames span 2/3 height (one row each in the 3-row grid),
      // bottom singleton spans 1/3.
      return (
        <Col>
          <Row flex={2}>
            <Cell s={sections[0]} />
            <Cell s={sections[1]} />
          </Row>
          <Row flex={1}>
            <Cell s={sections[2]} />
          </Row>
        </Col>
      );
    }
    if (v === '3p-left1-right2') {
      // Column 1 (full height) + Column 2 (split vertically)
      return (
        <Row>
          <Cell s={sections[0]} />
          <Col>
            <Cell s={sections[1]} />
            <Cell s={sections[2]} />
          </Col>
        </Row>
      );
    }
    // 3p-top1-bot2: top singleton spans 1/3 height, bottom pair spans 2/3.
    return (
      <Col>
        <Row flex={1}>
          <Cell s={sections[0]} />
        </Row>
        <Row flex={2}>
          <Cell s={sections[1]} />
          <Cell s={sections[2]} />
        </Row>
      </Col>
    );
  }

  if (count === 4) {
    if (v === '4p-pod') {
      // Commander Pod 1-2-1 expressed as a 4-row grid where the middle
      // player pair spans rows 2+3. We realise that with three rows whose
      // flex weights are 1 / 2 / 1 (top / mid-pair / bottom).
      return (
        <Col>
          <Row flex={1}>
            <Cell s={sections[0]} />
          </Row>
          <Row flex={2}>
            <Cell s={sections[1]} />
            <Cell s={sections[2]} />
          </Row>
          <Row flex={1}>
            <Cell s={sections[3]} />
          </Row>
        </Col>
      );
    }
    // 4p-grid — Quad 2×2 (EW axis throughout)
    return (
      <Col>
        <Row>
          <Cell s={sections[0]} />
          <Cell s={sections[1]} />
        </Row>
        <Row>
          <Cell s={sections[2]} />
          <Cell s={sections[3]} />
        </Row>
      </Col>
    );
  }

  // Fallback — single row for any unexpected count.
  return (
    <Row>
      {sections.map((s) => (
        <Cell key={s.id} s={s} />
      ))}
    </Row>
  );
}

// Legacy variants fold into current ones so in-progress matches keep working.
function normalizeVariant(variant: string | undefined, count: number): string | undefined {
  if (!variant) return undefined;
  if (count === 4) {
    if (variant === '4p-top1-bot3' || variant === '4p-top3-bot1' || variant === '4p-vstack') {
      return '4p-pod';
    }
  }
  return variant;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TrackerLayout({ sections, layoutVariant }: TrackerLayoutProps) {
  return (
    <View style={{ flex: 1, alignItems: 'stretch', justifyContent: 'center' }}>
      {renderVariant(layoutVariant, sections)}
    </View>
  );
}
