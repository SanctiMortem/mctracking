// SCR-006: Stats dashboard — implementation in HIST-011
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function StatsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-006 — Stats Dashboard (HIST-011)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
