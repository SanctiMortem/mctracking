// SCR-012: Player Profile — implementation in DATA-008 / HIST-005
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function PlayerProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-012 — Player Profile (DATA-008)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
