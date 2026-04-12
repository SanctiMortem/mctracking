/**
 * BannerAdWrapper — shows an anchored adaptive banner ad.
 * Returns null when the user has premium (BR-AUTH-04).
 * Uses AdMob test IDs in development.
 *
 * PLAT-011 (EPIC-05)
 */
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { useSettings } from '@/hooks/useSettings';

const BANNER_UNIT_ID = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : (process.env.ADMOB_BANNER_UNIT_ID ?? 'ca-app-pub-PLACEHOLDER/PLACEHOLDER');

export function BannerAdWrapper() {
  const { settings } = useSettings();

  // While settings load, default to not showing ads (safe).
  // BR-AUTH-04: no ads for premium users.
  if (!settings || settings.premium) return null;

  return (
    <BannerAd
      unitId={BANNER_UNIT_ID}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    />
  );
}
