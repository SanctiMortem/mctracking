// SCR-005: Match history — implementation in HIST-002
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-005 — History (HIST-002)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
