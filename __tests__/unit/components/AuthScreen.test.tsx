/**
 * Unit tests — app/auth.tsx + components/auth/AuthProviderButton.tsx
 * PLAT-003 (EPIC-05)
 */

describe('AuthProviderButton', () => {
  it.todo('renders label when not loading');
  it.todo('renders ActivityIndicator when loading=true');
  it.todo('dims to opacity 0.38 when anyLoading=true and loading=false');
  it.todo('is disabled when anyLoading=true');
  it.todo('calls onPress when tapped and not loading');
  it.todo('applies primary style when variant="primary"');
});

describe('AuthScreen — platform', () => {
  it.todo('hides Apple Sign In button on Android (Platform.OS !== "ios")');
  it.todo('shows Apple Sign In button on iOS (Platform.OS === "ios")');
});

describe('AuthScreen — error state', () => {
  it.todo('shows inline error banner when error is set');
  it.todo('shows BR-AUTH-05 message when oauth_account_exists error returned');
  it.todo('clears error when user starts typing in email field');
});

describe('AuthScreen — email form', () => {
  it.todo('expands email form when "Continue with Email" is tapped');
  it.todo('shows validation error when email or password is empty on submit');
});

describe('AuthScreen — guest mode', () => {
  it.todo('calls enterGuestMode and navigates to /guest when "Continue without account" tapped');
});
