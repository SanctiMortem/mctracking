# PLAT-006: UI — SCR-017 Groups Screen

> **Issue ID:** PLAT-006
> **Priority:** P1
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
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

- [ ] Lista de grupos del usuario: los que creó (owner) y los que es member, con nombre + rol badge
- [ ] Botón "Crear grupo" → sheet modal con input de nombre + confirm
- [ ] Al crear: navega a la vista del grupo creado con su invite link visible
- [ ] Para cada grupo: botón "Ver invite link" (solo si es owner) con opción de compartir via Share API nativa
- [ ] Botón "Unirse a grupo" → input de invite_code + confirm
- [ ] Error invite expirado: mensaje claro "Este link expiró — pide uno nuevo al owner"
- [ ] Estado vacío: "Aún no perteneces a ningún grupo — Crea uno o únete por invitación"
- [ ] Acceso: desde Settings o desde header de Home

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

- [ ] Integration: crear grupo → invite link visible → compartir (mock Share API)
- [ ] Unit: lista de grupos separada en "Mis grupos" y "Miembro de"

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
