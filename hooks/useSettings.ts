/**
 * useSettings — fetch UserSettings + auto-save PATCH with 300ms debounce.
 * PLAT-008 (EPIC-05)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';

import { apiFetch } from '@/services/api';
import type { UserSettings } from '@/db/index';

type SettingsResponse = { success: true; data: UserSettings };

export type SettingsPatch = {
  language?: 'en' | 'es' | 'auto';
  swipe_gestures_enabled?: boolean;
  debounce_threshold_ms?: number;
  require_commander?: boolean;
  default_life_total?: number;
};

export function useSettings() {
  const { getToken } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await apiFetch<SettingsResponse>('/api/settings', 'GET', undefined, token ?? undefined);
      setSettings(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Apply a patch optimistically and schedule debounced PATCH /api/settings after 300ms. */
  const patchSetting = useCallback(
    (patch: SettingsPatch) => {
      // Optimistic local update — map snake_case API keys to camelCase schema keys
      setSettings((prev) => {
        if (!prev) return prev;
        const update: Partial<UserSettings> = {};
        if (patch.language !== undefined) update.language = patch.language;
        if (patch.swipe_gestures_enabled !== undefined) update.swipeGesturesEnabled = patch.swipe_gestures_enabled;
        if (patch.debounce_threshold_ms !== undefined) update.debounceThresholdMs = patch.debounce_threshold_ms;
        if (patch.require_commander !== undefined) update.requireCommander = patch.require_commander;
        if (patch.default_life_total !== undefined) update.defaultLifeTotal = patch.default_life_total;
        return { ...prev, ...update };
      });

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          const token = await getToken();
          const res = await apiFetch<SettingsResponse>(
            '/api/settings',
            'PATCH',
            patch,
            token ?? undefined,
          );
          setSettings(res.data);
        } catch {
          // Silent fail — optimistic update already applied
        } finally {
          setSaving(false);
        }
      }, 300);
    },
    [getToken],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { settings, loading, error, saving, refresh, patchSetting };
}
