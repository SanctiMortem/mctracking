import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../styles/tokens';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Settings — coming in EPIC-05</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    color: colors.text.secondary,
    fontSize: 16,
  },
});
