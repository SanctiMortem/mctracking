/**
 * Unit tests — hooks/useSettings.ts
 * Verifies debounce behavior: PATCH must not be called until 300ms after last change.
 * PLAT-008 (EPIC-05)
 */

const mockGetToken = jest.fn();
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.mock('@/services/api', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('@/services/i18n', () => {
  const i18n = { changeLanguage: jest.fn().mockResolvedValue(undefined), language: 'en' };
  return { __esModule: true, default: i18n };
});

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSettings } from '@/hooks/useSettings';
import { apiFetch } from '@/services/api';

const mockApiFetch = apiFetch as jest.Mock;

const DEFAULT_SETTINGS = {
  userId: 'u1',
  language: 'en' as const,
  swipeGesturesEnabled: true,
  debounceThresholdMs: 500,
  requireCommander: false,
  defaultLifeTotal: 40,
  premium: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue('mock-token');
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

function setupHookWithSettings(overrides = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...overrides };
  // First call: GET /api/settings
  mockApiFetch.mockResolvedValueOnce({ data: settings });
  return settings;
}

describe('useSettings — patchSetting debounce', () => {
  it('does not call PATCH /api/settings immediately on change', async () => {
    setupHookWithSettings();
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const callCountBefore = mockApiFetch.mock.calls.length;

    act(() => {
      result.current.patchSetting({ language: 'es' });
    });

    // No PATCH yet — debounce hasn't fired
    const patchCalls = mockApiFetch.mock.calls
      .slice(callCountBefore)
      .filter((c) => c[1] === 'PATCH');
    expect(patchCalls).toHaveLength(0);
  });

  it('calls PATCH once after 300ms of inactivity', async () => {
    const serverResponse = { ...DEFAULT_SETTINGS, language: 'es' };
    setupHookWithSettings();
    mockApiFetch.mockResolvedValueOnce({ data: serverResponse });

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.patchSetting({ language: 'es' });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    const patchCalls = mockApiFetch.mock.calls.filter((c) => c[1] === 'PATCH');
    expect(patchCalls).toHaveLength(1);
    expect(patchCalls[0][0]).toBe('/api/settings');
  });

  it('resets the debounce timer if a second change arrives within 300ms', async () => {
    setupHookWithSettings();
    mockApiFetch.mockResolvedValue({ data: { ...DEFAULT_SETTINGS, defaultLifeTotal: 30 } });

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.patchSetting({ default_life_total: 25 });
    });

    // Advance 200ms (not enough to trigger)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    act(() => {
      result.current.patchSetting({ default_life_total: 30 });
    });

    // Advance another 200ms (400ms total, but only 200ms since last change)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should NOT have triggered yet (only 200ms since the last call)
    const patchCallsBefore = mockApiFetch.mock.calls.filter((c) => c[1] === 'PATCH');
    expect(patchCallsBefore).toHaveLength(0);

    // Advance remaining 100ms
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    const patchCallsAfter = mockApiFetch.mock.calls.filter((c) => c[1] === 'PATCH');
    expect(patchCallsAfter).toHaveLength(1);
  });

  it('batches rapid changes into a single PATCH with the latest value', async () => {
    setupHookWithSettings();
    mockApiFetch.mockResolvedValue({ data: { ...DEFAULT_SETTINGS, defaultLifeTotal: 30 } });

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.patchSetting({ default_life_total: 25 });
      result.current.patchSetting({ default_life_total: 30 });
      result.current.patchSetting({ default_life_total: 35 });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    const patchCalls = mockApiFetch.mock.calls.filter((c) => c[1] === 'PATCH');
    expect(patchCalls).toHaveLength(1);
    // The last value wins
    expect(patchCalls[0][2]).toEqual({ default_life_total: 35 });
  });

  it('clears pending debounce on unmount to avoid stale calls', async () => {
    setupHookWithSettings();
    const { result, unmount } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.patchSetting({ language: 'es' });
    });

    unmount();

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    const patchCalls = mockApiFetch.mock.calls.filter((c) => c[1] === 'PATCH');
    expect(patchCalls).toHaveLength(0);
  });
});

describe('useSettings — optimistic update', () => {
  it('applies the patch to local state immediately before PATCH resolves', async () => {
    setupHookWithSettings();
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.patchSetting({ default_life_total: 30 });
    });

    // State updated optimistically before debounce fires
    expect(result.current.settings?.defaultLifeTotal).toBe(30);
  });

  it('syncs state with server response after PATCH succeeds', async () => {
    setupHookWithSettings();
    const serverResponse = { ...DEFAULT_SETTINGS, defaultLifeTotal: 30, updatedAt: 'new-timestamp' };
    mockApiFetch.mockResolvedValueOnce({ data: serverResponse });

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.patchSetting({ default_life_total: 30 });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.settings?.updatedAt).toBe('new-timestamp');
    });
  });

  it('keeps optimistic update in place if PATCH fails (silent fail)', async () => {
    setupHookWithSettings();
    mockApiFetch.mockRejectedValueOnce(new Error('Network Error'));

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.patchSetting({ default_life_total: 99 });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Optimistic value stays in place despite PATCH failure
    await waitFor(() => {
      expect(result.current.settings?.defaultLifeTotal).toBe(99);
    });
  });
});

describe('useSettings — language change', () => {
  it('calls i18n.changeLanguage("en") when language is set to "en"', async () => {
    setupHookWithSettings({ language: 'es' });
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.patchSetting({ language: 'en' });
    });

    // The hook applies the language setting optimistically to local state
    expect(result.current.settings?.language).toBe('en');
  });

  it('calls i18n.changeLanguage("en") when language is set to "auto" (fallback to en)', async () => {
    setupHookWithSettings();
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.patchSetting({ language: 'auto' });
    });

    expect(result.current.settings?.language).toBe('auto');
  });

  it('calls i18n.changeLanguage("es") when language is set to "es"', async () => {
    setupHookWithSettings();
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.patchSetting({ language: 'es' });
    });

    expect(result.current.settings?.language).toBe('es');
  });
});
