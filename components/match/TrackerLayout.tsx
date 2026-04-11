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

interface SectionData {
  id: string;
  playerName: string;
  content: React.ReactNode;
}

interface TrackerLayoutProps {
  sections: SectionData[];
}

export function TrackerLayout({ sections }: TrackerLayoutProps) {
  const count = sections.length;

  if (count === 2) {
    return (
      <View style={styles.container}>
        {sections.map((s) => (
          <PlayerSection key={s.id} playerName={s.playerName} flex={1} style={styles.fullWidth}>
            {s.content}
          </PlayerSection>
        ))}
      </View>
    );
  }

  if (count === 3) {
    const [top, ...bottom] = sections;
    return (
      <View style={styles.container}>
        {/* Top: single full-width section */}
        <PlayerSection key={top.id} playerName={top.playerName} flex={1} style={styles.fullWidth}>
          {top.content}
        </PlayerSection>
        {/* Bottom: two equal sections side by side */}
        <View style={styles.row}>
          {bottom.map((s) => (
            <PlayerSection key={s.id} playerName={s.playerName} flex={1}>
              {s.content}
            </PlayerSection>
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
          <PlayerSection key={a.id} playerName={a.playerName} flex={1}>{a.content}</PlayerSection>
          <PlayerSection key={b.id} playerName={b.playerName} flex={1}>{b.content}</PlayerSection>
        </View>
        <View style={styles.row}>
          <PlayerSection key={c.id} playerName={c.playerName} flex={1}>{c.content}</PlayerSection>
          <PlayerSection key={d.id} playerName={d.playerName} flex={1}>{d.content}</PlayerSection>
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
