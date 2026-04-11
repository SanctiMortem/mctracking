// SCR-007: Match Setup — implementation in MATCH-005
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function MatchSetupScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-007 — Match Setup (MATCH-005)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
