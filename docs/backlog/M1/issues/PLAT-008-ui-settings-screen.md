# PLAT-008: UI — SCR-018 Settings Screen

> **Issue ID:** PLAT-008
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar SCR-018 (Settings): pantalla con las preferencias del usuario configurables — debounce threshold, life total inicial, commander obligatorio, idioma de la app, gestures. Incluye el acceso al upgrade Premium (PLAT-012 se integra aquí) y navegación a Grupos (SCR-017).

## User Story

> Como **P-002** (usuario autenticado), quiero **configurar la app a mi estilo** para **adaptar el tracker y la UI a mis preferencias**.

**Implementa:** US-041, US-042, US-043

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-018 Settings | [15_DESIGN.md#scr-018](../../planning/15_DESIGN.md) |
| USER_STORIES | US-041, US-042, US-043 | [04_USER_STORIES.md#us-041](../../planning/04_USER_STORIES.md) |

---

## ✅ Criterios de Aceptación

- [ ] Sección "Tracker": slider de debounce threshold (200–2000ms) con valor visible + label del rango
- [ ] Sección "Tracker": stepper o input para `default_life_total` (default 40, rango 1–999)
- [ ] Sección "Tracker": toggle "Commander obligatorio al crear decks" (`require_commander`)
- [ ] Sección "Apariencia": picker de idioma ("Automático" / "Español" / "English")
- [ ] Sección "Gestures": toggle "Activar gestos de swipe" (`swipe_gestures_enabled`)
- [ ] Sección "Grupos": link → SCR-017 (Grupos)
- [ ] Sección "Premium": CTA "Eliminar anuncios (Premium)" — solo visible si `premium=false`; si `premium=true` muestra "Premium activo ✓"
- [ ] Sección "Cuenta": botón "Cerrar sesión" (Clerk `signOut()`)
- [ ] Auto-save: cada cambio se envía inmediatamente a `PATCH /settings` con debounce de 300ms

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Cambiar debounce threshold
  Dado que debounce_threshold_ms=500
  Cuando muevo el slider a 1000ms
  Entonces el valor se guarda via PATCH /settings
  Y el siguiente match usará ese threshold (BR-TRACK-12)

Escenario: Cambiar idioma
  Dado que la app está en español
  Cuando cambio el picker a "English"
  Entonces la UI cambia a inglés sin reiniciar la app (US-041)
  Y los nombres de commanders no se traducen (BR-I18N-02)

Escenario: Usuario Premium
  Dado que premium=true
  Cuando navego a SCR-018
  Entonces no veo el CTA "Eliminar anuncios" sino "Premium activo ✓"

Escenario: Cerrar sesión
  Dado que soy usuario autenticado
  Cuando toco "Cerrar sesión" y confirmo
  Entonces Clerk hace signOut()
  Y navego a SCR-001 (Auth)
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/settings/index.tsx` — SCR-018 screen
- `hooks/useSettings.ts` — GET + auto-save PATCH con debounce

**i18n language change en runtime:**
```typescript
import i18n from '../../services/i18n';

// Al cambiar el picker:
await i18n.changeLanguage(newLanguage);  // sin reinicio
await patchSettings({ language: newLanguage });
```

**Acceso a SCR-018:**
- Icono gear en el header de SCR-002 (Home) — per 15_DESIGN.md §0.7: "Settings icono gear en header SCR-002"

**Dependencias de Issues:**
- Bloqueado por: PLAT-007 (Settings API)
- Bloquea a: —

---

## ⚠️ Edge Cases

- Slider de debounce: en iOS hay un Slider nativo; en Android puede necesitar `@react-native-community/slider`
- Cambio de idioma: los comandantes ya cargados en la pantalla de decks no requieren recarga — solo los nuevos strings de la UI cambian
- Auto-save debounce: si el usuario mueve el slider rápidamente, debounce de 300ms antes del PATCH

## 🧪 Tests Requeridos

- [ ] Unit: slider de debounce no llama API hasta 300ms después del último cambio (debounce de auto-save)
- [ ] Integration: cambio de idioma se persiste en settings y se refleja en la UI

---

## SK Leverage

No aplica — funcionalidad nueva.

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
