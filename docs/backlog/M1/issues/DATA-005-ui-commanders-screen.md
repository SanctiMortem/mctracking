# DATA-005: UI — SCR-016 Commanders (list + CRUD)

> **Issue ID:** DATA-005
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-01-DATA-FOUNDATION](../epics/EPIC-01-DATA-FOUNDATION.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar SCR-016 (Commanders Archive): pantalla con lista de commanders del usuario, búsqueda inline, y formulario de crear/editar commander. El formulario incluye selector de colores WUBRG (chips interactivos) y toggle de partner. Esta pantalla es accesible desde SCR-004 (Decks) cuando se asigna un commander a un deck.

## User Story

> Como **P-002** (usuario autenticado), quiero **ver y gestionar mis commanders desde una pantalla dedicada** para **tener un catálogo de commanders listo para asignar a decks**.

**Implementa:** US-008, US-009

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-016 CRUD Commanders | [15_DESIGN.md#scr-016](../../planning/15_DESIGN.md) |
| USER_STORIES | US-008, US-009 | [04_USER_STORIES.md#us-008](../../planning/04_USER_STORIES.md) |
| DATA_MODEL | E-001 Commander | [06_DATA_MODEL.md#e-001](../../planning/06_DATA_MODEL.md) |
| BUSINESS_RULES | BR-ENTITY-01 | [05_BUSINESS_RULES.md#br-entity-01](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [ ] Lista de commanders con nombre, chips de colores y badge "Partner" si aplica
- [ ] Búsqueda en tiempo real por nombre
- [ ] Botón FAB o header para crear nuevo commander
- [ ] Formulario inline o bottom sheet: nombre (text input), colores (chips WUBRG, multi-select), toggle "Partner"
- [ ] Al guardar, llama a `POST /api/commanders` y actualiza la lista
- [ ] Swipe-to-delete o menú contextual invoca soft delete con confirmación
- [ ] Estado vacío: mensaje "Aún no tienes commanders. Crea el primero." con CTA
- [ ] Tokens de color "The Mystic Archive" aplicados en toda la pantalla

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Crear commander con colores WUBRG
  Dado que estoy en SCR-016
  Cuando toco "Nuevo Commander", ingreso nombre "Atraxa" y selecciono chips W, U, B, G
  Y toco "Guardar"
  Entonces el commander aparece en la lista con los 4 chips de color
  Y puedo asignarlo a un deck en SCR-004

Escenario: Toggle Partner
  Dado que estoy creando un commander
  Cuando activo el toggle "Partner"
  Entonces la UI muestra que este commander requiere un segundo commander en el deck

Escenario: Estado vacío
  Dado que el usuario no tiene commanders aún
  Cuando navego a SCR-016
  Entonces veo "Aún no tienes commanders" con un botón para crear el primero

Escenario: Búsqueda filtra la lista
  Dado que tengo 10 commanders
  Cuando escribo "Atra" en el buscador
  Entonces la lista se filtra mostrando solo commanders que contienen "Atra"
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `app/commanders/index.tsx` — SCR-016 screen
- `components/commanders/CommanderList.tsx` — Lista con búsqueda
- `components/commanders/CommanderForm.tsx` — Formulario crear/editar
- `components/ui/ColorChips.tsx` — Chips WUBRG multi-select (reutilizable)
- `hooks/useCommanders.ts` — Fetch + mutations desde `/api/commanders`

**Componentes nuevos:**
- `CMP-ColorChips` — Chips de colores MTG multi-select (W/U/B/R/G/C)

**Dependencias de Issues:**
- Bloqueado por: DATA-002 (Commander API)
- Bloquea a: DATA-010 (Commander Detail stub)

## ⚠️ Edge Cases

- Si el usuario tiene 50+ commanders, la lista necesita `FlatList` con `keyExtractor` para performance
- Los chips de color deben ser accesibles (tamaño mínimo de 44x44pt para touch)

## 🧪 Tests Requeridos

- [ ] Unit: `ColorChips` toggle selecciona/deselecciona colores
- [ ] Integration: crear commander desde UI aparece en lista
- [ ] E2E: happy path crear commander en simulador

## 🚫 Out of Scope

- Stats del commander → DATA-010 + EPIC-04
- Importación desde Scryfall → Fase 3

---

## SK Leverage

No aplica — funcionalidad nueva. Componentes del design system "The Mystic Archive".

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-10 | `Modal` nativo en lugar de `@gorhom/bottom-sheet` para el formulario | No hay bottom sheet lib instalada; Modal cubre el AC sin dependencia extra |
| 2026-04-10 | Delete con `Alert.confirm` (menú contextual) en lugar de swipe | Gesture Handler instalado pero swipeable requiere setup extra — AC cumplido con menú de confirmación |
| 2026-04-10 | `services/api.ts` con `apiFetch` + base URL via `expo-constants.hostUri` | Necesario para que el cliente RN alcance los API routes de Expo Router en dev |
| 2026-04-10 | Búsqueda client-side sobre la lista cargada | Lista pequeña en MVP; evita round-trip al servidor por cada keystroke |

---

## Commits

- `90fe92e` — feat(data): DATA-005 — SCR-016 Commanders Archive UI

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
