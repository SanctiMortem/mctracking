# PLAT-003: UI — SCR-001 Auth Screen (todos los providers)

> **Issue ID:** PLAT-003
> **Priority:** P0
> **Effort:** L
> **Story Points:** 8
> **Status:** 📋 Backlog
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/ui`, `domains/api`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar SCR-001 (Auth screen): pantalla de bienvenida con los 4 providers de login (Email/Password, Google, Apple, Magic Link) via Clerk, más el CTA "Continuar sin cuenta" para Guest mode. Este es el gate de autenticación de la app.

## User Story

> Como **P-002** (usuario nuevo) o **P-001** (guest), quiero **crear una cuenta o iniciar sesión** para **acceder a todas las features o al tracker básico**.

**Implementa:** US-035, US-036, US-037

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-001 Auth / Login | [15_DESIGN.md#scr-001](../../planning/15_DESIGN.md) |
| USER_STORIES | US-035, US-036, US-037 | [04_USER_STORIES.md#us-035](../../planning/04_USER_STORIES.md) |
| BUSINESS_RULES | BR-AUTH-01, BR-AUTH-02, BR-AUTH-05 | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [ ] SCR-001 muestra solo si no hay sesión activa (Clerk `useAuth().isSignedIn === false`)
- [ ] CTA principal "Crear cuenta con Email" → flujo email/password de Clerk
- [ ] Botón "Continuar con Google" → OAuth Google (Clerk `OAuth2Strategy`)
- [ ] Botón "Continuar con Apple" → Apple Sign In (Clerk, iOS only — ocultar en Android)
- [ ] Link "Recibir link por email" → Magic Link (Clerk passwordless)
- [ ] CTA secundario "Continuar sin cuenta" → navega a SCR-019 (Guest Tracker)
- [ ] Al completar auth exitosamente → `GET /auth/session` bootstrap → navega a SCR-002 (Home)
- [ ] Error email ya registrado con otro provider: mensaje específico (BR-AUTH-05)
- [ ] Branding "The Mystic Archive": texto de bienvenida, logo, dark background `surface` — NO una pantalla SaaS genérica

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Registro exitoso con email
  Dado que estoy en SCR-001 sin sesión activa
  Cuando ingreso email y contraseña válidos y confirmo
  Entonces Clerk crea la cuenta
  Y se llama GET /auth/session que crea user_settings default (BR-AUTH-02)
  Y navego a SCR-002 (Home)

Escenario: Login con Google — primera vez
  Dado que no tengo cuenta
  Cuando toco "Continuar con Google" y autorizo el OAuth flow
  Entonces se crea cuenta con provider='google'
  Y se crean user_settings default y navego a Home

Escenario: Email ya registrado con Google
  Dado que "carlos@example.com" existe con provider='google'
  Cuando intento registrarme con ese email vía email/password
  Entonces veo "Este email está registrado con Google. Usa ese método para ingresar." (BR-AUTH-05)

Escenario: Continuar sin cuenta
  Dado que estoy en SCR-001
  Cuando toco "Continuar sin cuenta"
  Entonces navego a SCR-019 (Guest Tracker) sin crear cuenta (BR-AUTH-01)
  Y los datos del tracker no se persisten en la nube
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `app/auth/index.tsx` (o `app/(auth)/sign-in.tsx`) — SCR-001 screen
- `app/_layout.tsx` — AuthGate: si `!isSignedIn && !isGuest` → redirigir a `/auth`

**Clerk hooks:**
```typescript
import { useSignIn, useSignUp, useOAuth } from '@clerk/clerk-expo';

// Google OAuth
const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

// Apple OAuth — solo iOS
const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: 'oauth_apple' });
```

**Auth gate en `_layout.tsx`:**
```typescript
const { isSignedIn, isLoaded } = useAuth();
// Si !isLoaded → splash screen
// Si !isSignedIn && route !== '/auth' && route !== '/guest' → redirect to /auth
```

**Guest state:**
```typescript
// contexts/GuestContext.tsx — isGuest: boolean
// Cuando isGuest=true, no se requiere Clerk auth pero no hay persistencia
```

**Bootstrap tras auth:**
```typescript
// En AuthProvider o en la redirección post-login:
await fetch('/api/auth/session'); // Crea user_settings si es primer login (PLAT-002)
router.replace('/(tabs)/');
```

**Dependencias de Issues:**
- Bloqueado por: PLAT-002 (auth/session API), SETUP-007 (Clerk SDK config)
- Bloquea a: PLAT-004 (Guest mode), PLAT-011 (Ads — solo para usuarios autenticados)

---

## ⚠️ Edge Cases

- Apple Sign In no disponible en Android: detectar plataforma con `Platform.OS === 'ios'` y ocultar el botón
- Apple Sign In requiere dispositivo físico para testing (no funciona en simulador con Expo Go)
- Magic Link: el link se abre en el browser → deep link de regreso a la app (configurar Expo Router deep linking)
- Clerk `isLoaded=false` al arrancar: mostrar splash/skeleton en lugar de flash de SCR-001

## 🧪 Tests Requeridos

- [ ] Integration: flujo email/password completo con user_settings bootstrap
- [ ] Unit: botón Apple Sign In no aparece en Android
- [ ] Unit: error BR-AUTH-05 se muestra cuando email ya existe con otro provider

## 🚫 Out of Scope

- Guest→User upgrade mid-match → ADR-006 (diferido a v1.1)
- Forgot password flow → Clerk maneja esto automáticamente via email

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
