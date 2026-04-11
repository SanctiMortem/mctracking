# DATA-007: UI — SCR-004 Decks (library + CRUD)

> **Issue ID:** DATA-007
> **Priority:** P1
> **Effort:** L
> **Story Points:** 8
> **Status:** ✅ Done
> **Epic:** [EPIC-01-DATA-FOUNDATION](../epics/EPIC-01-DATA-FOUNDATION.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar SCR-004 (Decks Library): lista de decks con filtro por commander, CRUD inline, y formulario de creación que incluye selector de commander (con búsqueda) y campo para el segundo commander si es partner. Esta pantalla es L (mayor complejidad que players) por el selector de commanders con búsqueda y la lógica de partner.

## User Story

> Como **P-002** (usuario autenticado), quiero **gestionar mi colección de decks con su commander asignado** para **trackear el win rate de cada deck y seleccionarlos en matches**.

**Implementa:** US-004, US-005, US-006, US-007

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-004 Decks | [15_DESIGN.md#scr-004](../../planning/15_DESIGN.md) |
| USER_STORIES | US-004, US-005, US-006, US-007 | [04_USER_STORIES.md#us-004](../../planning/04_USER_STORIES.md) |
| DATA_MODEL | E-002 Deck | [06_DATA_MODEL.md#e-002](../../planning/06_DATA_MODEL.md) |
| BUSINESS_RULES | BR-DECK-03, BR-DECK-07 | [05_BUSINESS_RULES.md#br-deck-03](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [ ] Lista de decks activos con nombre, chips de colores del commander y nombre del commander
- [ ] Filtro por commander (dropdown o selector rápido)
- [ ] Formulario crear deck: nombre (text), selector de commander (search + lista), descripción (opcional)
- [ ] Si el commander seleccionado tiene `is_partner = true` → aparece segundo selector de commander
- [ ] Tap en deck navega a SCR-013 (Deck Detail)
- [ ] Swipe-to-delete con confirmación; error si deck tiene match activo
- [ ] Estado vacío con CTA

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Crear deck con commander normal
  Dado que tengo commanders creados en SCR-016
  Cuando creo un deck "Superfriends" y selecciono "Atraxa" como commander
  Entonces el deck aparece en SCR-004 con los chips de color W/U/B/G

Escenario: Crear deck con commander partner
  Dado que el commander "Thrasios" tiene is_partner=true
  Cuando selecciono "Thrasios" como commander del deck
  Entonces aparece un segundo campo de commander
  Y debo seleccionar el segundo commander para poder guardar

Escenario: Filtrar decks por commander
  Dado que tengo decks de múltiples commanders
  Cuando selecciono el filtro "Atraxa"
  Entonces solo se muestran los decks con Atraxa como commander

Escenario: Error al eliminar deck con match activo
  Dado que el deck está siendo usado en una partida activa
  Cuando intento eliminarlo
  Entonces veo "No puedes eliminar un deck en una partida activa"
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `app/(tabs)/decks.tsx` — SCR-004 screen
- `components/decks/DeckList.tsx`
- `components/decks/DeckForm.tsx` — Con selector de commander
- `components/decks/CommanderSelector.tsx` — Búsqueda de commanders (reutilizable en Match Setup)
- `hooks/useDecks.ts`

**Componentes nuevos:**
- `CommanderSelector` — Reutilizable en SCR-004 y SCR-007 (Match Setup)

**Dependencias de Issues:**
- Bloqueado por: DATA-004 (Deck API)
- Bloquea a: DATA-009 (Deck Detail stub)

## ⚠️ Edge Cases

- `CommanderSelector` debe manejar el caso de 0 commanders (prompt al usuario para crear uno)
- Performance: si el usuario tiene 100+ decks, usar virtualized list

## 🧪 Tests Requeridos

- [ ] Unit: `DeckForm` muestra segundo commander selector cuando `is_partner=true`
- [ ] Integration: crear deck desde UI con commander partner

## 🚫 Out of Scope

- Stats del deck en SCR-004 → DATA-009 + EPIC-04
- Decklist / carta individual → Non-Goal NG-001

---

## SK Leverage

No aplica — funcionalidad nueva. `CommanderSelector` es componente nuevo reutilizable.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-10 | `CommanderSelector` como full-screen Modal en lugar de dropdown | Mejor UX para listas con search en móvil; el drop-down nativo no soporta búsqueda |
| 2026-04-10 | Filtro de commander como horizontal scroll chips en lugar de picker | Acceso rápido a los commanders más usados sin abrir otro modal |
| 2026-04-10 | Colores del deck = union de colores del commander1 + commander2 | Un deck partner tiene identidad cromática de ambos commanders — visualización más precisa |
| 2026-04-10 | `excludeId` en CommanderSelector previene selección del mismo commander para ambos slots | Edge case: Thrasios no puede ser su propio partner |
| 2026-04-10 | `useDecks` acepta `commanderFilter` opcional y lo pasa al API | El filtro server-side es más limpio que filtrar una lista potencialmente grande en cliente |

---

## Commits

- `327cdad` — feat(data): DATA-007 — SCR-004 Decks Library UI (tab screen)

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
