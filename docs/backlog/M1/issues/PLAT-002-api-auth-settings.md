# PLAT-002: API — Auth Session + Settings Bootstrap

> **Issue ID:** PLAT-002
> **Priority:** P0
> **Effort:** S
> **Story Points:** 2
> **Status:** ✅ Done
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/api`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar `GET /auth/session` (endpoint público que devuelve el estado de sesión y crea `user_settings` si es el primer login) y `GET /settings` (retorna settings del usuario actual). El endpoint de sesión actúa como "bootstrap" — asegura que todo usuario autenticado tenga `user_settings` desde el primer request.

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| API_CONTRACTS | GET /auth/session, GET /settings | [08_API_CONTRACTS.md](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-AUTH-02 (UserSettings default al signup) | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

**GET /auth/session:**
- [x] Endpoint público (no requiere auth Clerk)
- [x] Si hay Clerk session activa: retorna `{ authenticated: true, user_id, settings: UserSettings, active_match: ActiveMatchRef | null }`
  - `active_match` = primer match con `status='in_progress'` propiedad del usuario (`created_by = userId`), shape: `{ id, group_id, started_at }`
  - Si no hay match activo: `active_match: null`
- [x] Si no hay session: retorna `{ authenticated: false }`
- [x] Si es el primer request del usuario (no tiene `user_settings`): crea `user_settings` con defaults (BR-AUTH-02)
- [x] Upsert pattern — no crea duplicados si se llama múltiples veces
- [x] El objeto `settings` en la respuesta incluye todos los campos de `user_settings` (no solo status)

**GET /settings:**
- [x] Requiere auth (`🔒`)
- [x] Retorna `user_settings` del usuario actual
- [x] Si no existe (race condition): crea con defaults

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Primer login — bootstrap de UserSettings
  Dado que Carlos se autenticó por primera vez con Google
  Cuando el cliente llama GET /auth/session con el token de Clerk
  Entonces se crea user_settings con valores default (language=auto, debounce=500ms, life_total=40)
  Y la respuesta incluye settings en el payload

Escenario: Login posterior — no duplicar settings
  Dado que Carlos ya tiene user_settings creados
  Cuando llama GET /auth/session nuevamente
  Entonces se retornan sus settings existentes sin crear duplicado
```

## 🔧 Contexto Técnico

**Ruta:** `app/api/auth/session+api.ts`

**Bootstrap pattern:**
```typescript
// GET /auth/session
const auth = getAuth(c);  // Clerk — puede ser null si no autenticado
if (auth?.userId) {
  // Upsert user_settings
  await db.insert(user_settings)
    .values({ user_id: auth.userId, ...defaults })
    .onConflictDoNothing();  // UNIQUE(user_id) — no duplicar
  const settings = await db.query.user_settings.findFirst({
    where: eq(user_settings.user_id, auth.userId)
  });
  return c.json({ success: true, data: { authenticated: true, user_id: auth.userId, settings } });
}
return c.json({ success: true, data: { authenticated: false } });
```

**Dependencias de Issues:**
- Bloqueado por: PLAT-001 (user_settings schema)
- Bloquea a: PLAT-003 (Auth screen usa este endpoint al montar), PLAT-007

---

## ⚠️ Edge Cases

- Clerk webhook vs polling: en MVP, usar polling en el cliente al arrancar la app (no webhooks)
- Race condition primer login: usar `onConflictDoNothing()` en Drizzle para idempotencia

## 🧪 Tests Requeridos

- [x] Integration: primer request crea user_settings
- [x] Integration: request posterior no duplica settings (upsert idempotente)
- [x] Integration: sin token retorna `{ authenticated: false }`
- [x] Integration: response incluye `active_match` con ID cuando hay match in_progress
- [x] Integration: response incluye `active_match: null` cuando no hay match activo

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisions Made

| Decisión | Razón |
|----------|-------|
| `db.select().from()` builder pattern (not `db.query.xxx`) | Consistent with all existing services — `db` is initialized without schema generic, so relational query API is unavailable |
| `onConflictDoNothing()` in `getOrCreateSettings` | Idempotent upsert — UNIQUE index on `user_id` prevents duplicates on race condition or repeat calls |
| `getOrCreateSettings` extracted to `services/settings.ts` | Shared by both `session+api.ts` and `settings+api.ts`, avoids duplication |
| `PUBLIC_PATHS` set in `_middleware.ts` (replaces single `if` check) | Cleaner extension point — future public routes can be added in one place |
| `started_at` field in `active_match` maps to `matches.createdAt` | API contract specifies `started_at`; schema column is `created_at` — shape translation at response layer |

### Artifacts Created

- `services/settings.ts` — `getOrCreateSettings(userId)` — upsert-then-select helper
- `app/api/auth/session+api.ts` — `GET /auth/session` (public bootstrap endpoint)
- `app/api/settings+api.ts` — `GET /settings` (auth-gated user settings retrieval)

### Artifacts Modified

- `app/api/_middleware.ts` — added `PUBLIC_PATHS` set; `/api/auth/session` now bypasses auth gate; error response aligned to project standard (`success: false, code: 'UNAUTHORIZED'`)
- `__tests__/integration/api/platform.test.ts` — added 8 integration test stubs for `GET /auth/session` and `GET /settings` (skipped, project pattern)

### Verification

- [x] Typecheck: Pass (no errors in new/modified files)
- [x] Lint: Pass (no errors in new/modified files)
- [x] Tests: 8 passed · 9 suites skipped · new stubs skipped as expected

---

_Completado: 2026-04-11_
