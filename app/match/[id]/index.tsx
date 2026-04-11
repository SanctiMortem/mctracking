// SCR-011: Match Detail — implementation in MATCH-008
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/styles/tokens';

export default function MatchDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>SCR-011 — Match Detail (MATCH-008)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: colors.text.secondary, fontSize: 16 },
});
