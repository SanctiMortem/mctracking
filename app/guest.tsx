// SCR-019: Guest tracker — implementation in PLAT-004
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function GuestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-019 — Guest Tracker (PLAT-004)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
