declare namespace NodeJS {
  interface ProcessEnv {
    // Server-only (no EXPO_PUBLIC_ prefix)
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    // Client-safe (EXPO_PUBLIC_ prefix)
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  }
}
