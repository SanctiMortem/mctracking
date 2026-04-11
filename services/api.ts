/**
 * Client-side API fetch helper.
 * Resolves the base URL for Expo Router API Routes from the native client.
 *
 * In development: uses expo-constants hostUri (Metro dev server).
 * In production:  uses EXPO_PUBLIC_API_URL env var.
 */
import Constants from 'expo-constants';

function getBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Metro dev server — hostUri is "192.168.x.x:8081"
  const host = Constants.expoConfig?.hostUri?.split(':').shift() ?? 'localhost';
  return `http://${host}:8081`;
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
