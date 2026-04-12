declare namespace NodeJS {
  interface ProcessEnv {
    // Server-only (no EXPO_PUBLIC_ prefix)
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    // IAP / Purchases (PLAT-012)
    APPLE_SHARED_SECRET?: string;
    GOOGLE_PLAY_SERVICE_ACCOUNT_KEY?: string;
    ANDROID_PACKAGE_NAME?: string;
    // Client-safe (EXPO_PUBLIC_ prefix)
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  }
}
