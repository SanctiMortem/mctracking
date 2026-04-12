# EPIC-05: Platform

> **Milestone:** M1
> **Status:** ✅ Done
> **Issues:** 18 total (18 done)
> **Branch:** `epic/platform` (crear al empezar)

---

## 🎯 Objetivo

Implementar la capa de plataforma que hace el producto completo: Auth multi-provider con modo Guest, Friend Groups (shared DB), i18n EN/ES, Settings configurables (debounce, life total, commander obligatorio), Home screen funcional con banner de match activo, monetización (Ads + IAP premium), y Guest Tracker. Este epic cierra MVP v1.0.

**Prerequisitos de decisión:** ADR-004 a ADR-007 deben resolverse al inicio del epic (definen el scope de Home, Groups, Guest upgrade, y IAP).

---

## User Stories

| ID | Título | Priority | Features |
|----|--------|----------|---------|
| US-035 | Registrarse con email + contraseña | 🔴 Must | FT-016 |
| US-036 | Iniciar sesión con Google OAuth | 🔴 Must | FT-016 |
| US-037 | Usar modo Guest sin cuenta | 🔴 Must | FT-016 |
| US-038 | Crear un grupo nuevo | 🔴 Must | FT-017 |
| US-039 | Invitar miembros al grupo | 🔴 Must | FT-017 |
| US-040 | Aceptar invitación y unirse al grupo | 🔴 Must | FT-017 |
| US-041 | Cambiar idioma de la app | 🔴 Must | FT-018 |
| US-042 | Configurar debounce threshold | 🔴 Must | FT-019 |
| US-043 | Configurar life total inicial y commander obligatorio | 🔴 Must | FT-019 |
| US-044 | Ver Home con match activo en banner | 🔴 Must | FT-020 |
| US-045 | Navegar a Nuevo Match desde Home | 🔴 Must | FT-020 |

---

## 📋 Issues

| ID | Título | Depende de | Priority | Status | Effort | SP |
|----|--------|------------|----------|--------|--------|----|
| [ADR-004](../issues/ADR-004-home-match-active-context.md) | ADR: Home match active — grupo vs individual | — | P1 | ✅ | XS | 1 |
| [ADR-005](../issues/ADR-005-group-selection-screen.md) | ADR: Group selection screen obligatoria? | — | P1 | ✅ | XS | 1 |
| [ADR-006](../issues/ADR-006-guest-upgrade-mid-match.md) | ADR: Guest→User upgrade mid-match | — | P2 | ✅ | XS | 1 |
| [ADR-007](../issues/ADR-007-iap-receipt-validation.md) | ADR: IAP receipt validation — endpoint separado? | — | P1 | ✅ | XS | 1 |
| [PLAT-001](../issues/PLAT-001-db-schema-platform.md) | DB schema: groups, group_members, user_settings | — | P0 | ✅ | S | 2 |
| [PLAT-002](../issues/PLAT-002-api-auth-settings.md) | API: Auth session + Settings CRUD | PLAT-001 | P0 | ✅ | S | 2 |
| [PLAT-003](../issues/PLAT-003-ui-auth-screen.md) | UI: SCR-001 Auth screen (todos los providers) | PLAT-002, SETUP-007 | P0 | ✅ | L | 8 |
| [PLAT-004](../issues/PLAT-004-ui-guest-tracker.md) | UI: SCR-019 Guest Tracker (full) | TRACK-003, TRACK-004 | P0 | ✅ | M | 5 |
| [PLAT-005](../issues/PLAT-005-api-groups.md) | API: Groups CRUD (create, invite, join) | PLAT-001 | P1 | ✅ | M | 5 |
| [PLAT-006](../issues/PLAT-006-ui-groups-screen.md) | UI: SCR-017 Groups screen | PLAT-005 | P1 | ✅ | M | 5 |
| [PLAT-007](../issues/PLAT-007-api-settings.md) | API: Settings PATCH + UserSettings | PLAT-001, ADR-007 | P1 | ✅ | S | 2 |
| [PLAT-008](../issues/PLAT-008-ui-settings-screen.md) | UI: SCR-018 Settings screen | PLAT-007 | P1 | ✅ | M | 5 |
| [PLAT-009](../issues/PLAT-009-i18n-strings.md) | i18n: Translations completas (EN + ES) | SETUP-006 | P1 | ✅ | M | 5 |
| [PLAT-010](../issues/PLAT-010-ui-home-screen.md) | UI: SCR-002 Home screen FULL | ADR-004, HIST-001, PLAT-005 | P1 | ✅ | M | 5 |
| [PLAT-011](../issues/PLAT-011-ads-integration.md) | Monetización: Ads (AdMob/Unity — free tier) | PLAT-003 | P2 | ✅ | M | 5 |
| [PLAT-012](../issues/PLAT-012-iap-premium.md) | Monetización: IAP one-time premium | PLAT-007, ADR-007 | P2 | ✅ | L | 8 |
| [PLAT-013](../issues/PLAT-013-eas-production.md) | Platform: EAS Build production (iOS + Android) | SETUP-008, Todos | P1 | ✅ | S | 2 |
| [PLAT-014](../issues/PLAT-014-epic-tests.md) | 🧪 Epic Tests — Platform | Todos | P1 | ✅ | M | 5 |

> **Total SP:** 65

---

## 🔗 Dependencias

**Requiere:**
- [EPIC-SETUP](./EPIC-SETUP.md) — SETUP-006 (i18n skeleton), SETUP-007 (Clerk), SETUP-008 (EAS)
- [EPIC-03](./EPIC-03-LIVE-TRACKING.md) — TRACK-003/004 (para Guest Tracker)
- [EPIC-04](./EPIC-04-HISTORY-STATS.md) — HIST-001 (para Home banner de historial)
- ADR-004 a ADR-007 resueltos al inicio

**Bloquea:**
- Nada (epic de cierre de M1)

---

## 📐 Scope

**Incluido:**
- DB schema: `groups`, `group_members`, `user_settings`
- Auth screen SCR-001: Email/Password + Google OAuth + Apple Sign In + Magic Link (via Clerk)
- Modo Guest: SCR-019 con tracker básico (sin persistencia cloud)
- Groups API: POST /groups, POST /groups/:id/invite, POST /groups/join (invite code)
- SCR-017 Groups: lista de grupos, create, invite link, join
- Settings API: GET/PATCH /settings (debounce, life total, commander required, language)
- SCR-018 Settings: slider debounce, picker life total, toggles
- i18n: strings completas EN + ES (MTG terms never translated — BR-I18N-02)
- SCR-002 Home: banner match activo, últimas partidas, stat highlight, CTA Nuevo Match
- Ads: BannerAd + InterstitialAd (AdMob o Unity Ads) en free tier
- IAP: one-time purchase para eliminar anuncios (sin gatear features)
- EAS Build production profiles (TestFlight / Play Store internal)

**Excluido:**
- Guest→User upgrade mid-match → v1.1 (ADR-006 cierra esto)
- Apple Sign In testing en simulador → requiere físico (documentar)
- Push notifications → Non-Goal NG-005
- Modo tablet → Non-Goal NG-002

---

## 📚 Referencias

- Discovery Brief: [00_DISCOVERY_BRIEF.md#§2](../../planning/00_DISCOVERY_BRIEF.md)
- Business Rules: [05_BUSINESS_RULES.md#br-auth-01](../../planning/05_BUSINESS_RULES.md)
- API Contracts: [08_API_CONTRACTS.md#groups](../../planning/08_API_CONTRACTS.md)
- Design: [15_DESIGN.md#scr-001](../../planning/15_DESIGN.md)

---

## ✅ QC Checklist (Al Completar Epic)

- [ ] Auth funciona con los 4 providers (email, Google, Apple, Magic Link)
- [ ] Guest Tracker opera sin auth y sin persistencia cloud
- [ ] Group invite link con expiración funcional (BR-GROUP-05)
- [ ] Settings persisten y aplican a nuevos matches
- [ ] i18n: cambio de idioma en runtime sin reinicio
- [ ] Home muestra banner "Partida en curso" cuando hay match in_progress
- [ ] Ads se muestran en free tier y se ocultan tras IAP premium
- [ ] EAS builds generan artefactos para TestFlight + Play Store internal

---

## 📈 Progreso

```
Total:     ██████████████████ 100% (18 issues)
Done:      ██████████████████ 100% (18 issues — all done ✅)
```

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-12 — PLAT-014 Done — Epic completo ✅_
