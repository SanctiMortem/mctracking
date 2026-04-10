---
project: 'MTG Commander Tracker'
client: 'Personal / About Agency'
stakeholder: 'Gabriel Asse'
project_type: mobile-app
structure_version: '1.0'
design_system: custom
locale: 'en-US'
timezone: 'America/Mexico_City'
deadline: 'TBD'
stack: { framework: react-native, db: neon, auth: tbd }
---

# Project Config

---

## 1. Project Info

| Campo | Valor |
|-------|-------|
| **Nombre** | MTG Commander Tracker |
| **Tipo** | Mobile App (iOS + Android) |
| **Repo** | TBD |
| **Branch principal** | main |
| **Branch de trabajo** | develop |
| **Fecha inicio** | 2026-04-09 |

---

## 2. Problem Statement

App móvil para grupos de amigos que juegan Magic: The Gathering en formato Commander. Resuelve el tracking de vida, poison counters y commander damage en vivo (2-4 jugadores, 1 dispositivo), y mantiene un historial histórico con estadísticas de win rate por jugador, deck y commander.

---

## 3. Stakeholders

| Rol | Nombre | Contacto | Decides sobre |
|-----|--------|---------|---------------|
| Product Owner | Gabriel Asse | — | Scope, prioridad, aprobación |

---

## 4. Tech Stack

| Capa | Tecnología |
|------|-----------|
| **Framework** | React Native (iOS + Android) |
| **UI** | React Native components (custom design system) |
| **Styling** | StyleSheet / TBD (NativeWind o Tamagui — definir en /docs) |
| **DB** | Neon (PostgreSQL serverless) |
| **ORM** | TBD (Drizzle ORM recomendado — definir en /docs) |
| **Auth** | TBD (Neon Auth / Clerk / Auth.js — definir en /docs) |
| **i18n** | react-i18next + expo-localization |
| **Navigation** | React Navigation |

### Stack Overrides vs SK estándar

Este proyecto NO usa el Starter Kit estándar (Next.js). Es React Native puro.
`SK_ACTIVE = false` — sin leverage de SK.

---

## 5. Infrastructure & Services

| Servicio | Host / Propósito | Env Var | Notas |
|---------|-----------------|---------|-------|
| **Neon** | DB principal (PostgreSQL serverless) | `DATABASE_URL` | Cloud-hosted, escala a cero |
| **Auth Provider TBD** | Auth multi-provider (email, Google, Apple, magic link) | `AUTH_*` | Definir en /docs |
| **Apple IAP** | Compra única Premium (iOS) | Via StoreKit | Elimina ads |
| **Google Play Billing** | Compra única Premium (Android) | Via Billing API | Elimina ads |
| **Ad Network TBD** | Monetización Free tier | `ADS_*` | Google AdMob / Unity Ads — definir en /docs |
| **Apple App Store** | Distribución iOS | — | — |
| **Google Play Store** | Distribución Android | — | — |

---

## 7. Roles

guest, user, group_member, group_owner

---

## 8. Client Context

| Campo | Valor |
|-------|-------|
| **Industria** | Gaming / entretenimiento (MTG players) |
| **Nivel de formalidad** | Casual-técnico (audiencia: jugadores de MTG) |
| **Idioma preferido** | Bilingüe EN/ES (terminología MTG siempre en inglés) |
| **Restricciones marca** | No usar arte oficial WotC sin licencia. No usar el logo de Magic: The Gathering. Los 5 colores MTG (WUBRG) son el sistema visual base. |
| **Referencia visual** | MTG Arena — dark mode, moderno, minimalista |

---

## 9. Key Decisions

- React Native + Neon — stack único para iOS + Android con PostgreSQL serverless (F23)
- Sin deadline — calidad siempre prioridad sobre velocidad de entrega (F35)
- Monetización: Free + Ads. Premium ONE TIME para quitar ads. No gatea features. (F36)
- Modo Guest: tracking básico sin login, sin persistencia. Login para funciones completas. (F45)
- Resultado de match SIEMPRE manual — la app nunca asigna resultado automáticamente (F40)
- Commander damage por commander_id individual (no por player). Con partners: contadores separados (F42)
- Un deck NO puede estar en 2 matches activos simultáneamente (F39)
- Partner commanders: toggle al crear deck → obliga a seleccionar 2 commanders (F38)
- Usuarios pueden pertenecer a múltiples grupos simultáneamente, sin límite en MVP (F46)
- Auth en Batch 4 en UI, pero schema + scoping de datos debe scaffoldearse en Batch 1 (Challenge Pass advisory)

---

## 10. Project-Specific Rules

1. Terminología MTG (Commander, Infect, Scoop, Mill, etc.) siempre en inglés — no traducir aunque la app esté en español
2. 21 commander damage desde un solo commander = condición de pérdida → solo alerta visual, sin acción automática
3. 10 poison counters = condición de pérdida → solo alerta visual, sin acción automática
4. Matches `abandoned` aparecen en historial pero NO cuentan para ninguna stat
5. Soft delete obligatorio para Player/Deck/Commander con historial de participaciones
6. Debounce threshold 200ms–2000ms, configurable en Settings por el usuario
7. i18n + Settings schema + Auth schema deben scaffoldearse en Batch 1, aunque sus UIs completas lleguen en Batch 4

---

## 11. Scope Boundaries

**No incluye (MVP):**

- Lista de cartas / decklist upload (solo nombre + commander + descripción)
- Integración con Scryfall / Moxfield / Archidekt (Fase 3)
- Sincronización multiusuario en tiempo real entre dispositivos (Fase 3)
- Mana pool tracking (Fase 2)
- Orden de eliminación, notas por match (Fase 2)
- Modo tablet dedicado, heatmaps, ranking ELO (futuro)
- Export CSV/Excel (futuro)
- Modo light (solo dark mode en MVP)
- Arte oficial de Wizards of the Coast

---

## 12. Pipeline Status

| Fase | Documento | Estado |
|------|-----------|--------|
| Discovery | `docs/planning/00_DISCOVERY_BRIEF.md` | ✅ Completo |
| Proposal | `docs/planning/01_PROPOSAL.md` | ⬜ Pendiente |
| Docs | `docs/planning/02-14_*.md` | ⬜ Pendiente |
| Design | `docs/planning/15_DESIGN.md` | ⬜ Pendiente |
| Backlog | `docs/backlog/` | ⬜ Pendiente |
| Code | `src/` | ⬜ Pendiente |

---

## 13. Quick Commands

```bash
# TBD — definir en /docs una vez configurado el proyecto
# npx expo start        # Development server
# npx expo run:ios      # iOS simulator
# npx expo run:android  # Android emulator
# pnpm db:generate      # Generate migration (Drizzle)
# pnpm db:migrate       # Apply migration
```

---

> 📝 **Generado:** 2026-04-09 | Discovery completado

_TimeKast Factory — Project Config_
