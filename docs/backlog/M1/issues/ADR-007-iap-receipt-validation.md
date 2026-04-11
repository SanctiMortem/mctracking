# ADR-007: IAP Receipt Validation — Endpoint Separado o en PATCH /settings?

> **Issue ID:** ADR-007
> **Priority:** P1
> **Effort:** XS
> **Story Points:** 1
> **Status:** 📋 Backlog
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/api`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Decidir si la validación del receipt IAP (compra del tier Premium para eliminar anuncios) se hace como parte del `PATCH /settings` existente o requiere un endpoint dedicado `POST /purchases/verify`.

**Open Question original:** OQ-01 en 08_API_CONTRACTS.md — "¿La validación de receipt IAP (Premium) se hace en `/settings PATCH` o en un endpoint `/purchases/verify` separado?"

---

## 📎 Doc References

| Doc | Sección | Link |
|-----|---------|------|
| API_CONTRACTS | PATCH /settings — nota sobre premium | [08_API_CONTRACTS.md#settings](../../planning/08_API_CONTRACTS.md) |
| DISCOVERY | §3 Monetización | [00_DISCOVERY_BRIEF.md](../../planning/00_DISCOVERY_BRIEF.md) |

---

## ✅ Opciones

### Opción A — Endpoint separado `POST /purchases/verify` (recomendada)

```typescript
// POST /api/purchases/verify
// Input: { receipt: string; product_id: 'premium_one_time' }
// Side Effects: Si receipt válido → UserSettings.premium = true
// Output: { success: true, data: { premium: boolean } }
```

**Pros:**
- Separación de responsabilidades — settings no mezcla compras con preferencias del usuario
- Más fácil de auditar y agregar lógica de validación específica de IAP (App Store + Play Store tienen receipts distintos)
- El `PATCH /settings` explícitamente rechaza `premium: true` del cliente (no se puede "hackear" el premium via settings)

**Contras:**
- Un endpoint más que crear

### Opción B — Validar en `PATCH /settings` con receipt adjunto

```typescript
// PATCH /settings
// { premium_receipt: string; ... }
```

**Pros:** Un único endpoint para settings.
**Contras:** Mezcla compras con settings. Complica la validación.

---

## 🎯 Recomendación

**Opción A** — `POST /purchases/verify` separado.

Razón: La lógica de validación de receipts (App Store StoreKit 2 + Google Play Billing) es compleja y específica. Mezclarla con `PATCH /settings` crea un endpoint con dos responsabilidades muy distintas. El `PATCH /settings` ya tiene la nota explícita en 08_API_CONTRACTS.md: "El campo `premium` solo debe actualizarse a `true` tras validación de receipt IAP server-side."

**Nota:** `expo-iap` o `react-native-iap` maneja el purchase flow en el cliente; el endpoint solo valida el receipt server-side.

---

## ✅ Criterios de Aceptación

- [ ] Decisión documentada en esta ADR
- [ ] PLAT-012 (IAP Premium) implementa `POST /purchases/verify`
- [ ] PLAT-007 (Settings API) deja `premium` como read-only en `PATCH /settings`

## 🧪 Tests Requeridos

- [ ] Ninguno adicional — informa la implementación en PLAT-012

---

## SK Leverage

No aplica.

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
