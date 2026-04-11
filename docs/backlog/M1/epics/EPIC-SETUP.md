# EPIC-SETUP: Project Setup & Scaffolding

> **Milestone:** M1
> **Status:** ✅ Done
> **Issues:** 10 total (10 done)
> **Branch:** `epic/setup` (crear al empezar)

---

## 🎯 Objetivo

Establecer la base técnica completa del proyecto MTG Commander Tracker: scaffolding del proyecto Expo, configuración de Drizzle ORM + Neon, shell de navegación con Expo Router, design tokens "The Mystic Archive", i18n skeleton, Clerk SDK provider, y EAS Build. Este epic no incluye código de features — solo la fundación sobre la que todos los demás epics construirán.

**Nota SK:** `SK_ACTIVE = false`. Este proyecto es React Native + Expo puro. No hay Starter Kit base — todo se scaffoldea desde cero.

---

## 📋 Issues

| ID | Título | Depende de | Priority | Status | Effort | SP |
|----|--------|------------|----------|--------|--------|----|
| [ADR-001](../issues/ADR-001-styling-strategy.md) | ADR: Styling strategy (NativeWind vs StyleSheet) | — | P0 | ✅ | XS | 1 |
| [SETUP-001](../issues/SETUP-001-scaffold-expo-project.md) | Scaffold Expo + TypeScript project | — | P0 | ✅ | S | 2 |
| [SETUP-002](../issues/SETUP-002-configure-env-vars.md) | Configure environment variables | SETUP-001 | P0 | ✅ | S | 2 |
| [SETUP-003](../issues/SETUP-003-configure-drizzle-neon.md) | Configure Drizzle ORM + Neon connection | SETUP-001, SETUP-002 | P0 | ✅ | M | 5 |
| [SETUP-004](../issues/SETUP-004-configure-expo-router-shell.md) | Configure Expo Router navigation shell | SETUP-001, ADR-001 | P0 | ✅ | M | 5 |
| [SETUP-005](../issues/SETUP-005-configure-design-tokens.md) | Configure design tokens "The Mystic Archive" | SETUP-001, ADR-001 | P1 | ✅ | M | 5 |
| [SETUP-006](../issues/SETUP-006-configure-i18n-skeleton.md) | Configure i18n skeleton (react-i18next) | SETUP-001 | P1 | ✅ | S | 2 |
| [SETUP-007](../issues/SETUP-007-configure-clerk-sdk.md) | Configure Clerk SDK provider | SETUP-001, SETUP-002 | P0 | ✅ | M | 5 |
| [SETUP-008](../issues/SETUP-008-configure-eas-build.md) | Configure EAS Build (iOS + Android) | SETUP-001 | P1 | ✅ | M | 5 |
| [SETUP-009](../issues/SETUP-009-epic-tests.md) | 🧪 Epic Tests — SETUP | Todos | P2 | ✅ | S | 2 |

> **Total SP:** 34

---

## 🔗 Dependencias

**Requiere:**
- Nada — primer epic

**Bloquea:**
- [EPIC-01](./EPIC-01-DATA-FOUNDATION.md) — requiere Drizzle + Neon (SETUP-003)
- [EPIC-02](./EPIC-02-MATCH-LIFECYCLE.md) — requiere Drizzle + Neon (SETUP-003)
- [EPIC-03](./EPIC-03-LIVE-TRACKING.md) — requiere todo SETUP
- EPIC-04, EPIC-05 — requieren todo SETUP

---

## 📐 Scope

**Incluido:**
- Scaffolding Expo + TypeScript + Expo Router
- Configuración Drizzle ORM + conexión Neon (sin schema de dominio — ese va en EPIC-01)
- Shell de navegación (tab bar + auth gate placeholder)
- Design tokens WUBRG ("The Mystic Archive")
- i18n skeleton (strings vacíos EN/ES, detección de idioma)
- Clerk SDK provider (auth UI completa en EPIC-05/Batch 4)
- EAS Build configuration

**Excluido:**
- Schema de dominio (Commander, Player, etc.) → EPIC-01
- Auth UI completa → EPIC-05
- Pantallas de features → EPIC-01 en adelante
- Contenido real de traducciones → EPIC-05 (i18n)

---

## 📚 Referencias

- Architecture: [07_ARCHITECTURE.md](../../planning/07_ARCHITECTURE.md)
- Discovery Brief: [00_DISCOVERY_BRIEF.md](../../planning/00_DISCOVERY_BRIEF.md)
- Design System: [15_DESIGN.md#§0-visual-direction](../../planning/15_DESIGN.md)

---

## ✅ QC Checklist (Al Completar Epic)

- [ ] `npx expo start` funciona sin errores
- [ ] Expo Router navega a todas las rutas definidas
- [ ] Drizzle conecta a Neon (test de ping)
- [ ] Design tokens aplicados en un componente de prueba
- [ ] i18n detecta idioma del dispositivo
- [ ] Clerk provider wrappea la app sin errores
- [ ] EAS build genera APK/IPA en modo desarrollo
- [ ] 0 errores TypeScript (`npx tsc --noEmit`)

---

## 📈 Progreso

```
Total:     ██████████ 100% (10 issues)
Done:      ██████████ 100% (10 issues)
```

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
