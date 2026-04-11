# TRACK-004: Component — LifeCounter (CMP-001)

> **Issue ID:** TRACK-004
> **Priority:** P0
> **Effort:** M
> **Story Points:** 5
> **Status:** 📋 Backlog
> **Epic:** [EPIC-03-LIVE-TRACKING](../epics/EPIC-03-LIVE-TRACKING.md)
> **Skills:** `domains/ui`
> **Agents:** `frontend-specialist`, `mobile-developer`
> **Owner:** Gabriel Asse

---

## 🎯 Objetivo

Implementar el componente LifeCounter (CMP-001): el display principal de vida en cada sección del tracker. Muestra el life total actual como número grande, responde a tap +/- para cambios rápidos, long press para entrada de valor exacto, y dispara eventos debounced a `POST /api/match-events` al confirmar el cambio.

## User Story

> Como **P-002** (usuario en partida), quiero **actualizar el life total de un jugador con taps rápidos** para **no interrumpir el flow de la partida con una interfaz complicada**.

**Implementa:** US-013, US-014

---

## 📎 Doc References (Inline)

| Doc | Sección | Link |
|-----|---------|------|
| DESIGN | CMP-001 LifeCounter | [15_DESIGN.md#cmp-001](../../planning/15_DESIGN.md) |
| USER_STORIES | US-013, US-014 | [04_USER_STORIES.md#us-013](../../planning/04_USER_STORIES.md) |
| BUSINESS_RULES | BR-TRACK-01 (life floor 0?) | [05_BUSINESS_RULES.md#br-track-01](../../planning/05_BUSINESS_RULES.md) |
| BUSINESS_RULES | BR-TRACK-09 (debounce) | [05_BUSINESS_RULES.md#br-track-09](../../planning/05_BUSINESS_RULES.md) |

---

## ✅ Criterios de Aceptación

- [ ] Número de vida en tipografía `display-lg` (72sp) — legible a distancia
- [ ] Botones `-1` (izquierda) y `+1` (derecha) de al menos 60x60pt para fácil tapping
- [ ] Long press en `-` o `+` → incremento rápido (hold repeat cada 150ms)
- [ ] Tap en el número → modo de entrada directa (NumericInput modal o inline)
- [ ] Los cambios se acumulan localmente con debounce (default 500ms, configurable en EPIC-05)
- [ ] Al expirar el debounce → `POST /api/match-events` con delta acumulado
- [ ] Alerta visual sutil cuando life_total ≤ 0 (no acción automática — BR-TRACK-01)
- [ ] Nombre del jugador visible en la sección (header de la PlayerSection)

## 🥒 Escenarios (Gherkin)

```gherkin
Escenario: Reducir vida con taps rápidos (debounce)
  Dado que life_total=40 y debounce_threshold=500ms
  Cuando el usuario toca "-1" cinco veces en menos de 500ms
  Entonces el display muestra 35 inmediatamente (feedback local)
  Y después de 500ms se envía un solo POST /api/match-events con delta=-5

Escenario: Alerta visual cuando vida llega a 0
  Dado que life_total=1
  Cuando el usuario toca "-1"
  Entonces el número 0 se muestra con color rojo (warning visual)
  Y NO aparece ningún pop-up de eliminación automática

Escenario: Entrada directa de valor
  Dado que life_total=40
  Cuando el usuario hace long-press en el número "40"
  Entonces aparece un input numérico
  Y al confirmar "25", el life_total pasa de 40 a 25 (delta=-15)
```

## 🔧 Contexto Técnico

**Archivos a crear:**
- `components/tracker/LifeCounter.tsx` — CMP-001
- `hooks/useDebounce.ts` — Hook de debounce genérico (threshold configurable)

**Debounce pattern:**
```typescript
// Acumular delta localmente
const [pendingDelta, setPendingDelta] = useState(0);
const { flush } = useDebounce(() => {
  if (pendingDelta !== 0) {
    postEvent({ event_type: 'life_change', delta: pendingDelta, participation_id });
    setPendingDelta(0);
  }
}, threshold);
```

**Dependencias de Issues:**
- Bloqueado por: TRACK-003 (Tracker shell)
- Bloquea a: TRACK-005, TRACK-006

## ⚠️ Edge Cases

- ¿Life total puede ser negativo? (BR-TRACK-07 OQ-01) — implementar según decisión: si floor=0, el botón "-" se deshabilita al llegar a 0; si no hay floor, continúa bajando
- Long press en botones +/- no debe activar el modo de entrada directa del número

## 🧪 Tests Requeridos

- [ ] Unit: debounce acumula deltas y hace un solo call
- [ ] Unit: alerta visual activa cuando life_total ≤ 0
- [ ] Unit: entrada directa calcula delta correcto

## 🚫 Out of Scope

- Commander Damage → TRACK-005
- Poison Counter → TRACK-006
- Configuración del threshold → EPIC-05

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
