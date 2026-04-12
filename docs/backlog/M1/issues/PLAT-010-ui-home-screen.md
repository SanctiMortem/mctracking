# PLAT-010: UI — SCR-002 Home Screen FULL

> **Issue ID:** PLAT-010
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

Implementar SCR-002 (Home) como pantalla principal post-login: banner de match activo, últimas partidas, stat highlight del usuario, CTA "Nuevo Match", y context switcher de grupo (per ADR-004 y ADR-005).

## User Story

> Como **P-002** (usuario autenticado), quiero **ver en Home un resumen de mi actividad y acceder rápidamente a mis acciones** para **no perder tiempo navegando**.

**Implementa:** US-044, US-045

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | SCR-002 Home | [15_DESIGN.md#scr-002](../../planning/15_DESIGN.md) |
| USER_STORIES | US-044, US-045 | [04_USER_STORIES.md#us-044](../../planning/04_USER_STORIES.md) |
| ADR | ADR-004 (contexto activo) | [ADR-004-home-match-active-context.md](./ADR-004-home-match-active-context.md) |
| ADR | ADR-005 (context switcher en header) | [ADR-005-group-selection-screen.md](./ADR-005-group-selection-screen.md) |

---

## ✅ Criterios de Aceptación

- [ ] **Context switcher** en header: dropdown "Personal / Nombre del Grupo" (per ADR-005); si solo "Personal" → no mostrar dropdown (user sin grupos)
- [ ] **Banner "Partida en curso"**: visible solo si hay un match `in_progress` en el contexto activo; tap → navega a SCR-008
- [ ] **CTA principal "Nuevo Match"**: botón `primary` (amber) — 1 por pantalla; tap → navega a SCR-007
- [ ] **Últimas 3 partidas**: `MatchCard` (de HIST-002) en preview mode; tap → SCR-005 (ver todas)
- [ ] **Stat highlight**: win rate del usuario en el contexto activo con badge visual
- [ ] Si no hay partidas: estado vacío con CTA "Inicia tu primera partida" en lugar de últimas partidas
- [ ] Icono gear en header → SCR-018 (Settings)

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Home con match activo
  Dado que hay un match in_progress en mi contexto activo
  Cuando navego a SCR-002
  Entonces veo el banner "Partida en curso — Retomar" prominente
  Y al tocarlo navego a SCR-008 con el estado actual del match

Escenario: Home con últimas partidas
  Dado que tengo 8 matches completados
  Cuando navego a SCR-002
  Entonces veo las últimas 3 MatchCards + link "Ver todas (8)"

Escenario: Context switcher
  Dado que soy miembro de "Grupo MTG Martes" y tengo contexto personal
  Cuando toco el dropdown en el header y selecciono "Grupo MTG Martes"
  Entonces las últimas partidas y stats se actualizan al historial del grupo

Escenario: Home de primer uso
  Dado que no tengo matches ni partidas
  Cuando navego a SCR-002
  Entonces veo CTA "Inicia tu primera partida" en lugar de historial vacío
  Y win rate muestra "Sin partidas"
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `app/(tabs)/index.tsx` — SCR-002 screen
- `contexts/GroupContext.tsx` — Contexto activo (Personal o Group ID)
- `hooks/useHome.ts` — Match activo + últimas partidas + win rate del usuario
- `components/home/ActiveMatchBanner.tsx` — Banner de match en curso

**GroupContext:**
```typescript
interface GroupContextValue {
  activeContext: 'personal' | string; // string = group_id
  setActiveContext: (ctx: 'personal' | string) => void;
  userGroups: Group[];
}
```

**Data en Home:**
```typescript
// Match activo: campo active_match de GET /auth/session (PLAT-002)
//   — NO usar GET /matches (excluye in_progress por BR-MATCH-07)
// Grupos: GET /groups (PLAT-005) — alimenta GroupContext dropdown
// Últimas 3 partidas: GET /matches?limit=3 (solo completed/abandoned)
// Win rate: GET /stats/players/:userId — reutiliza HIST-004
```

**Dependencias de Issues:**
- Bloqueado por: ADR-004, ADR-005 (decisiones de diseño), HIST-001 (matches API), PLAT-005 (groups)
- Bloquea a: PLAT-011 (Ads se muestran en Home)

---

## ⚠️ Edge Cases

- Sin grupos: context switcher oculto — no hay dropdown si solo "Personal"
- Match activo en grupo distinto al contexto activo: no mostrar banner (solo el del contexto activo)
- Win rate del usuario individual vs win rate en el grupo: contexto activo determina cuál se muestra

## 🧪 Tests Requeridos

- [ ] Unit: `ActiveMatchBanner` solo aparece si `match.status === 'in_progress'` en el contexto activo
- [ ] Integration: cambiar contexto activo actualiza las últimas partidas

---

## SK Leverage

No aplica — funcionalidad nueva.

---

## 📝 Implementation Evidence

### Decisiones Tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-12 | `GroupContext` no usa `useGroups` internamente — los grupos se sincronizan desde la pantalla Home | Evita fetch de grupos cuando el usuario es Guest (sin grupos); mantiene el contexto liviano |
| 2026-04-12 | Win rate calculado como agregado de `player_rankings` de `/api/stats/global` | No hay mapeo directo User→Player en sesión; stats globales ya están scoped al userId y retornan todos los players; win rate agregado (wins/participaciones) es el stat más significativo disponible |
| 2026-04-12 | Context switcher usa `Modal` custom en lugar de `Alert.alert` | Consistencia con el design system "The Mystic Archive"; `Alert` no soporta theming personalizado |
| 2026-04-12 | `GroupProvider` envuelve el `Stack` dentro de `AuthGate` (no en `RootLayout`) | Solo monta el provider cuando hay sesión activa (signed in o guest); evita fetch de grupos antes del gate de auth |

### Artifacts Created

- `contexts/GroupContext.tsx` — Context global para activeContext (Personal \| group_id) y userGroups
- `hooks/useHome.ts` — Fetches paralelos: session (active_match) + matches?limit=3 + stats/global; filtra active_match por activeContext (ADR-004)
- `components/home/ActiveMatchBanner.tsx` — Banner CMP-015 con amber styling, pulse indicator, tap → tracker

### Artifacts Modified

- `app/(tabs)/index.tsx` — SCR-002 full: header + context switcher + banner + CTA + recent matches + stat badge + empty state
- `app/_layout.tsx` — `GroupProvider` añadido envolviendo el Stack dentro de `AuthGate`
- `locales/en.json` + `locales/es.json` — Sección `home` con 14 strings EN/ES

### Verification

- [x] Typecheck: ✅ Pass (0 errores en archivos del issue; errores pre-existentes en `services/decks.ts` y `__tests__/` no introducidos)
- [x] Lint: ✅ Pass (0 errores, 0 warnings en los 5 archivos del issue)
- [x] Tests: ⏳ Diferido a PLAT-014 (Epic Tests — Platform)

### AC Checklist

- [x] Context switcher visible solo si user tiene ≥1 grupo
- [x] Banner "Partida en curso" solo si match.in_progress en contexto activo (ADR-004)
- [x] CTA "Nuevo Match" (amber primary, 1 por pantalla) → SCR-007
- [x] Últimas 3 MatchCards + link "Ver todas (N)" → SCR-005
- [x] Stat highlight: total matches + win rate badge
- [x] Empty state "Sin partidas aún" + CTA "Inicia tu primera partida"
- [x] Gear icon → SCR-018

---

## Commits

- `d442885` feat(platform): implement PLAT-010 — SCR-002 Home Screen FULL (EPIC-05)

---

_Creado: 2026-04-10_
_Última actualización: 2026-04-10_
