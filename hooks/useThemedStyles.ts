/**
 * useThemedStyles — compute StyleSheet from active theme.
 *
 * Usage:
 *   const styles = useThemedStyles((t) => ({
 *     container: { backgroundColor: t.colors.background.primary },
 *   }));
 */
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/styles/themes/types';

export function useThemedStyles<T extends Record<string, any>>(
  factory: (theme: AppTheme) => T,
): { [K in keyof T]: any } {
  const { theme } = useTheme();
  return useMemo(
    () => StyleSheet.create(factory(theme) as any),
    [theme],
  );
}
