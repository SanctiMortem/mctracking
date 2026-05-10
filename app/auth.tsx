/**
 * SCR-001 — Auth / Login screen.
 *
 * Gate screen shown to unauthenticated, non-guest users.
 * Supports: Email/Password, Google OAuth, Apple Sign In (iOS only), Magic Link.
 * Post-auth: bootstraps user_settings via GET /auth/session, then navigates to Home.
 *
 * Design: "The Mystic Archive" dark theme — surface card, WUBRG accent.
 * BR-AUTH-01: Guest mode bypasses auth.
 * BR-AUTH-02: user_settings created on first login via bootstrap call.
 * BR-AUTH-05: Email already registered with another provider → inline error.
 *
 * PLAT-003 (EPIC-05)
 */
import { useOAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AuthProviderButton } from '@/components/auth/AuthProviderButton';
import { useGuest } from '@/contexts/GuestContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';
import { spacing } from '@/styles/tokens';

// ─── Types ───────────────────────────────────────────────────────────────────

type LoadingProvider = 'email' | 'google' | 'apple' | 'magic' | null;
type EmailMode = 'idle' | 'expanded';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Maps Clerk error codes to user-facing messages (BR-AUTH-05). */
function clerkErrorMessage(code: string | undefined): string {
  if (code === 'form_identifier_exists' || code === 'oauth_account_exists') {
    return 'This email is registered with a different provider. Try signing in with that method.';
  }
  return 'Something went wrong. Please try again.';
}

/** Calls GET /auth/session to bootstrap user_settings after successful auth (PLAT-002). */
async function bootstrapSession() {
  try {
    await fetch('/api/auth/session');
  } catch {
    // Non-fatal: user_settings will be created on next call
  }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { enterGuestMode } = useGuest();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: 'oauth_apple' });

  const [loading, setLoading] = useState<LoadingProvider>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState<EmailMode>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicSent, setMagicSent] = useState(false);

  const anyLoading = loading !== null;

  function clearError() {
    if (error) setError(null);
  }

  // ─── Post-auth navigation ───────────────────────────────────────────────

  async function onAuthSuccess() {
    await bootstrapSession();
    router.replace('/(tabs)/');
  }

  // ─── Google OAuth ───────────────────────────────────────────────────────

  async function handleGoogle() {
    if (!signInLoaded) return;
    setLoading('google');
    setError(null);
    try {
      const { createdSessionId, setActive } = await startGoogleFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        await onAuthSuccess();
      }
    } catch (e: unknown) {
      const code = (e as { errors?: { code: string }[] })?.errors?.[0]?.code;
      setError(clerkErrorMessage(code));
    } finally {
      setLoading(null);
    }
  }

  // ─── Apple Sign In (iOS only) ───────────────────────────────────────────

  async function handleApple() {
    if (!signInLoaded) return;
    setLoading('apple');
    setError(null);
    try {
      const { createdSessionId, setActive } = await startAppleFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        await onAuthSuccess();
      }
    } catch (e: unknown) {
      const code = (e as { errors?: { code: string }[] })?.errors?.[0]?.code;
      setError(clerkErrorMessage(code));
    } finally {
      setLoading(null);
    }
  }

  // ─── Email / Password ───────────────────────────────────────────────────

  async function handleEmailSubmit() {
    if (!signInLoaded || !signUpLoaded) return;
    if (!email.trim() || !password.trim()) {
      setError(t('auth.emailAndPasswordRequired'));
      return;
    }
    setLoading('email');
    setError(null);

    // Try sign-in first; fall back to sign-up if identifier not found.
    try {
      const result = await signIn!.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setSignInActive!({ session: result.createdSessionId });
        await onAuthSuccess();
      }
    } catch (e: unknown) {
      const code = (e as { errors?: { code: string }[] })?.errors?.[0]?.code;
      if (code === 'form_identifier_not_found') {
        try {
          const result = await signUp!.create({ emailAddress: email, password });
          if (result.status === 'complete') {
            await setSignUpActive!({ session: result.createdSessionId });
            await onAuthSuccess();
          }
        } catch (e2: unknown) {
          const code2 = (e2 as { errors?: { code: string }[] })?.errors?.[0]?.code;
          setError(clerkErrorMessage(code2));
        }
      } else {
        setError(clerkErrorMessage(code));
      }
    } finally {
      setLoading(null);
    }
  }

  // ─── Magic Link ─────────────────────────────────────────────────────────

  async function handleMagicLink() {
    if (!signInLoaded) return;
    if (!email.trim()) {
      setEmailMode('expanded');
      setError(t('auth.enterEmailFirst'));
      return;
    }
    setLoading('magic');
    setError(null);
    try {
      await signIn!.create({
        strategy: 'email_link',
        identifier: email,
        redirectUrl: 'mtgslivertracker://auth/callback',
      });
      setMagicSent(true);
    } catch (e: unknown) {
      const code = (e as { errors?: { code: string }[] })?.errors?.[0]?.code;
      setError(clerkErrorMessage(code));
    } finally {
      setLoading(null);
    }
  }

  // ─── Guest mode ─────────────────────────────────────────────────────────

  function handleGuest() {
    enterGuestMode();
    router.replace('/guest');
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.appName}>{t('auth.appName')}</Text>
          <Text style={styles.appSubtitle}>{t('auth.appSubtitle')}</Text>
        </View>

        {/* ── Auth card ── */}
        <View style={styles.card}>

          {/* Error banner */}
          {error !== null && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Magic link sent confirmation */}
          {magicSent && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>
                {t('auth.magicLinkSent')}
              </Text>
            </View>
          )}

          {/* Google */}
          <AuthProviderButton
            label={t('auth.continueWithGoogle')}
            onPress={handleGoogle}
            loading={loading === 'google'}
            anyLoading={anyLoading}
          />

          {/* Apple — iOS only */}
          {Platform.OS === 'ios' && (
            <AuthProviderButton
              label={t('auth.continueWithApple')}
              onPress={handleApple}
              loading={loading === 'apple'}
              anyLoading={anyLoading}
            />
          )}

          {/* Email / Password */}
          {emailMode === 'idle' ? (
            <AuthProviderButton
              label={t('auth.continueWithEmail')}
              onPress={() => { setEmailMode('expanded'); clearError(); }}
              loading={false}
              anyLoading={anyLoading}
            />
          ) : (
            <View style={styles.emailForm}>
              <TextInput
                style={styles.input}
                placeholder={t('auth.emailLabel')}
                placeholderTextColor={theme.colors.text.muted}
                value={email}
                onChangeText={(v) => { setEmail(v); clearError(); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!anyLoading}
              />
              <TextInput
                style={styles.input}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={theme.colors.text.muted}
                value={password}
                onChangeText={(v) => { setPassword(v); clearError(); }}
                secureTextEntry
                autoComplete="password"
                editable={!anyLoading}
              />
              <AuthProviderButton
                label={t('auth.signInOrCreate')}
                onPress={handleEmailSubmit}
                loading={loading === 'email'}
                anyLoading={anyLoading}
                variant="primary"
              />
            </View>
          )}

          {/* Magic Link */}
          <TouchableOpacity
            onPress={handleMagicLink}
            disabled={anyLoading}
            style={[styles.magicLinkRow, anyLoading && styles.dimmed]}
          >
            <Text style={styles.magicLinkText}>{t('auth.sendMagicLink')}</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>{t('common.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Guest CTA */}
          <TouchableOpacity
            onPress={handleGuest}
            disabled={anyLoading}
            style={[styles.guestButton, anyLoading && styles.dimmed]}
            activeOpacity={0.7}
          >
            <Text style={styles.guestLabel}>{t('auth.continueWithoutAccount')}</Text>
          </TouchableOpacity>

        </View>

        {/* Footer note */}
        <Text style={styles.footerNote}>{t('auth.guestNote')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  root: {
    flex: 1 as const,
    backgroundColor: t.colors.background.primary,
  },
  scroll: {
    flexGrow: 1 as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[12],
  },
  header: {
    alignItems: 'center' as const,
    marginBottom: spacing[8],
  },
  appName: {
    fontSize: t.typography.size['heading-xl'],
    fontWeight: t.typography.weight.bold,
    color: t.colors.text.primary,
    letterSpacing: t.typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
  },
  appSubtitle: {
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.regular,
    color: t.colors.text.secondary,
    letterSpacing: t.typography.letterSpacing.wider,
    marginTop: spacing[1],
    textTransform: 'uppercase' as const,
  },
  card: {
    width: '100%' as const,
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.xl,
    padding: spacing[6],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: t.colors.border.subtle,
  },
  errorBanner: {
    backgroundColor: 'rgba(211,32,42,0.15)',
    borderRadius: t.radius.sm,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(211,32,42,0.4)',
  },
  errorText: {
    color: '#E57373',
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
    textAlign: 'center' as const,
  },
  successBanner: {
    backgroundColor: 'rgba(46,204,113,0.12)',
    borderRadius: t.radius.sm,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.3)',
  },
  successText: {
    color: '#66BB6A',
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center' as const,
  },
  emailForm: {
    gap: spacing[2],
  },
  input: {
    height: 48,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    backgroundColor: t.colors.background.elevated,
    paddingHorizontal: spacing[4],
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
  },
  magicLinkRow: {
    alignItems: 'center' as const,
    paddingVertical: spacing[1],
  },
  magicLinkText: {
    color: t.colors.text.link,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  divider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
    marginVertical: spacing[1],
  },
  dividerLine: {
    flex: 1 as const,
    height: 1,
    backgroundColor: t.colors.border.subtle,
  },
  dividerLabel: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    textTransform: 'uppercase' as const,
    letterSpacing: t.typography.letterSpacing.wide,
  },
  guestButton: {
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  guestLabel: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.medium,
  },
  dimmed: {
    opacity: 0.38,
  },
  footerNote: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    textAlign: 'center' as const,
    marginTop: spacing[6],
  },
});
