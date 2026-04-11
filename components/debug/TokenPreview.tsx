/**
 * TokenPreview — Debug component to verify design tokens visually.
 * Only use during development. Not rendered in production.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, mtgColors, radius, shadows, spacing, typography } from '@/styles/tokens';

type SwatchProps = { color: string; label: string };
function Swatch({ color, label }: SwatchProps) {
  return (
    <View style={styles.swatchRow}>
      <View style={[styles.swatchBox, { backgroundColor: color }]} />
      <Text style={styles.swatchLabel}>{label}</Text>
      <Text style={styles.swatchHex}>{color}</Text>
    </View>
  );
}

export default function TokenPreview() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* MTG Colors */}
      <Text style={styles.section}>MTG WUBRG</Text>
      {Object.entries(mtgColors).map(([k, v]) => (
        <Swatch key={k} color={v} label={k} />
      ))}

      {/* Background */}
      <Text style={styles.section}>Background</Text>
      {Object.entries(colors.background).map(([k, v]) => (
        <Swatch key={k} color={v} label={k} />
      ))}

      {/* Life Total */}
      <Text style={styles.section}>Life Total Ranges</Text>
      {Object.entries(colors.lifeTotal).map(([k, v]) => (
        <Swatch key={k} color={v} label={k} />
      ))}

      {/* Status */}
      <Text style={styles.section}>Status</Text>
      {Object.entries(colors.status).map(([k, v]) => (
        <Swatch key={k} color={v} label={k} />
      ))}

      {/* Typography */}
      <Text style={styles.section}>Typography Scale</Text>
      {Object.entries(typography.size).map(([k, v]) => (
        <Text key={k} style={[styles.typoSample, { fontSize: Math.min(v, 32) }]}>
          {k} — {v}sp
        </Text>
      ))}

      {/* Spacing */}
      <Text style={styles.section}>Spacing</Text>
      {Object.entries(spacing).map(([k, v]) => (
        <View key={k} style={styles.spacingRow}>
          <View style={[styles.spacingBar, { width: v }]} />
          <Text style={styles.swatchLabel}>{k} × 4 = {v}px</Text>
        </View>
      ))}

      {/* Shadow */}
      <Text style={styles.section}>Shadows</Text>
      {Object.entries(shadows).map(([k, v]) => (
        <View key={k} style={[styles.shadowBox, v]}>
          <Text style={styles.swatchLabel}>{k}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  content: { padding: spacing[4], paddingBottom: spacing[12] },
  section: {
    color: colors.accent.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.bold,
    marginTop: spacing[6],
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  swatchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[2] },
  swatchBox: { width: 32, height: 32, borderRadius: radius.sm, marginRight: spacing[2] },
  swatchLabel: { color: colors.text.primary, fontSize: typography.size['body-sm'], flex: 1 },
  swatchHex: { color: colors.text.secondary, fontSize: typography.size.caption },
  typoSample: { color: colors.text.primary, marginBottom: spacing[1] },
  spacingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[1] },
  spacingBar: { height: 12, backgroundColor: colors.accent.primary, borderRadius: radius.xs, marginRight: spacing[2] },
  shadowBox: {
    backgroundColor: colors.background.surface,
    padding: spacing[4],
    borderRadius: radius.md,
    marginBottom: spacing[4],
    alignItems: 'center',
  },
});
