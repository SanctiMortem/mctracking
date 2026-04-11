# SETUP-009: 🧪 Epic Tests — SETUP

> **Issue ID:** SETUP-009
> **Priority:** P2
> **Effort:** S
> **Story Points:** 2
> **Status:** ✅ Done
> **Epic:** [EPIC-SETUP](../epics/EPIC-SETUP.md)
> **Skills:** `domains/api`
> **Agents:** `test-engineer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Completar la cobertura de tests para el EPIC-SETUP: verificar que la conexión a Neon funciona, que el sistema de variables de entorno valida correctamente, y que la inicialización de i18n es robusta. Ejecutar audit R3 del epic como cierre formal antes de comenzar EPIC-01.

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| EPIC | SETUP | [EPIC-SETUP.md](../epics/EPIC-SETUP.md) |

---

## ✅ Criterios de Aceptación

### Unit Tests

- [ ] `constants/env.ts` lanza error cuando falta variable requerida (mock `process.env`)
- [ ] `constants/i18n.ts` inicializa con fallback `'en'` cuando `languageCode` es `null`
- [ ] i18n: terminología MTG tiene mismo valor en EN y ES (snapshot test de keys críticas)

### Integration Tests

- [ ] `GET /api/health` retorna `{ ok: true, db: "connected" }` con Neon real
- [ ] API Route sin token Clerk retorna `401 Unauthorized`

### Audit R3

- [ ] Ejecutar `/audit R3` con scope EPIC-SETUP
- [ ] Hallazgos críticos resueltos (0 unresolved)

---

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Flujo completo del setup (smoke test)
  Dado que todos los issues de EPIC-SETUP están implementados
  Cuando ejecuto `npx expo start --no-dev`
  Entonces la app arranca sin errores
  Y `GET /api/health` retorna 200

Escenario: Variables de entorno inválidas detectadas temprano
  Dado que `DATABASE_URL` está ausente en `.env.local`
  Cuando cualquier API Route intenta importar `constants/env.ts`
  Entonces se lanza error "Missing required env var: DATABASE_URL" antes de ejecutar lógica
```

## 🔧 Contexto Técnico

**Tests a crear:**
- `__tests__/unit/env.test.ts` — Variables de entorno
- `__tests__/unit/i18n.test.ts` — i18n initialization
- `__tests__/integration/health.test.ts` — DB health check

**Comando de verificación:**
```bash
pnpm test -- --grep "SETUP"
```

**Dependencias de Issues:**
- Bloqueado por: SETUP-001 a SETUP-008
- Bloquea a: Cierre de EPIC-SETUP

## ⚠️ Edge Cases

- Tests de integration necesitan `DATABASE_URL` en el entorno de test — usar `.env.test` con Neon branching

## 🧪 Tests Requeridos

- [ ] Unit: env validation
- [ ] Unit: i18n fallback
- [ ] Integration: health endpoint

## 🚫 Out of Scope

- Tests de features (EPIC-01+)
- E2E tests de navegación (EPIC-04 en adelante)

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Tests Creados

| Fecha | Test File | Tipo | Coverage |
|-------|-----------|------|----------|
| — | — | — | — |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
