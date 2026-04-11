# SETUP-004: Configure Expo Router navigation shell

> **Issue ID:** SETUP-004
> **Priority:** P0
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-SETUP](../epics/EPIC-SETUP.md)
> **Skills:** `domains/ui`, `project/architecture`
> **Agents:** `mobile-developer`, `layout-composer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar el shell de navegación completo de la app usando Expo Router: el layout raíz con auth gate, el tab bar de 5 tabs, las rutas de modales (match setup, match tracker, guest tracker), y las rutas de pantallas individuales (push). Las pantallas son stubs vacíos — solo la estructura de navegación importa en este issue.

Este issue depende de ADR-001 (decisión de styling) para aplicar los estilos correctos al tab bar.

## User Story

> Como **P-002** (Usuario autenticado), quiero **navegar entre las secciones de la app** para **acceder a todas las funcionalidades desde el tab bar sin perderme**.

**Implementa:** — (Infraestructura de navegación, §7 Architecture + §2 Navegación de 15_DESIGN)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | §2 Navegación + Arquitectura de Expo Router | [15_DESIGN.md#§2-navegacion](../../planning/15_DESIGN.md) |
| DESIGN | §1 Mapa de Pantallas | [15_DESIGN.md#§1-mapa-de-pantallas](../../planning/15_DESIGN.md) |
| ARCHITECTURE | ADR-004 Expo Router API Routes | [07_ARCHITECTURE.md#adr-004](../../planning/07_ARCHITECTURE.md) |

---

## ✅ Criterios de Aceptación

- [ ] Tab bar con 5 tabs funcional: Home, Players, Decks, History, Stats
- [ ] Auth gate: rutas protegidas redirigen a `/auth` si no hay sesión Clerk
- [ ] Rutas modales configuradas: `/match/setup`, `/match/[id]/tracker`, `/guest`
- [ ] Tab bar oculto en SCR-007, SCR-008, SCR-009, SCR-019 (según §0.7 de 15_DESIGN)
- [ ] Todas las rutas del mapa de pantallas (SCR-001 a SCR-019) tienen un archivo `app/*.tsx` stub
- [ ] Deep linking configurado en `app.json` (scheme: `mtgtracker`)
- [ ] Back navigation funciona correctamente en iOS y Android

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Tab bar navega entre las 5 secciones
  Dado que estoy autenticado y en Home
  Cuando toco el tab "Jugadores"
  Entonces navego a SCR-003 (Players list)
  Y el tab bar permanece visible

Escenario: Auth gate redirige a login
  Dado que no estoy autenticado (sin sesión Clerk)
  Cuando intento acceder a cualquier ruta protegida
  Entonces soy redirigido a `/auth` (SCR-001)
  Y el tab bar no es visible en la pantalla de auth

Escenario: Modal de match setup no muestra tab bar
  Dado que estoy autenticado y en Home
  Cuando toco "Nuevo Match"
  Entonces se abre `/match/setup` como modal de pantalla completa
  Y el tab bar no es visible durante el setup

Escenario: Guest tracker accesible sin autenticación
  Dado que estoy en la pantalla de auth (SCR-001)
  Cuando toco "Continuar sin cuenta"
  Entonces se abre `/guest` como modal de pantalla completa
  Y el tab bar no es visible
```

## 🔧 Contexto Técnico

**Arquitectura de rutas (de 15_DESIGN §2):**
```
app/
├── _layout.tsx              → Root layout (Clerk provider + auth gate)
├── auth.tsx                 → SCR-001 (Auth gate — stub)
├── guest.tsx                → SCR-019 (Guest Tracker — stub)
├── (tabs)/
│   ├── _layout.tsx          → Tab bar layout
│   ├── index.tsx            → SCR-002 (Home — stub)
│   ├── players.tsx          → SCR-003 (Players — stub)
│   ├── decks.tsx            → SCR-004 (Decks — stub)
│   ├── history.tsx          → SCR-005 (History — stub)
│   └── stats.tsx            → SCR-006 (Stats Dashboard — stub)
├── match/
│   ├── setup.tsx            → SCR-007 (Match Setup — stub)
│   └── [id]/
│       ├── tracker.tsx      → SCR-008 (Match Tracker — stub)
│       ├── close.tsx        → SCR-009 (Cierre — stub)
│       ├── results.tsx      → SCR-010 (Results — stub)
│       └── index.tsx        → SCR-011 (Match Detail — stub)
├── players/[id].tsx         → SCR-012 (Player Profile — stub)
├── decks/[id].tsx           → SCR-013 (Deck Detail — stub)
├── commanders/
│   ├── index.tsx            → SCR-016 (CRUD Commanders — stub)
│   └── [id].tsx             → SCR-014 (Commander Detail — stub)
├── stats/matchup.tsx        → SCR-015 (Matchup Stats — stub)
├── groups.tsx               → SCR-017 (Groups — stub)
└── settings.tsx             → SCR-018 (Settings — stub)
```

**Archivos a crear/modificar:**
- `app/_layout.tsx` — Root layout con Clerk provider
- `app/(tabs)/_layout.tsx` — Tab bar con 5 tabs y estilos del design system
- Todos los archivos `app/**/*.tsx` stub (solo `<View><Text>SCR-XXX</Text></View>`)

**Dependencias de Issues:**
- Bloqueado por: SETUP-001, ADR-001
- Bloquea a: Todos los issues UI de EPIC-01+

## ⚠️ Edge Cases

- En Android, el botón físico de "Back" debe manejar correctamente el stack de navegación en modales
- Expo Router en modo `expo-router/server` para API Routes no afecta la navegación cliente — verificar que `app/api/` no interfiere con las rutas de navegación

## 🧪 Tests Requeridos

- [ ] Manual: navegar a todas las rutas definidas sin errores en iOS simulator
- [ ] Manual: verificar que tab bar se oculta en SCR-007, SCR-008, SCR-009, SCR-019

## 🚫 Out of Scope

- Implementar el contenido de las pantallas (EPIC-01+)
- Animaciones de transición personalizadas (polish)
- Deep link testing en dispositivo real

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
