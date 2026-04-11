# ADR-006: Guest→User Upgrade Mid-Match

> **Issue ID:** ADR-006
> **Priority:** P2
> **Effort:** XS
> **Story Points:** 1
> **Status:** ✅ Done
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/api`, `domains/ui`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Decidir si el upgrade de Guest a User autenticado durante una partida activa debe preservar el estado del tracker (life totals, eventos) o simplemente cerrar la sesión guest y empezar desde cero.

**Scope Note en 15_DESIGN.md:** "Upgrade Guest→User mid-match diferido a v1.1 (OQ-02 en 03_USER_PERSONAS). En MVP, Auth gate es solo al inicio."

---

## 📎 Doc References

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-001 Auth Scope Note | [15_DESIGN.md#scr-001](../../planning/15_DESIGN.md) |
| DISCOVERY | F45 Modo Guest | [00_DISCOVERY_BRIEF.md](../../planning/00_DISCOVERY_BRIEF.md) |

---

## ✅ Opciones

### Opción A — Diferir a v1.1 (recomendada)

En MVP, el upgrade Guest→User no ocurre durante una partida. El flujo de Auth (SCR-001) solo se muestra al iniciar la app sin sesión. Un guest que quiera loguearse debe primero cerrar/abandonar el tracker guest.

**Pros:** 
- Cero complejidad de migración de estado en MVP
- Ya documentado como decisión en 15_DESIGN.md (SCR-001 Scope Note)
- El SCR-019 (Guest Tracker) no tiene persistencia cloud — nada que migrar

**Contras:** 
- El usuario pierde los datos del tracker guest al loguearse

### Opción B — Upgrade con preservación del estado en MVP

Implementar la migración de estado del Guest Tracker a un Match persistido en la nube al hacer login.

**Pros:** Mejor UX para el usuario que empieza como guest y decide loguearse.
**Contras:** Muy alta complejidad técnica para MVP. El Guest Tracker es in-memory sin schema de MatchEvents.

---

## 🎯 Recomendación

**Opción A** — Diferir a v1.1. Ya decidido implícitamente en los docs de diseño.

**Acción para PLAT-003 y PLAT-004:** En SCR-019 (Guest Tracker), mostrar un toast/banner "Inicia sesión para guardar el historial" — pero sin acción de upgrade desde ahí.

---

## ✅ Criterios de Aceptación

- [x] Decisión documentada — Guest→User mid-match es Out of Scope para MVP
- [ ] PLAT-003 (Auth screen) solo se muestra al iniciar la app sin sesión
- [ ] PLAT-004 (Guest Tracker) incluye banner de invitación a crear cuenta, sin upgrade en caliente

## 🧪 Tests Requeridos

- [ ] Ninguno adicional

---

## SK Leverage

No aplica.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-11 | **Opción A — Diferido a v1.1. Out of Scope MVP.** | La migración Guest→User mid-match requiere serializar estado in-memory + POST match retroactivo al cloud — complejidad alta desproporcionada para MVP. El SCR-019 (Guest Tracker) es completamente in-memory sin schema de MatchEvents: literalmente no hay nada que migrar sin un diseño dedicado. La decisión ya estaba capturada en 15_DESIGN.md (SCR-001 Scope Note + OQ-004 → D-01). El flujo MVP es: Auth gate solo al iniciar la app sin sesión. Si el guest quiere loguearse, abandona el tracker primero. |

### Implicaciones para issues dependientes

- **PLAT-003 (SCR-001 Auth Screen)** — Solo se muestra al iniciar la app sin sesión activa. No hay punto de entrada desde el tracker activo.
- **PLAT-004 (SCR-019 Guest Tracker)** — Incluir banner informativo "Inicia sesión para guardar tu historial" (no accionable como upgrade en caliente). Solo informativo.
- **v1.1 Backlog** — Crear issue separado: "Guest→User upgrade mid-match: serializar local state + retroactivo POST match + migración de MatchEvents" (referencia: D-01 en 15_DESIGN.md).

### Sin cambios en 15_DESIGN.md

OQ-004 ya estaba marcada como "🔴 Diferido a v1.1 (D-01)". Actualizada para referenciar ADR-006.

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-11_
