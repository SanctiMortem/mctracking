# 🏗️ Architecture — MTG Commander Tracker

> Generado desde Discovery Brief §5, §8 por `/docs`
> **Fuente:** `docs/planning/00_DISCOVERY_BRIEF.md`
> **SSOT:** Este documento + ADRs para decisiones técnicas.
> **Versión:** 1.0 — 2026-04-09

---

## Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                   MOBILE CLIENTS                             │
│   ┌─────────────────────┐   ┌─────────────────────────┐     │
│   │     iOS (Expo)      │   │    Android (Expo)        │     │
│   │  React Native App   │   │  React Native App        │     │
│   └──────────┬──────────┘   └──────────┬──────────────┘     │
└──────────────┼────────────────────────┼────────────────────┘
               │                        │
               └───────────┬────────────┘
                           │ HTTPS / REST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (TBD — ver ADR-004)               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                API Layer (RN direct to Neon)           │  │
│  │  ┌───────────┐   ┌──────────────┐   ┌─────────────┐   │  │
│  │  │   Auth    │   │  CRUD APIs   │   │  Stats API  │   │  │
│  │  │ (TBD)     │   │  (Drizzle)   │   │ (on-demand) │   │  │
│  │  └───────────┘   └──────────────┘   └─────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │     Neon       │  │  Apple IAP /   │  │   Ad Network  │  │
│  │  PostgreSQL    │  │  Google Billing│  │   (TBD)       │  │
│  │  (serverless)  │  │  (Premium)     │  │               │  │
│  └────────────────┘  └────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

| Capa              | Tecnología                      | Estado   | Justificación                                          |
| ----------------- | ------------------------------- | -------- | ------------------------------------------------------ |
| **Framework**     | React Native (Expo)             | ✅ Firm  | iOS + Android desde un único codebase (ADR-001)        |
| **Language**      | TypeScript                      | ✅ Firm  | Type safety end-to-end                                 |
| **Base de datos** | Neon (PostgreSQL serverless)    | ✅ Firm  | Cloud DB, serverless, escala a cero (ADR-002)          |
| **ORM**           | Drizzle ORM                     | 🟡 TBD   | Recomendado para Neon/PostgreSQL — definir en /docs    |
| **Auth**          | Clerk (`@clerk/clerk-expo`)       | ✅ Firm | Multi-provider nativo RN, JWT para Neon RLS (ADR-003)  |
| **Styling**       | TBD (NativeWind o StyleSheet)   | 🟡 TBD   | Design system "The Mystic Archive" (Tailwind tokens)   |
| **i18n**          | react-i18next + expo-localization | ✅ Firm | Estándar ecosistema RN para EN/ES (BR-I18N-01)         |
| **Navigation**    | React Navigation                | ✅ Firm  | Estándar para RN, soporta tabs + modals + stack       |
| **Ads**           | TBD (Google AdMob / Unity Ads)  | 🟡 TBD   | Definir en /docs — solo Free tier (BR-AUTH-03)         |
| **Payments**      | Apple IAP + Google Play Billing | ✅ Firm  | One-time Premium (ADR-006)                             |

---

## Integraciones Externas

| Servicio             | Propósito                          | Criticidad     | Env Var         | Fase  |
| -------------------- | ---------------------------------- | -------------- | --------------- | ----- |
| **Neon**             | DB principal (PostgreSQL serverless) | 🔴 Core       | `DATABASE_URL`  | MVP   |
| **Clerk**           | Auth multi-provider (Email, Google, Apple, Magic Link) | 🔴 Core | `CLERK_*` | MVP |
| **Apple Sign In**    | OAuth iOS (oblig. si hay OAuth)    | 🔴 Requerido   | Via SDK         | MVP   |
| **Google OAuth**     | Auth OAuth Android/iOS             | 🔴 Core        | `GOOGLE_*`      | MVP   |
| **Magic Link**       | Auth sin contraseña (email)        | 🟡 Importante  | Via Auth SDK    | MVP   |
| **Apple IAP**        | Compra única Premium (iOS)         | 🟡 Importante  | Via StoreKit    | MVP   |
| **Google Play Billing** | Compra única Premium (Android)  | 🟡 Importante  | Via Billing API | MVP   |
| **Ad Network TBD**   | Monetización Free tier             | 🟢 Nice-to-have | `ADS_*`        | MVP   |
| **Scryfall API**     | Import commanders automático       | 🟢 Diferido    | —               | Fase 3|

---

## Environments

| Environment | Propósito            | Branch  | DB                      |
| ----------- | -------------------- | ------- | ----------------------- |
| Production  | Usuarios reales      | main    | Neon production branch  |
| Development | Desarrollo local     | develop | Neon dev branch         |
| Preview     | Review de PRs        | PRs     | Neon preview branch     |

### Variables de Entorno

| Variable          | Descripción                   | Requerido | Notas                        |
| ----------------- | ----------------------------- | --------- | ---------------------------- |
| `DATABASE_URL`    | Neon connection string        | ✅        | Branch-specific              |
| `CLERK_PUBLISHABLE_KEY` | Clerk public key (client) | ✅  | Clerk Dashboard              |
| `CLERK_SECRET_KEY` | Clerk secret (server-side)   | ✅        | Clerk Dashboard              |
| `GOOGLE_CLIENT_ID` | OAuth Google Client ID       | ✅        | Google Cloud Console         |
| `GOOGLE_CLIENT_SECRET` | OAuth Google Secret     | ✅        | Google Cloud Console         |
| `ADS_*`           | Ad network credentials        | ❌        | TBD — definir en /docs       |

---

## Decisiones de Arquitectura (ADRs)

### ADR-001: React Native (Expo) como framework móvil

| Atributo    | Valor                      |
| ----------- | -------------------------- |
| **Fecha**   | 2026-04-09                 |
| **Estado**  | Aceptado ✅                |
| **Fuente**  | Discovery Brief §1, §8     |
| **Riesgo**  | Low                        |

**Contexto:**
La app debe funcionar en iOS y Android. Se requiere un único codebase para reducir costos de desarrollo y mantenimiento. La app es nativa móvil, no web.

**Decisión:**
React Native con Expo como framework base. Un único codebase TypeScript para iOS y Android.

**Alternativas consideradas:**

1. **Flutter** — ❌ Ecosistema diferente al preferido; curva de aprendizaje en Dart.
2. **Swift/Kotlin nativos** — ❌ Dos codebases separados; duplicación de esfuerzo para MVP.
3. **React Native sin Expo** — ⚠️ Posible, pero Expo simplifica build/distribución y OTA updates.

**Consecuencias:**

- ✅ Un codebase para iOS y Android
- ✅ Expo simplifica distribución a App Store y Play Store
- ✅ Expo Router / React Navigation para navegación
- ⚠️ Algunas features nativas (IAP, push notifications) requieren Expo plugins o código nativo adicional

---

### ADR-002: Neon (PostgreSQL serverless) como base de datos

| Atributo    | Valor                      |
| ----------- | -------------------------- |
| **Fecha**   | 2026-04-09                 |
| **Estado**  | Aceptado ✅                |
| **Fuente**  | Discovery Brief §1, §8     |
| **Riesgo**  | Low                        |

**Contexto:**
El producto requiere persistencia cloud para historial, stats y grupos de amigos. Los datos son relacionales (matches, participations, players, decks).

**Decisión:**
Neon PostgreSQL serverless como única base de datos. Drizzle ORM recomendado para type safety.

**Alternativas consideradas:**

1. **Firebase / Firestore** — ❌ NoSQL no se ajusta a las relaciones complejas del modelo de datos (Participation, MatchEvent, GroupMembership).
2. **Supabase** — ⚠️ Viable, pero el cliente especificó Neon explícitamente.
3. **PlanetScale (MySQL)** — ❌ Sin soporte para arrays nativos de PostgreSQL (necesarios para `Commander.colors`).

**Consecuencias:**

- ✅ SQL relacional para queries complejas de stats
- ✅ Escala a cero (costo mínimo en inactividad)
- ✅ Branching de DB para desarrollo/preview
- ⚠️ Cold start en Neon puede agregar latencia (< 500ms en práctica)

---

### ADR-003: Auth provider — Clerk

| Atributo    | Valor                      |
| ----------- | -------------------------- |
| **Fecha**   | 2026-04-09                 |
| **Estado**  | Aceptado ✅                |
| **Fuente**  | Discovery Brief §2, §8     |
| **Riesgo**  | Med (vendor lock-in mitigado por schema agnóstico) |

**Contexto:**
Se requiere auth multi-provider en React Native/Expo: Email/Password, Google OAuth, Apple Sign In (obligatorio en App Store si hay OAuth social), Magic Link. La solución debe tener SDK nativo para Expo.

**Decisión:**
**Clerk** con `@clerk/clerk-expo`. Maneja los 4 providers requeridos, incluye session management, y tiene soporte nativo para Expo con hooks de React.

**Alternativas descartadas:**

1. **Neon Auth** — ❌ Más nuevo y menos battle-tested para React Native. SDK de Expo no maduro al momento de esta decisión.
2. **Auth.js** — ❌ Diseñado principalmente para Next.js/web. Soporte para React Native requiere configuración manual compleja y no es el caso de uso principal.
3. **Firebase Auth** — ❌ No estaba en las opciones del Brief y agrega dependencia de Firebase al stack Neon.

**Consecuencias:**

- ✅ SDK oficial `@clerk/clerk-expo` con soporte nativo para Apple Sign In, Google OAuth, Magic Link
- ✅ Session management y token refresh automático en el cliente RN
- ✅ JWT templates para Neon RLS — los tokens de Clerk pueden usarse en Row Level Security de Neon
- ✅ `User.provider` enum en schema sigue siendo el SSOT de qué provider usó el usuario al registrarse
- ⚠️ Costo por MAU en producción (plan gratuito hasta 10K MAUs — suficiente para MVP)
- ⚠️ Vendor lock-in en auth: mitigado porque el schema de `users` es propio y los datos se almacenan en Neon

---

### ADR-004: Arquitectura backend — Expo API Routes (Hono) como capa de API

| Atributo    | Valor                      |
| ----------- | -------------------------- |
| **Fecha**   | 2026-04-09                 |
| **Estado**  | Aceptado ✅                |
| **Fuente**  | Discovery Brief §8         |
| **Riesgo**  | Med (Expo API Routes es relativamente nuevo) |

**Contexto:**
React Native no puede usar Server Actions de Next.js. La `DATABASE_URL` de Neon no puede estar expuesta en el bundle del cliente móvil. Se necesita una capa de backend que intermedie entre la app RN y Neon, validando auth y scoping de datos por grupo/user.

**Decisión:**
**Expo Router API Routes** con **Hono** como handler de requests HTTP. Las API Routes de Expo corren en el servidor (SSR/server functions) y pueden conectarse directamente a Neon con Drizzle sin exponer credenciales al cliente. Hono provee routing type-safe, middleware, y validación con Zod.

**Alternativas descartadas:**

1. **Neon Serverless Driver directo desde el cliente RN** — ❌ Expone `DATABASE_URL` en el bundle del cliente. Riesgo de seguridad crítico.
2. **API REST separada (Node/Express en Railway/Render)** — ⚠️ Viable pero agrega infraestructura separada. Expo API Routes consolida todo en un mismo proyecto Expo.
3. **tRPC sobre Expo** — ⚠️ Excelente DX pero setup más complejo para MVP. Puede considerarse en Fase 2 si se requiere type safety end-to-end más estricto.
4. **GraphQL** — ❌ Overhead innecesario para el modelo de datos de este proyecto.

**Consecuencias:**

- ✅ Un solo repositorio — app RN + API Routes en el mismo proyecto Expo
- ✅ `DATABASE_URL` solo vive en el servidor (Expo API Routes), nunca en el cliente
- ✅ Clerk JWT puede validarse en el middleware de las API Routes para auth server-side
- ✅ Hono es ligero (~12KB), tiene middleware para CORS, auth, y validación Zod
- ✅ Compatible con Neon + Drizzle ORM directamente desde el servidor
- ⚠️ Expo API Routes requiere Expo SDK 51+ y el proyecto en modo server-side (no solo managed workflow)
- ⚠️ Deploy requiere servidor Node.js (no solo bundle estático) — compatible con EAS hosting o Railway

---

### ADR-005: Soft delete para Player y Deck con historial

| Atributo    | Valor                      |
| ----------- | -------------------------- |
| **Fecha**   | 2026-04-09                 |
| **Estado**  | Aceptado ✅                |
| **Fuente**  | Brief §6 BR-ENTITY-03, BR-DECK-07 |
| **Riesgo**  | Low                        |

**Contexto:**
Al eliminar un jugador o deck que participó en matches pasados, se debe preservar el historial de esas participaciones para mantener la integridad del historial y las stats.

**Decisión:**
Soft delete mediante campo `deleted_at: timestamp nullable` en Player y Deck. Queries de UI filtran `WHERE deleted_at IS NULL`. El historial y stats usan la entidad "deletada" normalmente (nombre se preserva).

**Alternativas consideradas:**

1. **Hard delete + cascade NULL** — ❌ Borra el nombre del jugador/deck de participaciones históricas. Rompe la trazabilidad.
2. **Archived flag (`is_deleted: boolean`)** — ⚠️ Menos expresivo; no permite saber cuándo fue eliminado.

**Consecuencias:**

- ✅ Historial preservado con datos completos
- ✅ Stats de decks/jugadores soft-deleted siguen siendo correctas
- ⚠️ Todas las queries de UI deben filtrar `WHERE deleted_at IS NULL`

---

### ADR-006: Monetización — Free + Premium One-Time (sin subscripción)

| Atributo    | Valor                      |
| ----------- | -------------------------- |
| **Fecha**   | 2026-04-09                 |
| **Estado**  | Aceptado ✅                |
| **Fuente**  | Discovery Brief §1 Monetización, BR-AUTH-03/04 |
| **Riesgo**  | Low                        |

**Contexto:**
La app necesita un modelo de monetización que no genere fricción en el uso core.

**Decisión:**
Free tier con Ads + Premium ONE TIME (compra única vía Apple IAP / Google Play Billing) que elimina ads permanentemente. El Premium no gatea ninguna feature funcional.

**Alternativas consideradas:**

1. **Subscripción mensual** — ❌ El cliente rechazó explícitamente (F36). Fricción para app casual.
2. **Freemium (features gateadas)** — ❌ El cliente rechazó explícitamente. "La monetización no gatea ninguna feature funcional."
3. **Solo ads** — ⚠️ No ofrece opción de eliminar ads; puede frustrar usuarios power.

**Consecuencias:**

- ✅ Máxima accesibilidad — todos los features disponibles para todos
- ✅ Modelo simple de implementar (un campo `UserSettings.premium: boolean`)
- ⚠️ Revenue limitado vs subscripción (compensado por bajo costo de servidor — Neon escala a cero)

---

### ADR-007: Stats on-demand (sin pre-cómputo en MVP)

| Atributo    | Valor                      |
| ----------- | -------------------------- |
| **Fecha**   | 2026-04-09                 |
| **Estado**  | Aceptado ✅                |
| **Fuente**  | Discovery Brief §8 Automation Jobs, BR-STATS-09 |
| **Riesgo**  | Med (performance en grupos grandes) |

**Contexto:**
Las stats (win rate, matchup) requieren aggregates sobre matches históricos. Se puede pre-calcular (cron/triggers) o calcular on-demand.

**Decisión:**
Stats calculadas on-demand en MVP (sin cache, sin pre-cómputo). Latencia aceptada para el volumen esperado (grupos de amigos: 20–100 matches).

**Alternativas consideradas:**

1. **Materialized Views en PostgreSQL** — ⚠️ Más complejo en MVP; necesario si el volumen escala.
2. **Cached en Redis** — ❌ Infraestructura adicional innecesaria en MVP.
3. **Denormalized stats en UserSettings/Player** — ❌ Riesgo de inconsistencia; sync complejo.

**Consecuencias:**

- ✅ Arquitectura simple — no hay jobs de background ni triggers complejos en MVP
- ✅ Stats siempre frescos (no hay staleness)
- ⚠️ Latencia perceptible si el grupo tiene 500+ matches (mitigar en Fase 2 con Materialized Views)

---

### ADR-008: Tracker en vivo — estado local + sync al cerrar match

| Atributo    | Valor                      |
| ----------- | -------------------------- |
| **Fecha**   | 2026-04-09                 |
| **Estado**  | Aceptado ✅                |
| **Fuente**  | Discovery Brief §8 Real-time Strategy |
| **Riesgo**  | Med (consistencia en offline) |

**Contexto:**
El tracker opera en un único dispositivo. No hay sincronización multiusuario en tiempo real en MVP. Se requiere decidir cuándo persisten los cambios.

**Decisión:**
Los cambios de vida/poison/commander damage se mantienen en estado local (React state + optimistic updates) durante el match. Los MatchEvents se persisten a Neon al generarse (con debounce). El match se sincroniza completamente al cerrarse.

**Alternativas consideradas:**

1. **Sync en tiempo real (WebSockets)** — ❌ Fuera de scope MVP (Fase 3). Complejidad alta.
2. **Sync solo al cerrar match** — ⚠️ Si la app crashea, se pierde el progreso.
3. **Persist cada MatchEvent al generarse** — ✅ Elegida. Balance entre consistencia y performance.

**Consecuencias:**

- ✅ El tracker es responsivo (estado local)
- ✅ Crash recovery: si la app crashea, los eventos ya persistidos permiten reconstruir el estado
- ⚠️ Requiere reconexión para persistir — modo offline degrada (BR-AUTH-01 + §8 Offline)

---

## RBAC — Matriz de Permisos por Módulo

> Ver detalle en `03_USER_PERSONAS.md` (Matriz de Permisos Completa) y `05_BUSINESS_RULES.md` (BR-AUTH).

| Módulo           | Guest (P-001) | User (P-002) | Group Member (P-003) | Group Owner (P-004) |
| ---------------- | :-----------: | :----------: | :------------------: | :-----------------: |
| Tracker básico   | ✅            | ✅           | ✅                   | ✅                  |
| CRUD personal    | ❌            | ✅           | ✅                   | ✅                  |
| CRUD grupo       | ❌            | ❌           | ✅                   | ✅                  |
| Historial/Stats  | ❌            | ✅           | ✅                   | ✅                  |
| Admin grupo      | ❌            | ❌           | ❌                   | ✅                  |

---

## Flujos de Datos Críticos

### FL-01: Nuevo Match (logueado)

```
1. Usuario toca "Nuevo Match" en Home (P01)
   │
   ▼
2. Navega a Setup Match (P06)
   ├── Load jugadores del grupo/personal
   └── Load decks disponibles (filtrar in_progress)
   │
   ▼
3. Validación al iniciar (BR-MATCH-03):
   ├── N jugadores ∈ [2,4]
   ├── No decks repetidos
   └── Cada jugador con deck asignado
   │
   ▼
4. POST /matches → crea Match(in_progress) + N Participations(life=40)
   │
   ▼
5. Navega a Match Tracker (P07) — estado local
   ├── life_total, poison_counters, commander_damage: React state
   └── Cada cambio → debounce → POST /match-events (persist)
   │
   ▼
6. Usuario cierra match → Sheet Cierre (P08)
   ├── Selecciona ganador + win condition (o draw / abandon)
   └── PATCH /matches/:id → status=completed + crea MatchResult
   │
   ▼
7. Navega a Resultados (P09)
```

### FL-02: Undo en Tracker

```
1. Usuario toca "Undo" en P07
   │
   ▼
2. Query: GET last MatchEvent WHERE is_undone = false AND match_id = X
   │
   ▼
3. PATCH /match-events/:id → is_undone = true
   │
   ▼
4. Participation: life_total (o poison / cmd_dmg) ← previous_value
   │
   ▼
5. UI actualiza estado local con previous_value
```

---

## Performance

### Estrategia de Caching (MVP)

| Recurso          | Estrategia             | Notas                                  |
| ---------------- | ---------------------- | -------------------------------------- |
| Stats            | Sin cache (on-demand)  | BR-STATS-09 — suficiente para MVP      |
| Match Tracker    | Estado local (React)   | Persiste MatchEvents async con debounce|
| Auth session     | Auth provider SDK      | Token refresh automático               |
| Historial/CRUD   | Sin cache — fetch fresco | Pull on navigate                      |

### Métricas Target (mobile)

| Métrica                | Target   | Herramienta         |
| ---------------------- | -------- | ------------------- |
| App launch (cold)      | < 3s     | Expo Performance    |
| Match Setup navigation | < 500ms  | React Navigation    |
| Stats load             | < 2s     | Neon query timing   |
| Tracker tap response   | < 50ms   | Local state update  |
| Neon cold start        | < 500ms  | Neon dashboard      |

---

## Seguridad

### Capas de Protección

| Capa         | Implementación              | Qué protege                          |
| ------------ | --------------------------- | ------------------------------------ |
| Auth         | Clerk + Expo middleware     | Acceso a recursos cloud; JWT valida RLS |
| API          | Validación de input (Zod)   | Input malicioso                      |
| DB           | RLS (Row Level Security)    | Aislamiento de datos por grupo/user  |
| Network      | HTTPS obligatorio           | Transport layer                      |
| IAP          | Receipt validation server-side | Premium status verificado en backend |

### Consideraciones de Seguridad Críticas

1. **RLS en Neon:** Cada entidad scoped por `group_id` o `user_id` debe tener Row Level Security activo. Un user no debe poder acceder a datos de otro grupo.
2. **DB credentials:** No exponer `DATABASE_URL` en el cliente RN — debe pasar por una capa de API (ver ADR-004 pendiente).
3. **IAP validation:** La verificación de compras Premium debe hacerse server-side, nunca solo en el cliente.

---

## Open Questions

| #     | Pregunta                                                                              | Impacto     | Owner    |
| ----- | ------------------------------------------------------------------------------------- | ----------- | -------- |
| ~~OQ-01~~ | ~~Auth provider~~ — **Resuelto:** Clerk (ADR-003 ✅)                              | —           | —        |
| ~~OQ-02~~ | ~~Backend pattern~~ — **Resuelto:** Expo API Routes + Hono (ADR-004 ✅)           | —           | —        |
| OQ-03 | ¿NativeWind o StyleSheet nativo para el Design System "The Mystic Archive"?            | Med         | Dev      |
| OQ-04 | ¿Se usa Expo Router o React Navigation para la estructura de navegación?               | Med         | Dev      |
| OQ-05 | ¿Cuál Ad Network se elige para el Free tier? (AdMob / Unity Ads)                      | Low         | Cliente  |

---

## Assumptions

| #    | Supuesto                                                                              | Si es incorrecto                               |
| ---- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| A-01 | Expo es el toolchain de React Native (no bare RN). Simplifica build, OTA, y distribución. | Cambiar si se requiere código nativo no soportado por Expo. |
| A-02 | Drizzle ORM es la elección para Neon (type safety, migraciones). Pendiente confirmación. | Alternativa: Prisma (más verbose) o raw SQL.  |
| A-03 | La app no requiere sincronización en tiempo real en MVP — un solo dispositivo por partida. | Si se agrega multi-device, rediseñar ADR-008. |
| A-04 | Row Level Security en Neon es la estrategia de aislamiento de datos por grupo.         | Si RLS no es viable, implementar filtros en API layer. |

---

_Generado por TimeKast Factory — /docs_
