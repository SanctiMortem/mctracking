// SCR-001: Auth screen — implementation in PLAT-003
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function AuthScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-001 — Auth (PLAT-003)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
