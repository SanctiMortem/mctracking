// SCR-002: Home — implementation in PLAT-010
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MTG Commander Tracker</Text>
      <Text style={styles.sub}>SCR-002 — Home (PLAT-010)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text.primary, fontSize: 22, fontWeight: 'bold' },
  sub: { color: colors.text.secondary, fontSize: 13, marginTop: 8 },
});
