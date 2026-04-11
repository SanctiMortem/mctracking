# EPIC-02: Match Lifecycle

> **Milestone:** M1
> **Status:** 🔄 In Progress
> **Issues:** 9 total (8 done)
> **Branch:** `epic/match-lifecycle` (crear al empezar)

---

## 🎯 Objetivo

Implementar el ciclo de vida completo de una partida de Commander: Match Setup (selección de 2-4 jugadores con sus decks), creación del Match + Participations en la DB, cierre del match (selección de ganador + win condition / draw / abandon), y pantalla de resultados. Las pantallas de historial y stats se construyen en EPIC-04.

Este epic completa la mitad de Batch 1 junto con EPIC-01 — al terminar, el usuario puede iniciar y cerrar una partida completa.

---

## User Stories

| ID | Título | Priority | Features |
|----|--------|----------|---------|
| US-010 | Iniciar setup de match | 🔴 Must | FT-004 |
| US-011 | Seleccionar jugadores y decks | 🔴 Must | FT-004 |
| US-012 | Crear match con validaciones | 🔴 Must | FT-004 |
| US-016 | Cerrar match con ganador | 🔴 Must | FT-006 |
| US-017 | Cerrar match como draw | 🔴 Must | FT-006 |
| US-018 | Abandonar match | 🔴 Must | FT-006 |
| US-021 | Ver detalle de un match | 🟡 Should | FT-007 (parcial) |

---

## 📋 Issues

| ID | Título | Depende de | Priority | Status | Effort | SP |
|----|--------|------------|----------|--------|--------|----|
| [MATCH-001](../issues/MATCH-001-db-schema-match.md) | DB schema: Match, Participation, MatchResult | DATA-001, SETUP-003 | P0 | ✅ | M | 5 |
| [MATCH-002](../issues/MATCH-002-api-create-match.md) | API: POST /api/matches (crear match) | MATCH-001 | P0 | ✅ | M | 5 |
| [MATCH-003](../issues/MATCH-003-api-close-match.md) | API: PATCH /api/matches/:id (cerrar match) | MATCH-001 | P0 | ✅ | M | 5 |
| [MATCH-004](../issues/MATCH-004-api-match-detail.md) | API: GET /api/matches/:id (detalle) | MATCH-001 | P1 | ✅ | S | 2 |
| [MATCH-005](../issues/MATCH-005-ui-match-setup.md) | UI: SCR-007 Match Setup | MATCH-002, DATA-003, DATA-004 | P0 | ✅ | L | 8 |
| [MATCH-006](../issues/MATCH-006-ui-close-match.md) | UI: SCR-009 Cierre de Match (sheet) | MATCH-003 | P1 | ✅ | M | 5 |
| [MATCH-007](../issues/MATCH-007-ui-match-results.md) | UI: SCR-010 Match Results | MATCH-003 | P1 | ✅ | M | 5 |
| [MATCH-008](../issues/MATCH-008-ui-match-detail.md) | UI: SCR-011 Match Detail (stub) | MATCH-004 | P2 | ✅ | S | 2 |
| [MATCH-009](../issues/MATCH-009-epic-tests.md) | 🧪 Epic Tests — Match Lifecycle | Todos | P1 | 📋 | M | 5 |

> **Total SP:** 42

---

## 🔗 Dependencias

**Requiere:**
- [EPIC-SETUP](./EPIC-SETUP.md) — SETUP-003 (Drizzle), SETUP-004 (Router), SETUP-007 (Clerk)
- [EPIC-01](./EPIC-01-DATA-FOUNDATION.md) — DATA-001 (schema Commander/Player/Deck)

**Bloquea:**
- [EPIC-03](./EPIC-03-LIVE-TRACKING.md) — Tracker necesita Match + Participation existentes

---

## 📐 Scope

**Incluido:**
- Schema Drizzle: Match, Participation, MatchResult
- API CRUD del match lifecycle (create, close, detail)
- SCR-007 (Match Setup: selección jugadores + decks)
- SCR-009 (Cierre de Match: sheet con ganador + win condition)
- SCR-010 (Match Results: pantalla de resultado)
- SCR-011 (Match Detail: stub, expandido en EPIC-04)

**Excluido:**
- Match Tracker en vivo → EPIC-03
- Event Log / Undo → EPIC-03
- Historial de matches (lista) → EPIC-04 (FT-007)
- Stats a partir de matches → EPIC-04

---

## 📚 Referencias

- Feature Map: [02_FEATURE_MAP.md#ft-004](../../planning/02_FEATURE_MAP.md)
- Data Model: [06_DATA_MODEL.md#e-005](../../planning/06_DATA_MODEL.md)
- API Contracts: [08_API_CONTRACTS.md#matches](../../planning/08_API_CONTRACTS.md)
- Business Rules: [05_BUSINESS_RULES.md#br-match-01](../../planning/05_BUSINESS_RULES.md)

---

## ✅ QC Checklist (Al Completar Epic)

- [ ] Flujo completo: Setup → crear match → cerrar match funcional
- [ ] Validación de no-repetición de decks en match
- [ ] Win conditions enum completo en DB
- [ ] SCR-007, SCR-009, SCR-010 navegables sin errores
- [ ] `pnpm typecheck` pasa

---

## 📈 Progreso

```
Total:     █████████ 100% (9 issues)
Done:      ████████░  89% (8 issues — MATCH-001–008)
Remaining: █░░░░░░░░  11% (1 issue)
```

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-11 (MATCH-008 done)_
