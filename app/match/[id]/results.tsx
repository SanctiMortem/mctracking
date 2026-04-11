// SCR-010: Match Results — implementation in MATCH-007
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function MatchResultsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-010 — Match Results (MATCH-007)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
