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

import { colors, radius, spacing, typography } from '@/styles/tokens';

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
        <ActivityIndicator size="small" color={colors.text.primary} />
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

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  buttonPrimary: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
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
    fontSize: typography.size['body-lg'],
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.normal,
  },
  labelPrimary: {
    fontWeight: typography.weight.semibold,
  },
});
