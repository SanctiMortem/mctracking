/**
 * Unit tests — components/ads/BannerAdWrapper.tsx
 * PLAT-011 (EPIC-05)
 */

jest.mock('react-native-google-mobile-ads', () => ({
  BannerAd: () => null,
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
  TestIds: { ADAPTIVE_BANNER: 'ca-app-pub-test/banner' },
}));

jest.mock('@/hooks/useSettings', () => ({
  useSettings: jest.fn(),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { useSettings } from '@/hooks/useSettings';
import { BannerAdWrapper } from '@/components/ads/BannerAdWrapper';

const mockUseSettings = useSettings as jest.Mock;

describe('BannerAdWrapper', () => {
  it('renders null when premium = true (BR-AUTH-04)', () => {
    mockUseSettings.mockReturnValue({ settings: { premium: true } });
    const { toJSON } = render(<BannerAdWrapper />);
    expect(toJSON()).toBeNull();
  });

  it('renders the BannerAd when premium = false', () => {
    mockUseSettings.mockReturnValue({ settings: { premium: false } });
    const { toJSON } = render(<BannerAdWrapper />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders null when settings are not yet loaded (null)', () => {
    mockUseSettings.mockReturnValue({ settings: null });
    const { toJSON } = render(<BannerAdWrapper />);
    expect(toJSON()).toBeNull();
  });
});
