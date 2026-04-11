# SETUP-001: Scaffold Expo + TypeScript project

> **Issue ID:** SETUP-001
> **Priority:** P0
> **Effort:** S
> **Story Points:** 2
> **Status:** 📋 Backlog
> **Epic:** [EPIC-SETUP](../epics/EPIC-SETUP.md)
> **Skills:** `domains/api`, `project/architecture`
> **Agents:** `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Crear el proyecto Expo base con TypeScript estricto, Expo Router, la estructura de directorios del proyecto, y la configuración de package.json con todas las dependencias del stack confirmado. Este es el punto de partida de todo el codebase — sin este issue, ningún otro puede comenzar.

El scaffold debe reflejar la arquitectura definida en `07_ARCHITECTURE.md`: Expo SDK latest, TypeScript strict, Expo Router para navegación + API Routes, estructura de carpetas `app/`, `components/`, `services/`, `hooks/`, `types/`, `styles/`.

## User Story

> Como **Gabriel Asse** (único desarrollador), quiero **un proyecto Expo funcional con TypeScript** para **tener una base limpia donde implementar todas las features del MTG Commander Tracker**.

**Implementa:** — (Infraestructura base, §7 Architecture ADR-001)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| ARCHITECTURE | Stack + Planned Source Layout | [07_ARCHITECTURE.md#stack](../../planning/07_ARCHITECTURE.md) |
| DISCOVERY | §8 Stack | [00_DISCOVERY_BRIEF.md#§8-stack](../../planning/00_DISCOVERY_BRIEF.md) |

---

## ✅ Criterios de Aceptación

- [ ] `npx expo start` arranca sin errores
- [ ] TypeScript strict mode habilitado (`"strict": true` en `tsconfig.json`)
- [ ] Expo Router configurado (`app/` directory)
- [ ] Estructura de directorios creada: `app/`, `components/`, `services/`, `hooks/`, `types/`, `styles/`, `constants/`
- [ ] `package.json` incluye todas las dependencias del stack: `expo`, `expo-router`, `react-native`, `typescript`, `drizzle-orm`, `@neondatabase/serverless`, `@clerk/clerk-expo`, `react-i18next`, `expo-localization`, `hono`
- [ ] `.gitignore`, `.env.example`, `README.md` presentes
- [ ] `npx tsc --noEmit` pasa sin errores

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Proyecto arranca correctamente
  Dado que el proyecto fue scaffoldeado con `npx create-expo-app`
  Y las dependencias están instaladas con `pnpm install`
  Cuando ejecuto `npx expo start`
  Entonces el servidor de desarrollo arranca sin errores
  Y el Metro bundler está disponible

Escenario: TypeScript strict está activo
  Dado que el proyecto está scaffoldeado
  Cuando agrego código con un type error intencional (ej: `const x: number = "hola"`)
  Entonces `npx tsc --noEmit` reporta el error
  Y el error no pasa silenciosamente

Escenario: Expo Router resuelve rutas
  Dado que existe `app/index.tsx`
  Cuando la app carga en el simulador
  Entonces la ruta raíz `/` renderiza el componente de `app/index.tsx`
```

## 🔧 Contexto Técnico

**Comando de scaffolding:**
```bash
npx create-expo-app@latest MTG_App --template blank-typescript
cd MTG_App
pnpm install
```

**Dependencias a instalar:**
```bash
pnpm add expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
pnpm add @clerk/clerk-expo expo-secure-store
pnpm add react-i18next i18next expo-localization
pnpm add hono
pnpm add react-native-reanimated react-native-gesture-handler
```

**Estructura de directorios a crear:**
```
app/
├── (tabs)/           # Tab navigation
├── api/              # Expo Router API Routes (Hono handlers)
├── auth/             # Auth flows (Clerk)
├── match/            # Match screens
├── players/          # Player screens
├── decks/            # Deck screens
├── commanders/       # Commander screens
├── groups/           # Groups screens
├── stats/            # Stats screens
└── _layout.tsx       # Root layout
components/
services/
hooks/
types/
styles/
constants/
```

**Archivos a crear/modificar:**
- `package.json` — dependencias completas del stack
- `tsconfig.json` — strict mode
- `app.json` / `app.config.ts` — Expo config (bundleIdentifier, slug)
- `app/_layout.tsx` — Root layout (Clerk provider placeholder, i18n init)
- `.env.example` — Variables requeridas
- `babel.config.js` — Reanimated plugin

**Dependencias de Issues:**
- Bloquea: SETUP-002, SETUP-003, SETUP-004, SETUP-005, SETUP-006, SETUP-007, SETUP-008

## ⚠️ Edge Cases

- Si `create-expo-app` genera una versión desactualizada del SDK → verificar que la versión de Expo SDK sea compatible con Clerk + Drizzle + Reanimated
- pnpm workspace vs regular install → usar regular (no monorepo para MVP)

## 🧪 Tests Requeridos

- [ ] Smoke test: `npx expo start --no-dev` no lanza errores de bundling
- [ ] TypeScript check: `npx tsc --noEmit` pasa

## 🚫 Out of Scope

- Implementar pantallas de features (EPIC-01+)
- Configurar variables de entorno reales (SETUP-002)
- Conectar a Neon (SETUP-003)

---

## SK Leverage

No aplica — funcionalidad nueva (no hay SK en este proyecto). Proyecto scaffoldeado desde `create-expo-app`.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| — | — | — |

### Problemas y Soluciones

| Fecha | Problema | Solución |
|-------|----------|----------|
| — | — | — |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
