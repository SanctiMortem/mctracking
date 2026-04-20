import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import es from '../locales/es.json';

const SUPPORTED = ['en', 'es'] as const;
type Supported = typeof SUPPORTED[number];

/** Device language, snapped to a supported locale. */
export function getDeviceLanguage(): Supported {
  const raw = getLocales()?.[0]?.languageCode ?? 'en';
  return (SUPPORTED as readonly string[]).includes(raw) ? (raw as Supported) : 'en';
}

/** Resolve a stored preference ('auto' | 'en' | 'es') to the i18n target. */
export function resolveLanguage(pref: string | null | undefined): Supported {
  if (pref === 'en' || pref === 'es') return pref;
  return getDeviceLanguage();
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
