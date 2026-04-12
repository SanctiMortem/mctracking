import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../styles/tokens';
import { BannerAdWrapper } from '@/components/ads/BannerAdWrapper';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MTG Commander Tracker</Text>
      <Text style={styles.subtitle}>Home — coming in EPIC-01</Text>
      <BannerAdWrapper />
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
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: 8,
  },
});
