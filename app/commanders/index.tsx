// SCR-016: Commanders CRUD — implementation in DATA-005
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function CommandersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-016 — Commanders (DATA-005)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
