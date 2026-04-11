# PLAT-007: API — Settings PATCH + UserSettings

> **Issue ID:** PLAT-007
> **Priority:** P1
> **Effort:** S
> **Story Points:** 2
> **Status:** 📋 Backlog
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

- [ ] `PATCH /settings` con campos opcionales: `language`, `swipe_gestures_enabled`, `debounce_threshold_ms`, `require_commander`, `default_life_total`
- [ ] Validar `debounce_threshold_ms` ∈ [200, 2000] → 400 `SETTINGS_DEBOUNCE_OUT_OF_RANGE` (BR-TRACK-10)
- [ ] Validar `default_life_total` ∈ [1, 999]
- [ ] Campo `premium` RECHAZADO si viene del cliente sin receipt → 400 (ADR-007, BR-AUTH-04)
- [ ] `updated_at` se actualiza en el registro
- [ ] Retorna el `UserSettings` completo actualizado

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

- [ ] Integration: cada campo se actualiza correctamente
- [ ] Integration: debounce fuera de rango retorna 400
- [ ] Integration: `premium: true` en body retorna 400

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| — | — | — |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
