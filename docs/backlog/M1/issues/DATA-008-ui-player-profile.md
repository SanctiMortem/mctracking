# DATA-008: UI — SCR-012 Player Profile (stub)

> **Issue ID:** DATA-008
> **Priority:** P2
> **Effort:** S
> **Story Points:** 2
> **Status:** ✅ Done
> **Epic:** [EPIC-01-DATA-FOUNDATION](../epics/EPIC-01-DATA-FOUNDATION.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar el stub de SCR-012 (Player Profile): pantalla accesible desde SCR-003 (tap en jugador) que muestra el nombre del jugador, fecha de creación, y placeholders para las stats que se rellenarán en EPIC-04. En este epic solo se construye la estructura de la pantalla — los datos de stats son "Próximamente" o ceros.

## User Story

> Como **P-002** (usuario autenticado), quiero **ver el perfil de un jugador** para **acceder a su información básica y eventualmente sus estadísticas**.

**Implementa:** US-022 (parcial — stats en EPIC-04)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-012 Perfil Jugador | [15_DESIGN.md#scr-012](../../planning/15_DESIGN.md) |
| USER_STORIES | US-022, US-023 | [04_USER_STORIES.md#us-022](../../planning/04_USER_STORIES.md) |
| DATA_MODEL | E-009 Player | [06_DATA_MODEL.md#e-009](../../planning/06_DATA_MODEL.md) |

---

## ✅ Criterios de Aceptación

- [ ] Pantalla accesible desde tap en jugador en SCR-003
- [ ] Muestra nombre del jugador en header
- [ ] Muestra fecha de creación del jugador
- [ ] Sección "Stats" con placeholders (win rate, partidas, racha) mostrando `—` o `0`
- [ ] Botón editar nombre (inline o bottom sheet)
- [ ] Back navigation al presionar atrás

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Ver perfil desde lista de jugadores
  Dado que estoy en SCR-003
  Cuando toco en el jugador "Carlos"
  Entonces navego a SCR-012 con "Carlos" en el header
  Y veo la fecha en que Carlos fue creado

Escenario: Stats placeholder visible
  Dado que Carlos no tiene matches completados aún
  Cuando estoy en su perfil (SCR-012)
  Entonces la sección Stats muestra "—" o "0" en win rate, partidas, etc.
  Y un texto "Las stats aparecerán cuando Carlos juegue su primera partida"
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `app/players/[id].tsx` — SCR-012 screen

**Dependencias de Issues:**
- Bloqueado por: DATA-006 (Players UI)
- Stats en este screen → EPIC-04

## ⚠️ Edge Cases

- Si el jugador fue soft-deleted pero se accede por URL directa → mostrar pantalla de "Jugador no disponible"

## 🧪 Tests Requeridos

- [ ] Unit: `SCR-012` renderiza nombre del jugador correctamente
- [ ] Unit: Muestra placeholder cuando no hay stats

## 🚫 Out of Scope

- Stats reales → EPIC-04
- Historial de matches del jugador → EPIC-04

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
