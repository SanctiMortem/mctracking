# EPIC-01: Data Foundation

> **Milestone:** M1
> **Status:** ✅ Done
> **Issues:** 11 total (11 done)
> **Branch:** `epic/data-foundation` (crear al empezar)

---

## 🎯 Objetivo

Implementar las tres entidades base del dominio MTG: Commander, Player y Deck. Incluye schema Drizzle, API Routes CRUD con Hono, y las pantallas de listado + CRUD inline para cada entidad. Estas entidades son el prerequisito para todo el sistema de matches — sin jugadores y decks no hay partidas.

---

## User Stories

| ID | Título | Priority | Features |
|----|--------|----------|---------|
| US-001 | Crear jugador nuevo | 🔴 Must | FT-001 |
| US-002 | Editar jugador | 🔴 Must | FT-001 |
| US-003 | Soft-delete jugador | 🔴 Must | FT-001 |
| US-004 | Crear deck nuevo | 🔴 Must | FT-002 |
| US-005 | Editar deck | 🔴 Must | FT-002 |
| US-006 | Soft-delete deck | 🔴 Must | FT-002 |
| US-007 | Listar decks con filtro por commander | 🔴 Must | FT-002 |
| US-008 | Crear commander nuevo | 🔴 Must | FT-003 |
| US-009 | Editar commander | 🔴 Must | FT-003 |
| US-022 | Ver perfil de jugador | 🟡 Should | FT-001, FT-008 |
| US-023 | Ver historial de un jugador | 🟡 Should | FT-008 |
| US-024 | Ver decks de un jugador | 🟡 Should | FT-002 |
| US-025 | Ver stats por deck | 🟡 Should | FT-009 |

---

## 📋 Issues

| ID | Título | Depende de | Priority | Status | Effort | SP |
|----|--------|------------|----------|--------|--------|----|
| [DATA-001](../issues/DATA-001-db-schema-entities.md) | DB schema: Commander, Player, Deck | SETUP-003 | P0 | ✅ | M | 5 |
| [DATA-002](../issues/DATA-002-api-commander-crud.md) | API: Commander CRUD | DATA-001 | P0 | ✅ | M | 5 |
| [DATA-003](../issues/DATA-003-api-player-crud.md) | API: Player CRUD | DATA-001 | P0 | ✅ | M | 5 |
| [DATA-004](../issues/DATA-004-api-deck-crud.md) | API: Deck CRUD | DATA-001, DATA-002 | P0 | ✅ | M | 5 |
| [DATA-005](../issues/DATA-005-ui-commanders-screen.md) | UI: SCR-016 Commanders (list + CRUD) | DATA-002 | P1 | ✅ | M | 5 |
| [DATA-006](../issues/DATA-006-ui-players-screen.md) | UI: SCR-003 Players (list + CRUD) | DATA-003 | P1 | ✅ | M | 5 |
| [DATA-007](../issues/DATA-007-ui-decks-screen.md) | UI: SCR-004 Decks (library + CRUD) | DATA-004 | P1 | ✅ | L | 8 |
| [DATA-008](../issues/DATA-008-ui-player-profile.md) | UI: SCR-012 Player Profile (stub) | DATA-006 | P2 | ✅ | S | 2 |
| [DATA-009](../issues/DATA-009-ui-deck-detail.md) | UI: SCR-013 Deck Detail (stub) | DATA-007 | P2 | ✅ | S | 2 |
| [DATA-010](../issues/DATA-010-ui-commander-detail.md) | UI: SCR-014 Commander Detail (stub) | DATA-005 | P2 | ✅ | S | 2 |
| [DATA-011](../issues/DATA-011-epic-tests.md) | 🧪 Epic Tests — Data Foundation | Todos | P1 | ✅ | M | 5 |

> **Total SP:** 49

---

## 🔗 Dependencias

**Requiere:**
- [EPIC-SETUP](./EPIC-SETUP.md) — SETUP-003 (Drizzle + Neon), SETUP-004 (Router), SETUP-005 (Tokens)

**Bloquea:**
- [EPIC-02](./EPIC-02-MATCH-LIFECYCLE.md) — Match necesita Player + Deck + Commander FKs
- [EPIC-03](./EPIC-03-LIVE-TRACKING.md) — Tracker necesita Match (que necesita este epic)

---

## 📐 Scope

**Incluido:**
- Schema Drizzle para Commander, Player, Deck (con soft delete, RLS básico)
- API Routes CRUD completos (Hono) para las 3 entidades
- UI de listado + crear/editar inline para SCR-003 (Players), SCR-004 (Decks), SCR-016 (Commanders)
- Stubs de perfil/detalle: SCR-012, SCR-013, SCR-014 (stats se agregan en EPIC-04)

**Excluido:**
- Stats de jugador/deck/commander → EPIC-04
- Match Setup que usa estas entidades → EPIC-02
- Auth de grupo (Group + GroupMembership schema) → EPIC-05
- Datos de partidas en perfiles → EPIC-04

---

## 📚 Referencias

- Data Model: [06_DATA_MODEL.md#e-001](../../planning/06_DATA_MODEL.md)
- Feature Map: [02_FEATURE_MAP.md#ft-001](../../planning/02_FEATURE_MAP.md)
- Design: [15_DESIGN.md#scr-003](../../planning/15_DESIGN.md)
- Business Rules: [05_BUSINESS_RULES.md#br-entity-01](../../planning/05_BUSINESS_RULES.md)

---

## ✅ QC Checklist (Al Completar Epic)

- [ ] CRUD completo para Commander, Player, Deck funcional
- [ ] Soft delete funciona (registros no se borran físicamente)
- [ ] SCR-003, SCR-004, SCR-016 navegan y muestran datos reales de Neon
- [ ] `pnpm typecheck` pasa sin errores
- [ ] DATA-011 (Epic Tests) completado con cobertura ≥80%

---

## 📈 Progreso

```
Total:     ███████████ 100% (11 issues)
Done:      ███████████ 100% (11 issues)
```

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
