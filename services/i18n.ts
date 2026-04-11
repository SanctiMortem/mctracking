import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// i18n skeleton — strings populated in EPIC-05 (Batch 4)
const resources = {
  en: {
    translation: {
      // Common
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.done': 'Done',
      // Tabs
      'tabs.home': 'Home',
      'tabs.history': 'History',
      'tabs.stats': 'Stats',
      'tabs.settings': 'Settings',
    },
  },
  es: {
    translation: {
      // Common
      'common.save': 'Guardar',
      'common.cancel': 'Cancelar',
      'common.delete': 'Eliminar',
      'common.edit': 'Editar',
      'common.done': 'Listo',
      // Tabs
      'tabs.home': 'Inicio',
      'tabs.history': 'Historial',
      'tabs.stats': 'Estadísticas',
      'tabs.settings': 'Ajustes',
    },
  },
};

const deviceLanguage = getLocales()?.[0]?.languageCode ?? 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

export default i18n;
