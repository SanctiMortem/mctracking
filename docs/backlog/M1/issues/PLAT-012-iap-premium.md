# PLAT-012: Monetización — IAP One-Time Premium

> **Issue ID:** PLAT-012
> **Priority:** P2
> **Effort:** L
> **Story Points:** 8
> **Status:** 📋 Backlog
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/api`, `domains/ui`
> **Agents:** `mobile-developer`, `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar la compra única de Premium (eliminar anuncios): flujo IAP en el cliente via `expo-iap` o `react-native-iap`, receipt validation server-side en `POST /purchases/verify` (ADR-007), y actualización de `user_settings.premium = true`.

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DISCOVERY | §3 Monetización | [00_DISCOVERY_BRIEF.md](../../planning/00_DISCOVERY_BRIEF.md) |
| BUSINESS_RULES | BR-AUTH-04 (premium gate) | [05_BUSINESS_RULES.md](../../planning/05_BUSINESS_RULES.md) |
| ADR | ADR-007 (endpoint separado para receipt) | [ADR-007-iap-receipt-validation.md](./ADR-007-iap-receipt-validation.md) |

---

## ✅ Criterios de Aceptación

**Cliente:**
- [ ] CTA "Eliminar anuncios" en SCR-018 (Settings) — tap inicia el IAP flow
- [ ] Integración con App Store (StoreKit 2, iOS) y Google Play Billing (Android)
- [ ] Product ID: `com.mtgtracker.premium` (o el definido en App Store Connect / Play Console)
- [ ] Al completar la compra: enviar receipt a `POST /purchases/verify`
- [ ] Restore purchases: botón "Restaurar compras" en Settings — para usuarios que reinstalan la app

**API — `POST /purchases/verify`:**
- [ ] Valida receipt con App Store o Google Play API server-side
- [ ] Si válido: `UPDATE user_settings SET premium = true WHERE user_id = :id`
- [ ] Retorna `{ success: true, data: { premium: true } }`
- [ ] Si inválido/expirado receipt: 400 `PURCHASE_RECEIPT_INVALID`
- [ ] Idempotente: si ya es premium, retornar 200 sin error

**Post-compra:**
- [ ] Los ads desaparecen inmediatamente sin reinicio de app (leer `premium` del estado local)

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Compra exitosa
  Dado que premium=false y toco "Eliminar anuncios" en Settings
  Cuando completo la compra en App Store
  Entonces el cliente recibe el receipt y llama POST /purchases/verify
  Y premium se actualiza a true en user_settings
  Y los ads desaparecen inmediatamente

Escenario: Restaurar compras
  Dado que reinstalé la app pero ya compré Premium previamente
  Cuando toco "Restaurar compras"
  Entonces StoreKit/Play Billing devuelve el receipt de la compra anterior
  Y se llama POST /purchases/verify y premium se restaura

Escenario: Receipt inválido
  Dado que el receipt es malformado o de un producto diferente
  Cuando llamo POST /purchases/verify
  Entonces recibo 400 PURCHASE_RECEIPT_INVALID
  Y premium permanece false
```

## 🔧 Contexto Técnico

**Librería:** `expo-iap` (fork activo de react-native-iap para Expo)

**Ruta API:** `app/api/purchases/verify+api.ts`

**Receipt validation:**
```typescript
// iOS (StoreKit 2): validar via App Store Server API
// POST https://api.storekit.itunes.apple.com/inApps/v2/...

// Android: validar via Google Play Developer API
// GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/...
```

**App Store Connect config:**
- Crear producto "Non-Consumable" con Product ID `com.mtgtracker.premium`
- Precio: definir en App Store Connect (≈$2.99 USD sugerido)

**Dependencias de Issues:**
- Bloqueado por: PLAT-007 (settings), ADR-007 (endpoint separado), PLAT-011 (ads a eliminar)
- Bloquea a: —

---

## ⚠️ Edge Cases

- Refund en App Store/Google Play: el usuario puede solicitar refund — no reversible en MVP (premium permanece true a menos de implementar webhook)
- Familia compartida (iOS Family Sharing): en MVP, no soportado — la compra es per-account
- Receipt validation secrets (App Store shared secret): almacenar en variable de entorno, nunca en cliente

## 🧪 Tests Requeridos

- [ ] Integration: POST /purchases/verify con receipt válido → premium=true en DB
- [ ] Integration: POST /purchases/verify con receipt inválido → 400
- [ ] Integration: llamada idempotente (ya premium) → 200 sin error

## 🚫 Out of Scope

- Suscripción mensual/anual → Fase 2
- Premium con features adicionales más allá de quitar ads → no en MVP

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
