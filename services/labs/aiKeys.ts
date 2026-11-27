/**
 * LABS — bring-your-own API keys for AI match narration (KEY-001).
 *
 * Everything under services/labs and app/labs.tsx is experimental and meant
 * to be deleted or promoted once narration is tuned.
 *
 * Keys live only in the device keychain (expo-secure-store). They are never
 * sent to our backend, never logged, and never put in an error message. The
 * phone calls Deepgram and Anthropic directly with them (ADR-009).
 *
 * Anthropic is called over plain HTTP here on purpose: the official
 * TypeScript SDK does not support React Native.
 */
import * as SecureStore from 'expo-secure-store';

export type AiProvider = 'anthropic' | 'deepgram';

const KEY_NAMES: Record<AiProvider, string> = {
  anthropic: 'labs_anthropic_api_key',
  deepgram: 'labs_deepgram_api_key',
};
const LABS_ENABLED = 'labs_enabled';

/** Where each key is created — opened in the browser from the Labs screen. */
export const KEY_CONSOLE_URLS: Record<AiProvider, string> = {
  anthropic: 'https://platform.claude.com/settings/keys',
  deepgram: 'https://console.deepgram.com/',
};

export async function getAiKey(provider: AiProvider): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_NAMES[provider]);
  } catch {
    return null;
  }
}

export async function saveAiKey(provider: AiProvider, key: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_NAMES[provider], key.trim());
}

export async function removeAiKey(provider: AiProvider): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_NAMES[provider]);
}

/** "…a1B2" — enough to recognise a key without showing it. */
export function maskKey(key: string): string {
  return `…${key.slice(-4)}`;
}

export async function isLabsEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(LABS_ENABLED)) === '1';
  } catch {
    return false;
  }
}

export async function setLabsEnabled(enabled: boolean): Promise<void> {
  if (enabled) await SecureStore.setItemAsync(LABS_ENABLED, '1');
  else await SecureStore.deleteItemAsync(LABS_ENABLED);
}

/** Labs: experimental player frames (casual matches and account matches). */
const FRAME_EXPERIMENT = 'labs_frame_experiment';

export async function isFrameExperimentEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(FRAME_EXPERIMENT)) === '1';
  } catch {
    return false;
  }
}

export async function setFrameExperimentEnabled(enabled: boolean): Promise<void> {
  if (enabled) await SecureStore.setItemAsync(FRAME_EXPERIMENT, '1');
  else await SecureStore.deleteItemAsync(FRAME_EXPERIMENT);
}

/** Labs: stats v2 (services/stats2) on the stats screens of this device. */
const NEW_STATS = 'labs_new_stats';

export async function isNewStatsEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(NEW_STATS)) === '1';
  } catch {
    return false;
  }
}

export async function setNewStatsEnabled(enabled: boolean): Promise<void> {
  if (enabled) await SecureStore.setItemAsync(NEW_STATS, '1');
  else await SecureStore.deleteItemAsync(NEW_STATS);
}

export type KeyTestResult = { ok: true } | { ok: false; message: string };

const TEST_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Checks a key with a request that costs nothing: listing one model for
 * Anthropic, listing projects for Deepgram.
 */
export async function testAiKey(provider: AiProvider, key: string): Promise<KeyTestResult> {
  const trimmed = key.trim();
  if (!trimmed) return { ok: false, message: 'Enter a key first.' };

  try {
    const res =
      provider === 'anthropic'
        ? await fetchWithTimeout('https://api.anthropic.com/v1/models?limit=1', {
            headers: { 'x-api-key': trimmed, 'anthropic-version': '2026-10-21' },
          })
        : await fetchWithTimeout('https://api.deepgram.com/v1/projects', {
            headers: { Authorization: `Token ${trimmed}` },
          });

    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'The key was rejected. Check that it was copied in full.' };
    }
    if (res.status === 429) {
      return { ok: false, message: 'Rate limited. The key may be fine — try again in a minute.' };
    }
    return { ok: false, message: `The service answered with an error (HTTP ${res.status}).` };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return {
      ok: false,
      message: aborted ? 'The request timed out. Check your connection.' : 'Could not reach the service. Check your connection.',
    };
  }
}
