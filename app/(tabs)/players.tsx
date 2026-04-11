// SCR-003: Players list — implementation in DATA-006
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function PlayersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-003 — Players (DATA-006)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
