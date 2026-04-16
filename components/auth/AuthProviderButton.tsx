/**
 * CMP-016 — AuthProviderButton
 *
 * Reusable auth provider button: default / loading / disabled states.
 * Used in SCR-001 for Email, Google, Apple, and Magic Link flows.
 * Loading state: active button shows activity indicator; all others dim to opacity 0.38.
 *
 * PLAT-003 (EPIC-05)
 */
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { useTheme } from '@/contexts/ThemeContext';

interface AuthProviderButtonProps {
  label: string;
  onPress: () => void;
  /** True while this specific button's flow is in progress */
  loading?: boolean;
  /** True while ANY button's flow is in progress (dims this button) */
  anyLoading?: boolean;
  /** Optional icon element rendered to the left of the label */
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export function AuthProviderButton({
  label,
  onPress,
  loading = false,
  anyLoading = false,
  icon,
  variant = 'secondary',
}: AuthProviderButtonProps) {
  const { theme } = useTheme();

  const styles = useThemedStyles(createStyles);

  const dimmed = anyLoading && !loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        dimmed && styles.buttonDimmed,
      ]}
      onPress={onPress}
      disabled={anyLoading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.text.primary} />
      ) : (
        <View style={styles.inner}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[styles.label, variant === 'primary' && styles.labelPrimary]}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (t: AppTheme) => ({
  button: {
    height: 52,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    backgroundColor: t.colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  buttonPrimary: {
    backgroundColor: t.colors.accent.primary,
    borderColor: t.colors.accent.primary,
  },
  buttonDimmed: {
    opacity: 0.38,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  icon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.medium,
    color: t.colors.text.primary,
    letterSpacing: t.typography.letterSpacing.normal,
  },
  labelPrimary: {
    fontWeight: t.typography.weight.semibold,
  },
})
