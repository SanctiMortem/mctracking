# DATA-006: UI — SCR-003 Players (list + CRUD)

> **Issue ID:** DATA-006
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

Implementar SCR-003 (Players List): lista de jugadores del usuario con CRUD inline. Tap en un jugador lleva a SCR-012 (Player Profile). Esta pantalla es uno de los 5 tabs principales y la primera que muchos usuarios configurarán al iniciar la app.

## User Story

> Como **P-002** (usuario autenticado), quiero **ver y gestionar mi lista de jugadores** para **tener el roster listo antes de iniciar un match**.

**Implementa:** US-001, US-002, US-003

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-003 Jugadores | [15_DESIGN.md#scr-003](../../planning/15_DESIGN.md) |
| USER_STORIES | US-001, US-002, US-003 | [04_USER_STORIES.md#us-001](../../planning/04_USER_STORIES.md) |
| DATA_MODEL | E-009 Player | [06_DATA_MODEL.md#e-009](../../planning/06_DATA_MODEL.md) |
| BUSINESS_RULES | BR-ENTITY-01, BR-ENTITY-03 | [05_BUSINESS_RULES.md#br-entity-01](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [ ] Lista de jugadores activos (filtrando soft-deleted)
- [ ] FAB o botón "+" para crear nuevo jugador (nombre requerido, nombre opcional secundario)
- [ ] Tap en jugador navega a SCR-012 (Player Profile)
- [ ] Swipe-to-delete o menú contextual para soft delete con confirmación
- [ ] Si el jugador tiene match activo, soft delete muestra error ("Jugador en partida activa")
- [ ] Edición inline o bottom sheet: editar nombre del jugador
- [ ] Estado vacío: "Aún no tienes jugadores. Agrega el primero." con CTA
- [ ] Tokens del design system aplicados

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Agregar nuevo jugador
  Dado que estoy en SCR-003
  Cuando toco "+" e ingreso el nombre "Carlos"
  Y toco "Guardar"
  Entonces "Carlos" aparece en la lista
  Y puedo seleccionarlo en Match Setup

Escenario: Intentar eliminar jugador con match activo
  Dado que "Gabriel" está en una partida activa
  Cuando intento eliminarlo via swipe-to-delete
  Entonces veo "No puedes eliminar un jugador en una partida activa"
  Y el jugador permanece en la lista

Escenario: Navegar al perfil del jugador
  Dado que estoy en SCR-003
  Cuando toco en el jugador "Carlos"
  Entonces navego a SCR-012 (Player Profile de Carlos)
```

## 🔧 Contexto Técnico

**Archivos a crear/modificar:**
- `app/(tabs)/players.tsx` — SCR-003 screen (ya existe como stub en SETUP-004)
- `components/players/PlayerList.tsx` — Lista con FlatList
- `components/players/PlayerForm.tsx` — Form crear/editar
- `hooks/usePlayers.ts` — Fetch + mutations

**Dependencias de Issues:**
- Bloqueado por: DATA-003 (Player API)
- Bloquea a: DATA-008 (Player Profile stub)

## ⚠️ Edge Cases

- Lista vacía en primera apertura — estado vacío prominente con CTA
- FlatList performance con 50+ jugadores (usar `getItemLayout` si altura es fija)

## 🧪 Tests Requeridos

- [ ] Unit: `PlayerList` renderiza jugadores correctamente
- [ ] Integration: crear jugador desde UI aparece en lista

## 🚫 Out of Scope

- Stats del jugador en esta pantalla → DATA-008 + EPIC-04
- Búsqueda/filtros avanzados (la lista en MVP es simple)

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-10 | `getItemLayout` con altura fija 64pt | Optimiza FlatList para listas largas sin necesidad de medir cada row |
| 2026-04-10 | Avatar de iniciales en lugar de foto | MVP sin upload de imagen; las iniciales dan identidad visual suficiente |
| 2026-04-10 | ACTIVE_MATCH error code mapeado en UI | El AC exige mensaje específico para este caso; el API ya retorna el code |

---

## Commits

- `49fa80f` — feat(data): DATA-006 — SCR-003 Players List UI (tab screen)

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
