# ⚠️ Risk Register — MTG Commander Tracker

> Generado desde 07_ARCHITECTURE, 05_BUSINESS_RULES, 08_API_CONTRACTS por `/docs`
> **Fuente:** Discovery Brief §5, §8
> **Versión:** 1.0 — 2026-04-09

---

## Clasificación de Riesgos

| Probabilidad | Valor | Descripción |
|-------------|-------|-------------|
| Alta | 3 | Probable que ocurra en MVP |
| Media | 2 | Posible pero no seguro |
| Baja | 1 | Improbable pero plausible |

| Impacto | Valor | Descripción |
|---------|-------|-------------|
| Crítico | 3 | Bloquea el lanzamiento o causa pérdida de datos |
| Alto | 2 | Degrada significativamente la experiencia |
| Bajo | 1 | Molestia menor, workaround disponible |

**Score = Probabilidad × Impacto** (1–9)

---

## Resumen Ejecutivo

| ID | Riesgo | Score | Estado |
|----|--------|-------|--------|
| R-001 | Latencia de Neon cold start | 6 | 🔴 Activo |
| R-002 | Debounce inconsistente en dispositivos lentos | 6 | 🔴 Activo |
| R-003 | Rechazo de App Store por Apple IAP | 6 | 🔴 Activo |
| R-004 | Partner commanders — complejidad de data model | 4 | 🟡 Monitorear |
| R-005 | Stats on-demand — queries lentas en historial grande | 4 | 🟡 Monitorear |
| R-006 | Clerk downtime | 3 | 🟢 Bajo |
| R-007 | Pérdida de MatchEvents en match activo (network loss) | 6 | 🔴 Activo |
| R-008 | Desincronización de vida local vs servidor | 4 | 🟡 Monitorear |
| R-009 | Rotación de screens durante partida (UX) | 4 | 🟡 Monitorear |
| R-010 | Apple Sign In obligatorio en iOS | 3 | 🟢 Bajo |
| R-011 | Migración de schema destructiva en producción | 3 | 🟢 Bajo |
| R-012 | Scryfall API deprecation | 2 | 🟢 Bajo |

---

## Riesgos Detallados

---

### R-001 — Latencia de Neon Cold Start

**Categoría:** Infraestructura  
**Probabilidad:** Alta (3) | **Impacto:** Alto (2) | **Score:** 6

**Descripción:**  
Neon PostgreSQL serverless escala a cero cuando no hay actividad. El primer request después de un período idle puede tardar 1-3 segundos en "despertar" la instancia. Para una app de tracking en tiempo real durante una partida, esto es inaceptable.

**Escenarios de riesgo:**
- Un jugador abre la app después de varias horas idle → loading spinner largo en Home
- El primer evento de un match (después de setup) tarda 2-3s → mala primera impresión
- En partidas que empiezan temprano en el día, la DB puede estar dormida

**Mitigaciones:**

| Mitigación | Esfuerzo | Efectividad |
|-----------|---------|-------------|
| **M1:** Keep-alive ping cada 5 min durante match activo | Bajo | Alta |
| **M2:** Pre-warm DB al iniciar el setup del match (antes de `POST /matches`) | Bajo | Alta |
| **M3:** Neon plan "Always On" (paid tier) — elimina cold start | Medio (costo) | Total |
| **M4:** Optimistic UI — mostrar cambio local inmediatamente, sincronizar después | Medio | Alta |

**Plan:** M4 está contemplado en ADR-008 (Local state + sync). Implementar M2 como hedge adicional. Evaluar M3 si cold starts persisten en staging.

**Trigger de escalada:** Si p95 latency de primer request supera 2s en staging.

---

### R-002 — Debounce Inconsistente en Dispositivos Lentos

**Categoría:** Lógica de Negocio  
**Probabilidad:** Alta (3) | **Impacto:** Alto (2) | **Score:** 6

**Descripción:**  
BR-TRACK-03 define debounce con ventana 200–2000ms. En dispositivos lentos o con alta carga de CPU (muchos jugadores en pantalla, animaciones), el timestamp de los eventos puede no reflejar con precisión el tiempo real entre taps. Esto puede causar que grupos que debían estar juntos se separen, o viceversa.

**Escenarios de riesgo:**
- Jugador toca rápido en teléfono lento → JS event loop delayed → timestamps artificialmente espaciados → 2 grupos en lugar de 1
- `performance.now()` vs `Date.now()` divergen en algunos dispositivos Android

**Mitigaciones:**

| Mitigación | Esfuerzo | Efectividad |
|-----------|---------|-------------|
| **M1:** Usar `performance.now()` para timestamps internos (más preciso que `Date.now()`) | Bajo | Media |
| **M2:** Aplicar debounce con trailing edge + flush al terminar el match | Bajo | Alta |
| **M3:** Testear en dispositivos de gama baja (Android Go, iPhone SE 2) en QA | Bajo | Alta |
| **M4:** Hacer el `debounce_window` configurable por el usuario (VAL-003: 200-2000ms) — ya contemplado en BR | — | — |

**Plan:** M1 + M2 en implementación. M3 como test obligatorio pre-launch.

---

### R-003 — Rechazo de App Store por Apple IAP

**Categoría:** Distribución  
**Probabilidad:** Alta (3) | **Impacto:** Alto (2) | **Score:** 6

**Descripción:**  
Apple tiene reglas estrictas sobre apps que ofrecen contenido premium. Si el Premium se describe como "elimina anuncios", Apple puede rechazar la app o requerir que el pago sea exclusivamente vía StoreKit. Cualquier referencia a compras fuera del IAP o flujos que parezcan evadir la comisión del 30% son causas de rechazo.

**Escenarios de riesgo:**
- Guideline 3.1.1: "Apps may not use in-app purchase to sell or unlock physical goods or services"
- Si el flujo de Premium menciona "sin pagar más" o compra previa, Apple puede confundirlo con un flujo externo
- Ads mostrados antes del IAP pueden violar guidelines si se perciben como coercivos

**Mitigaciones:**

| Mitigación | Esfuerzo | Efectividad |
|-----------|---------|-------------|
| **M1:** Revisar App Store Review Guidelines §3.1.1 antes de diseñar el paywall | Bajo | Alta |
| **M2:** Implementar "Restore Purchases" correctamente (obligatorio para Apple) | Bajo | Requerido |
| **M3:** No mencionar precios ni descuentos fuera del sheet de IAP | Bajo | Alta |
| **M4:** Preparar respuesta a rechazo con apelación (proceso conocido) | Bajo | Media |
| **M5:** Usar `StoreKit 2` API (SwiftUI-compatible, recomendado por Apple) vía Expo module | Medio | Alta |

**Plan:** M1 + M2 + M3 son no-negociables. Revisar guidelines antes de implementar FT-018.

---

### R-004 — Complejidad del Modelo de Partner Commanders

**Categoría:** Lógica de Negocio / Data Model  
**Probabilidad:** Media (2) | **Impacto:** Alto (2) | **Score:** 4

**Descripción:**  
Los partner commanders requieren dos campos en Deck y Participation (`commander_id`, `commander_id_2`), dos contadores de daño independientes en JSONB, y stats separadas por commander. Esta complejidad puede generar bugs sutiles: daño sumado incorrecto, stats duplicadas, validaciones que fallan en edge cases.

**Escenarios de riesgo:**
- Daño de `cmd_id_2` se acumula en el contador de `cmd_id_1`
- Al calcular stats, un partner commander aparece dos veces en win rate del jugador
- Al archivar un deck con partners, solo se soft-delete uno de los dos commanders

**Mitigaciones:**

| Mitigación | Esfuerzo | Efectividad |
|-----------|---------|-------------|
| **M1:** Tests unitarios exhaustivos para partner damage (ver 11_TEST_STRATEGY §6.1) | Bajo | Alta |
| **M2:** Constraint en DB: si `commander_id_2 IS NOT NULL`, ambos deben tener `is_partner=true` (ya en 06_DATA_MODEL) | Bajo | Alta |
| **M3:** Función helper `getCommanderIds(deck)` que siempre retorna array — elimina ambigüedad en código | Bajo | Alta |
| **M4:** Review manual de queries de stats antes de merge | Bajo | Media |

**Plan:** M1 + M2 son críticos. M3 reduce surface area de bugs en implementación.

---

### R-005 — Stats On-Demand Lentas (Historial Grande)

**Categoría:** Performance  
**Probabilidad:** Media (2) | **Impacto:** Alto (2) | **Score:** 4

**Descripción:**  
ADR-007 establece stats on-demand (sin pre-cálculo) para MVP. Para usuarios con muchas partidas (> 50–100), queries como win rate y rankings implican JOINs sobre `match_events`, `participations`, y `matches`. Sin índices apropiados, esto puede degradarse.

**Escenarios de riesgo:**
- Un Group Owner con 200+ partidas ve el ranking global con latencia > 3s
- `GET /stats/global` con 50 jugadores activos hace full scan de `match_events`
- Neon free tier tiene limits en compute — queries pesadas agotan el budget

**Mitigaciones:**

| Mitigación | Esfuerzo | Efectividad |
|-----------|---------|-------------|
| **M1:** Índices en `match_events(participation_id, is_undone)` y `participations(match_id)` — ya en 06_DATA_MODEL | Bajo | Alta |
| **M2:** Paginación en `GET /stats/global` (limit/offset ya en 08_API_CONTRACTS) | Bajo | Media |
| **M3:** EXPLAIN ANALYZE en staging con 500+ partidas seed antes de launch | Bajo | Alta |
| **M4:** Si queries superan 2s en staging con M1+M3, considerar materialized view parcial (Post-MVP) | Alto | Total |

**Plan:** M1 + M3 pre-launch. M4 en roadmap Post-MVP si necesario.

---

### R-006 — Clerk Downtime

**Categoría:** Dependencias Externas  
**Probabilidad:** Baja (1) | **Impacto:** Alto (3) | **Score:** 3

**Descripción:**  
Si Clerk tiene un incident, los usuarios no pueden autenticarse. Los JWT ya emitidos siguen siendo válidos hasta su expiración, pero refresh tokens fallarán.

**Mitigaciones:**

| Mitigación | Esfuerzo | Efectividad |
|-----------|---------|-------------|
| **M1:** Configurar JWT expiry en Clerk a 7 días (en vez de default corto) — reduce impacto de outage | Bajo | Media |
| **M2:** Guest mode siempre disponible sin auth | Bajo | Media |
| **M3:** Status page de Clerk en runbook (RB-009) | Bajo | Baja |

**Plan:** M1 + M2 como mitigación pasiva. Clerk SLA es 99.9% — riesgo aceptable.

---

### R-007 — Pérdida de MatchEvents en Match Activo (Network Loss)

**Categoría:** Confiabilidad de Datos  
**Probabilidad:** Alta (3) | **Impacto:** Alto (2) | **Score:** 6

**Descripción:**  
ADR-008 establece estado local durante el match con sync al servidor. Si el dispositivo pierde conectividad durante una partida larga y la app crashea o se fuerza a cerrar, los MatchEvents locales no sincronizados se perderían.

**Escenarios de riesgo:**
- Partida de 2 horas, conexión intermitente → 30 minutos de eventos sin sync → app crash → datos perdidos
- Dos dispositivos en el mismo match (futuro FT-022) desincronizan sus estados locales

**Mitigaciones:**

| Mitigación | Esfuerzo | Efectividad |
|-----------|---------|-------------|
| **M1:** Persistencia local con `AsyncStorage` o `expo-sqlite` durante match activo | Medio | Alta |
| **M2:** Retry queue automático cuando conectividad se restaura | Medio | Alta |
| **M3:** Indicador visual de sync status en pantalla de tracker | Bajo | Media (UX) |
| **M4:** Al reabrir app, detectar match in_progress sin sync y ofrecer recovery | Medio | Alta |

**Plan:** M1 + M3 en MVP. M2 + M4 como enhancement inmediato post-MVP.

---

### R-008 — Desincronización de Vida Local vs Servidor

**Categoría:** Consistencia de Datos  
**Probabilidad:** Media (2) | **Impacto:** Alto (2) | **Score:** 4

**Descripción:**  
El life total se calcula en cliente (optimistic) y se recalcula desde MatchEvents en servidor. Si hay discrepancias (bug en cálculo local, eventos perdidos, race condition en retry), el cliente muestra un valor diferente al real.

**Mitigaciones:**

| Mitigación | Esfuerzo | Efectividad |
|-----------|---------|-------------|
| **M1:** `GET /matches/:id` retorna life totals calculados en servidor — reconciliar al reconnect | Medio | Alta |
| **M2:** Tests unitarios de CALC-003 con fixtures (11_TEST_STRATEGY §8) | Bajo | Alta |
| **M3:** Al detectar discrepancia, mostrar el valor del servidor con indicador visual | Bajo | Media |

**Plan:** M1 + M2 en MVP.

---

### R-009 — Rotación de Pantalla Durante Partida

**Categoría:** UX / React Native  
**Probabilidad:** Media (2) | **Impacto:** Alto (2) | **Score:** 4

**Descripción:**  
El tracker (P06) necesita mostrar 2–6 jugadores de forma usable. En teléfonos pequeños con orientación portrait, 6 jugadores quedarían muy comprimidos. Si se permite rotación, la UI en landscape cambia pero el estado local no debería perderse (React Native puede re-montar el componente si no se maneja correctamente).

**Mitigaciones:**

| Mitigación | Esfuerzo | Efectividad |
|-----------|---------|-------------|
| **M1:** Bloquear orientación en portrait para el tracker — simplicidad > flexibilidad (BR-TRACK-08) | Bajo | Total |
| **M2:** Si se permite landscape, persistir estado en ref o Context para sobrevivir re-renders | Medio | Alta |
| **M3:** Layouts responsivos desde el inicio (ya contemplado en UI_Stitch designs para P06) | Bajo | Alta |

**Plan:** M1 como primera opción (más simple). M3 cubre casos de tablets en el futuro.

---

### R-010 — Apple Sign In Obligatorio en iOS

**Categoría:** Compliance  
**Probabilidad:** Baja (1) | **Impacto:** Alto (3) | **Score:** 3

**Descripción:**  
Apple requiere que si una app ofrece cualquier método de login con terceros (Google, Facebook, etc.), debe también ofrecer "Sign in with Apple" en iOS. Clerk soporta esto nativamente. El riesgo es olvidar activarlo.

**Mitigaciones:**

| Mitigación | Esfuerzo | Efectividad |
|-----------|---------|-------------|
| **M1:** Clerk tiene Apple Sign In built-in — activar en Dashboard antes de submit | Bajo | Total |
| **M2:** Incluir en checklist de pre-submit (RB-001) | Bajo | Alta |

**Plan:** M1 es la solución completa. Bajo riesgo dado que Clerk lo maneja.

---

### R-011 — Migración de Schema Destructiva en Producción

**Categoría:** Operaciones / DB  
**Probabilidad:** Baja (1) | **Impacto:** Alto (3) | **Score:** 3

**Descripción:**  
Drizzle no genera rollbacks automáticos. Una migration que dropa una columna o tabla con datos reales en producción podría resultar en pérdida irreversible de datos.

**Mitigaciones:**

| Mitigación | Esfuerzo | Efectividad |
|-----------|---------|-------------|
| **M1:** Nunca ejecutar migrations directamente en producción sin staging first (RB-003) | Bajo | Alta |
| **M2:** Backup automático de schema antes de cada migration (RB-003 §pasos) | Bajo | Alta |
| **M3:** Code review obligatorio de cada `.sql` generado por Drizzle | Bajo | Alta |
| **M4:** Usar Neon branching: clonar rama de producción, aplicar migration, verificar, luego aplicar a main | Medio | Total |

**Plan:** M1 + M2 + M3 en proceso. M4 como práctica Gold standard.

---

### R-012 — Scryfall API Deprecation / Breaking Change

**Categoría:** Dependencias Externas  
**Probabilidad:** Baja (1) | **Impacto:** Bajo (2) | **Score:** 2

**Descripción:**  
FT-020 (import automático de commanders desde Scryfall) es Post-MVP (Fase 3). Si Scryfall cambia su API o la depreca, esta feature post-MVP quedaría bloqueada. En MVP, commanders se crean manualmente, por lo que el impacto es nulo en el lanzamiento.

**Mitigaciones:**

| Mitigación | Esfuerzo | Efectividad |
|-----------|---------|-------------|
| **M1:** Scryfall import es Post-MVP — no hay riesgo para el launch | — | Total |
| **M2:** Al implementar, crear adapter/wrapper para aislar la API de Scryfall del resto del código | Bajo | Alta |

**Plan:** No action requerida en MVP.

---

## Roadmap de Mitigaciones por Fase

### Fase 1 — Pre-Implementación
- [ ] R-003: Leer Apple App Store Guidelines §3.1.1 y §3.1.3
- [ ] R-010: Activar Apple Sign In en Clerk Dashboard

### Fase 2 — Durante Implementación
- [ ] R-001: Implementar pre-warm de DB al iniciar match setup
- [ ] R-002: Usar `performance.now()` para timestamps de debounce
- [ ] R-004: Crear `getCommanderIds(deck)` helper + constraints en DB
- [ ] R-007: Implementar persistencia local con AsyncStorage durante match
- [ ] R-008: Implementar reconciliación en `GET /matches/:id`
- [ ] R-009: Bloquear orientación portrait en pantalla de tracker

### Fase 3 — Pre-Launch (QA)
- [ ] R-001: Medir cold start latency en staging — debe ser < 2s p95
- [ ] R-002: Testear debounce en dispositivos Android de gama baja
- [ ] R-003: Testear flujo IAP en sandbox (iOS + Android)
- [ ] R-005: EXPLAIN ANALYZE con 500+ partidas seed
- [ ] R-011: Backup automático de schema en CI pre-migration

---

*Risk Register generado por `/docs` — revisar y actualizar al inicio de cada sprint de implementación.*
