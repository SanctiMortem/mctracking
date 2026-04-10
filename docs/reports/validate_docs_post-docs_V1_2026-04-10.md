# Document Validation Report

> **Date:** 2026-04-10
> **Stage:** post-docs (Discovery → Docs, sin 15_DESIGN.md)
> **Tier:** V1 — Pipeline Alignment
> **Status:** 🔴 FAIL
> **Validated by:** AI Agent (/validate_docs V1)

---

## 📊 Executive Summary

La cadena de documentación está **estructuralmente sólida**: los 13 documentos existen, las 20 features MVP están mapeadas, las 11 entidades tienen schema completo, y los 47 BR están definidos correctamente en 05_BUSINESS_RULES.md. Sin embargo, existen **5 drifts críticos** en los documentos de testing y trazabilidad que invalidan sus cross-references: los BR-TRACK numbers en test strategy y traceability están mal asignados, y la matriz de trazabilidad cita US IDs inexistentes (US-046→054) que no existen en 04_USER_STORIES.md. Estos drifts no bloquean el `/design` pero deben corregirse antes de `/backlog`.

---

## 📋 V1: Pipeline Alignment

### Coverage por Stage

| Stage         | Checks | Passed | Failed | Gaps | Drift |
|---------------|:------:|:------:|:------:|:----:|:-----:|
| post-discovery | 3 | 3 | 0 | 0 | 0 |
| post-proposal  | N/A | — | — | — | — |
| post-docs      | 10 | 5 | 5 | 1 | 5 |
| post-design    | N/A | — | — | — | — |
| post-backlog   | N/A | — | — | — | — |

### Post-Docs — Reconciliación de Features (Brief §3 → 02_FEATURE_MAP)

| # | Feature Brief §3 | FT-XXX en 02 | Batch | Status |
|---|-----------------|--------------|-------|--------|
| 1 | FT-001 CRUD Jugadores | ✅ FT-001 | 1 | ✅ |
| 2 | FT-002 CRUD Decks | ✅ FT-002 | 1 | ✅ |
| 3 | FT-003 CRUD Commanders | ✅ FT-003 | 1 | ✅ |
| 4 | FT-004 Match Setup | ✅ FT-004 | 1 | ✅ |
| 5 | FT-005 Match Tracker en vivo | ✅ FT-005 | 2 | ✅ |
| 6 | FT-006 Cierre de Match | ✅ FT-006 | 1 | ✅ |
| 7 | FT-007 Historial de Matches | ✅ FT-007 | 2 | ✅ |
| 8 | FT-008 Stats por Jugador | ✅ FT-008 | 3 | ✅ |
| 9 | FT-009 Stats por Deck | ✅ FT-009 | 3 | ✅ |
| 10 | FT-010 Stats por Commander | ✅ FT-010 | 3 | ✅ |
| 11 | FT-011 Matchup Stats | ✅ FT-011 | 3 | ✅ |
| 12 | FT-012 Stats Dashboard Global | ✅ FT-012 | 3 | ✅ |
| 13 | FT-013 Commander Damage Tracking | ✅ FT-013 | 2 | ✅ |
| 14 | FT-014 Poison Counter Tracking | ✅ FT-014 | 2 | ✅ |
| 15 | FT-015 Match Event Log + Undo | ✅ FT-015 | 2 | ✅ |
| 16 | FT-016 Auth System (multi-provider) | ✅ FT-016 | 4 | ✅ |
| 17 | FT-017 Friend Groups | ✅ FT-017 | 4 | ✅ |
| 18 | FT-018 i18n (EN/ES) | ✅ FT-018 | 4 | ✅ |
| 19 | FT-019 Settings | ✅ FT-019 | 4 | ✅ |
| 20 | FT-020 Home / Navigation | ✅ FT-020 | 4 | ✅ |

**Features MVP: 20/20 ✅**

### Post-Docs — Reconciliación de Entidades (Brief §4 → 06_DATA_MODEL)

| # | Entidad Brief §4 | E-XXX en 06 | CRUD definido | Status |
|---|-----------------|-------------|---------------|--------|
| 1 | User (E1) | E-010 | C/R/U | ✅ |
| 2 | Player (E2) | E-009 | C/R/U/D* soft | ✅ |
| 3 | Commander (E3) | E-001 | C/R/U/D* | ✅ |
| 4 | Deck (E4) | E-002 | C/R/U/D* soft | ✅ |
| 5 | Match (E5) | E-005 | C/R/U | ✅ |
| 6 | Participation (E6) | E-008 | C/R/U | ✅ |
| 7 | MatchResult (E7) | E-007 | C/R | ✅ |
| 8 | MatchEvent (E8) | E-006 | C/R | ✅ |
| 9 | Group (E9) | E-003 | C/R/U/D* arch | ✅ |
| 10 | GroupMembership (E10) | E-004 | C/R/D | ✅ |
| 11 | UserSettings (E11) | E-011 | C/R/U | ✅ |

**Entidades: 11/11 ✅**

### Post-Docs — Reconciliación de Business Rules (Brief §6 → 05_BUSINESS_RULES)

| # | BR Brief §6 | BR-XXX en 05 | Implementable | Status |
|---|-------------|-------------|---------------|--------|
| BR-MATCH-01→10 | 10 reglas | BR-MATCH-01→10 | ✅ | ✅ |
| BR-DECK-01→08 | 8 reglas | BR-DECK-01→08 | ✅ | ✅ |
| BR-TRACK-01→13 | 13 reglas | BR-TRACK-01→13 | ✅ | ✅ |
| BR-STATS-01→09 | 9 reglas | BR-STATS-01→09 | ✅ | ✅ |
| BR-AUTH-01→05 | 5 reglas | BR-AUTH-01→05 | ✅ | ✅ |
| BR-GROUP-01→05 | 5 reglas | BR-GROUP-01→05 | ✅ | ✅ |
| BR-ENTITY-01→05 | 5 reglas | BR-ENTITY-01→05 | ✅ | ✅ |
| BR-I18N-01→03 | 3 reglas | BR-I18N-01→03 | ✅ | ✅ |

> Nota: 05_BUSINESS_RULES.md tiene 58 reglas de BR más CALC-001→003, VAL-001→005, y 16 ERR codes. El count de "47 reglas" del checkpoint anterior era incorrecto (contaba solo BRs, excluía CALC/VAL/ERR).

**Business Rules: 58/58 ✅ (en 05_BUSINESS_RULES.md)**

### Post-Docs — Reconciliación de User Stories (Brief features → 04_USER_STORIES)

**Conteo real verificado:** 04_USER_STORIES.md tiene **45 user stories** (US-001 → US-045).

| Feature | US reales en 04_USER_STORIES | Status |
|---------|------------------------------|--------|
| FT-001 CRUD Jugadores | US-001, US-002, US-003 | ✅ |
| FT-002 CRUD Decks | US-004, US-005, US-006, US-007 | ✅ |
| FT-003 CRUD Commanders | US-008 (crear), US-009 (editar) | ⚠️ Sin US de delete commander |
| FT-004 Match Setup | US-010, US-011, US-012 | ✅ |
| FT-005 Match Tracker | US-013, US-014, US-015 | ✅ |
| FT-006 Cierre Match | US-016, US-017, US-018 | ✅ |
| FT-007 Historial | US-019, US-020, US-021 | ✅ |
| FT-008 Stats Jugador | US-022, US-023 | ✅ |
| FT-009 Stats Deck | US-024 | ✅ |
| FT-010 Stats Commander | US-025 | ✅ |
| FT-011 Matchup Stats | US-026, US-027 | ✅ |
| FT-012 Stats Dashboard | US-028, US-029 | ✅ |
| FT-013 Commander Damage | US-030, US-031 | ✅ |
| FT-014 Poison Counters | US-032 | ✅ |
| FT-015 Event Log + Undo | US-033, US-034 | ✅ |
| FT-016 Auth | US-035, US-036, US-037 | ✅ |
| FT-017 Groups | US-038, US-039, US-040 | ✅ |
| FT-018 i18n | US-041 | ✅ |
| FT-019 Settings | US-042, US-043 | ✅ |
| FT-020 Home/Navigation | US-044, US-045 | ✅ |

---

## 🔴 Gaps Encontrados

| # | Fuente | Elemento | Debería estar en | Severidad | Status |
|---|--------|----------|-----------------|:---------:|:------:|
| G-001 | Brief §4 (BR-ENTITY-04) | User story de "eliminar commander" — BR-ENTITY-04 define regla de integridad al eliminar | 04_USER_STORIES.md (US-00X para FT-003 delete) | 🟡 | ❌ |
| G-002 | Brief §3 FT-018 Premium | User story para compra Premium (IAP one-time) — FT-016 Auth tiene US-035→037 (auth flows) pero no cubre el flujo de compra Premium | 04_USER_STORIES.md | 🟡 | ❌ |

---

## 🔴 Drift Encontrado

| # | Fuente dice | Doc dice | Doc afectado | Severidad | Status |
|---|------------|----------|-------------|:---------:|:------:|
| D-001 | 05_BUSINESS_RULES.md: BR-TRACK-09 = Debounce; BR-TRACK-11 = Undo; BR-TRACK-04 = 21-damage alert | 11_TEST_STRATEGY.md §6.1/6.2/6.3: "Debounce Engine (BR-TRACK-03)", "Undo Stack (BR-TRACK-06)", "Commander Damage Lethality (BR-TRACK-07)" — todos incorrectos | 11_TEST_STRATEGY.md | 🔴 | ❌ |
| D-002 | 05_BUSINESS_RULES.md: BR-STATS-07 = "mostrar todos los empatados en la misma posición. No aplicar criterio de desempate arbitrario." | 11_TEST_STRATEGY.md §6.2: "desempate por nombre alfabético (BR-STATS-07)" — contradice la regla | 11_TEST_STRATEGY.md | 🔴 | ❌ |
| D-003 | 04_USER_STORIES.md: 45 stories (US-001→US-045). E5 features en US-035→045 | 14_TRACEABILITY.md: cita US-046→054 (9 IDs inexistentes); asigna US-044/045 a "FT-017 Guest Mode" cuando son FT-020 Home; asigna US-035→045 a "History & Stats" cuando son Auth/Groups/i18n/Settings/Home | 14_TRACEABILITY.md | 🔴 | ❌ |
| D-004 | 05_BUSINESS_RULES.md: BR-TRACK-03 = Partners damage counters; BR-TRACK-06 = Poison floor; BR-TRACK-09 = Debounce; BR-TRACK-11 = Undo; BR-GROUP-05 = Invite expiry | 14_TRACEABILITY.md §3 tabla: "BR-TRACK-03 (debounce)", "BR-TRACK-06 (undo)", "BR-GROUP-03 (invite expiry)" — todos incorrectos | 14_TRACEABILITY.md | 🔴 | ❌ |
| D-005 | 05_BUSINESS_RULES.md: BR-TRACK-11 = Undo; BR-GROUP-05 = Invite con expiración | 12_E2E_SCENARIOS.md E2E-004: "BR cubiertos: BR-TRACK-06" (undo); E2E-006: "BR cubiertos: BR-GROUP-03/04" (invite) — incorrectos. E2E-005 §5.4: "desempate por nombre alfabético" — contradice BR-STATS-07 | 12_E2E_SCENARIOS.md | 🟡 | ❌ |

---

## 🛠️ Correcciones Requeridas

### Correcciones Críticas (antes de `/backlog`)

#### Fix D-001 — 11_TEST_STRATEGY.md §6

| Incorrecto | Correcto |
|-----------|---------|
| §6.1 "Debounce Engine (BR-TRACK-03)" | §6.1 "Debounce Engine (BR-TRACK-09)" |
| §6.2 "Undo Stack (BR-TRACK-06)" | §6.2 "Undo Stack (BR-TRACK-11)" |
| §6.3 "Commander Damage Lethality (BR-TRACK-07)" | §6.3 "Commander Damage Lethality (BR-TRACK-04)" |
| Tabla de refs: "BR-TRACK-03 (debounce)" | "BR-TRACK-09 (debounce)" |
| Tabla de refs: "BR-TRACK-06 (undo)" | "BR-TRACK-11 (undo)" |

#### Fix D-002 — 11_TEST_STRATEGY.md §6.2

| Incorrecto | Correcto |
|-----------|---------|
| "✅ Ranking con ties → desempate por nombre alfabético (BR-STATS-07)" | "✅ Ranking con ties → mostrar todos los empatados en la misma posición, sin criterio de desempate arbitrario (BR-STATS-07)" |

#### Fix D-003 — 14_TRACEABILITY.md (reescritura de E3, E4, E5)

La sección Epic E3→E5 debe reescribirse con los US IDs reales:

```
Epic E3 — Live Tracking (FT-013, 014, 015)
US-030, US-031 → FT-013 Commander Damage
US-032         → FT-014 Poison Counters
US-033, US-034 → FT-015 Event Log + Undo

Epic E4 — History & Stats (FT-007→012)
US-019, US-020, US-021 → FT-007 Historial
US-022, US-023         → FT-008 Stats Jugador
US-024                 → FT-009 Stats Deck
US-025                 → FT-010 Stats Commander
US-026, US-027         → FT-011 Matchup Stats
US-028, US-029         → FT-012 Stats Dashboard

Epic E5 — Platform (FT-016→020)
US-035, US-036, US-037 → FT-016 Auth
US-038, US-039, US-040 → FT-017 Groups
US-041                 → FT-018 i18n
US-042, US-043         → FT-019 Settings
US-044, US-045         → FT-020 Home/Navigation
```

Actualizar "Resumen de Cobertura": Total US = 45 (no 54).

#### Fix D-004 — 14_TRACEABILITY.md §3 tabla "Cobertura de Business Rules"

| Incorrecto | Correcto |
|-----------|---------|
| "BR-TRACK-03 (debounce)" | "BR-TRACK-09 (debounce)" |
| "BR-TRACK-06 (undo)" | "BR-TRACK-11 (undo)" |
| "BR-GROUP-03 (invite expiry)" | "BR-GROUP-05 (invite expiry)" |

#### Fix D-005 — 12_E2E_SCENARIOS.md

| Ubicación | Incorrecto | Correcto |
|----------|-----------|---------|
| E2E-004 "BR cubiertos" | `BR-TRACK-06` | `BR-TRACK-11` |
| E2E-006 "BR cubiertos" | `BR-GROUP-03/04 (invite)` | `BR-GROUP-05` |
| E2E-005 §5.4 | "se ordena por nombre alfabético (BR-STATS-07)" | "todos los empatados aparecen en la misma posición (BR-STATS-07)" |

### Gaps a Evaluar (no bloqueantes para `/design`)

- **G-001**: Considerar agregar US-046: "Eliminar commander" a 04_USER_STORIES.md para cubrir BR-ENTITY-04. FT-003 actualmente tiene solo Create + Edit.
- **G-002**: Considerar agregar US-047: "Comprar Premium" para cubrir el flujo IAP (actualmente documentado en API Contracts como `PATCH /settings` pero sin US que lo derive).

---

## 🎯 Verdict

**Pipeline Alignment (V1):** 🔴 FAIL

**Razón del FAIL:** 5 drifts identificados, de los cuales 4 son críticos (D-001→D-004). Los drifts no afectan la implementación (05_BUSINESS_RULES.md es correcto, 04_USER_STORIES.md es correcto) pero los documentos de test y trazabilidad tienen referencias cruzadas incorrectas que deben corregirse antes de generar el backlog.

**Recomendaciones:**

1. 🔴 **Corregir D-003 primero** (14_TRACEABILITY.md E3→E5) — es el drift más amplio y afecta directamente la generación del backlog.
2. 🔴 **Corregir D-001 + D-004** en paralelo — son correcciones de 5 números en 2 archivos.
3. 🔴 **Corregir D-002 + D-005** — corrección semántica de BR-STATS-07 en 3 archivos.
4. 🟡 **Evaluar G-001 y G-002** — agregar 2 user stories faltantes antes de `/backlog`.
5. ✅ Después de estas correcciones, la documentación está lista para `/design`.

---

*Reporte generado por `/validate_docs` V1 — 2026-04-10*
