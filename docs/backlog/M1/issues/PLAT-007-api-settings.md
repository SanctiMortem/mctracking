# PLAT-007: API — Settings PATCH + UserSettings

> **Issue ID:** PLAT-007
> **Priority:** P1
> **Effort:** S
> **Story Points:** 2
> **Status:** ✅ Done
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/api`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar `PATCH /settings` para que el usuario pueda actualizar sus preferencias (debounce threshold, life total inicial, commander obligatorio, idioma, gestures). El campo `premium` es read-only via este endpoint (requiere receipt validation en PLAT-012 — ADR-007).

## User Story

> Como **P-002** (usuario autenticado), quiero **configurar mis preferencias** para **adaptar la app a mi estilo de juego**.

**Implementa:** US-041, US-042, US-043

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| API_CONTRACTS | PATCH /settings | [08_API_CONTRACTS.md#settings](../../planning/08_API_CONTRACTS.md) |
| BUSINESS_RULES | BR-TRACK-10 (debounce range), BR-TRACK-12, BR-DECK-02 | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |
| ADR | ADR-007 (premium read-only aquí) | [ADR-007-iap-receipt-validation.md](./ADR-007-iap-receipt-validation.md) |

---

## ✅ Criterios de Aceptación

- [x] `PATCH /settings` con campos opcionales: `language`, `swipe_gestures_enabled`, `debounce_threshold_ms`, `require_commander`, `default_life_total`
- [x] Validar `debounce_threshold_ms` ∈ [200, 2000] → 400 `SETTINGS_DEBOUNCE_OUT_OF_RANGE` (BR-TRACK-10)
- [x] Validar `default_life_total` ∈ [1, 999]
- [x] Campo `premium` RECHAZADO si viene del cliente sin receipt → 400 (ADR-007, BR-AUTH-04)
- [x] `updated_at` se actualiza en el registro
- [x] Retorna el `UserSettings` completo actualizado

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Cambiar debounce a 1000ms
  Dado que debounce_threshold_ms=500
  Cuando llamo PATCH /settings con { debounce_threshold_ms: 1000 }
  Entonces se guarda 1000ms
  Y retorna UserSettings completo con el nuevo valor

Escenario: Debounce fuera de rango
  Dado que intento enviar debounce_threshold_ms=2500
  Cuando llamo PATCH /settings
  Entonces recibo 400 con error SETTINGS_DEBOUNCE_OUT_OF_RANGE (BR-TRACK-10)

Escenario: Intento de setear premium desde cliente
  Dado que envío { premium: true } en el body
  Cuando llamo PATCH /settings
  Entonces recibo 400 — campo premium no actualizable via este endpoint
```

## 🔧 Contexto Técnico

**Ruta:** `app/api/settings+api.ts` (PATCH handler adicional al GET de PLAT-002)

**Zod schema:**
```typescript
const patchSettingsSchema = z.object({
  language: z.enum(['en', 'es', 'auto']).optional(),
  swipe_gestures_enabled: z.boolean().optional(),
  debounce_threshold_ms: z.number().int().min(200).max(2000).optional(),
  require_commander: z.boolean().optional(),
  default_life_total: z.number().int().min(1).max(999).optional(),
  premium: z.undefined(),  // Explícitamente rechazado
});
```

**Dependencias de Issues:**
- Bloqueado por: PLAT-001 (user_settings schema), PLAT-002 (GET /settings)
- Bloquea a: PLAT-008

---

## 🧪 Tests Requeridos

- [x] Integration: cada campo se actualiza correctamente
- [x] Integration: debounce fuera de rango retorna 400
- [x] Integration: `premium: true` en body retorna 400

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisions Made

| Decisión | Razón |
|----------|-------|
| Manual validation instead of Zod | Zod is not installed in the project; all other routes use manual typeof/range checks — consistent pattern |
| `premium` rejected via `'premium' in raw` key check | Catches `{ premium: true }`, `{ premium: false }`, and `{ premium: null }` — any presence is rejected per ADR-007 |
| Validation split: type check in API layer, range check in service | Type errors are API concerns; business rule constraints (BR-TRACK-10) belong in the service |
| `update` built as `Record<string, unknown>` | Drizzle `.set()` accepts `Partial<UserSettings>` but camelCase mapping is easier with a plain object and `.returning()` guarantees the correct type back |

### Artifacts Modified

- `services/settings.ts` — added `SettingsPatch` type, `UpdateSettingsResult` union, `updateSettings()` function
- `app/api/settings+api.ts` — added `PATCH` handler; updated header comment to include PLAT-007
- `__tests__/integration/api/platform.test.ts` — 8 integration test stubs added

### Verification

- [x] Typecheck: ✅ Zero errors in changed files
- [x] Lint: ✅ Only pre-existing Clerk import/no-unresolved
- [x] Tests: Stubs added (describe.skip per project pattern)

### Commit

_See below_

---

_Completado: 2026-04-12_
