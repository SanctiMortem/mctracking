/**
 * Unit tests — i18n runtime behavior
 * Verifies that language changes apply in-memory without app restart.
 * PLAT-014 (EPIC-05)
 *
 * Complement to locales.test.ts (which covers key parity + MTG term identity).
 * These tests focus on runtime switching behavior (BR-I18N-01).
 */

describe('i18n — runtime language switch', () => {
  it.todo('calling i18n.changeLanguage("es") updates t() output to Spanish strings immediately');
  it.todo('calling i18n.changeLanguage("en") updates t() output to English strings immediately');
  it.todo('language switch does not require an app reload or navigation reset');
  it.todo('MTG terms (e.g. game.commander) remain unchanged after language switch (BR-I18N-02)');
  it.todo('language switch persists to user_settings via useSettings.patchSetting({ language })');
});

describe('i18n — "auto" language resolution', () => {
  it.todo('language="auto" resolves to device locale when expo-localization returns "es"');
  it.todo('language="auto" resolves to "en" when device locale is unsupported (fallback)');
  it.todo('language="auto" resolves to "en" when expo-localization returns null/undefined');
});
