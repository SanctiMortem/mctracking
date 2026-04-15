/**
 * TrackerLayout — positions 2, 3, or 4 PlayerSections within the tracker.
 *
 * Supports multiple layout variants per player count, selected during
 * match setup. Falls back to the default layout if no variant is specified.
 *
 * TRACK-003 (EPIC-03)
 */
import { StyleSheet, View } from 'react-native';

import { PlayerSection } from './PlayerSection';

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

function Section({ s, style }: { s: SectionData; style?: object }) {
  return (
    <PlayerSection
      key={s.id}
      rotation={s.rotation}
      isActive={s.isActive}
      flex={1}
      style={style}
    >
      {s.content}
    </PlayerSection>
  );
}

export function TrackerLayout({ sections, layoutVariant }: TrackerLayoutProps) {
  const count = sections.length;

  // ── 2 Players ──────────────────────────────────
  if (count === 2) {
    if (layoutVariant === '2p-side') {
      return (
        <View style={styles.container}>
          <View style={styles.row}>
            {sections.map((s) => (
              <Section key={s.id} s={s} />
            ))}
          </View>
        </View>
      );
    }
    // Default: 2p-stack
    return (
      <View style={styles.container}>
        {sections.map((s) => (
          <Section key={s.id} s={s} style={styles.fullWidth} />
        ))}
      </View>
    );
  }

  // ── 3 Players ──────────────────────────────────
  if (count === 3) {
    const [a, b, c] = sections;

    if (layoutVariant === '3p-left1-right2') {
      return (
        <View style={styles.container}>
          <View style={styles.row}>
            <Section s={a} />
            <View style={styles.col}>
              <Section s={b} />
              <Section s={c} />
            </View>
          </View>
        </View>
      );
    }

    if (layoutVariant === '3p-top2-bot1') {
      return (
        <View style={styles.container}>
          <View style={[styles.row, { flex: 3 }]}>
            <Section s={a} />
            <Section s={b} />
          </View>
          <View style={[styles.row, { flex: 2 }]}>
            <Section s={c} style={styles.fullWidth} />
          </View>
        </View>
      );
    }

    // Default: 3p-top1-bot2 (1 top small + 2 bottom large)
    return (
      <View style={styles.container}>
        <View style={[styles.row, { flex: 2 }]}>
          <Section s={a} style={styles.fullWidth} />
        </View>
        <View style={[styles.row, { flex: 3 }]}>
          <Section s={b} />
          <Section s={c} />
        </View>
      </View>
    );
  }

  // ── 4 Players ──────────────────────────────────
  if (count === 4) {
    const [a, b, c, d] = sections;

    if (layoutVariant === '4p-top1-bot3') {
      return (
        <View style={styles.container}>
          <View style={[styles.row, { flex: 2 }]}>
            <Section s={a} style={styles.fullWidth} />
          </View>
          <View style={[styles.row, { flex: 3 }]}>
            <Section s={b} />
            <Section s={c} />
            <Section s={d} />
          </View>
        </View>
      );
    }

    if (layoutVariant === '4p-top3-bot1') {
      return (
        <View style={styles.container}>
          <View style={[styles.row, { flex: 3 }]}>
            <Section s={a} />
            <Section s={b} />
            <Section s={c} />
          </View>
          <View style={[styles.row, { flex: 2 }]}>
            <Section s={d} style={styles.fullWidth} />
          </View>
        </View>
      );
    }

    // Default: 4p-grid (2x2)
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <Section s={a} />
          <Section s={b} />
        </View>
        <View style={styles.row}>
          <Section s={c} />
          <Section s={d} />
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  fullWidth: {
    width: '100%',
  },
});
