// SCR-013: Deck Detail — implementation in DATA-009 / HIST-007
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function DeckDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-013 — Deck Detail (DATA-009)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
