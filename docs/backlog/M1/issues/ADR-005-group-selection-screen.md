# ADR-005: ¿Pantalla de Selección de Grupo Obligatoria?

> **Issue ID:** ADR-005
> **Priority:** P1
> **Effort:** XS
> **Story Points:** 1
> **Status:** 📋 Backlog
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Decidir si la selección de grupo activo (cuando el usuario pertenece a múltiples grupos) debe ser una pantalla dedicada o un control embebido en Home/Header. Esta decisión afecta directamente la UX de navegación y el scope de PLAT-006 y PLAT-010.

**Relacionado con:** ADR-004 (define que el contexto activo es el grupo seleccionado)

---

## 📎 Doc References

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-017 Grupos | [15_DESIGN.md#scr-017](../../planning/15_DESIGN.md) |
| DISCOVERY | §2 — F46 múltiples grupos | [00_DISCOVERY_BRIEF.md](../../planning/00_DISCOVERY_BRIEF.md) |

---

## ✅ Opciones

### Opción A — Control embebido en Home (recomendada)

Un dropdown/chip en el header de Home (SCR-002) permite cambiar entre "Personal" y los grupos del usuario. No hay pantalla dedicada de selección. SCR-017 (Grupos) es solo para gestionar grupos (crear, invitar, ver miembros).

**Pros:** 
- Más fluido — cambio de contexto en 1 tap desde Home
- SCR-017 queda limpio como "gestión" de grupos, no como "selector"
- Consistente con cómo apps como Slack manejan workspaces

**Contras:**
- El dropdown puede saturar el header si hay muchos grupos

### Opción B — Pantalla dedicada de selección al login

Al iniciar sesión, si el usuario tiene grupos, aparece una pantalla "¿Con qué grupo vas a jugar hoy?" antes de llegar a Home.

**Pros:** Claro y explícito.
**Contras:** Fricción innecesaria. En MVP, muchos usuarios no tendrán grupos todavía.

---

## 🎯 Recomendación

**Opción A** — Control embebido en Home header.

Razón: Zero fricción. Los usuarios sin grupos ni lo ven. Los usuarios con grupos cambian contexto en 1 tap. Evita una pantalla que interrumpe el flujo al abrir la app.

---

## ✅ Criterios de Aceptación

- [ ] Decisión documentada en esta ADR
- [ ] PLAT-010 (Home) incluye el context switcher si Opción A
- [ ] PLAT-006 (SCR-017) es pantalla de gestión, no de selección

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
| — | — | — |

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
