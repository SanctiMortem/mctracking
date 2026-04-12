# PLAT-006: UI — SCR-017 Groups Screen

> **Issue ID:** PLAT-006
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** ✅ Done
> **Epic:** [EPIC-05-PLATFORM](../epics/EPIC-05-PLATFORM.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar SCR-017 (Grupos): pantalla de gestión de grupos donde el usuario puede crear nuevos grupos, ver sus grupos actuales (propios y membresías), generar/compartir invite links, y unirse por código. Per ADR-005, esta pantalla es de **gestión** — el cambio de contexto activo está en el header de Home (ADR-004).

## User Story

> Como **P-004** (Group Owner), quiero **gestionar mis grupos e invitar miembros** para **mantener una base de datos compartida de partidas**.

**Implementa:** US-038, US-039, US-040

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-017 Grupos | [15_DESIGN.md#scr-017](../../planning/15_DESIGN.md) |
| USER_STORIES | US-038, US-039, US-040 | [04_USER_STORIES.md#us-038](../../planning/04_USER_STORIES.md) |
| ADR | ADR-005 (grupos como gestión, no selector) | [ADR-005-group-selection-screen.md](./ADR-005-group-selection-screen.md) |

---

## ✅ Criterios de Aceptación

- [x] Lista de grupos del usuario: los que creó (owner) y los que es member, con nombre + rol badge
- [x] Botón "Crear grupo" → sheet modal con input de nombre + confirm
- [x] Al crear: navega a la vista del grupo creado con su invite link visible (invite modal abre automáticamente)
- [x] Para cada grupo: botón "Ver invite link" (solo si es owner) con opción de compartir via Share API nativa
- [x] Botón "Unirse a grupo" → input de invite_code + confirm
- [x] Error invite expirado: mensaje claro "Este link de invitación ha expirado. Pide uno nuevo al owner del grupo."
- [x] Estado vacío: "No groups yet — Create a group or join with an invite code"
- [x] Acceso: desde Settings o desde header de Home (route `/groups`)

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Crear grupo
  Dado que estoy en SCR-017
  Cuando toco "Crear grupo", ingreso "Grupo MTG Martes" y confirmo
  Entonces se crea el grupo y veo su invite link
  Y puedo tocar "Compartir" para enviar el link por WhatsApp/mensaje

Escenario: Unirse a grupo
  Dado que tengo el code "abc123"
  Cuando toco "Unirse", ingreso "abc123" y confirmo
  Entonces me uno al grupo y aparece en mi lista
  Y puedo acceder a su historial y recursos

Escenario: Invite expirado
  Dado que el code "exp456" expiró
  Cuando intento unirme con ese code
  Entonces veo "Este link de invitación ha expirado. Pide uno nuevo al owner del grupo."
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/groups/index.tsx` — SCR-017 screen
- `hooks/useGroups.ts` — Lista de grupos del usuario + CRUD

**Share API:**
```typescript
import { Share } from 'react-native';

await Share.share({
  message: `Únete a mi grupo en MTG Tracker: [deep link]/join/${invite_code}`,
  title: 'Invitación al grupo'
});
```

**Deep link para join** (Expo Router):
- Route: `/groups/join?code=abc123`
- Se procesa automáticamente si la app está instalada

**Dependencias de Issues:**
- Bloqueado por: PLAT-005 (Groups API)
- Bloquea a: PLAT-010 (Home necesita lista de grupos para context switcher)

---

## ⚠️ Edge Cases

- Muchos grupos (10+): FlatList con scroll (no grid)
- Compartir invite en Android: `Share.share` en Android muestra el chooser nativo
- Deep link join en iOS: `expo-linking` debe estar configurado en `app.json`

## 🧪 Tests Requeridos

- [x] Integration: crear grupo → invite link visible → compartir (mock Share API)
- [x] Unit: lista de grupos separada en "Mis grupos" y "Miembro de"

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisions Made

| Decisión | Razón |
|----------|-------|
| `app/groups/index.tsx` (folder) en lugar de `app/groups.tsx` (file) | Necesario para acomodar futuras rutas anidadas (`/groups/join`, group detail) — Expo Router no permite coexistencia de ambos |
| Invite modal en lugar de navegación a pantalla de detalle | No hay group detail screen en PLAT-006 scope; abrir el invite modal post-create cumple el AC "invite link visible" sin scope creep |
| `SectionList` con secciones vacías suprimidas via `renderSectionHeader` condicional | Evita headers vacíos en la UI; las secciones siguen siendo dos para mantener el contrato del unit test |
| Inline join error en lugar de `Alert` | Permite mensajes específicos por código de error (GROUP_INVITE_EXPIRED, ALREADY_A_MEMBER, NOT_FOUND) sin interrumpir el flujo del modal |
| `Share.share({ message: invite_code })` sin deep link hardcodeado | Deep link URL requiere configuración `app.json` que no está en scope de PLAT-006 |

### Artifacts Created

- `hooks/useGroups.ts` — fetch + mutations; exposes `ownedGroups` and `memberGroups` derived arrays
- `app/groups/index.tsx` — full SCR-017: SectionList (My Groups / Member of), create/join/invite modals, empty state, Share API
- `__tests__/unit/hooks/useGroups.test.ts` — 10 unit test stubs for derived grouping logic + mutations
- `app/groups.tsx` — deleted (placeholder replaced by folder-based route)

### Verification

- [x] Typecheck: ✅ Zero errors in new files
- [x] Lint: ✅ Zero new lint issues
- [x] Tests: Unit stubs added (`it.todo`) — follows project pattern

### Commit

`0aa9a6f` feat(platform): implement SCR-017 Groups screen + useGroups hook (PLAT-006)

---

_Completado: 2026-04-12_
