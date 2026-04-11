// SCR-008: Match Tracker — implementation in TRACK-003
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function MatchTrackerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-008 — Match Tracker (TRACK-003)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
