/**
 * useInterstitialAd — loads an AdMob interstitial and exposes showAd().
 * Shows the ad only if loaded and user is not premium (BR-AUTH-04).
 * If the ad is not ready, the callback runs immediately.
 *
 * Usage: const { showAd } = useInterstitialAd();
 *        showAd(() => router.replace('/(tabs)'));
 *
 * PLAT-011 (EPIC-05)
 */
import { useEffect, useRef } from 'react';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

import { useSettings } from '@/hooks/useSettings';

const INTERSTITIAL_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : (process.env.ADMOB_INTERSTITIAL_UNIT_ID ?? 'ca-app-pub-PLACEHOLDER/PLACEHOLDER');

export function useInterstitialAd() {
  const { settings } = useSettings();
  const adRef = useRef<InterstitialAd | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (settings?.premium) return;

    const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      loadedRef.current = true;
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      loadedRef.current = false;
    });

    interstitial.load();
    adRef.current = interstitial;

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, [settings?.premium]);

  /**
   * Show the interstitial, then call onComplete.
   * If ad is not loaded or user is premium, onComplete is called immediately.
   */
  function showAd(onComplete: () => void) {
    if (settings?.premium || !loadedRef.current || !adRef.current) {
      onComplete();
      return;
    }

    const unsub = adRef.current.addAdEventListener(AdEventType.CLOSED, () => {
      unsub();
      onComplete();
    });

    adRef.current.show();
  }

  return { showAd };
}
