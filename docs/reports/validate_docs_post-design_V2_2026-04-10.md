# Document Validation Report

> **Date:** 2026-04-10
> **Stage:** post-design (Discovery → Docs → Design)
> **Tier:** V2 (Pipeline Alignment + Semantic Fidelity)
> **Status:** ✅ PASS (con correcciones aplicadas)
> **Validated by:** AI Agent

---

## 📊 Executive Summary

El pipeline de documentación (00–15) está correctamente alineado. Las 20 features MVP, 45 user stories, 19 pantallas, 11 entidades y 4 personas tienen representación completa y consistente desde el Discovery Brief hasta el diseño. Se detectaron 4 gaps (todos 🟡 Medium o Minor), de los cuales 3 fueron corregidos inline. El único gap no corregible desde diseño es un drift sistemático en `14_TRACEABILITY.md` (FT IDs mal asignados en Épicas E1-E2) que requiere corrección en ese documento. Los docs son construibles — un agente de implementación puede scaffoldear la app desde ellos sin ambigüedad crítica.

---

## 📋 V1: Pipeline Alignment

### Coverage por Stage

| Stage | Checks | Passed | Failed | Gaps | Drift |
|-------|:------:|:------:|:------:|:----:|:-----:|
| post-discovery | 3 | 3 | 0 | 0 | 0 |
| post-proposal | N/A | — | — | — | — |
| post-docs | 9 | 8 | 1 | 1 | 1 |
| post-design | 7 | 7 | 0 | 0 | 0 |
| post-backlog | N/A | — | — | — | — |

> `post-proposal` N/A: `01_PROPOSAL.md` ausente por waiver aprobado en CHECKPOINT 1 de `/design`.
> `post-backlog` N/A: `docs/backlog/` no existe — etapa siguiente.

### Checks Detallados: Post-Discovery

| Check | Resultado |
|-------|----------|
| §11 Cross-Map (entidades, pantallas, features en Brief) | ✅ — Brief §3/§4/§7 completos con 20 features, 8 entidades, 19 pantallas |
| Namespace BR-XXX vs RN-XXX | ✅ — Solo BR-XXX en 05_BUSINESS_RULES. Sin mezcla de namespaces |
| Completitud §1–§11 + Coverage Map | ✅ — 16 docs presentes (00–15 + project-config) |

### Checks Detallados: Post-Docs

| Check | Fuente → Destino | Resultado |
|-------|-----------------|----------|
| Features MVP → FT-XXX | Brief §3 → 02_FEATURE_MAP | ✅ 20/20 features mapeadas FT-001→FT-020 |
| Personas → P-XXX | Brief §2 → 03_USER_PERSONAS | ✅ 4/4 personas (P-001→P-004) con RBAC completo |
| US coverage por feature | Brief §3 → 04_USER_STORIES | ✅ 45 US, cada FT-XXX tiene ≥1 US |
| BR coverage | Brief §6 → 05_BUSINESS_RULES | ✅ 9 namespaces, BR-MATCH-01→10, BR-DECK-01→08, BR-TRACK-01→13, BR-STATS-01→09, BR-AUTH-01→05, BR-GROUP-01→05, BR-ENTITY-01→05, BR-I18N-01→03 |
| Entidades → E-XXX | Brief §4 → 06_DATA_MODEL | ✅ 11 entidades (E-001→E-011) con schema completo |
| ADR → Data Model | 07_ARCHITECTURE ADRs → 06 | ✅ ADR-002 (Neon), ADR-005 (Drizzle) reflejados en E-XXX schemas |
| API actions → US escritura | 04_USER_STORIES → 08_API_CONTRACTS | ✅ Todos los endpoints CRUD y match lifecycle documentados |
| Riesgos → R-XXX | Brief §8 → 13_RISK_REGISTER | ✅ Riesgos técnicos (device sizing, glassmorphism Android, expo-google-fonts) en R-XXX |
| Traceability FT→US→E→BR→SCR | 14_TRACEABILITY | **🟡 DRIFT** — FT IDs en Épicas E1-E2 misaligned vs 02_FEATURE_MAP (ver Drift #1) |

### Checks Detallados: Post-Design

| Check | Fuente → Destino | Resultado |
|-------|-----------------|----------|
| Pantallas Brief §7.2 → SCR-XXX | Brief P01-P19 → 15_DESIGN | ✅ 19/19 — tabla completa verificada en validation_design_v1.0 |
| Features → UI | 02_FEATURE_MAP FT-XXX → SCR-XXX | ✅ 20/20 — todos mapeados en §1 |
| Entidades → Data Req | 06_DATA_MODEL E-XXX → §4/§5 | ✅ 11/11 — mutation lifecycle tabla en §5.1 cubre todas las entidades |
| Flujos Brief §7.3 → FLW-XXX | Brief FL-01→FL-10 → 15_DESIGN FLW | ✅ 10/10 con Mermaid |
| Componentes SK | INVENTORY.md → CMPs | ✅ N/A — proyecto greenfield, sin SK previo |
| RBAC visual | 03_PERSONAS → SCR access | ✅ Cada SCR tiene campo "Acceso" + RBAC Nav Rules en §2 |
| Variantes diferenciadas | Guest vs User vs Group | ✅ SCR-019 (Guest) separado de SCR-008 (User) por DD-006 |

---

### Gaps Encontrados

| # | Fuente | Elemento | Debería estar en | Severidad | Status |
|---|--------|----------|-----------------|:---------:|:------:|
| 1 | 14_TRACEABILITY Épica E1 | US-008→FT-002, US-009→FT-002 | US-008/009 son FT-003 (Commanders) en 04_USER_STORIES | 🟡 Medium | ✅ Corregido en 14_TRACEABILITY |
| 2 | 15_DESIGN CMP inventory | CMP-005 solo mapeada a SCR-008 | CMP-005 también en SCR-019 (guest cmd damage) | 🟡 Minor | ✅ Corregido |

### Drift Encontrado

| # | Fuente dice | Doc dice | Doc afectado | Severidad | Status |
|---|------------|----------|-------------|:---------:|:------:|
| 1 | 04_USER_STORIES: US-008=FT-003 crear commander, US-009=FT-003 editar commander | 14_TRACEABILITY Épica E1: US-008=FT-002 PATCH /decks, US-009=FT-002 DELETE /decks | 14_TRACEABILITY.md | 🟡 Medium | ✅ Corregido |
| 2 | 05_BUSINESS_RULES BR-MATCH-09: enum = `combat_damage, commander_damage, infect, combo, mill, scoop, concede, other` | 15_DESIGN FLW-004: "combat, commander_damage, poison, decked_out, concede, other" | 15_DESIGN.md §3 FLW-004 | 🟡 Medium | ✅ Corregido en 15_DESIGN |

---

## 🔍 V2: Semantic Fidelity

### Matriz de Fidelidad

| Par | P1 Intención | P2 Implícitos | P3 Creep | P4 Prioridad | P5 Construible | P6 Terminología | P7 SK | P8 Security |
|-----|:-----------:|:-------------:|:--------:|:------------:|:--------------:|:---------------:|:-----:|:-----------:|
| Brief → Docs (02-14) | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ |
| All → Design (15) | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ |

> P1=Intención, P2=Implícitos, P3=Creep, P4=Prioridad, P5=Construible, P6=Terminología, P7=SK, P8=Security

---

### Hallazgos Semánticos

#### ✅ P1 — Intención (Brief → Docs + Design)

El "por qué" del producto se preserva bien en toda la cadena:
- Brief §1: "una app para jugadores de Commander que quieren llevar estadísticas sin esfuerzo" → 04_USER_STORIES captura el JTBD (Job To Be Done) de cada persona.
- Brief principio "el resultado SIEMPRE es manual" → BR-MATCH-05 lo documenta explícitamente + DD-001 en 15_DESIGN explica el debounce local state como mecanismo de cero latencia.
- Brief §9 "Mystic Archive" branding → 15_DESIGN §0 deriva correctamente de `aether_archway/DESIGN.md`.

---

#### ✅ P2 — Requisitos Implícitos

Todos los requisitos implícitos identificados fueron formalizados:
- "Un jugador puede estar en múltiples grupos" (Brief §2 prosa) → formalizado como A-02 en 03_USER_PERSONAS.
- "Terminología MTG siempre en inglés" (Brief §9) → BR-I18N-02 + DD-010 en 15_DESIGN §6.
- "Retomar match activo" (implícito en F45 Brief §3) → CMP-015 (ActiveMatchBanner) + nota en FLW-001 de 15_DESIGN.
- Commander damage por `commander_id` (implícito en reglas de MTG) → BR-TRACK-02 + E-008 JSONB field.

---

#### ✅ P3 — Sin Scope Creep

No se detectaron elementos en downstream que no estén en Brief §3 MVP:
- 15_DESIGN: 19 pantallas = exactamente las 19 del Brief §7.2.
- 02_FEATURE_MAP: 20 features = exactamente FT-001→FT-020 del Brief §3.
- FT-021→FT-025 correctamente marcadas como Post-MVP en 02_FEATURE_MAP, no aparecen en 15_DESIGN.
- D-01→D-07 en 15_DESIGN §8.2 son todos deferred con justificación, no scope creep.

---

#### ✅ P4 — Prioridad Preservada

- Brief §3 marca todos los features MVP como "Must Have Batch 1-4" → 02_FEATURE_MAP preserva el ordering por batch.
- Brief risks §8: R3 (iPhone SE sizing) → 13_RISK_REGISTER documentado + OQ-007 en 15_DESIGN (deferred D-02).
- Batches: Batch 1 (CRUD) → Batch 2 (Match) → Batch 3 (Stats) → Batch 4 (Auth/Groups) preserva el orden lógico de dependencias.
- Features Post-MVP (FT-021→025) no tienen pantalla ni US ni issues — correctamente excluidas.

---

#### 🟡 P5 — Construible (Gap en 14_TRACEABILITY)

**Par: Brief → Docs**

La traceability matrix (14_TRACEABILITY.md) tiene un error sistemático en las Épicas E1 y E2 donde los FT IDs no coinciden con 02_FEATURE_MAP:

**Evidencia:**

`04_USER_STORIES.md §FT-003`:
> "US-008: Crear commander nuevo | Feature: FT-003 | US-009: Editar commander existente | Feature: FT-003"

`14_TRACEABILITY.md Épica E1`:
> "| US-008 | FT-002 Decks | BR-DECK-07 | `PATCH /decks/:id` |"
> "| US-009 | FT-002 Decks | BR-ENTITY-02 | `DELETE /decks/:id` |"

`14_TRACEABILITY.md Épica E2`:
> "| US-010 | FT-003 Match Setup | BR-MATCH-01..." (debería ser FT-004 Match Setup)

**Impacto:** Un agente de implementación que confíe en la traceability para mapear US-008/009 a endpoints construirá PATCH/DELETE /decks en lugar de POST/PATCH /commanders. El design (15_DESIGN §1 SCR-016) tiene el mapeo correcto.

**Mitigación:** 15_DESIGN §1 es la fuente correcta para SCR→FT→US. La traceability tiene error pero el design no. El impacto real es bajo porque el design (SSOT para implementación UI) es correcto.

**Acción requerida:** Corregir 14_TRACEABILITY.md Épicas E1-E2 para alinear FT IDs con 02_FEATURE_MAP.

---

#### 🟡 P6 — Terminología (Drift en enum win_condition)

**Par: All → Design**

`05_BUSINESS_RULES.md BR-MATCH-09`:
> "Valores: `combat_damage`, `commander_damage`, `infect`, `combo`, `mill`, `scoop`, `concede`, `other`"

`15_DESIGN.md FLW-004 (antes de corrección)`:
> "Win conditions enum (BR-MATCH-09): combat, commander_damage, poison, decked_out, concede, other"

Los valores diferían: `infect`→`poison`, `mill`→`decked_out`, `scoop` ausente, `combo` ausente, `combat_damage`→`combat`.

**Status:** ✅ Corregido — FLW-004 ahora lista los 8 valores exactos con backticks y referencia a BR-MATCH-09.

`09_GLOSSARY.md`: Terminología consistente en toda la cadena — "Match Event", "Participation", "Undo", "Soft Delete", "Guest Mode", "Commander Damage" usan los mismos términos en todos los docs. "MatchEvent" en singular (código) vs "Match Event" en prosa — aceptable per BR-I18N-01.

---

#### ✅ P7 — SK Leverage

Proyecto greenfield — no hay Starter Kit previo. No aplica reutilización vs reinvención.

Las decisions del design system están bien justificadas:
- DD-008 (tipografía): Space Grotesk + Manrope desde `aether_archway` — no reinventan, usan el design system propio.
- DD-009 (No-Line Rule): definido en `aether_archway` — coherente.
- CMP-003/004 (WUBRGPip/WUBRGChipStrip): usados en 6-8 pantallas — buena reutilización de componentes propios.

---

#### ✅ P8 — Seguridad y Fairness

- **RBAC matrix:** Documentada en 03_USER_PERSONAS §Matriz + 07_ARCHITECTURE (Clerk + RLS Neon). Cada SCR tiene campo "Acceso" + §2.3 RBAC Nav Rules. ✅
- **Visibilidad de datos por rol:** Guest → sin persistencia (BR-AUTH-01). User → own data only. Group Member → group-scoped. Owner → gestión. Bien delimitado. ✅
- **Immutabilidad:** MatchResult no editable post-cierre (BR-MATCH-06 "no re-close"). MatchEvent marcado `is_undone`, no eliminado físicamente (BR-TRACK-11). ✅
- **Audit trail:** MatchEvents son el log inmutable de cambios. Cada evento tiene timestamp + player_id + delta. ✅
- **No dummy users:** Sin proxy users — Guest es estado pre-auth sin cuenta, no cuenta falsa. ✅
- **Datos sensibles:** `CLERK_SECRET_KEY`, `DATABASE_URL` nunca en cliente (Expo Router API routes server-side). ✅

---

## 🎯 Verdict

**Pipeline Alignment (V1):** ✅ PASS (1 gap 🟡 en 14_TRACEABILITY — no bloquea implementación)
**Semantic Fidelity (V2):** ✅ PASS (correcciones aplicadas inline en 15_DESIGN)
**Post-Implementation (V3):** ⏭️ Skipped — no hay código todavía

**Overall: ✅ PASS**

---

## Recomendaciones

1. **[Alta] Corregir `14_TRACEABILITY.md` Épicas E1-E2:** Los FT IDs (US-008/009→FT-002 incorrectos; US-010+→FT-003 incorrecto) deben actualizarse para alinear con 02_FEATURE_MAP. Impacto bajo en el presente (el design es correcto) pero puede confundir a futuros agentes de implementación o revisión.

2. **[Media] Resolver OQ-001 (scope ActiveMatchBanner en grupos) antes de Batch 4:** La CMP-015 query depende de si el banner muestra el match del usuario individual o del grupo activo. Esta decisión afecta el endpoint `GET /matches` y la lógica de filtrado.

3. **[Baja] Confirmar enfoque de commander damage en SCR-019 (Guest):** CMP-005 en modo genérico (sin `commander_id`) necesita una decisión de UX: ¿contadores numéricos por sección del oponente, o se omite en guest? Aclarar en A-05 antes de implementar SCR-019.

---

## Correcciones Aplicadas

| Fecha | Gap/Drift | Fix Aplicado | Doc |
|-------|-----------|-------------|-----|
| 2026-04-10 | Win condition enum wrong values en FLW-004 | Corregido a los 8 valores exactos de BR-MATCH-09 | 15_DESIGN.md §3 |
| 2026-04-10 | CMP-005 inventory solo tenía SCR-008 | Agregado SCR-019 con nota "modo genérico sin commander_id" | 15_DESIGN.md §4 |
| 2026-04-10 | US-008/009 en §1 Épica E1 → FT-002 incorrecto | Corregido a FT-003 Commanders con endpoints y BRs correctos | 14_TRACEABILITY.md §1 |
| 2026-04-10 | FT labels en §1 Épica E2 (FT-003→FT-004, FT-009→FT-006, etc.) | Corregidos todos los FT IDs de E2 a los valores de 02_FEATURE_MAP | 14_TRACEABILITY.md §1 |
| 2026-04-10 | US-030/031/032 duplicados en E2 bajo FT-010 (ya en E3) | Eliminadas filas duplicadas de E2 | 14_TRACEABILITY.md §1 |
| 2026-04-10 | §2 Feature→Entidades: FT-003 Commanders ausente, FT labels incorrectos | Reescrito §2 con 20 FT-XXX correctos y entidades correctas | 14_TRACEABILITY.md §2 |
| 2026-04-10 | §3 BR Coverage: BR-STATS-01→09 referenciaban US-037/038/039/041/042 (Auth/Groups) | Corregido a US-022/023/024/025/026/027 (Stats stories reales) | 14_TRACEABILITY.md §3 |
| 2026-04-10 | §4 Endpoints: FT-002 para commanders, FT-003 para matches, etc. | Corregidos todos los FT IDs y US references de §4 | 14_TRACEABILITY.md §4 |

---

_TimeKast Factory — Document Validation Report (V2)_
_Stage: post-design | Generated: 2026-04-10_
