# DATA-009: UI — SCR-013 Deck Detail (stub)

> **Issue ID:** DATA-009
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

Implementar el stub de SCR-013 (Deck Detail): pantalla accesible desde SCR-004 (tap en deck) que muestra el nombre del deck, commander(s) con sus chips de color, descripción, y placeholders para stats. Stats reales en EPIC-04.

## User Story

> Como **P-002** (usuario autenticado), quiero **ver el detalle de un deck** para **revisar su commander y eventualmente sus estadísticas de win rate**.

**Implementa:** US-024 (parcial — stats en EPIC-04)

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-013 Detalle Deck | [15_DESIGN.md#scr-013](../../planning/15_DESIGN.md) |
| USER_STORIES | US-024 | [04_USER_STORIES.md#us-024](../../planning/04_USER_STORIES.md) |
| DATA_MODEL | E-002 Deck | [06_DATA_MODEL.md#e-002](../../planning/06_DATA_MODEL.md) |

---

## ✅ Criterios de Aceptación

- [ ] Pantalla accesible desde tap en deck en SCR-004
- [ ] Nombre del deck en header, chips de colores del commander visible
- [ ] Commander(s) mostrado(s) con nombre y chips de color; si partner, ambos commanders visibles
- [ ] Descripción del deck (si existe)
- [ ] Sección "Stats" con placeholders
- [ ] Botón editar deck

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Ver detalle de deck normal
  Dado que el deck "Superfriends" tiene commander "Atraxa"
  Cuando toco el deck en SCR-004
  Entonces veo SCR-013 con "Superfriends" en header, "Atraxa" con chips W/U/B/G

Escenario: Ver detalle de deck partner
  Dado que el deck "Double Trouble" tiene commanders "Thrasios" y "Tymna"
  Cuando toco el deck
  Entonces veo ambos commanders listados en SCR-013
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/decks/[id].tsx` — SCR-013 screen

**Dependencias de Issues:**
- Bloqueado por: DATA-007 (Decks UI)

## ⚠️ Edge Cases

- Si el deck tiene partner commanders, mostrar ambos con separador visual claro

## 🧪 Tests Requeridos

- [ ] Unit: `SCR-013` renderiza nombre, commander, y placeholder stats

## 🚫 Out of Scope

- Stats del deck → EPIC-04

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
