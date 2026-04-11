// SCR-015: Matchup Stats — implementation in HIST-010 / HIST-011
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function MatchupStatsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-015 — Matchup Stats (HIST-010)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
