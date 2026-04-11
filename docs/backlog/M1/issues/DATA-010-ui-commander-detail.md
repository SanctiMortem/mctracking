# DATA-010: UI — SCR-014 Commander Detail (stub)

> **Issue ID:** DATA-010
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

Implementar el stub de SCR-014 (Commander Detail): pantalla accesible desde SCR-016 (tap en commander) que muestra el nombre, chips de color, badge "Partner", y placeholders para stats. Stats reales en EPIC-04.

## User Story

> Como **P-002** (usuario autenticado), quiero **ver el detalle de un commander** para **revisar su información y eventualmente su win rate**.

**Implementa:** US-025 (parcial — stats en EPIC-04)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-014 Detalle Commander | [15_DESIGN.md#scr-014](../../planning/15_DESIGN.md) |
| USER_STORIES | US-025 | [04_USER_STORIES.md#us-025](../../planning/04_USER_STORIES.md) |
| DATA_MODEL | E-001 Commander | [06_DATA_MODEL.md#e-001](../../planning/06_DATA_MODEL.md) |

---

## ✅ Criterios de Aceptación

- [ ] Accesible desde tap en commander en SCR-016
- [ ] Nombre y chips de color WUBRG visibles
- [ ] Badge "Partner" si `is_partner = true`
- [ ] Sección "Stats" con placeholders
- [ ] Sección "Decks que usan este commander" (lista vacía si no hay)
- [ ] Botón editar commander

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Ver commander con badge Partner
  Dado que "Thrasios" tiene is_partner=true
  Cuando navego a SCR-014 de Thrasios
  Entonces veo el badge "Partner" junto a su nombre
  Y sus chips de colores

Escenario: Ver placeholder stats sin partidas
  Dado que el commander no tiene matches completados
  Cuando estoy en SCR-014
  Entonces veo win rate "—" y "0 partidas jugadas"
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/commanders/[id].tsx` — SCR-014

**Dependencias de Issues:**
- Bloqueado por: DATA-005 (Commanders UI)

## ⚠️ Edge Cases

- Commander sin colores (colorless): chips mostrará solo el chip `C`

## 🧪 Tests Requeridos

- [ ] Unit: `SCR-014` renderiza badge Partner cuando `is_partner=true`

## 🚫 Out of Scope

- Stats del commander → EPIC-04

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
