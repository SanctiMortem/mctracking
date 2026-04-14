/**
 * ResponsiveContainer — centers content with maxWidth on tablet/iPad.
 *
 * On phone: full width, standard padding.
 * On tablet/large: constrains to contentMaxWidth, centers horizontally.
 *
 * Use this as a wrapper inside ScrollView/FlatList or as a top-level container.
 */
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useResponsive } from '@/hooks/useResponsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Override max width (defaults to responsive contentMaxWidth) */
  maxWidth?: number;
}

export function ResponsiveContainer({ children, style, maxWidth }: ResponsiveContainerProps) {
  const { contentMaxWidth, contentPadding } = useResponsive();
  const effectiveMax = maxWidth ?? contentMaxWidth;

  return (
    <View
      style={[
        styles.container,
        { paddingHorizontal: contentPadding },
        effectiveMax ? { maxWidth: effectiveMax, alignSelf: 'center', width: '100%' } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
