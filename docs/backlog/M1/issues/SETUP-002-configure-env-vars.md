# SETUP-002: Configure environment variables and secrets

> **Issue ID:** SETUP-002
> **Priority:** P0
> **Effort:** S
> **Story Points:** 2
> **Status:** 📋 Backlog
> **Epic:** [EPIC-SETUP](../epics/EPIC-SETUP.md)
> **Skills:** `domains/api`, `project/architecture`
> **Agents:** `devops-engineer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Configurar la gestión de variables de entorno para el proyecto Expo: crear `.env.local` con las credenciales reales, `.env.example` como plantilla documentada, y la capa de validación en TypeScript que garantiza que las variables requeridas existen al arrancar. Las credenciales nunca se exponen al cliente RN — solo las API Routes (servidor) acceden a `DATABASE_URL` y `CLERK_SECRET_KEY`.

## User Story

> Como **Gabriel Asse** (desarrollador), quiero **un sistema seguro de variables de entorno** para **garantizar que las credenciales nunca se filtran al bundle del cliente y el proyecto falla temprano si faltan variables críticas**.

**Implementa:** — (Infraestructura segura, §7 Architecture ADR-005)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| ARCHITECTURE | ADR-005 Clerk + Env | [07_ARCHITECTURE.md#adr-005](../../planning/07_ARCHITECTURE.md) |
| DISCOVERY | §5 Infrastructure | [00_DISCOVERY_BRIEF.md#§5-infrastructure](../../planning/00_DISCOVERY_BRIEF.md) |

---

## ✅ Criterios de Aceptación

- [ ] `.env.example` documenta todas las variables requeridas con descripción
- [ ] `.env.local` en `.gitignore` (nunca commiteado)
- [ ] `constants/env.ts` valida variables al importar, lanza error en dev si faltan
- [ ] Variables del servidor (`DATABASE_URL`, `CLERK_SECRET_KEY`) solo accesibles desde `app/api/`
- [ ] Variables del cliente (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`) con prefijo `EXPO_PUBLIC_`
- [ ] `types/env.d.ts` declara tipos para `process.env` con las variables del proyecto

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: App arranca con variables configuradas
  Dado que `.env.local` tiene todas las variables requeridas
  Cuando ejecuto `npx expo start`
  Entonces la app arranca sin errores de variables faltantes

Escenario: App falla temprano si falta variable crítica
  Dado que `.env.local` no tiene `DATABASE_URL`
  Cuando una API Route intenta importar `constants/env.ts`
  Entonces se lanza un error descriptivo "Missing required env var: DATABASE_URL"
  Y no se produce un error críptico en runtime

Escenario: Variable de servidor no accesible en cliente
  Dado que `DATABASE_URL` no tiene prefijo `EXPO_PUBLIC_`
  Cuando el bundle del cliente RN se compila
  Entonces `DATABASE_URL` no aparece en el bundle del cliente
  Y solo es accesible desde Expo API Routes (servidor)
```

## 🔧 Contexto Técnico

**Variables requeridas:**

| Variable | Scope | Descripción |
|----------|-------|-------------|
| `DATABASE_URL` | Servidor | Neon connection string |
| `CLERK_SECRET_KEY` | Servidor | Clerk backend secret |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Cliente | Clerk publishable key |
| `GOOGLE_CLIENT_ID` | Servidor | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Servidor | Google OAuth client secret |

**Archivos a crear/modificar:**
- `.env.example` — Template con descripción de cada variable
- `.env.local` — Credenciales reales (gitignored)
- `constants/env.ts` — Módulo de validación + exportación tipada
- `types/env.d.ts` — Declaración de tipos para `process.env`
- `.gitignore` — Asegurar `.env*.local` ignorado

**`constants/env.ts` pattern:**
```typescript
function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}
export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  CLERK_SECRET_KEY: requireEnv('CLERK_SECRET_KEY'),
  // ...
};
```

**Dependencias de Issues:**
- Bloqueado por: SETUP-001
- Bloquea a: SETUP-003 (Neon connection), SETUP-007 (Clerk SDK)

## ⚠️ Edge Cases

- EAS Build en CI necesita variables en `eas.json` o como secrets de Expo — documentar en `.env.example`
- `EXPO_PUBLIC_` prefix solo funciona en Expo SDK; en Expo API Routes (servidor) se accede normalmente

## 🧪 Tests Requeridos

- [ ] Unit: `constants/env.ts` lanza error cuando variable falta (mock `process.env`)
- [ ] Manual: verificar que `DATABASE_URL` no aparece en el bundle de cliente (Metro bundle inspector)

## 🚫 Out of Scope

- Configurar las credenciales reales de producción (eso es SETUP-008 / EAS)
- Secret rotation o vault management

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
