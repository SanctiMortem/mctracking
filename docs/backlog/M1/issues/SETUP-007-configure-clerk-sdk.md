# SETUP-007: Configure Clerk SDK provider

> **Issue ID:** SETUP-007
> **Priority:** P0
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-SETUP](../epics/EPIC-SETUP.md)
> **Skills:** `domains/api`, `domains/security`
> **Agents:** `mobile-developer`, `security-auditor`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Instalar y configurar el Clerk SDK para React Native (`@clerk/clerk-expo`): wrappear la app con `ClerkProvider`, configurar `expo-secure-store` como token cache, y proteger las Expo API Routes con middleware de validación JWT. La UI completa de auth (pantalla de login, flujos OAuth, magic link) se implementa en EPIC-05, pero el provider debe estar listo desde el inicio para que el auth gate del router funcione correctamente.

## User Story

> Como **P-002** (usuario autenticado), quiero **que mi sesión persista entre reinicios de la app** para **no tener que iniciar sesión cada vez que abro la app**.

**Implementa:** US-035 (parcial — provider setup; UI completa en EPIC-05)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| FEATURE_MAP | FT-016 Auth | [02_FEATURE_MAP.md#ft-016](../../planning/02_FEATURE_MAP.md) |
| ARCHITECTURE | ADR-005 Clerk | [07_ARCHITECTURE.md#adr-005](../../planning/07_ARCHITECTURE.md) |
| DATA_MODEL | E-010 User | [06_DATA_MODEL.md#e-010](../../planning/06_DATA_MODEL.md) |

---

## ✅ Criterios de Aceptación

- [ ] `ClerkProvider` wrappea la app en `app/_layout.tsx` con `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `expo-secure-store` configurado como `tokenCache` en ClerkProvider
- [ ] Auth gate en `app/_layout.tsx`: redirige a `/auth` si no hay sesión activa
- [ ] Middleware de validación JWT en `app/api/_middleware.ts` (rechaza requests sin token Clerk válido)
- [ ] `useAuth()` hook disponible en cualquier componente autenticado
- [ ] `useUser()` retorna el usuario actual con `id`, `email`
- [ ] Guest mode: la ruta `/guest` es accesible sin autenticación

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Sesión persiste entre reinicios
  Dado que el usuario inició sesión con email
  Cuando cierra y reabre la app
  Entonces la sesión sigue activa
  Y no se le pide que inicie sesión nuevamente

Escenario: Auth gate protege rutas privadas
  Dado que no hay sesión activa
  Cuando la app intenta navegar a la ruta `/(tabs)/`
  Entonces es redirigida a `/auth`
  Y el auth gate no permite acceso

Escenario: API Route rechaza request sin token
  Dado que una API Route tiene middleware de Clerk
  Cuando recibe un request sin `Authorization: Bearer {token}` válido
  Entonces retorna `401 Unauthorized`
  Y no ejecuta lógica de negocio

Escenario: Guest mode accesible sin auth
  Dado que no hay sesión activa
  Cuando el usuario toca "Continuar sin cuenta" en SCR-001
  Entonces puede navegar a `/guest` (SCR-019) sin autenticarse
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `app/_layout.tsx` — Agregar `ClerkProvider` + auth gate redirect
- `app/api/_middleware.ts` — Middleware de validación JWT para todas las API Routes
- `hooks/useAuth.ts` — Wrapper conveniente sobre `useAuth` de Clerk (si se necesita)

**`app/_layout.tsx` pattern:**
```typescript
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';

const tokenCache = {
  async getToken(key: string) { return SecureStore.getItemAsync(key); },
  async saveToken(key: string, value: string) { return SecureStore.setItemAsync(key, value); },
};

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <AuthGate />
    </ClerkProvider>
  );
}
```

**Middleware pattern:**
```typescript
import { getAuth } from '@clerk/clerk-expo/server';
export async function middleware(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return new Response('Unauthorized', { status: 401 });
}
```

**Dependencias de Issues:**
- Bloqueado por: SETUP-001, SETUP-002
- Bloquea a: DATA-003 (Player API usa userId), EPIC-05 (Auth UI)

## ⚠️ Edge Cases

- `expo-secure-store` no funciona en web/Expo Go en algunos entornos — en esos casos usar in-memory cache como fallback
- Apple Sign In es obligatorio en iOS si la app ofrece cualquier otro OAuth (Apple Developer requirement)

## 🧪 Tests Requeridos

- [ ] Integration: API Route con middleware retorna 401 para request sin token
- [ ] Manual: sesión persiste en simulador de iOS entre reinicios del simulador

## 🚫 Out of Scope

- UI de login (pantallas SCR-001, email/password form, OAuth buttons) → EPIC-05
- RBAC de Group Member/Owner → DATA-001 + EPIC-05

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
