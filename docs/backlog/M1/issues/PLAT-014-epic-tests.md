# PLAT-014: 🧪 Epic Tests — Platform (EPIC-05)

> **Issue ID:** PLAT-014
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/test`
> **Agents:** `test-engineer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Suite de tests para EPIC-05: valida los flujos de autenticación, el sistema de grupos, las settings, y el comportamiento del Guest Tracker. Incluye E2E de los flujos críticos end-to-end para el primer release.

---

## ✅ Criterios de Aceptación

**Tests de Integración (API):**
- [ ] `GET /auth/session` — crea user_settings en primer login (idempotente)
- [ ] `POST /groups` — crea grupo + membership owner + invite_code
- [ ] `POST /groups/join` — código válido → membership member
- [ ] `POST /groups/join` — código expirado → GROUP_INVITE_EXPIRED
- [ ] `PATCH /settings` — debounce_threshold_ms fuera de rango → 400
- [ ] `PATCH /settings` — campo premium rechazado sin receipt
- [ ] `POST /purchases/verify` — receipt válido → premium=true

**Tests de Integración (UI):**
- [ ] Auth screen — botón Apple Sign In no aparece en Android
- [ ] Guest Tracker — undo in-memory funciona sin API calls
- [ ] Settings auto-save — PATCH se llama con debounce de 300ms (no en cada keystroke)
- [ ] i18n — cambio de idioma actualiza los strings sin reinicio

**Tests E2E:**
- [ ] Flujo completo de registro: email → user_settings bootstrap → Home
- [ ] Flujo grupos: crear → copiar invite → unirse (con segundo usuario mock)
- [ ] Flujo premium: settings → IAP mock → ads desaparecen

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Bootstrap de user_settings al primer login
  Dado que Carlos se autentica por primera vez
  Cuando el cliente llama GET /auth/session con su token Clerk
  Entonces se crean user_settings con todos los defaults
  Y una segunda llamada NO crea duplicados

Escenario: Guest Tracker sin API calls
  Dado que soy guest y uso el tracker
  Cuando reduzco 5 vida a un jugador y hago Undo
  Entonces no se realizó ninguna llamada a /api/*
  Y la vida volvió a su valor anterior in-memory

Escenario: Cambio de idioma en runtime
  Dado que la app está en español
  Cuando cambio a "English" en Settings
  Entonces el tab bar muestra "History" en lugar de "Historial"
  Y el nombre del commander "Atraxa, Praetors' Voice" NO cambia (BR-I18N-03)
```

## 🔧 Contexto Técnico

**Mocks necesarios:**
```typescript
// Mock de Clerk en tests — no hacer auth real
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ isSignedIn: true, userId: 'test-user-id' }),
  useSignIn: () => ({ signIn: jest.fn() }),
}));

// Mock de expo-iap para tests IAP
jest.mock('expo-iap', () => ({
  initConnection: jest.fn(),
  requestPurchase: jest.fn().mockResolvedValue({ receiptData: 'mock-receipt' }),
}));
```

**Dependencias de Issues:**
- Bloqueado por: todos los issues de EPIC-05

---

## 🧪 Tests Requeridos

- [ ] 7 tests de integración API (listados arriba)
- [ ] 4 tests de integración UI (listados arriba)
- [ ] 3 flujos E2E (listados arriba)

## 🚫 Out of Scope

- Tests de monetización con compras reales → solo con mocks/sandbox
- Tests de Apple Sign In en iOS real → requiere dispositivo físico + certificados

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
