# SETUP-006: Configure i18n skeleton (react-i18next)

> **Issue ID:** SETUP-006
> **Priority:** P1
> **Effort:** S
> **Story Points:** 2
> **Status:** 📋 Backlog
> **Epic:** [EPIC-SETUP](../epics/EPIC-SETUP.md)
> **Skills:** `domains/ui`
> **Agents:** `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Configurar el skeleton de internacionalización con `react-i18next` + `expo-localization`: inicialización de i18next, detección automática del idioma del dispositivo, archivos de traducción vacíos (EN/ES), y un hook `useTranslation` disponible globalmente. El contenido de las traducciones se llenará en EPIC-05 (FT-018), pero la infraestructura debe estar lista desde el inicio para que todos los strings de la app usen `t('key')` desde el primer día.

## User Story

> Como **P-002** (usuario), quiero **que la app aparezca en mi idioma preferido** para **no tener que cambiar la configuración manualmente**.

**Implementa:** US-043 (parcial — skeleton; UI completa en EPIC-05)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| FEATURE_MAP | FT-018 i18n | [02_FEATURE_MAP.md#ft-018](../../planning/02_FEATURE_MAP.md) |
| USER_STORIES | US-043 | [04_USER_STORIES.md#us-043](../../planning/04_USER_STORIES.md) |
| ARCHITECTURE | BR-I18N-01/02 | [07_ARCHITECTURE.md#br-i18n](../../planning/07_ARCHITECTURE.md) |

---

## ✅ Criterios de Aceptación

- [ ] `react-i18next` inicializado con `expo-localization` para detección de idioma
- [ ] Archivos `locales/en.json` y `locales/es.json` creados (vacíos o con keys de prueba)
- [ ] Hook `useTranslation` disponible sin imports adicionales en cualquier componente
- [ ] Fallback a inglés si el idioma del dispositivo no es EN/ES
- [ ] Terminología MTG nunca traducida (BR-I18N-02): `Commander`, `Poison`, `Infect`, `Scoop`, etc. son keys con mismo valor en EN y ES
- [ ] `i18n.ts` exporta la instancia configurada

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Idioma del dispositivo detectado automáticamente
  Dado que el dispositivo tiene el idioma configurado en español
  Cuando la app arranca
  Entonces los strings de la interfaz aparecen en español
  Y la terminología MTG permanece en inglés

Escenario: Fallback a inglés para idioma no soportado
  Dado que el dispositivo tiene el idioma en francés
  Cuando la app arranca
  Entonces los strings aparecen en inglés (idioma de fallback)

Escenario: Terminología MTG no se traduce
  Dado que el idioma activo es español
  Cuando un componente renderiza `t('game.commander')`
  Entonces el texto visible es "Commander" (no "Comandante")
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `constants/i18n.ts` — Configuración de i18next + expo-localization
- `locales/en.json` — Strings en inglés (vacío o con keys de prueba)
- `locales/es.json` — Strings en español (vacío o con keys de prueba)
- `app/_layout.tsx` — Inicializar i18n en el root layout

**`constants/i18n.ts` pattern:**
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from '../locales/en.json';
import es from '../locales/es.json';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: Localization.getLocales()[0]?.languageCode ?? 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
export default i18n;
```

**Regla de terminología MTG (BR-I18N-02):**
Keys como `game.commander`, `game.poison`, `game.infect`, `game.scoop` deben tener el mismo valor en `en.json` y `es.json`.

**Dependencias de Issues:**
- Bloqueado por: SETUP-001
- Bloquea a: Todos los issues UI (los strings deben usar `t('key')` desde el inicio)

## ⚠️ Edge Cases

- `expo-localization` retorna `null` en algunos simuladores web — usar fallback defensivo `?? 'en'`
- En el simulador de iOS, el idioma puede no coincidir con el del dispositivo real — testear en dispositivo

## 🧪 Tests Requeridos

- [ ] Unit: `i18n.ts` inicializa sin errores con mock de `expo-localization`
- [ ] Unit: fallback a `'en'` cuando `languageCode` es `null`

## 🚫 Out of Scope

- Llenar traducciones reales → EPIC-05 (FT-018)
- Cambio de idioma en Settings UI → EPIC-05 (FT-019)
- Pluralización avanzada o RTL support

---

## SK Leverage

No aplica — funcionalidad nueva (no hay SK en este proyecto).

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| — | — | — |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
