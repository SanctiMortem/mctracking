# ADR-004: Home — Match Activo de Grupo vs Individual

> **Issue ID:** ADR-004
> **Priority:** P1
> **Effort:** XS
> **Story Points:** 1
> **Status:** ✅ Done
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/api`, `domains/ui`
> **Agents:** `backend-specialist`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Definir el comportamiento del banner "Partida en curso" en Home (SCR-002) cuando el usuario pertenece a múltiples grupos. ¿El banner muestra el match activo del grupo seleccionado actualmente, o de cualquier grupo del usuario?

**Open Question original:** OQ-01 en 15_DESIGN.md (SCR-002 Scope Note) — "Por ahora: contexto del usuario individual."

---

## 📎 Doc References

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-002 Home Scope Note | [15_DESIGN.md#scr-002](../../planning/15_DESIGN.md) |
| DISCOVERY | §2 Grupos | [00_DISCOVERY_BRIEF.md#§2](../../planning/00_DISCOVERY_BRIEF.md) |

---

## ✅ Opciones

### Opción A — Solo contexto individual (personal)

El banner siempre muestra el match activo **del usuario individual** (sin grupo).

**Pros:** Más simple. Sin estado de "grupo activo" que gestionar. En MVP, la mayoría de usuarios no tienen grupos aún.
**Contras:** Si el usuario tiene un match en un grupo, no lo verá desde Home.

### Opción B — Grupo activo seleccionado (recomendada para MVP)

El banner muestra el match activo del **contexto activo actual** (personal o grupo, según lo que esté seleccionado). Un selector de contexto en Home indica cuál está activo.

**Pros:** Correcto para grupos. Consistente con cómo el resto de la app scopea datos.
**Contras:** Requiere diseñar el "contexto activo" — un state global en la app.

### Opción C — Cualquier match activo del usuario

Muestra el match activo si existe en cualquier contexto del usuario.

**Pros:** Nunca se pierde un match activo.
**Contras:** Si hay 2 grupos con matches activos simultáneos (teórico pero posible), ¿cuál mostrar?

---

## 🎯 Recomendación

**Opción B** — Grupo activo seleccionado, con scope en Home a ese contexto.

Razón: Consistente con el modelo de datos donde los recursos son scoped por grupo. Un selector de contexto simple (dropdown "Personal / Grupo X") en Home Home resuelve la UX. Si el usuario no tiene grupos, solo muestra "Personal" y el problema desaparece.

---

## ✅ Criterios de Aceptación

- [x] Decisión documentada en esta ADR
- [ ] PLAT-010 (Home screen) implementa la opción elegida
- [ ] Si Opción B: definir el state de "contexto activo" como Context global en `contexts/GroupContext.tsx`

## 🧪 Tests Requeridos

- [ ] Ninguno adicional — la ADR informa la implementación

---

## SK Leverage

No aplica.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-11 | **Opción B — Grupo activo seleccionado** | El data model es group-scoped por diseño (todos los entities tienen `group_id` FK). F46 establece explícitamente que los recursos pertenecen al grupo activo seleccionado. Un `GroupContext` global es necesario de todas formas para PLAT-005/PLAT-006/PLAT-010. La Opción C crea ambigüedad sin criterio de desempate si hay 2 grupos con matches activos. La Opción A contradice la arquitectura al ocultar matches de grupo desde el punto de entrada principal. |

### Implicaciones para issues dependientes

- **PLAT-001** — El DB schema debe incluir la noción de "grupo activo" (o manejarlo como state en el cliente vía `GroupContext`)
- **PLAT-010** — Home screen debe leer el contexto activo desde `GroupContext` y hacer la query: `WHERE group_id = activeGroupId AND status = 'in_progress' LIMIT 1`
- **contexts/GroupContext.tsx** — Crear como parte de PLAT-001 o PLAT-010. Estado: `{ activeGroupId: string | null }`. `null` = contexto personal (matches sin group_id).
- **CMP-015 (ActiveMatchBanner)** — Query scopeada al `activeGroupId` del contexto. Si no hay match activo en ese contexto, no se muestra el banner (aunque existan matches en otros grupos).

### OQ-001 Resuelta

`15_DESIGN.md` OQ-001 actualizado a 🟢 Resuelta — Opción B.

---

## Commits

_Ninguno aún_

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-11_
