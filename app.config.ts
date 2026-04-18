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
    supportsTablet: true,
    bundleIdentifier: 'com.aboutagency.mtgtracker',
    buildNumber: '3',
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
    versionCode: 3,
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
