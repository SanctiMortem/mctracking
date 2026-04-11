// SCR-014: Commander Detail — implementation in DATA-010 / HIST-009
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function CommanderDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-014 — Commander Detail (DATA-010)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
