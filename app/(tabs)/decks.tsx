// SCR-004: Decks list — implementation in DATA-007
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function DecksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-004 — Decks (DATA-007)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
