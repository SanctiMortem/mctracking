/**
 * useInterstitialAd — STUB until real AdMob IDs are configured.
 *
 * The react-native-google-mobile-ads SDK has been removed because it crashes
 * at native init with placeholder IDs (GADInvalidInitializationException).
 * showAd() simply calls onComplete immediately.
 *
 * PLAT-011 (EPIC-05)
 */
export function useInterstitialAd() {
  function showAd(onComplete: () => void) {
    onComplete();
  }

  return { showAd };
}
