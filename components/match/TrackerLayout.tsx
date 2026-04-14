/**
 * TrackerLayout — positions 2, 3, or 4 PlayerSections within the tracker.
 *
 * Layouts:
 *  2p: two rows (50% each), vertical split
 *  3p: top half full-width + bottom half 50/50
 *  4p: 2×2 grid (each section = 50% × 50%)
 *
 * TRACK-003 (EPIC-03)
 */
import { StyleSheet, View } from 'react-native';

import { PlayerSection } from './PlayerSection';

export type LayoutType = '2p' | '3p' | '4p';

export interface SectionData {
  id: string;
  /** Text rotation in degrees (0, 90, 180, 270). Set during match setup. */
  rotation?: number;
  /** Whether this player's turn timer is active. */
  isActive?: boolean;
  content: React.ReactNode;
}

interface TrackerLayoutProps {
  sections: SectionData[];
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

export function TrackerLayout({ sections }: TrackerLayoutProps) {
  const count = sections.length;

  if (count === 2) {
    return (
      <View style={styles.container}>
        {sections.map((s) => (
          <Section key={s.id} s={s} style={styles.fullWidth} />
        ))}
      </View>
    );
  }

  if (count === 3) {
    const [top, ...bottom] = sections;
    return (
      <View style={styles.container}>
        <Section s={top} style={styles.fullWidth} />
        <View style={styles.row}>
          {bottom.map((s) => (
            <Section key={s.id} s={s} />
          ))}
        </View>
      </View>
    );
  }

  if (count === 4) {
    const [a, b, c, d] = sections;
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
  fullWidth: {
    width: '100%',
  },
});
