import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'MTG Commander Tracker',
  slug: 'mtg-commander-tracker',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'mtgtracker',
  userInterfaceStyle: 'dark',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.aboutagency.mtgtracker',
    buildNumber: '1',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#1c1102',
    },
    package: 'com.aboutagency.mtgtracker',
    versionCode: 1,
  },
  plugins: [
    'expo-router',
    'expo-localization',
    [
      'expo-secure-store',
      {
        faceIDPermission: 'Allow MTG Commander Tracker to use Face ID.',
      },
    ],
    // react-native-google-mobile-ads disabled until real AdMob IDs are configured.
    // The SDK crashes on launch with placeholder IDs (GADInvalidInitializationException).
    'expo-iap',
    'expo-web-browser',
  ],
  web: {
    output: 'server',
    bundler: 'metro',
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '3825a377-c05c-45a2-afff-2a4bd1eccc11',
    },
  },
});
