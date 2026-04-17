/**
 * Client-side API fetch helper.
 * Resolves the base URL for Expo Router API Routes from the native client.
 *
 * Resolution order:
 *   1. EXPO_PUBLIC_API_URL (baked at build time in preview/prod).
 *   2. Metro dev server via expo-constants hostUri (only in __DEV__).
 *   3. Hard-coded production fallback — protects release builds where the
 *      env var wasn't baked in, otherwise requests would go to
 *      http://localhost:8081 and fail with "Network request failed".
 */
import Constants from 'expo-constants';

const PRODUCTION_API_URL = 'https://mctracker-about-agency.vercel.app';

function getBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (__DEV__) {
    const host = Constants.expoConfig?.hostUri?.split(':').shift() ?? 'localhost';
    return `http://${host}:8081`;
  }
  return PRODUCTION_API_URL;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export async function apiFetch<T = unknown>(
  path: string,
  method: Method = 'GET',
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw Object.assign(new Error(error.message ?? error.error ?? `HTTP ${res.status}`), {
      status: res.status,
      code: error.error,
    });
  }

  return res.json();
}
